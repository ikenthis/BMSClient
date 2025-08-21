// InventoryPanel.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { 
  X, Focus, Search, List, Thermometer, Gauge, 
  ChevronRight, ChevronDown, Eye, ZoomIn, Home, Unlock, Lightbulb
} from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import { AutoSizer } from 'react-virtualized';
import '../styles/inventorypanel.css';
import { 
  zoomToElement, 
  zoomToElements, 
  zoomToCategory, 
  zoomToElementsByProperty,
  resetView,
  getElementInfo 
} from '../utils/ElementZoomUtils';



interface InventoryPanelProps {
  models: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsModels | null;
  world?: OBC.World | null;
  onElementSelected?: (element: InventoryElement) => void;
  onShowElementInfo?: (element: InventoryElement) => void;
  onClose?: () => void;
  // Nuevas propiedades para el control de aislamiento
  onElementIsolated?: (element: InventoryElement) => void;
  onResetIsolation?: () => void;
  isSelectionLocked?: boolean;
  currentIsolatedCategory?: string | null;
}

// Interfaz para elementos del inventario
interface InventoryElement {
  modelId: string;
  model: FRAGS.FragmentsModel;
  localId: number;
  name?: string;
  type?: string;
  category: string;
  subCategory?: string;
  properties?: Record<string, any>;
  // Nuevos campos para información espacial
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    volume: number;
  };
  position?: THREE.Vector3;
}

// Interfaz para información de categoría
interface CategoryInfo {
  category: string;
  displayName: string;
  icon: React.ReactNode;
  elements: InventoryElement[];
  totalCount: number;
  loaded: boolean;
  localIdsByModel: Record<string, number[]>;
}

// Definir las categorías que nos interesan
const INVENTORY_CATEGORIES = [
  {
    id: "IFCENERGYCONVERSIONDEVICE",
    displayName: "Equipos de Conversión de Energía",
    icon: <Thermometer size={18} />,
    color: new THREE.Color(0x4dabf5),
    subCategories: [
      { id: "hvac", name: "Equipos HVAC" },
    ]
  },
  {
    id: "IFCDISTRIBUTIONCONTROLELEMENT",
    displayName: "Elementos de Control",
    icon: <Gauge size={18} />,
    color: new THREE.Color(0xf59f00),
    subCategories: [
      { id: "actuator", name: "Dispositivos de Control" },
    ]
  },
  // CATEGORÍA ACTUALIZADA PARA LUMINARIAS
  {
    id: "IFCFLOWTERMINAL",
    displayName: "Luminarias",
    icon: <Lightbulb size={18} />,
    color: new THREE.Color(0xffd43b),
    subCategories: [
      { id: "luminarias", name: "Luminarias" },
    ]
  }
];

// Función mejorada para determinar subcategoría basada en PredefinedType
const determineSubCategory = (category, itemData, name, type) => {
  // Obtener PredefinedType si está disponible
  let predefinedType = '';
  if (itemData && itemData.PredefinedType) {
    if (typeof itemData.PredefinedType === 'object' && 'value' in itemData.PredefinedType) {
      predefinedType = String(itemData.PredefinedType.value || '').toLowerCase();
    } else if (typeof itemData.PredefinedType === 'string') {
      predefinedType = itemData.PredefinedType.toLowerCase();
    }
  }
  
  const nameLower = String(name || '').toLowerCase();
  const typeLower = String(type || '').toLowerCase();
  
  switch (category) {
    case "IFCENERGYCONVERSIONDEVICE":
      if (nameLower.includes('chiller') || nameLower.includes('enfria') || typeLower.includes('chiller')) {
        return "chiller";
      } else if (nameLower.includes('boiler') || nameLower.includes('calder') || nameLower.includes('calent') || typeLower.includes('boiler')) {
        return "boiler";
      } else {
        return "hvac";
      }
      
    case "IFCDISTRIBUTIONCONTROLELEMENT":
      if (nameLower.includes('sensor') || typeLower.includes('sensor')) {
        return "sensor";
      } else if (nameLower.includes('control') || typeLower.includes('control')) {
        return "controller";
      } else {
        return "actuator";
      }
      
    case "IFCFLOWTERMINAL":
      // Clasificar todos los elementos de IFCFLOWTERMINAL que sean IfcLightFixture como luminarias
      if (predefinedType && (predefinedType.includes('lightfixture') || 
          predefinedType.includes('light') || 
          predefinedType.includes('lighting'))) {
        return "luminarias";
      } else if (nameLower.includes('luz') || 
          nameLower.includes('light') || 
          nameLower.includes('luminaria') ||
          nameLower.includes('lampara') ||
          nameLower.includes('iluminacion') ||
          typeLower.includes('light') ||
          typeLower.includes('lighting')) {
        return "luminarias";
      } else {
        // Para otros elementos de IFCFLOWTERMINAL que no sean luminarias
        return "luminarias"; // Por defecto agrupar todo como luminarias
      }
      
    default:
      return undefined;
  }
};

// Materiales para visualización
const NON_ISOLATED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.5, 0.5, 0.5),
  opacity: 0.1,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const ISOLATED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.7, 0.7, 0.7),
  opacity: 0.3,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const HIGHLIGHTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.2, 0.6, 1.0),
  opacity: 1.0,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: false
};

const SELECTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(1.0, 0.8, 0.0),
  opacity: 1.0,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: false
};

