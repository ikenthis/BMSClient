//ElementIsolationManager.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { X, Focus, Search, List, MousePointer } from 'lucide-react';
import { FixedSizeList as VirtualList } from 'react-window';
import { AutoSizer } from 'react-virtualized';
import { ExtendedFragmentsModel} from '../types'
import '../styles/elementisolationmanager.css';

interface ElementIsolationManagerProps {
  models: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsModels | null;
  world?: OBC.World | null;
  onCategoryIsolated?: (category: string | null) => void;
  nonIsolatedOpacity?: number; // Opacidad para elementos no aislados (0.0 - 1.0)
  onClose?: () => void;
}

// Conversión de nombres técnicos a nombres legibles
const CATEGORY_DISPLAY_NAMES: { [key: string]: string } = {
  "IFCWALL": "Muros",
  "IFCSLAB": "Suelos/Losas",
  "IFCBEAM": "Vigas",
  "IFCCOLUMN": "Columnas/Pilares",
  "IFCDOOR": "Puertas",
  "IFCWINDOW": "Ventanas",
  "IFCROOF": "Techos",
  "IFCSTAIR": "Escaleras",
  "IFCRAILING": "Barandillas",
  "IFCFURNISHINGELEMENT": "Mobiliario",
  "IFCCURTAINWALL": "Muros Cortina",
  "IFCPLATE": "Placas",
  "IFCMEMBER": "Elementos Estructurales",
  "IFCBUILDINGELEMENTPROXY": "Elementos Genéricos",
  "IFCFLOWFITTING": "Conexiones MEP",
  "IFCFLOWSEGMENT": "Conductos/Tuberías",
  "IFCFLOWTERMINAL": "Terminales MEP",
  "IFCBUILDING": "Edificio",
  "IFCSPACE": "Espacios",
  "IFCSITE": "Terreno",
  "IFCPROJECT": "Proyecto",
  "IFCBUILDINGSTOREY": "Plantas",
  "IFCFOOTING": "Cimentaciones",
  "IFCPILE": "Pilotes",
  "IFCCOVERING": "Revestimientos",
  "IFCSensor": "Sensores"
};

// Interfaz para los elementos aislados
interface IsolatedElement {
  modelId: string;
  localId: number;
  name?: string;
  type?: string;
}

// Interfaz para información de categoría
interface CategoryInfo {
  category: string;
  elements: IsolatedElement[];
  totalCount: number;
  loaded: boolean;
  localIdsByModel: Record<string, number[]>;
}