const InventoryPanel: React.FC<InventoryPanelProps> = ({
  models = [],
  fragments = null,
  world = null,
  onElementSelected,
  onShowElementInfo,
  onClose,
  // Nuevas props para el control de aislamiento
  onElementIsolated,
  onResetIsolation,
  isSelectionLocked = false,
  currentIsolatedCategory = null
}) => {
  // Estados para búsqueda y UI
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isolationActive, setIsolationActive] = useState<boolean>(!!currentIsolatedCategory);
  
  // Estados para categorías y navegación
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<InventoryElement | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [selectionLocked, setSelectionLocked] = useState<boolean>(isSelectionLocked);

  // Referencias para memoria y virtualización
  const categoriesRef = useRef<Record<string, CategoryInfo>>({});
  const filteredElementsRef = useRef<InventoryElement[]>([]);
  const virtualListRef = useRef<any>(null);
  
  // Estado para identificar elementos resaltados
  const [highlightedElements, setHighlightedElements] = useState<Record<string, number[]>>({});
  
  // Paginación y carga lazy
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreElements, setHasMoreElements] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalElementCount, setTotalElementCount] = useState(0);
  const [elementUpdateCounter, setElementUpdateCounter] = useState(0);
  const PAGE_SIZE = 100; // Elementos por página
  const [isSelectionFromInventory, setIsSelectionFromInventory] = useState(false);
  
  // Para almacenar los modelos cambiados entre renders
  const modelsRef = useRef(models);

  // Memorizar IDs de categorías para evitar recálculos
  const categoryIds = useMemo(() => INVENTORY_CATEGORIES.map(c => c.id), []);

  useEffect(() => {
    setSelectionLocked(isSelectionLocked);
  }, [isSelectionLocked]);
  
  // Efecto para sincronizar el estado de aislamiento con el prop currentIsolatedCategory
  useEffect(() => {
    setIsolationActive(!!currentIsolatedCategory);
    
    // Si hay una categoría aislada y no coincide con la seleccionada, actualizamos
    if (currentIsolatedCategory && currentIsolatedCategory !== selectedCategory) {
      // Buscar si coincide con alguna categoría conocida
      const matchingCategory = INVENTORY_CATEGORIES.find(
        cat => cat.id === currentIsolatedCategory
      );
      
      if (matchingCategory) {
        setSelectedCategory(matchingCategory.id);
      }
    }
  }, [currentIsolatedCategory]);

  // Cargar información de categorías cuando se montan los modelos
  useEffect(() => {
    if (models && Array.isArray(models) && models.length > 0 && 
        (!modelsRef.current || models !== modelsRef.current)) {
      modelsRef.current = models;
      initializeCategories();
    }
  }, [models]); // Solo depende de models

  // Inicializar estructura de categorías
  const initializeCategories = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Crear estructura inicial de categorías
      const categoriesInfo: Record<string, CategoryInfo> = {};
      
      for (const category of INVENTORY_CATEGORIES) {
        categoriesInfo[category.id] = {
          category: category.id,
          displayName: category.displayName,
          icon: category.icon,
          elements: [],
          totalCount: 0,
          loaded: false,
          localIdsByModel: {}
        };
      }
      
      categoriesRef.current = categoriesInfo;
      
      // Precargar conteo de elementos por categoría
      for (const category of INVENTORY_CATEGORIES) {
        const { totalCount, idsByModel } = await countCategoryElements(category.id);
        
        if (categoriesRef.current[category.id]) {
          categoriesRef.current[category.id].totalCount = totalCount;
          categoriesRef.current[category.id].localIdsByModel = idsByModel;
        }
      }
    } catch (error) {
      console.error("Error al inicializar categorías:", error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Sin dependencias ya que usa las variables externas al componente

  // Función para contar elementos por categoría sin cargarlos todos
  const countCategoryElements = async (category: string): Promise<{
    totalCount: number, 
    idsByModel: Record<string, number[]>,
    guidsByModel: Record<string, string[]>
  }> => {
    let count = 0;
    const idsByModel: Record<string, number[]> = {};
    const guidsByModel: Record<string, string[]> = {};
    
    for (const model of models) {
      if (!model || !model.id) continue;
      
      try {
        // Obtener elementos de esta categoría
        const items = await model.getItemsOfCategory(category);
        
        // Array para almacenar los localIds
        const localIds: number[] = [];
        // Array para almacenar los GUIDs
        const guids: string[] = [];
        
        // Procesar cada elemento para obtener localId y GUID
        for (const item of items) {
          const localId = await item.getLocalId();
          if (localId !== null) {
            // Para IFCFLOWTERMINAL, pre-filtrar por nombre antes de contar
            if (category === "IFCFLOWTERMINAL") {
              try {
                // Obtener datos básicos para verificar el nombre
                const itemData = await model.getItemsData([localId], {
                  attributesDefault: false,
                  attributes: ["Name"]
                });
                
                if (itemData && itemData.length > 0 && itemData[0].Name) {
                  const name = typeof itemData[0].Name === 'object' && 'value' in itemData[0].Name 
                    ? String(itemData[0].Name.value) 
                    : String(itemData[0].Name);
                  
                  // Solo incluir si contiene "LUM"
                  if (!name.toUpperCase().includes('LUM')) {
                    continue; // Saltar este elemento
                  }
                }
              } catch (error) {
                // Si no podemos obtener el nombre, saltar este elemento para IFCFLOWTERMINAL
                continue;
              }
            }
            
            // Para IFCDISTRIBUTIONCONTROLELEMENT, pre-filtrar por nombre antes de contar
            if (category === "IFCDISTRIBUTIONCONTROLELEMENT") {
              try {
                // Obtener datos básicos para verificar el nombre
                const itemData = await model.getItemsData([localId], {
                  attributesDefault: false,
                  attributes: ["Name"]
                });
                
                if (itemData && itemData.length > 0 && itemData[0].Name) {
                  const name = typeof itemData[0].Name === 'object' && 'value' in itemData[0].Name 
                    ? String(itemData[0].Name.value) 
                    : String(itemData[0].Name);
                  
                  // Solo incluir si contiene "STH"
                  if (!name.toUpperCase().includes('STH')) {
                    continue; // Saltar este elemento
                  }
                }
              } catch (error) {
                // Si no podemos obtener el nombre, saltar este elemento para IFCDISTRIBUTIONCONTROLELEMENT
                continue;
              }
            }
            
            localIds.push(localId);
            
            // Obtener y almacenar el GUID utilizando el método getGuid()
            const guid = await item.getGuid();
            if (guid) {
              guids.push(guid);
              console.log(`Elemento de categoría ${category}, modelo ${model.id}, localId ${localId}, GUID: ${guid}`);
            } else {
              console.log(`Elemento de categoría ${category}, modelo ${model.id}, localId ${localId}, sin GUID`);
            }
          }
        }
        
        if (localIds.length > 0) {
          count += localIds.length;
          idsByModel[model.id] = localIds;
        }
        
        if (guids.length > 0) {
          guidsByModel[model.id] = guids;
        }
      } catch (error) {
        console.warn(`Error al contar elementos de categoría ${category} del modelo ${model.id}:`, error);
      }
    }
    
    return { totalCount: count, idsByModel, guidsByModel };
  };
  
  // Función para cargar elementos de forma paginada
  const loadElementsPage = async (
    category: string, 
    page: number = 1, 
    pageSize: number = PAGE_SIZE
  ): Promise<InventoryElement[]> => {
    if (!models || !models.length) return [];
    
    const elements: InventoryElement[] = [];
    let catInfo = categoriesRef.current[category];
    
    // Si ya tenemos los elementos cargados para esta página, devolverlos
    if (catInfo && catInfo.elements.length >= page * pageSize) {
      return catInfo.elements.slice((page - 1) * pageSize, page * pageSize);
    }
    
    // Si no tenemos información de categoría o no tenemos los IDs de los elementos,
    // primero hacemos un recuento para obtener los IDs
    if (!catInfo || !Object.keys(catInfo.localIdsByModel).length) {
      const { totalCount, idsByModel } = await countCategoryElements(category);
      
      if (!catInfo) {
        const categoryInfo = INVENTORY_CATEGORIES.find(c => c.id === category);
        catInfo = {
          category,
          displayName: categoryInfo?.displayName || category,
          icon: categoryInfo?.icon || <Focus size={18} />,
          elements: [],
          totalCount,
          loaded: false,
          localIdsByModel: idsByModel
        };
        categoriesRef.current[category] = catInfo;
      } else {
        catInfo.totalCount = totalCount;
        catInfo.localIdsByModel = idsByModel;
      }
      
      // Actualizar estado global
      setTotalElementCount(totalCount);
      setHasMoreElements(catInfo.elements.length < totalCount);
    }
    
    // Calcular qué elementos necesitamos cargar
    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(page * pageSize, catInfo.totalCount);
    
    // Si ya tenemos todos los elementos necesarios, devolverlos
    if (catInfo.elements.length >= endIdx) {
      return catInfo.elements.slice(startIdx, endIdx);
    }
    
    // Necesitamos cargar más elementos
    try {
      // Calculamos cuántos elementos tenemos que cargar de cada modelo
      for (const modelId in catInfo.localIdsByModel) {
        const model = models.find(m => m.id === modelId);
        if (!model) continue;
        
        const localIds = catInfo.localIdsByModel[modelId];
        if (!localIds.length) continue;
        
        // Determinar qué elementos cargar de este modelo
        const elementsToLoad = [];
        let elementsLoaded = 0;
        
        // Calcular cuántos elementos ya hemos cargado
        const elementsFromThisModelAlreadyLoaded = catInfo.elements.filter(
          e => e.modelId === modelId
        ).length;
        
        // Si ya hemos cargado todos los elementos de este modelo, continuar
        if (elementsFromThisModelAlreadyLoaded >= localIds.length) continue;
        
        // Determinar qué elementos cargar
        const startIdxForModel = elementsFromThisModelAlreadyLoaded;
        const endIdxForModel = Math.min(
          startIdxForModel + (pageSize - elementsLoaded),
          localIds.length
        );
        
        // Si no hay más elementos para cargar, continuar
        if (startIdxForModel >= endIdxForModel) continue;
        
        // Obtener IDs a cargar
        const idsToLoad = localIds.slice(startIdxForModel, endIdxForModel);
        elementsToLoad.push(...idsToLoad);
        elementsLoaded += idsToLoad.length;
        
        // Cargar datos de elementos
        if (elementsToLoad.length > 0) {
          try {
            const itemsData = await model.getItemsData(elementsToLoad, {
              attributesDefault: false,
              attributes: ["Name", "ObjectType", "Description", "PredefinedType"] // Asegúrate de incluir PredefinedType
            });
            
            // Determinar la subcategoría basado en propiedades
            const categoryConfig = INVENTORY_CATEGORIES.find(c => c.id === category);
            
            // Procesar los elementos cargados
            const elementsPromises = elementsToLoad.map(async (localId, index) => {
              const itemData = itemsData[index];
              const element: InventoryElement = {
                modelId,
                model,
                localId,
                category
              };
              
              // Añadir nombre si está disponible
              if (itemData && itemData.Name && typeof itemData.Name === 'object' && 'value' in itemData.Name) {
                element.name = String(itemData.Name.value);
              } else {
                element.name = `${category.replace('IFC', '')} ${localId}`;
              }
              
              // NOTA: El filtro por "LUM" ya se aplicó en countCategoryElements para IFCFLOWTERMINAL
              // Por lo que aquí todos los elementos ya son válidos
              
              // Añadir tipo si está disponible
              if (itemData && itemData.ObjectType && typeof itemData.ObjectType === 'object' && 'value' in itemData.ObjectType) {
                element.type = String(itemData.ObjectType.value);
              }
              
              // Asignar subcategoría basado en propiedades
              if (categoryConfig) {
                // Determinar subCategoria basada en tipo y nombre
                
                const name = element.name?.toLowerCase() || '';
                const type = element.type?.toLowerCase() || '';
                
                // Inferir la subcategoría
                if (category === "IFCENERGYCONVERSIONDEVICE") {
                  if (name.includes('chiller') || name.includes('enfria') || type.includes('chiller')) {
                    element.subCategory = "chiller";
                  } else if (name.includes('boiler') || name.includes('calder') || name.includes('calent') || type.includes('boiler')) {
                    element.subCategory = "boiler";
                  } else {
                    element.subCategory = "hvac";
                  }
                } else if (category === "IFCDISTRIBUTIONCONTROLELEMENT") {
                  if (name.includes('sensor') || type.includes('sensor')) {
                    element.subCategory = "sensor";
                  } else if (name.includes('control') || type.includes('control')) {
                    element.subCategory = "controller";
                  } else {
                    element.subCategory = "actuator";
                  }
                } else if (category === "IFCFLOWTERMINAL") {
                  // Para luminarias, todas van a la misma subcategoría
                  element.subCategory = "luminarias";
                }
              }
              
              try {
                // Obtener información espacial usando getBoxes
                const boxes = await model.getBoxes([localId]);
                if (boxes && boxes.length > 0) {
                  const box = boxes[0];
                  
                  // Calcular dimensiones
                  const size = new THREE.Vector3();
                  box.getSize(size);
                  
                  element.dimensions = {
                    width: size.x,
                    height: size.y,
                    depth: size.z,
                    volume: size.x * size.y * size.z
                  };
                  
                  // Calcular posición
                  const position = new THREE.Vector3();
                  box.getCenter(position);
                  element.position = position;
                }
              } catch (error) {
                console.warn(`Error al obtener información espacial para elemento ${localId}:`, error);
              }
              
              return element;
            });
            
            // Esperar a que todas las promesas se resuelvan
            const resolvedElements = await Promise.all(elementsPromises);
            // Ya no necesitamos filtrar elementos nulos porque el filtro se aplicó antes
            elements.push(...resolvedElements);
          } catch (error) {
            // Si no podemos obtener información detallada para IFCFLOWTERMINAL o IFCDISTRIBUTIONCONTROLELEMENT, 
            // no agregamos elementos fallback ya que no podemos verificar si contienen "LUM" o "STH"
            if (category !== "IFCFLOWTERMINAL" && category !== "IFCDISTRIBUTIONCONTROLELEMENT") {
              elementsToLoad.forEach(localId => {
                elements.push({
                  modelId,
                  model,
                  localId,
                  category,
                  name: `${category.replace('IFC', '')} ${localId}`,
                  subCategory: undefined
                });
              });
            }
          }
        }
        
        // Si ya hemos cargado suficientes elementos, salir del bucle
        if (elementsLoaded >= pageSize) break;
      }
      
      // Actualizar la información de categoría
      if (elements.length > 0) {
        // Para IFCFLOWTERMINAL, ordenar elementos dando prioridad a los que contienen "LUM"
        if (category === "IFCFLOWTERMINAL") {
          elements.sort((a, b) => {
            const aHasLum = (a.name?.toUpperCase() || '').includes('LUM');
            const bHasLum = (b.name?.toUpperCase() || '').includes('LUM');
            
            // Prioridad: elementos con LUM primero
            if (aHasLum && !bHasLum) return -1;
            if (!aHasLum && bHasLum) return 1;
            
            // Si ambos tienen o no tienen LUM, ordenar alfabéticamente
            return (a.name || '').localeCompare(b.name || '');
          });
        }
        
        // Para IFCDISTRIBUTIONCONTROLELEMENT, ordenar elementos dando prioridad a los que contienen "STH"
        if (category === "IFCDISTRIBUTIONCONTROLELEMENT") {
          elements.sort((a, b) => {
            const aHasSth = (a.name?.toUpperCase() || '').includes('STH');
            const bHasSth = (b.name?.toUpperCase() || '').includes('STH');
            
            // Prioridad: elementos con STH primero
            if (aHasSth && !bHasSth) return -1;
            if (!aHasSth && bHasSth) return 1;
            
            // Si ambos tienen o no tienen STH, ordenar alfabéticamente
            return (a.name || '').localeCompare(b.name || '');
          });
        }
        
        catInfo.elements.push(...elements);
        catInfo.loaded = catInfo.elements.length >= catInfo.totalCount;
        
        // Actualizar estado global
        setHasMoreElements(catInfo.elements.length < catInfo.totalCount);
      }
      
      return elements;
    } catch (error) {
      console.error(`Error al cargar elementos de la página ${page} para categoría ${category}:`, error);
      return [];
    }
  };

  // Cargar más elementos cuando se hace scroll
  const loadMoreElements = async () => {
    if (!selectedCategory || !hasMoreElements || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      await loadElementsPage(selectedCategory, nextPage);
      
      // Actualizar página actual
      setCurrentPage(nextPage);
      
      // Forzar actualización del componente
      setElementUpdateCounter(prev => prev + 1);
    } catch (error) {
      console.error("Error al cargar más elementos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Manejador para detectar scroll y cargar más elementos
  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: { 
    scrollOffset: number, 
    scrollUpdateWasRequested: boolean 
  }) => {
    if (!scrollUpdateWasRequested && hasMoreElements && !isLoadingMore) {
      // Calcular si estamos cerca del final
      const container = virtualListRef.current?._outerRef;
      if (container) {
        const { scrollHeight, clientHeight } = container;
        const scrollPosition = scrollOffset;
        const scrollThreshold = 200; // px antes del final
        
        if (scrollHeight - scrollPosition - clientHeight < scrollThreshold) {
          loadMoreElements();
        }
      }
    }
  };
  
  // Función para activar el modo de aislamiento visual
  const activateIsolationMode = async () => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // En lugar de usar getAllItems, vamos a obtener elementos por categoría
      for (const model of models) {
        try {
          // Obtener todas las categorías del modelo
          const categories = await model.getCategories();
          
          for (const category of categories) {
            // Obtener elementos de esta categoría
            const items = await model.getItemsOfCategory(category);
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              // Usar highlight para aplicar material semitransparente
              await model.highlight(localIds, NON_ISOLATED_MATERIAL);
            }
          }
        } catch (error) {
          console.error(`Error al aplicar material a modelo ${model.id}:`, error);
        }
      }
      
      // Actualizar fragmentos
      await fragments.update(true);
      
      setIsolationActive(true);
    } catch (error) {
      console.error("Error al activar modo de aislamiento:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para restaurar la vista normal
  const deactivateIsolationMode = async () => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Utilizar nuestra función auxiliar de ElementZoomUtils
      for (const model of models) {
        await resetView(model, world, fragments, true);
      }
      
      // Resetear estados
      setIsolationActive(false);
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setSelectedElement(null);
      setHighlightedElements({});
      setSelectionLocked(false); // Desbloquear selección al restablecer vista
      
      // Notificar al componente padre que se ha restablecido la vista
      if (onResetIsolation) {
        onResetIsolation();
      }
    } catch (error) {
      console.error("Error al desactivar modo de aislamiento:", error);
    } finally { 
      setIsLoading(false);
    }
  };
  
  // Función para aislar visualmente una categoría
  const isolateCategory = async (categoryId: string) => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Limpiar selecciones anteriores
      setSelectedSubCategory(null);
      setSelectedElement(null);
      
      // Activar modo aislamiento si no está activo
      if (!isolationActive) {
        await activateIsolationMode();
      }
      
      // Si ya había una categoría seleccionada, resetear los elementos
      if (selectedCategory && selectedCategory !== categoryId) {
        // Resetear elementos de la categoría anterior a semi-transparente
        const prevCatInfo = categoriesRef.current[selectedCategory];
        if (prevCatInfo) {
          for (const modelId in prevCatInfo.localIdsByModel) {
            const model = models.find(m => m.id === modelId);
            if (model) {
              const localIds = prevCatInfo.localIdsByModel[modelId];
              if (localIds.length > 0) {
                await model.highlight(localIds, NON_ISOLATED_MATERIAL);
              }
            }
          }
        }
      }
      
      setSelectedCategory(categoryId);
      
      // Si no tenemos datos de esta categoría, cargarlos
      if (!categoriesRef.current[categoryId]?.elements.length) {
        await loadElementsPage(categoryId, 1);
      }
      
      // Destacar elementos de esta categoría
      const catInfo = categoriesRef.current[categoryId];
      if (catInfo) {
        // Usar nuestra función de zoom a categoría para cada modelo
        for (const modelId in catInfo.localIdsByModel) {
          const model = models.find(m => m.id === modelId);
          if (model) {
            // Destacar visualmente los elementos
            await model.highlight(catInfo.localIdsByModel[modelId], ISOLATED_MATERIAL);
          }
        }
      }
      
      // Actualizar fragmentos
      await fragments.update(true);
      
      // Resetear paginación
      setCurrentPage(1);
      setHasMoreElements(true);
      
      // Actualizar elementos filtrados
      updateFilteredElements();
      
    } catch (error) {
      console.error(`Error al aislar categoría ${categoryId}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para aislar visualmente una subcategoría
  const isolateSubCategory = async (categoryId: string, subCategoryId: string) => {
    if (!fragments || models.length === 0 || !categoryId) return;
    
    setIsLoading(true);
    
    try {
      // Limpiar selección de elemento
      setSelectedElement(null);
      
      // Si la categoría principal no está seleccionada, seleccionarla primero
      if (selectedCategory !== categoryId) {
        await isolateCategory(categoryId);
      }
      
      setSelectedSubCategory(subCategoryId);
      
      // Obtener elementos de esta categoría
      const catInfo = categoriesRef.current[categoryId];
      if (!catInfo) return;
      
      // Si no hay elementos cargados, cargarlos
      if (!catInfo.elements.length) {
        await loadElementsPage(categoryId, 1);
      }
      
      // Asegurar que todos los elementos de la categoría sean semi-transparentes primero
      for (const modelId in catInfo.localIdsByModel) {
        const model = models.find(m => m.id === modelId);
        if (model) {
          const localIds = catInfo.localIdsByModel[modelId];
          if (localIds.length > 0) {
            await model.highlight(localIds, NON_ISOLATED_MATERIAL);
          }
        }
      }
      
      // Filtrar elementos por subcategoría
      const subCatElements = catInfo.elements.filter(e => e.subCategory === subCategoryId);
      
      if (subCatElements.length === 0) {
        console.warn(`No hay elementos en la subcategoría ${subCategoryId}`);
        setIsLoading(false);
        return;
      }
      
      // Agrupar por modelo para optimizar
      const elementsByModel: Record<string, number[]> = {};
      
      subCatElements.forEach(element => {
        if (!elementsByModel[element.modelId]) {
          elementsByModel[element.modelId] = [];
        }
        elementsByModel[element.modelId].push(element.localId);
      });
      
      // Destacar elementos de esta subcategoría
      for (const modelId in elementsByModel) {
        const model = models.find(m => m.id === modelId);
        if (model) {
          const localIds = elementsByModel[modelId];
          
          // Usar nuestra función de zoom a elementos para destacar visualmente
          await model.highlight(localIds, HIGHLIGHTED_MATERIAL);
          
          // Opcional: Zoom a los elementos de la subcategoría
          if (world) {
            await zoomToElements(
              model,
              localIds,
              world,
              fragments,
              {
                zoomFactor: 1.2,
                showBoundingBox: true,
                boundingBoxDuration: 3000,
                highlightElements: false // Ya los hemos destacado
              }
            );
          }
        }
      }
      
      // Actualizar fragmentos
      await fragments.update(true);
      
      // Actualizar elementos filtrados
      updateFilteredElements();
      
    } catch (error) {
      console.error(`Error al aislar subcategoría ${subCategoryId}:`, error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para seleccionar y enfocar un elemento
  // Función actualizada para seleccionar y enfocar un elemento
const selectElement = async (element: InventoryElement) => {
  // Si la selección está bloqueada globalmente y no es una selección desde el panel de inventario, no permitir
  if (selectionLocked && !isSelectionFromInventory) return;

  if (!fragments || !world || !models.length) return;
  
  setIsLoading(true);
  
  try {
    // Actualizar estado de selección
    setSelectedElement(element);

    // Notificar al componente padre para que active el bloqueo de selección externa
    if (onElementIsolated) {
      onElementIsolated({
        ...element,
        category: element.category || "CUSTOM_ISOLATION"
      });
    }
    
    // Activar bloqueo de selección local
    setSelectionLocked(true);
    
    // Si no está en modo aislamiento, activarlo
    if (!isolationActive) {
      await activateIsolationMode();
    }
    
    // Resetear highlight de elementos anteriores
    if (selectedCategory) {
      const catInfo = categoriesRef.current[selectedCategory];
      if (catInfo) {
        // Si hay subcategoría seleccionada, resetear solo esos elementos
        if (selectedSubCategory) {
          const subCatElements = catInfo.elements.filter(e => e.subCategory === selectedSubCategory);
          
          // Agrupar por modelo
          const elementsByModel: Record<string, number[]> = {};
          
          subCatElements.forEach(e => {
            if (!elementsByModel[e.modelId]) {
              elementsByModel[e.modelId] = [];
            }
            if (e.modelId !== element.modelId || e.localId !== element.localId) {
              elementsByModel[e.modelId].push(e.localId);
            }
          });
          
          // Aplicar material destacado pero no seleccionado
          for (const modelId in elementsByModel) {
            const model = models.find(m => m.id === modelId);
            if (model) {
              const localIds = elementsByModel[modelId];
              if (localIds.length > 0) {
                await model.highlight(localIds, HIGHLIGHTED_MATERIAL);
              }
            }
          }
        } else {
          // Resetear todos los elementos de la categoría a semi-transparente
          for (const modelId in catInfo.localIdsByModel) {
            const model = models.find(m => m.id === modelId);
            if (model) {
              const localIds = catInfo.localIdsByModel[modelId].filter(
                id => !(modelId === element.modelId && id === element.localId)
              );
              if (localIds.length > 0) {
                await model.highlight(localIds, ISOLATED_MATERIAL);
              }
            }
          }
        }
      }
    }

    // Obtener el modelo del elemento
    const model = models.find(m => m.id === element.modelId);
    if (!model) return;
    
    // Aplicar material de selección al elemento
    await model.highlight([element.localId], SELECTED_MATERIAL);
    
    // Usar nuestra función de zoom a elemento mejorada
    await zoomToElement(
      model,
      element.localId,
      world,
      fragments,
      {
        zoomFactor: 2.5,
        showBoundingBox: true,
        boundingBoxDuration: 3000,
        highlightElement: false // Ya lo hemos resaltado arriba
      }
    );
    
    // Actualizar fragmentos
    await fragments.update(true);
    
    // Notificar al componente padre
    if (onElementSelected) {
      onElementSelected(element);
    }
  } catch (error) {
    console.error("Error al seleccionar elemento:", error);
  } finally {
    setIsLoading(false);
  }
};
  
  // Función para hacer zoom a un elemento sin cambiar aislamiento
  const enhancedZoomToElement = async (element: InventoryElement, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Evitar que se propague al clic del elemento
    }
    
    if (!fragments || !world || !models.length) return;
    
    setIsLoading(true);
    
    try {
      // Usar la función zoomToElement de nuestras utilidades
      await zoomToElement(
        element.model,
        element.localId,
        world,
        fragments,
        {
          zoomFactor: 3, // Zoom más cercano
          showBoundingBox: true,
          boundingBoxDuration: 3000,
          highlightElement: true,
          makeOthersTransparent: false // No cambiar el aislamiento actual
        }
      );
      
      // Actualizar el elemento seleccionado
      setSelectedElement(element);
      
      // Notificar al componente padre si es necesario
      if (onElementSelected) {
        onElementSelected(element);
      }
    } catch (error) {
      console.error("Error al hacer zoom al elemento:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para hacer zoom a una categoría completa
  const handleZoomToCategory = async (categoryId: string) => {
    if (!fragments || !world || !models.length) return;
    
    setIsLoading(true);
    
    try {
      // Para cada modelo que tenga elementos de esta categoría
      const catInfo = categoriesRef.current[categoryId];
      if (!catInfo) return;
      
      for (const modelId in catInfo.localIdsByModel) {
        const model = models.find(m => m.id === modelId);
        if (!model) continue;
        
        // Usar la función zoomToCategory de nuestras utilidades
        await zoomToCategory(
          model,
          categoryId,
          world,
          fragments,
          {
            zoomFactor: 1.2, // Menos zoom para ver todos los elementos
            showBoundingBox: true,
            boundingBoxDuration: 3000,
            highlightElements: true
          }
        );
        
        // Solo procesamos el primer modelo para evitar múltiples zooms
        break;
      }
    } catch (error) {
      console.error("Error al hacer zoom a la categoría:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para mostrar información detallada del elemento
  const showElementInfo = async (element: InventoryElement, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      // Actualizar elemento seleccionado
      setSelectedElement(element);
      
      // Obtener información detallada si no la tenemos
      if (!element.properties || !element.dimensions) {
        const elementData = await getElementInfo(element.model, element.localId);
        
        // Actualizar el elemento con la información adicional
        if (elementData.properties) {
          element.properties = elementData.properties;
        }
        
        if (elementData.boundingBox) {
          const size = new THREE.Vector3();
          elementData.boundingBox.getSize(size);
          
          element.dimensions = {
            width: size.x,
            height: size.y,
            depth: size.z,
            volume: size.x * size.y * size.z
          };
          
          // Actualizar posición si no la teníamos
          if (elementData.position) {
            element.position = elementData.position;
          }
        }
      }
      
      // Notificar al componente padre
      if (onShowElementInfo) {
        onShowElementInfo(element);
      }
    } catch (error) {
      console.error("Error al mostrar información del elemento:", error);
    }
  };
  
  // Obtener elementos filtrados para la categoría seleccionada
  const getFilteredElements = (): InventoryElement[] => {
    if (!selectedCategory) return [];
    
    const catInfo = categoriesRef.current[selectedCategory];
    if (!catInfo) return [];
    
    // Si no hay término de búsqueda y no hay subcategoría seleccionada, devolver todos los elementos cargados
    if (!searchTerm && !selectedSubCategory) {
      return catInfo.elements;
    }
    
    // Filtrar por subcategoría primero si está seleccionada
    let filtered = catInfo.elements;
    if (selectedSubCategory) {
      filtered = filtered.filter(element => element.subCategory === selectedSubCategory);
    }
    
    // Luego por término de búsqueda si existe
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(element => {
        const nameMatch = element.name && element.name.toLowerCase().includes(term);
        const typeMatch = element.type && element.type.toLowerCase().includes(term);
        const idMatch = String(element.localId).includes(term);
        return nameMatch || typeMatch || idMatch;
      });
    }
    
    // Para IFCFLOWTERMINAL, asegurar que los elementos con LUM siempre aparezcan primero
    if (selectedCategory === "IFCFLOWTERMINAL") {
      filtered.sort((a, b) => {
        const aHasLum = (a.name?.toUpperCase() || '').includes('LUM');
        const bHasLum = (b.name?.toUpperCase() || '').includes('LUM');
        
        // Prioridad: elementos con LUM primero
        if (aHasLum && !bHasLum) return -1;
        if (!aHasLum && bHasLum) return 1;
        
        // Si ambos tienen o no tienen LUM, ordenar alfabéticamente
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    // Para IFCDISTRIBUTIONCONTROLELEMENT, asegurar que los elementos con STH siempre aparezcan primero
    if (selectedCategory === "IFCDISTRIBUTIONCONTROLELEMENT") {
      filtered.sort((a, b) => {
        const aHasSth = (a.name?.toUpperCase() || '').includes('STH');
        const bHasSth = (b.name?.toUpperCase() || '').includes('STH');
        
        // Prioridad: elementos con STH primero
        if (aHasSth && !bHasSth) return -1;
        if (!aHasSth && bHasSth) return 1;
        
        // Si ambos tienen o no tienen STH, ordenar alfabéticamente
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    return filtered;
  };
  
  // Actualizar elementos filtrados sin crear bucle infinito
  const updateFilteredElements = useCallback(() => {
    filteredElementsRef.current = getFilteredElements();
    setElementUpdateCounter(prev => prev + 1);
  }, [selectedCategory, selectedSubCategory, searchTerm]);
  
  // Actualizar elementos filtrados cuando cambia la selección o búsqueda
  useEffect(() => {
    updateFilteredElements();
  }, [selectedCategory, selectedSubCategory, searchTerm, updateFilteredElements]);
  
  // Alternar expansión de categoría
  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };
  
  // Alternar expansión de subcategoría
  const toggleSubCategoryExpansion = (categoryId: string, subCategoryId: string) => {
    const key = `${categoryId}-${subCategoryId}`;
    setExpandedSubCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };
  
  // Renderizar elemento de la lista virtualizada con botones de acción
  const renderRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const element = filteredElementsRef.current[index];
    
    if (!element) {
      // Placeholder para elementos que aún no han cargado
      return (
        <div className="inventory-element loading" style={style}>
          <div className="element-loading-placeholder">
            <div className="loading-line"></div>
            <div className="loading-line"></div>
          </div>
        </div>
      );
    }
    
    const isSelected = selectedElement && 
                       selectedElement.localId === element.localId && 
                       selectedElement.modelId === element.modelId;
    
    return (
      <div 
        className={`inventory-element ${isSelected ? 'selected' : ''} ${selectionLocked ? 'selection-locked' : ''}`}
        onClick={() => {
          // Marcar que la selección viene del panel de inventario
          setIsSelectionFromInventory(true);
          selectElement(element);
          // Restaurar después de un breve tiempo
          setTimeout(() => setIsSelectionFromInventory(false), 100);
        }}
        style={style}
      >
        <div className="element-info">
          <span className="element-name">
            {element.name || `Elemento ${index + 1}`}
          </span>
          {element.type && (
            <span className="element-type">{element.type}</span>
          )}
          <span className="element-id">ID: {element.localId}</span>
          
          {/* Mostrar dimensiones si están disponibles */}
          {element.dimensions && (
            <span className="element-dimensions">
              {element.dimensions.width.toFixed(2)} x {element.dimensions.height.toFixed(2)} x {element.dimensions.depth.toFixed(2)} m
            </span>
          )}
        </div>
        
        {/* Botones de acción */}
        <div className="element-actions">
          <button 
            className="element-action-button info-button"
            onClick={(e) => showElementInfo(element, e)}
            title="Ver información"
          >
            <Eye size={14} />
            <span>Ver info</span>
          </button>
          <button 
            className="element-action-button zoom-button"
            onClick={(e) => enhancedZoomToElement(element, e)}
            title="Acercar vista"
          >
            <ZoomIn size={14} />
            <span>Acercar</span>
          </button>
        </div>
        
        {/* Indicador de elemento bloqueado */}
        {isSelected && selectionLocked && (
          <div className="element-locked-indicator">
            <span>Selección bloqueada</span>
          </div>
        )}
      </div>
    );
  };
  
  // Renderizar panel
  return (
    <div className="inventory-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Focus size={18} />
          <h3>Inventario de Equipos</h3>
        </div>
        {onClose && (
          <button 
            className="panel-close-button"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      <div className="panel-content">
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Procesando...</span>
          </div>
        )}
        
        {/* Buscador */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar elementos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Controles de aislamiento */}
        <div className="isolation-controls">
          <button 
            className={`isolation-button ${isolationActive ? 'active' : ''}`}
            onClick={isolationActive ? deactivateIsolationMode : activateIsolationMode}
            disabled={isLoading}
          >
            {isolationActive ? (
              <>
                <X size={14} />
                <span>Restaurar Vista</span>
              </>
            ) : (
              <>
                <Focus size={14} />
                <span>Modo Aislamiento</span>
              </>
            )}
          </button>
          
          {/* Botón para volver a la vista completa */}
          <button 
            className="reset-view-button"
            onClick={() => {
              if (world && world.camera && world.camera.controls) {
                world.camera.controls.reset();
              }
            }}
            title="Vista completa"
          >
            <Home size={14} />
          </button>

          {/* Indicador y control de bloqueo */}
          {selectionLocked && (
            <div className="lock-indicator">
              <button 
                className="unlock-selection-button"
                onClick={() => {
                  setSelectionLocked(false);
                  // Notificar al componente padre
                  if (onResetIsolation) {
                    onResetIsolation();
                  }
                }}
                title="Desbloquear selección"
              >
                <Unlock size={14} />
                <span>Desbloquear</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Estado actual */}
        <div className="panel-status">
          <span className="status-info">
            {selectedElement ? (
                    <>
                    <span>{`Elemento: ${selectedElement.name}`}</span>
                    <button 
                      className="unlock-selection-button"
                      onClick={() => setSelectionLocked(false)}
                      title="Desbloquear selección"
                    >
                      <Unlock size={14} />
                    </button>
                  </>
                ) : selectedSubCategory ? (
            
              `Subcategoría: ${INVENTORY_CATEGORIES.find(c => c.id === selectedCategory)?.subCategories.find(s => s.id === selectedSubCategory)?.name}`
            ) : selectedCategory ? (
              `Categoría: ${INVENTORY_CATEGORIES.find(c => c.id === selectedCategory)?.displayName}`
            ) : isolationActive ? (
              "Modo aislamiento activo"
            ) : (
              "Seleccione una categoría"
            )}
          </span>
        </div>
        
        {/* Árbol de categorías */}
        <div className="categories-container">
          {INVENTORY_CATEGORIES.map(category => {
            const isExpanded = expandedCategories.has(category.id);
            const catInfo = categoriesRef.current[category.id] || { totalCount: 0, elements: [] };
            const isActive = selectedCategory === category.id;
            
            return (
              <div key={category.id} className="category-group">
                {/* Cabecera de categoría */}
                <div 
                  className={`category-header ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    toggleCategoryExpansion(category.id);
                    isolateCategory(category.id);
                  }}
                >
                  <div className="category-expand-icon">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div className="category-icon" style={{ color: `#${category.color.getHexString()}` }}>
                    {category.icon}
                  </div>
                  <span className="category-name-inventory">{category.displayName}</span>
                  <span className="category-count">{catInfo.totalCount}</span>
                  
                  {/* Botón de zoom a la categoría completa */}
                  <button 
                    className="category-zoom-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomToCategory(category.id);
                    }}
                    title="Zoom a categoría"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
                
                {/* Subcategorías */}
                {isExpanded && (
                  <div className="subcategories-container">
                    {category.subCategories.map(subCategory => {
                      const subCategoryKey = `${category.id}-${subCategory.id}`;
                      const isSubExpanded = expandedSubCategories.has(subCategoryKey);
                      const isSubActive = selectedCategory === category.id && selectedSubCategory === subCategory.id;
                      
                      // Filtrar elementos de esta subcategoría (para conteo)
                      const subCatElements = catInfo.elements.filter(e => e.subCategory === subCategory.id);
                      const subCatCount = subCatElements.length;
                      
                      return (
                        <div key={subCategory.id} className="subcategory-group">
                          {/* Cabecera de subcategoría */}
                          <div 
                            className={`subcategory-header ${isSubActive ? 'active' : ''}`}
                            onClick={() => {
                              toggleSubCategoryExpansion(category.id, subCategory.id);
                              isolateSubCategory(category.id, subCategory.id);
                            }}
                          >
                            <div className="subcategory-expand-icon">
                              {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                            <span className="subcategory-name">{subCategory.name}</span>
                            <span className="subcategory-count">{subCatCount}</span>
                          </div>
                          
                          {/* Lista de elementos (virtualizada) */}
                          {isSubExpanded && selectedCategory === category.id && selectedSubCategory === subCategory.id && (
                            <div className="elements-container">
                              {filteredElementsRef.current.length === 0 ? (
                                <div className="no-elements">
                                  {(catInfo.elements.length === 0 && !isLoading) ? (
                                    "No hay elementos disponibles en esta categoría."
                                  ) : (searchTerm && !isLoading) ? (
                                    "No se encontraron elementos con ese término de búsqueda."
                                  ) : (
                                    "Cargando elementos..."
                                  )}
                                </div>
                              ) : (
                                <div className="virtual-list-container" style={{ height: 400, width: '100%' }}>
                                  <AutoSizer>
                                    {({ height, width }) => (
                                      <VirtualList
                                        ref={virtualListRef}
                                        height={height}
                                        width={width}
                                        itemCount={filteredElementsRef.current.length}
                                        itemSize={70}
                                        onScroll={handleScroll}
                                        overscanCount={5}
                                      >
                                        {renderRow}
                                      </VirtualList>
                                    )}
                                  </AutoSizer>
                                  
                                  {isLoadingMore && (
                                    <div className="loading-more">
                                      <div className="spinner-small"></div>
                                      <span>Cargando más elementos...</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InventoryPanel;