const ElementIsolationManager: React.FC<ElementIsolationManagerProps> = ({ 
  models = [],
  fragments = null,
  world = null,
  onCategoryIsolated,
  nonIsolatedOpacity = 0.1, // Valor predeterminado para elementos no aislados (10% opacidad)
  onClose 
}) => {
  const [modelCategories, setModelCategories] = useState<string[]>([]);
  const [isolatedCategory, setIsolatedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [elementSearchTerm, setElementSearchTerm] = useState('');
  
  // Estado para mantener registro de los elementos resaltados
  const [highlightedElements, setHighlightedElements] = useState<Record<string, number[]>>({});
  
  // Referencia a categorías y sus elementos - optimizado para virtualización
  const categoriesRef = useRef<Record<string, CategoryInfo>>({});
  
  // Estado para el elemento enfocado actualmente
  const [focusedElement, setFocusedElement] = useState<IsolatedElement | null>(null);
  
  // Estado para mostrar/ocultar la lista de elementos
  const [showElementsList, setShowElementsList] = useState(true);
  
  // Gestión de paginación para carga progresiva
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreElements, setHasMoreElements] = useState(true);
  const PAGE_SIZE = 100; // Número de elementos a cargar por página
  
  // Conteo total de elementos para la categoría aislada
  const [totalElementCount, setTotalElementCount] = useState(0);
  
  // Estado para indicar si se están cargando más elementos
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Lista ref para virtualización
  const listRef = useRef<any>(null);
  
  // Referencia para guardar los filteredElements calculados
  const filteredElementsRef = useRef<IsolatedElement[]>([]);
  
  // Estado para forzar actualizaciones cuando cambian elementos virtualizados
  const [elementUpdateCounter, setElementUpdateCounter] = useState(0);

  // Obtener todas las categorías existentes en los modelos cargados
  const loadModelCategories = useCallback(async () => {
    if (!models || !Array.isArray(models) || models.length === 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const allCategories = new Set<string>();
      
      // Recopilar categorías de todos los modelos
      for (const model of models) {
        if (!model) continue;
        
        try {
          const categories = await model.getCategories();
          if (Array.isArray(categories)) {
            categories.forEach(category => {
              if (category) allCategories.add(category);
            });
          }
        } catch (error) {
          console.warn(`Error al obtener categorías del modelo ${model.id || 'desconocido'}:`, error);
        }
      }
      
      // Ordenar alfabéticamente
      const sortedCategories = Array.from(allCategories).sort();
      setModelCategories(sortedCategories);
      
      // Inicializar referencia de categorías
      const categoriesInfo: Record<string, CategoryInfo> = {};
      sortedCategories.forEach(category => {
        categoriesInfo[category] = {
          category,
          elements: [],
          totalCount: 0,
          loaded: false,
          localIdsByModel: {}
        };
      });
      categoriesRef.current = categoriesInfo;
      
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    } finally {
      setIsLoading(false);
    }
  }, [models]);

  // Cargar categorías cuando cambian los modelos
  useEffect(() => {
    if (models && Array.isArray(models) && models.length > 0) {
      loadModelCategories();
    } else {
      setModelCategories([]);
      categoriesRef.current = {};
    }
  }, [models, loadModelCategories]);

  // Función para centrar la escena en general
  const centerScene = () => {
    if (!world) return;

    try {
      // Usar la función de centrado genérica del mundo
      if (typeof world.fitToContent === 'function') {
        world.fitToContent();
      } else if (world.camera && world.camera.controls) {
        // Alternativa manual
        world.camera.controls.reset();
      }
    } catch (error) {
      console.error("Error al centrar escena:", error);
    }
  };
  
  // Función para calcular total de elementos por categoría (sin cargarlos todos)
  const countCategoryElements = async (category: string): Promise<{
    totalCount: number, 
    idsByModel: Record<string, number[]>
  }> => {
    let count = 0;
    const idsByModel: Record<string, number[]> = {};
    
    for (const model of models) {
      if (!model || !model.id) continue;
      
      try {
        // Obtener elementos de esta categoría
        const items = await model.getItemsOfCategory(category);
        const localIds = (await Promise.all(
          items.map(item => item.getLocalId())
        )).filter(id => id !== null) as number[];
        
        if (localIds.length > 0) {
          count += localIds.length;
          idsByModel[model.id] = localIds;
        }
      } catch (error) {
        console.warn(`Error al contar elementos de categoría ${category} del modelo ${model.id}:`, error);
      }
    }
    
    return { totalCount: count, idsByModel };
  };
  
  // Función para cargar elementos de forma paginada
  const loadElementsPage = async (
    category: string, 
    page: number = 1, 
    pageSize: number = PAGE_SIZE
  ): Promise<IsolatedElement[]> => {
    if (!models || !models.length) return [];
    
    const elements: IsolatedElement[] = [];
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
        catInfo = {
          category,
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
              attributes: ["Name", "ObjectType"]
            });
            
            // Crear registros para cada elemento con la información disponible
            elementsToLoad.forEach((localId, index) => {
              const itemData = itemsData[index];
              const element: IsolatedElement = {
                modelId,
                localId
              };
              
              // Añadir nombre si está disponible
              if (itemData && itemData.Name && typeof itemData.Name === 'object' && 'value' in itemData.Name) {
                element.name = String(itemData.Name.value);
              }
              
              // Añadir tipo si está disponible
              if (itemData && itemData.ObjectType && typeof itemData.ObjectType === 'object' && 'value' in itemData.ObjectType) {
                element.type = String(itemData.ObjectType.value);
              }
              
              elements.push(element);
            });
          } catch (error) {
            // Si no podemos obtener información detallada, al menos incluimos los IDs
            elementsToLoad.forEach(localId => {
              elements.push({
                modelId,
                localId
              });
            });
          }
        }
        
        // Si ya hemos cargado suficientes elementos, salir del bucle
        if (elementsLoaded >= pageSize) break;
      }
      
      // Actualizar la información de categoría
      if (elements.length > 0) {
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
    if (!isolatedCategory || !hasMoreElements || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      await loadElementsPage(isolatedCategory, nextPage);
      
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
  
  // Efecto para detectar cuando se hace scroll cerca del final de la lista
  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: { 
    scrollOffset: number, 
    scrollUpdateWasRequested: boolean 
  }) => {
    if (!scrollUpdateWasRequested && hasMoreElements && !isLoadingMore) {
      // Calcular si estamos cerca del final (últimos 1000px)
      const container = listRef.current?._outerRef;
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
  
  // Función para enfocar un elemento específico
  const focusElement = async (element: IsolatedElement) => {
    if (!fragments || !world) return;
    
    try {
      setFocusedElement(element);
      
      // Buscar el modelo correspondiente
      const model = models.find(m => m.id === element.modelId);
      if (!model) return;
      
      // Intentar resaltar este elemento con un color diferente (si podemos)
      const focusMaterial = {
        color: new THREE.Color(1, 0.8, 0), // Color dorado
        opacity: 1.0,
        renderedFaces: FRAGS.RenderedFaces.TWO,
        transparent: false
      };
      
      try {
        // Resaltar el elemento seleccionado
        await model.highlight([element.localId], focusMaterial);
      } catch (error) {
        console.warn("No se pudo resaltar el elemento específico:", error);
      }
      
      // Aquí haremos un enfoque aproximado en el elemento
      // Como no tenemos acceso a getItemBoundingBox, usaremos los controles de cámara
      // para acercarnos a la posición aproximada del elemento
      
      // Si el mundo tiene una función fitToObject o similar, la usamos
      if (typeof world.fitToObject === 'function' && model.object) {
        world.fitToObject(model.object);
      } else if (world.camera && world.camera.controls) {
        // Si no, hacemos un enfoque general y un poco de zoom
        world.camera.controls.reset();
        if (world.camera.controls.zoom) {
          // Acercar un poco la cámara
          world.camera.controls.zoom(1.5);
        }
      }
      
      // Actualizar la vista
      await fragments.update(true);
    } catch (error) {
      console.error("Error al enfocar elemento:", error);
    }
  };

  // Función para aislar una categoría usando highlight
  const isolateCategory = async (category: string | null) => {
    if (!fragments || !models.length) return;
    
    setIsLoading(true);
    setFocusedElement(null);
    
    try {
      // Si pedimos eliminar el aislamiento (category es null)
      if (category === null) {
        // Quitar todos los highlights en todos los modelos
        for (const modelId in highlightedElements) {
          const model = models.find(m => m.id === modelId);
          if (model && highlightedElements[modelId].length) {
            try {
              await model.resetHighlight(highlightedElements[modelId]);
            } catch (error) {
              console.warn(`Error al eliminar resaltado de modelo ${modelId}:`, error);
            }
          }
        }
        
        // Limpiar registro de elementos resaltados
        setHighlightedElements({});
        
        // Actualizar estado
        setIsolatedCategory(null);
        setCurrentPage(1);
        setTotalElementCount(0);
        setHasMoreElements(false);
        
        // Notificar al componente padre
        if (onCategoryIsolated) {
          onCategoryIsolated(null);
        }
        
        // Centrar la vista en la escena completa
        centerScene();
      } else {
        // Estamos aislando una nueva categoría
        
        // Material para los elementos de la categoría aislada
        const isolatedMaterial = {
          color: new THREE.Color("blue"), // Azul
          opacity: 1.0, // 100% opaco
          renderedFaces: FRAGS.RenderedFaces.TWO,
          transparent: false
        };
        
        // Material para los elementos no aislados (semi-transparentes)
        const nonIsolatedMaterial = {
          color: new THREE.Color(0.5, 0.5, 0.5), // Gris
          opacity: nonIsolatedOpacity, // Configurable, por defecto 10%
          renderedFaces: FRAGS.RenderedFaces.TWO,
          transparent: true
        };
        
        // Primero, limpiar cualquier resaltado anterior
        for (const modelId in highlightedElements) {
          const model = models.find(m => m.id === modelId);
          if (model && highlightedElements[modelId].length) {
            try {
              await model.resetHighlight(highlightedElements[modelId]);
            } catch (error) {
              console.warn(`Error al limpiar resaltado anterior en modelo ${modelId}:`, error);
            }
          }
        }
        
        // Nuevo registro de elementos resaltados
        const newHighlightedElements: Record<string, number[]> = {};
        
        // Contar elementos y obtener IDs para la categoría seleccionada
        const { totalCount, idsByModel } = await countCategoryElements(category);
        
        // Guardar esta información en la referencia de categoría
        if (!categoriesRef.current[category]) {
          categoriesRef.current[category] = {
            category,
            elements: [],
            totalCount,
            loaded: false,
            localIdsByModel: idsByModel
          };
        } else {
          categoriesRef.current[category].totalCount = totalCount;
          categoriesRef.current[category].localIdsByModel = idsByModel;
        }
        
        // Actualizar estado global
        setTotalElementCount(totalCount);
        setHasMoreElements(true);
        setCurrentPage(1);
        
        // Aplicar a todos los modelos
        for (const model of models) {
          try {
            // Para cada categoría en el modelo
            const allHighlightedIds: number[] = [];
            
            for (const cat of modelCategories) {
              // Obtener elementos de esta categoría
              const items = await model.getItemsOfCategory(cat);
              const localIds = (await Promise.all(
                items.map(item => item.getLocalId())
              )).filter(id => id !== null) as number[];
              
              if (localIds.length > 0) {
                // Aplicar el material adecuado según si es la categoría aislada o no
                if (cat === category) {
                  // Esta es la categoría a aislar - resaltar como opaca
                  await model.highlight(localIds, isolatedMaterial);
                } else {
                  // Esta es otra categoría - resaltar como semi-transparente
                  await model.highlight(localIds, nonIsolatedMaterial);
                }
                
                // Registrar estos IDs como resaltados
                allHighlightedIds.push(...localIds);
              }
            }
            
            // Guardar en el registro global
            if (allHighlightedIds.length && model.id) {
              newHighlightedElements[model.id] = allHighlightedIds;
            }
          } catch (error) {
            console.warn(`Error al procesar aislamiento en modelo ${model.id}:`, error);
          }
        }
        
        // Actualizar registro de elementos resaltados
        setHighlightedElements(newHighlightedElements);
        
        // Actualizar estado
        setIsolatedCategory(category);
        
        // Cargar primera página de elementos
        await loadElementsPage(category, 1);
        
        // Forzar actualización
        setElementUpdateCounter(prev => prev + 1);
        
        // Centrar la vista (de manera genérica)
        centerScene();
        
        // Notificar al componente padre
        if (onCategoryIsolated) {
          onCategoryIsolated(category);
        }
      }
      
      // Actualizar la vista
      if (fragments) {
        await fragments.update(true);
      }
    } catch (error) {
      console.error(`Error al aislar categoría ${category}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener el nombre legible de una categoría
  const getCategoryDisplayName = (category: string): string => {
    return CATEGORY_DISPLAY_NAMES[category] || category;
  };

  // Filtrar categorías por término de búsqueda
  const filteredCategories = searchTerm
    ? modelCategories.filter(category => 
        category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryDisplayName(category).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : modelCategories;
    
  // Obtener los elementos filtrados para la categoría actual
  const getFilteredElements = (): IsolatedElement[] => {
    if (!isolatedCategory) return [];
    
    const catInfo = categoriesRef.current[isolatedCategory];
    if (!catInfo) return [];
    
    // Si no hay término de búsqueda, devolver todos los elementos cargados
    if (!elementSearchTerm) {
      return catInfo.elements;
    }
    
    // Filtrar por término de búsqueda
    return catInfo.elements.filter(element => {
      // Incluir si el nombre o el ID contiene el término de búsqueda
      const nameMatch = element.name && element.name.toLowerCase().includes(elementSearchTerm.toLowerCase());
      const typeMatch = element.type && element.type.toLowerCase().includes(elementSearchTerm.toLowerCase());
      const idMatch = String(element.localId).includes(elementSearchTerm);
      return nameMatch || typeMatch || idMatch;
    });
  };

  // Actualizar elementos filtrados cuando se actualiza el componente
  useEffect(() => {
    if (isolatedCategory) {
      filteredElementsRef.current = getFilteredElements();
    } else {
      filteredElementsRef.current = [];
    }
  }, [elementSearchTerm, isolatedCategory, elementUpdateCounter]);
  
  // Renderizar elemento de la lista virtualizada
  const renderRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const element = filteredElementsRef.current[index];
    
    if (!element) {
      // Renderizar un placeholder para elementos que aún no han cargado
      return (
        <div className="isolated-element loading" style={style}>
          <div className="element-loading-placeholder">
            <div className="loading-line"></div>
            <div className="loading-line"></div>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`isolated-element ${focusedElement && focusedElement.localId === element.localId && focusedElement.modelId === element.modelId ? 'focused' : ''}`}
        onClick={() => focusElement(element)}
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
        </div>
        <MousePointer size={14} className="focus-icon" />
      </div>
    );
  };

  return (
    <div className="element-isolation-panel">
      <div className="isolation-panel-header">
        <div className="isolation-panel-title">
          <Focus size={18} />
          <h3>Aislamiento de Elementos por Categoría</h3>
        </div>
        {onClose && (
          <button 
            className="isolation-close-button"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      <div className="isolation-panel-content">
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Procesando...</span>
          </div>
        )}
        
        {!isolatedCategory ? (
          <>
            <div className="isolation-header">
              <p className="isolation-description">
                Selecciona una categoría para aislarla (elementos seleccionados opacos, resto transparentes).
              </p>
            </div>
            
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Buscar categorías..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="search-icon" />
            </div>
            
            <div className="isolation-options">
              {filteredCategories.map((category) => (
                <div 
                  key={category} 
                  className="isolation-option"
                  onClick={() => isolateCategory(category)}
                >
                  <div className="isolation-option-icon">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                      <line x1="2" y1="2" x2="22" y2="22">
                        </line>
                    </svg>
                  </div>
                  <div className="isolation-option-text">
                    <span className="category-name">{getCategoryDisplayName(category)}</span>
                    <span className="category-code">{category}</span>
                  </div>
                </div>
              ))}
              
              {filteredCategories.length === 0 && !isLoading && (
                <div className="no-categories">
                  {modelCategories.length === 0 
                    ? "No hay categorías disponibles. Cargue un modelo primero." 
                    : "No se encontraron categorías con ese término de búsqueda."}
                </div>
              )}
            </div>
          </>
        ) : (
          // Vista de categoría aislada con lista de elementos virtualizada
          <>
            <div className="isolation-active-header">
              <div className="isolation-active-category">
                <span className="isolation-category-name">
                  {getCategoryDisplayName(isolatedCategory)}
                </span>
                <span className="isolation-category-code">{isolatedCategory}</span>
              </div>
              
              <button 
                className="toggle-elements-list-button"
                onClick={() => setShowElementsList(!showElementsList)}
                title={showElementsList ? "Ocultar lista de elementos" : "Mostrar lista de elementos"}
              >
                <List size={16} />
                {showElementsList ? "Ocultar lista" : "Mostrar lista"}
              </button>
            </div>
            
            {showElementsList && (
              <>
                <div className="search-box">
                  <input 
                    type="text" 
                    placeholder="Buscar elementos..." 
                    value={elementSearchTerm}
                    onChange={(e) => setElementSearchTerm(e.target.value)}
                  />
                  <Search size={16} className="search-icon" />
                </div>
                
                <div className="elements-info">
                  <span className="elements-count">
                    {filteredElementsRef.current.length} / {totalElementCount} elementos
                  </span>
                  {isLoadingMore && (
                    <span className="loading-more-indicator">
                      <div className="spinner-small"></div>
                      Cargando más...
                    </span>
                  )}
                  {focusedElement && (
                    <span className="focused-element">
                      {focusedElement.name || `Elemento ${focusedElement.localId}`}
                    </span>
                  )}
                </div>
                
                <div className="isolated-elements-list-container">
                  {filteredElementsRef.current.length === 0 ? (
                    <div className="no-elements">
                      {totalElementCount === 0 
                        ? "No se encontraron elementos en esta categoría." 
                        : elementSearchTerm
                          ? "No se encontraron elementos con ese término de búsqueda."
                          : "Cargando elementos..."}
                    </div>
                  ) : (
                    // Implementación virtualizada de la lista de elementos
                    <div className="virtualized-list-container" style={{ height: "400px", width: "100%" }}>
                      <AutoSizer>
                        {({ height, width }) => (
                          <VirtualList
                            ref={listRef}
                            height={height}
                            width={width}
                            itemCount={filteredElementsRef.current.length}
                            itemSize={70} // Altura de cada elemento en píxeles
                            onScroll={handleScroll}
                            overscanCount={5} // Número de elementos a renderizar fuera de la vista
                          >
                            {renderRow}
                          </VirtualList>
                        )}
                      </AutoSizer>
                    </div>
                  )}
                </div>
              </>
            )}
            
            <div className="reset-isolation">
              <button 
                className="reset-button"
                onClick={() => isolateCategory(null)}
                disabled={isLoading}
              >
                Quitar Aislamiento
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ElementIsolationManager;