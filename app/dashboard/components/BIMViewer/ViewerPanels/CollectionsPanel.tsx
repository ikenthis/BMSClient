//CollectionsPanel.tsx - VERSIÓN OPTIMIZADA Y CORREGIDA

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { 
  X, Focus, Search, Building, Home,
  ChevronRight, ChevronDown, Eye, ZoomIn,
  Plus, Calendar, Minimize2
} from 'lucide-react';
import '../styles/collectionspanel.css';
import { 
  zoomToElement, 
  zoomToElements, 
  resetView
} from '../utils/ElementZoomUtils';
import { 
  SpaceElement, 
  CollectionsPanelProps, 
  SpaceProperties, 
  IFCSpaceData, 
  IFCPropertySet 
} from '../utils/typeDefs';
import CollectionForm from './CollectionForm';
import artCollectionService, { ArtCollectionItemFormData } from '../services/artCollectionService';
import collectionGeometryHandler from '../utils/CollectionGeometryHandlers';
import SpaceSchedule from './SpaceSchedule';
import { syncSpacesCache } from '../services/spaceCacheSync';
import { FixedSizeList as List, areEqual } from 'react-window';

// CONSTANTES DE OPTIMIZACIÓN
const BATCH_SIZE = 20;
const MAX_CONCURRENT_OPERATIONS = 10;
const PROCESSING_DELAY = 10;
const ITEM_HEIGHT = 80;

// SISTEMA DE CACHÉ GLOBAL PARA ESPACIOS
const spacesCache = new Map<string, {
  spaces: SpaceElement[];
  timestamp: number;
  modelIds: string[];
}>();

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos en milisegundos

// Función para generar clave de caché basada en los modelos
const generateCacheKey = (models: FRAGS.FragmentsModel[]): string => {
  return models.map(m => m.id).sort().join('|');
};

// Función para verificar si la caché es válida
const isCacheValid = (cacheEntry: any): boolean => {
  if (!cacheEntry) return false;
  const now = Date.now();
  return (now - cacheEntry.timestamp) < CACHE_DURATION;
};

// Función para limpiar caché expirada
const cleanExpiredCache = (): void => {
  const now = Date.now();
  for (const [key, entry] of spacesCache.entries()) {
    if ((now - entry.timestamp) >= CACHE_DURATION) {
      spacesCache.delete(key);
      console.log(`🗑️ Caché expirada eliminada para: ${key}`);
    }
  }
};

// Definición de materiales
const NON_HIGHLIGHTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.5, 0.5, 0.5),
  opacity: 0.05,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const HIGHLIGHTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0.2, 0.6, 1.0),
  opacity: 0.1,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

const SELECTED_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(1.0, 0.8, 0.0),
  opacity: 0.08,
  renderedFaces: FRAGS.RenderedFaces.TWO,
  transparent: true
};

// Hook personalizado para progreso de carga
const useSpaceLoadingProgress = () => {
  const [progress, setProgress] = useState({ 
    processed: 0, 
    total: 0, 
    percentage: 0,
    currentBatch: 0,
    totalBatches: 0
  });
  
  const updateProgress = useCallback((
    processed: number, 
    total: number, 
    currentBatch?: number, 
    totalBatches?: number
  ) => {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    setProgress({ processed, total, percentage, currentBatch, totalBatches });
  }, []);
  
  const resetProgress = useCallback(() => {
    setProgress({ processed: 0, total: 0, percentage: 0, currentBatch: 0, totalBatches: 0 });
  }, []);
  
  return { progress, updateProgress, resetProgress };
};

// Componente de barra de progreso
const LoadingProgressBar: React.FC<{ 
  progress: { processed: number; total: number; percentage: number; currentBatch?: number; totalBatches?: number };
  isVisible: boolean;
}> = ({ progress, isVisible }) => {
  if (!isVisible || progress.total === 0) return null;
  
  return (
    <div className="loading-progress">
      <div className="progress-info">
        <span>
          Procesando espacios: {progress.processed}/{progress.total}
          {progress.currentBatch && progress.totalBatches && (
            <span className="batch-info"> (Lote {progress.currentBatch}/{progress.totalBatches})</span>
          )}
        </span>
        <span className="percentage">{progress.percentage}%</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      <div className="progress-details">
        <span>⚡ Procesamiento optimizado en lotes</span>
      </div>
    </div>
  );
};

// Funciones de utilidad para extraer propiedades IFC
const extractPropertyValue = (data: any, propertyName: string): string => {
  if (!data) return '';
  
  // Caso 1: Propiedad directa en data
  if (data[propertyName] !== undefined) {
    const prop = data[propertyName];
    if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
      return prop.value;
    }
    if (typeof prop !== 'object' || prop === null) {
      return String(prop);
    }
  }
  
  // Caso 2: Dentro de properties
  if (data.properties && data.properties[propertyName] !== undefined) {
    const prop = data.properties[propertyName];
    if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
      return prop.value;
    }
    if (typeof prop !== 'object' || prop === null) {
      return String(prop);
    }
  }
  
  // Caso 3: Buscar en Psets
  if (data.psets) {
    const psetNames = ['Pset_SpaceCommon', 'Pset_Space', 'BaseQuantities'];
    for (const psetName of psetNames) {
      if (data.psets[psetName] && data.psets[psetName][propertyName] !== undefined) {
        const psetProp = data.psets[psetName][propertyName];
        if (typeof psetProp === 'object' && psetProp && psetProp.type === 'IFCLABEL' && psetProp.value !== undefined) {
          return psetProp.value;
        }
        if (typeof psetProp !== 'object' || psetProp === null) {
          return String(psetProp);
        }
      }
    }
  }
  
  return '';
};

const extractLongName = (data: any): string => {
  return extractPropertyValue(data, 'LongName');
};

const extractAllIFCLabelValues = (data: any): Record<string, string> => {
  const result: Record<string, string> = {};
  const seen = new Set();
  
  const extractFromObject = (obj: any, path: string) => {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        extractFromObject(item, `${path}[${index}]`);
      });
      return;
    }
    
    if (obj.type === 'IFCLABEL' && obj.value !== undefined) {
      result[path] = obj.value;
      return;
    }
    
    Object.entries(obj).forEach(([key, value]) => {
      const newPath = path ? `${path}.${key}` : key;
      if (value && typeof value === 'object') {
        extractFromObject(value, newPath);
      }
    });
  };
  
  extractFromObject(data, "");
  return result;
};

// Función optimizada para extraer propiedades en lotes
const extractSpacePropertiesBatch = async (
  model: FRAGS.FragmentsModel, 
  localIds: number[]
): Promise<(SpaceProperties | null)[]> => {
  if (!model || localIds.length === 0) {
    return [];
  }
  
  try {
    // Obtener todos los datos de una vez
    const itemsData = await model.getItemsData(localIds, {
      includeGeometry: false,
      includeMaterials: false,
      includeProperties: true
    });
    
    // Obtener todos los GUIDs de una vez
    const items = await model.getItemsOfCategory('IFCSPACE');
    const guidMap = new Map<number, string>();
    
    // Crear mapa de localId -> GUID en paralelo
    const guidPromises = items.map(async (item) => {
      try {
        const localId = await item.getLocalId();
        const guid = await item.getGuid();
        if (localId !== null && guid) {
          guidMap.set(localId, guid);
        }
      } catch (error) {
        // Silenciar errores individuales
      }
    });
    
    // Procesar en lotes para evitar sobrecarga
    for (let i = 0; i < guidPromises.length; i += MAX_CONCURRENT_OPERATIONS) {
      const batch = guidPromises.slice(i, i + MAX_CONCURRENT_OPERATIONS);
      await Promise.allSettled(batch);
    }
    
    // Procesar todos los datos
    return localIds.map((localId, index) => {
      try {
        const data = itemsData[index];
        if (!data) return null;
        
        const name = extractPropertyValue(data, 'Name') || `Espacio ${localId}`;
        const longName = extractLongName(data);
        const description = extractPropertyValue(data, 'Description');
        const objectType = extractPropertyValue(data, 'ObjectType');
        const globalId = guidMap.get(localId) || extractPropertyValue(data, 'GlobalId');
        
        // Filtro temprano: excluir áreas
        if (name && name.startsWith('Área:')) {
          return null;
        }
        
        const labelValues = extractAllIFCLabelValues(data);
        
        return {
          name,
          longName,
          description,
          objectType,
          globalId,
          psets: data.psets || {},
          labelValues,
          rawData: data
        } as SpaceProperties;
      } catch (error) {
        return null;
      }
    });
  } catch (error) {
    console.error(`Error al extraer propiedades del lote:`, error);
    return localIds.map(() => null);
  }
};

// Función principal optimizada para cargar espacios CON CACHÉ
const loadAllSpacesOptimized = async (
  models: FRAGS.FragmentsModel[],
  setIsLoading: (value: boolean) => void,
  setDebugMessage: (value: (prev: string) => string) => void,
  onProgress?: (processed: number, total: number, currentBatch?: number, totalBatches?: number) => void
): Promise<SpaceElement[]> => {
  if (!models.length) return [];
  
  // Generar clave de caché
  const cacheKey = generateCacheKey(models);
  
  // Limpiar caché expirada
  cleanExpiredCache();
  
  // Verificar si existe caché válida
  const cachedData = spacesCache.get(cacheKey);
  if (cachedData && isCacheValid(cachedData)) {
    setDebugMessage(() => "💾 Datos encontrados en caché - carga instantánea");
    setDebugMessage(prev => prev + `\n📊 Espacios cargados desde caché: ${cachedData.spaces.length}`);
    setDebugMessage(prev => prev + `\n⏰ Caché creada: ${new Date(cachedData.timestamp).toLocaleTimeString()}`);
    setDebugMessage(prev => prev + `\n✨ Carga completada instantáneamente desde caché`);
    
    // Simular progreso instantáneo para la UI
    if (onProgress) {
      onProgress(cachedData.spaces.length, cachedData.spaces.length, 1, 1);
    }
    
    return cachedData.spaces;
  }
  
  setIsLoading(true);
  setDebugMessage(() => "🚀 Iniciando carga optimizada de espacios (primera vez o caché expirada)...");
  
  const allSpaces: SpaceElement[] = [];
  let totalProcessed = 0;
  let totalSpaces = 0;
  
  try {
    // Contar total de espacios
    setDebugMessage(prev => prev + "\n📊 Contando espacios totales...");
    for (const model of models) {
      if (!model || !model.id) continue;
      
      try {
        const categories = await model.getCategories();
        if (categories.includes('IFCSPACE')) {
          const items = await model.getItemsOfCategory('IFCSPACE');
          totalSpaces += items.length;
        }
      } catch (error) {
        // Continuar con el siguiente modelo
      }
    }
    
    setDebugMessage(prev => prev + `\n📈 Total de espacios detectados: ${totalSpaces}`);
    
    if (onProgress) {
      onProgress(0, totalSpaces);
    }
    
    // Procesar cada modelo en lotes
    for (const model of models) {
      if (!model || !model.id) continue;
      
      try {
        setDebugMessage(prev => prev + `\n🔄 Analizando modelo ${model.id}...`);
        
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) {
          setDebugMessage(prev => prev + `\n⏭️ Modelo ${model.id} sin espacios - saltando`);
          continue;
        }
        
        const items = await model.getItemsOfCategory('IFCSPACE');
        const localIds = (await Promise.allSettled(
          items.map(item => item.getLocalId())
        ))
          .filter((result): result is PromiseFulfilledResult<number> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value);
        
        setDebugMessage(prev => prev + `\n📦 Encontrados ${localIds.length} espacios en modelo ${model.id}`);
        
        const totalBatches = Math.ceil(localIds.length / BATCH_SIZE);
        
        // Procesamiento en lotes
        for (let i = 0; i < localIds.length; i += BATCH_SIZE) {
          const batch = localIds.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          
          setDebugMessage(prev => prev + `\n⚡ Procesando lote ${batchNumber}/${totalBatches} (${batch.length} espacios)...`);
          
          try {
            const propertiesBatch = await extractSpacePropertiesBatch(model, batch);
            
            const validIndices: number[] = [];
            const validLocalIds: number[] = [];
            
            propertiesBatch.forEach((properties, index) => {
              if (properties) {
                validIndices.push(index);
                validLocalIds.push(batch[index]);
              }
            });
            
            let boxesBatch: THREE.Box3[] = [];
            if (validLocalIds.length > 0) {
              try {
                boxesBatch = await model.getBoxes(validLocalIds);
              } catch (error) {
                boxesBatch = [];
              }
            }
            
            // Crear elementos de espacio
            validIndices.forEach((originalIndex, validIndex) => {
              const properties = propertiesBatch[originalIndex];
              const localId = batch[originalIndex];
              
              if (!properties) return;
              
              let dimensions;
              let position;
              
              if (boxesBatch[validIndex]) {
                const box = boxesBatch[validIndex];
                const size = new THREE.Vector3();
                box.getSize(size);
                
                dimensions = {
                  width: size.x,
                  height: size.y,
                  depth: size.z,
                  area: size.x * size.z,
                  volume: size.x * size.y * size.z
                };
                
                properties.area = dimensions.area;
                properties.volume = dimensions.volume;
                
                const center = new THREE.Vector3();
                box.getCenter(center);
                position = center;
              }
              
              const spaceElement: SpaceElement = {
                modelId: model.id,
                model,
                localId,
                category: 'IFCSPACE',
                name: properties.name || `Espacio ${localId}`,
                longName: properties.longName || '',
                level: "Todos",
                properties,
                dimensions,
                position
              };
              
              allSpaces.push(spaceElement);
            });
            
            totalProcessed += batch.length;
            
            if (onProgress) {
              onProgress(totalProcessed, totalSpaces, batchNumber, totalBatches);
            }
            
            const percentage = Math.round((totalProcessed / totalSpaces) * 100);
            setDebugMessage(prev => prev + `\n✅ Lote ${batchNumber} completado. Progreso: ${totalProcessed}/${totalSpaces} (${percentage}%)`);
            
            await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
            
          } catch (error) {
            setDebugMessage(prev => prev + `\n❌ Error en lote ${batchNumber}: ${error instanceof Error ? error.message : String(error)}`);
            totalProcessed += batch.length;
            
            if (onProgress) {
              onProgress(totalProcessed, totalSpaces, batchNumber, totalBatches);
            }
          }
        }
        
      } catch (error) {
        setDebugMessage(prev => prev + `\n❌ Error en modelo ${model.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Ordenar espacios
    allSpaces.sort((a, b) => {
      if (a.name && b.name) {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
    
    // GUARDAR EN CACHÉ
    const cacheEntry = {
      spaces: allSpaces,
      timestamp: Date.now(),
      modelIds: models.map(m => m.id)
    };
    spacesCache.set(cacheKey, cacheEntry);
    
    setDebugMessage(prev => prev + `\n💾 Datos guardados en caché para futuras cargas`);
    setDebugMessage(prev => prev + `\n🎉 ¡Carga optimizada completada!`);
    setDebugMessage(prev => prev + `\n📊 Estadísticas finales:`);
    setDebugMessage(prev => prev + `\n  • Total espacios procesados: ${totalProcessed}`);
    setDebugMessage(prev => prev + `\n  • Espacios válidos (habitaciones): ${allSpaces.length}`);
    setDebugMessage(prev => prev + `\n  • Áreas filtradas: ${totalProcessed - allSpaces.length}`);
    setDebugMessage(prev => prev + `\n  • Próximas cargas serán instantáneas`);
    
  } catch (error) {
    setDebugMessage(prev => prev + `\n💥 Error crítico: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsLoading(false);
  }
  
  return allSpaces;
};

// Componentes virtualizados
const VirtualizedSearchSpaceItem = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    spaces: SpaceElement[];
    selectedSpace: SpaceElement | null;
    onSelectSpace: (space: SpaceElement) => void;
    onShowSpaceInfo: (space: SpaceElement, event?: React.MouseEvent) => void;
    collectionItems: ArtCollectionItemFormData[];
  };
}>(({ index, style, data }) => {
  const { spaces, selectedSpace, onSelectSpace, onShowSpaceInfo, collectionItems } = data;
  const space = spaces[index];
  
  if (!space) return null;
  
  const isSelected = selectedSpace && 
                   selectedSpace.localId === space.localId && 
                   selectedSpace.modelId === space.modelId;
  
  const hasCollections = collectionItems.some(item => 
    item.spaceGuid === space.properties?.globalId
  );
  
  return (
    <div style={style}>
      <div 
        className={`space-item ${isSelected ? 'selected' : ''} ${hasCollections ? 'has-collections' : ''}`}
        onClick={() => onSelectSpace(space)}
      >
        <div className="space-details">
          <span className="space-name">{space.name}</span>
          {space.longName && space.longName !== space.name && (
            <span className="space-longname">{space.longName}</span>
          )}
          {!space.longName && space.properties?.longName && space.properties.longName !== space.name && (
            <span className="space-longname">{space.properties.longName}</span>
          )}
          <span className="space-level">{space.level}</span>
          {space.dimensions && (
            <span className="space-area">
              {space.dimensions.area.toFixed(2)} m²
            </span>
          )}
          {hasCollections && (
            <span className="collection-indicator" title="Este espacio contiene elementos de colección">
              •
            </span>
          )}
        </div>
        
        <div className="space-item-actions">
          <button 
            className="space-item-action info-button"
            onClick={(e) => onShowSpaceInfo(space, e)}
            title="Ver información"
          >
            <Eye size={14} />
          </button>
          <button 
            className="space-item-action zoom-button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSpace(space);
            }}
            title="Acercar vista"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}, areEqual);

VirtualizedSearchSpaceItem.displayName = 'VirtualizedSearchSpaceItem';

const VirtualizedLevelSpaceItem = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    spaces: SpaceElement[];
    selectedSpace: SpaceElement | null;
    onSelectSpace: (space: SpaceElement) => void;
    onShowSpaceInfo: (space: SpaceElement, event?: React.MouseEvent) => void;
    collectionItems: ArtCollectionItemFormData[];
  };
}>(({ index, style, data }) => {
  const { spaces, selectedSpace, onSelectSpace, onShowSpaceInfo, collectionItems } = data;
  const space = spaces[index];
  
  if (!space) return null;
  
  const isSelected = selectedSpace && 
                   selectedSpace.localId === space.localId && 
                   selectedSpace.modelId === space.modelId;
  
  const hasCollections = collectionItems.some(item => 
    item.spaceGuid === space.properties?.globalId
  );
  
  return (
    <div style={style}>
      <div 
        className={`space-item ${isSelected ? 'selected' : ''} ${hasCollections ? 'has-collections' : ''}`}
        onClick={() => onSelectSpace(space)}
      >
        <div className="space-details">
          <span className="space-name">{space.name}</span>
          {space.longName && space.longName !== space.name && (
            <span className="space-longname">{space.longName}</span>
          )}
          {!space.longName && space.properties?.longName && space.properties.longName !== space.name && (
            <span className="space-longname">{space.properties.longName}</span>
          )}
          
          {space.dimensions && (
            <span className="space-area">
              {space.dimensions.area.toFixed(2)} m²
            </span>
          )}
          
          {hasCollections && (
            <span className="collection-indicator" title="Este espacio contiene elementos de colección">
              •
            </span>
          )}
        </div>
        
        <div className="space-item-actions">
          <button 
            className="space-item-action info-button"
            onClick={(e) => onShowSpaceInfo(space, e)}
            title="Ver información"
          >
            <Eye size={14} />
          </button>
          <button 
            className="space-item-action zoom-button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectSpace(space);
            }}
            title="Acercar vista"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}, areEqual);

VirtualizedLevelSpaceItem.displayName = 'VirtualizedLevelSpaceItem';

// Componente principal
const CollectionsPanel: React.FC<CollectionsPanelProps> = ({
  models = [],
  fragments = null,
  world = null,
  onElementSelected,
  onShowElementInfo,
  onClose
}) => {
  // Hook de progreso
  const { progress, updateProgress, resetProgress } = useSpaceLoadingProgress();
  
  // Estados para UI
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isolationActive, setIsolationActive] = useState<boolean>(false);
  
  // Estados para datos
  const [spaces, setSpaces] = useState<SpaceElement[]>([]);
  const [spacesByLevel, setSpacesByLevel] = useState<Record<string, SpaceElement[]>>({});
  const [levelsList, setLevelsList] = useState<string[]>([]);
  const [totalSpacesCount, setTotalSpacesCount] = useState(0);
  
  // Estados para selección
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<SpaceElement | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  
  // Estado para mostrar mensaje de depuración
  const [debugMessage, setDebugMessage] = useState("");
  
  // Estados para paneles
  const [showCollectionPanel, setShowCollectionPanel] = useState<boolean>(false);
  const [showReservationPanel, setShowReservationPanel] = useState<boolean>(false);
  
  // Estados para elementos de colección
  const [collectionItems, setCollectionItems] = useState<ArtCollectionItemFormData[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [spacesWithCollections, setSpacesWithCollections] = useState<Set<string>>(new Set());
  const [reservationResult, setReservationResult] = useState<any>(null);

  // Función para seleccionar y enfocar un espacio
  const selectSpace = useCallback(async (space: SpaceElement) => {
    if (!fragments || !world || !models.length) return;
    
    setIsLoading(true);
    
    try {
      setSelectedSpace(space);
      
      if (space.properties?.globalId && collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.showOnlySpaceGeometries(space.properties.globalId);
      }
      
      if (!isolationActive) {
        await activateIsolationMode();
      } else {
        for (const model of models) {
          try {
            const items = await model.getItemsOfCategory('IFCSPACE');
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.highlight(localIds, NON_HIGHLIGHTED_MATERIAL);
            }
          } catch (error) {
            // Silenciar error
          }
        }
      }
      
      if (selectedLevel && spacesByLevel[selectedLevel]) {
        const spacesInLevel = spacesByLevel[selectedLevel];
        const spacesByModel: Record<string, number[]> = {};
        
        spacesInLevel.forEach(s => {
          if (s.modelId === space.modelId && s.localId === space.localId) return;
          
          if (!spacesByModel[s.modelId]) {
            spacesByModel[s.modelId] = [];
          }
          
          spacesByModel[s.modelId].push(s.localId);
        });
        
        for (const modelId in spacesByModel) {
          const model = models.find(m => m.id === modelId);
          if (!model) continue;
          
          await model.highlight(spacesByModel[modelId], {
            ...HIGHLIGHTED_MATERIAL,
            opacity: 0.08
          });
        }
      }
      
      const model = models.find(m => m.id === space.modelId);
      if (!model) return;
      
      await model.setVisible([space.localId], false);
      
      await zoomToElement(
        model,
        space.localId,
        world,
        fragments,
        {
          zoomFactor: 2.0,
          showBoundingBox: true,
          boundingBoxDuration: 300000,
          boundingBoxColor: 0xffd700,
          highlightElement: false,
          onlyShowBoundingBox: true
        }
      );
      
      await fragments.update(true);
      
      if (onElementSelected) {
        onElementSelected(space);
      }
    } catch (error) {
      // Silenciar error
    } finally {
      setIsLoading(false);
    }
  }, [fragments, world, models, isolationActive, selectedLevel, spacesByLevel, onElementSelected]);
  
  // Función para mostrar información detallada del espacio
  const showSpaceInfo = useCallback((space: SpaceElement, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    setSelectedSpace(space);
    setDetailsCollapsed(false);
    
    if (onShowElementInfo) {
      onShowElementInfo(space);
    }
  }, [onShowElementInfo]);
  
  // Espacios filtrados memoizados
  const filteredSpaces = useMemo(() => {
    if (!searchTerm) return spaces;
    
    const term = searchTerm.toLowerCase();
    return spaces.filter(space => {
      const nameMatch = space.name && space.name.toLowerCase().includes(term);
      const longNameMatch = space.longName && space.longName.toLowerCase().includes(term);
      const propertyLongNameMatch = space.properties?.longName && 
                                    space.properties.longName.toLowerCase().includes(term);
      const levelMatch = space.level && space.level.toLowerCase().includes(term);
      const idMatch = String(space.localId).includes(term);
      
      return nameMatch || longNameMatch || propertyLongNameMatch || levelMatch || idMatch;
    });
  }, [spaces, searchTerm]);

  // Datos memoizados para listas virtualizadas
  const searchListData = useMemo(() => ({
    spaces: filteredSpaces,
    selectedSpace,
    onSelectSpace: selectSpace,
    onShowSpaceInfo: showSpaceInfo,
    collectionItems
  }), [filteredSpaces, selectedSpace, selectSpace, showSpaceInfo, collectionItems]);

  const getLevelListData = useCallback((level: string) => ({
    spaces: spacesByLevel[level] || [],
    selectedSpace,
    onSelectSpace: selectSpace,
    onShowSpaceInfo: showSpaceInfo,
    collectionItems
  }), [spacesByLevel, selectedSpace, selectSpace, showSpaceInfo, collectionItems]);
  
  // Efecto optimizado para cargar espacios CON SISTEMA DE CACHÉ
  useEffect(() => {
    if (!models.length) return;
    
    const loadSpaces = async () => {
      resetProgress();
      
      // Verificar caché antes de procesar
      const cacheKey = generateCacheKey(models);
      const cachedData = spacesCache.get(cacheKey);
      
      if (cachedData && isCacheValid(cachedData)) {
        // Carga desde caché - instantánea
        console.log("💾 Cargando espacios desde caché");
        setSpaces(cachedData.spaces);
        setSpacesByLevel({ "Todos": cachedData.spaces });
        setLevelsList(["Todos"]);
        setTotalSpacesCount(cachedData.spaces.length);
        setExpandedLevels(new Set(["Todos"]));
        
        // Simular progreso completado para la UI
        updateProgress(cachedData.spaces.length, cachedData.spaces.length, 1, 1);
        
        // Actualizar servicios
        artCollectionService.setSpacesCache(cachedData.spaces);
        syncSpacesCache(cachedData.spaces);
        
        setDebugMessage(() => "💾 Espacios cargados instantáneamente desde caché");
        setDebugMessage(prev => prev + `\n📊 Total espacios: ${cachedData.spaces.length}`);
        setDebugMessage(prev => prev + `\n⏰ Caché creada: ${new Date(cachedData.timestamp).toLocaleTimeString()}`);
        
        return;
      }
      
      // Si no hay caché válida, cargar normalmente
      console.log("🚀 Primera carga - procesando espacios...");
      const allSpaces = await loadAllSpacesOptimized(
        models, 
        setIsLoading, 
        setDebugMessage,
        updateProgress
      );
    
      // Actualizar estados
      setSpaces(allSpaces);
      setSpacesByLevel({ "Todos": allSpaces });
      setLevelsList(["Todos"]);
      setTotalSpacesCount(allSpaces.length);
      setExpandedLevels(new Set(["Todos"]));
      
      // Actualizar servicios
      artCollectionService.setSpacesCache(allSpaces);
      syncSpacesCache(allSpaces);
    };
    
    loadSpaces();
  }, [models, resetProgress, updateProgress]);

  useEffect(() => {
    if (selectedSpace && selectedSpace.properties?.globalId) {
      loadCollectionItems(selectedSpace.properties.globalId);
    }
  }, [selectedSpace]);

  useEffect(() => {
    if (models.length > 0) {
      loadAllSpacesWithCollections();
    }
  }, [models]);

  useEffect(() => {
    if (world && fragments) {
      collectionGeometryHandler.initialize(world);
      console.log("Gestor de geometrías de colecciones inicializado");
    }
  }, [world, fragments]);

  // Función para cargar espacios con colecciones
  const loadAllSpacesWithCollections = async () => {
    try {
      const response = await artCollectionService.getAllItems();
      
      if (response.status === 'success' && response.data && response.data.items) {
        const spacesWithCollectionSet = new Set<string>();
        
        response.data.items.forEach(item => {
          if (item.spaceGuid) {
            spacesWithCollectionSet.add(item.spaceGuid);
          }
        });
        
        setSpacesWithCollections(spacesWithCollectionSet);
        setDebugMessage(prev => prev + `\nDetectados ${spacesWithCollectionSet.size} espacios con elementos de colección`);
      }
    } catch (error) {
      console.error('Error al cargar espacios con colecciones:', error);
      setDebugMessage(prev => prev + `\nError al cargar espacios con colecciones: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const hasCollectionItems = (spaceGuid: string | undefined): boolean => {
    if (!spaceGuid) return false;
    return spacesWithCollections.has(spaceGuid);
  };  

  // Función para cargar elementos de colección
  const loadCollectionItems = async (spaceGuid: string) => {
    if (!spaceGuid) return;
    
    setIsLoading(true);
    
    try {
      const response = await artCollectionService.getItemsBySpace(spaceGuid);
      
      if (response.status === 'success' && response.data && response.data.items) {
        const spaceLongName = selectedSpace?.properties?.longName || selectedSpace?.longName || '';
        
        const itemsWithLongName = response.data.items.map(item => ({
          ...item,
          spaceLongName: spaceLongName
        }));
        
        setCollectionItems(itemsWithLongName);
        
        if (collectionGeometryHandler.isInitialized()) {
          collectionGeometryHandler.hideAllGeometries();
          
          const validItemIds = response.data.items.map(item => item.itemId);
          
          collectionGeometryHandler.getAllGeometryIds().forEach(geometryId => {
            if (!validItemIds.includes(geometryId)) {
              collectionGeometryHandler.removeCollectionGeometry(geometryId);
              console.log(`Eliminada geometría huérfana: ${geometryId}`);
            }
          });
          
          itemsWithLongName.forEach(item => {
            if (item.position && item.spaceGuid === spaceGuid) {
              if (!collectionGeometryHandler.hasGeometry(item.itemId)) {
                collectionGeometryHandler.createCollectionGeometry({
                  id: item.itemId,
                  spaceGuid: item.spaceGuid,
                  position: item.position,
                  name: item.name,
                  type: item.type,
                  scale: item.scale
                });
              }
            }
          });
          
          collectionGeometryHandler.showOnlySpaceGeometries(spaceGuid);
        }
      }
    } catch (error) {
      console.error('Error al cargar elementos de colección:', error);
      setDebugMessage(prev => prev + `\nError al cargar elementos de colección: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para guardar elemento de colección
  const saveCollectionItem = async (formData: ArtCollectionItemFormData) => {
    setIsLoading(true);
    
    console.log('Datos a enviar:', formData);
    
    if (!formData.name || !formData.type || !formData.spaceGuid) {
      const missingFields = [];
      if (!formData.name) missingFields.push('nombre');
      if (!formData.type) missingFields.push('tipo');
      if (!formData.spaceGuid) missingFields.push('espacio (spaceGuid)');
      if (selectedSpace && selectedSpace.properties?.longName) {
        formData.spaceLongName = selectedSpace.properties.longName;
      }
      
      const errorMessage = `Faltan campos obligatorios: ${missingFields.join(', ')}`;
      setDebugMessage(prev => prev + `\nError de validación: ${errorMessage}`);
      
      setIsLoading(false);
      return {
        status: 'error',
        message: errorMessage
      };
    }
    
    try {
      const response = await artCollectionService.createItem(formData);
      
      if (response.status === 'success' && response.data && response.data.item) {
        setCollectionItems(prev => [...prev, response.data.item]);
        
        setDebugMessage(prev => prev + `\nElemento de colección guardado correctamente: ${response.data.item.name}`);
        
        setShowCollectionPanel(false);
        setSuccessMessage(`¡Colección "${formData.name}" añadida con éxito!`);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      }
      
      return response;
    } catch (error) {
      console.error('Error al guardar elemento de colección:', error);
      setDebugMessage(prev => prev + `\nError al guardar elemento de colección: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para zoom a nivel
  const zoomToLevel = async (level: string) => {
    if (!fragments || !world || !models.length || !spacesByLevel[level]) return;
    
    setIsLoading(true);
    
    try {
      if (!isolationActive) {
        await activateIsolationMode();
      }
      
      const spacesInLevel = spacesByLevel[level];
      const spacesByModel: Record<string, { model: FRAGS.FragmentsModel, localIds: number[] }> = {};
      
      spacesInLevel.forEach(space => {
        if (!spacesByModel[space.modelId]) {
          spacesByModel[space.modelId] = {
            model: space.model,
            localIds: []
          };
        }
        
        spacesByModel[space.modelId].localIds.push(space.localId);
      });
      
      for (const modelId in spacesByModel) {
        const { model, localIds } = spacesByModel[modelId];
        
        await model.highlight(localIds, HIGHLIGHTED_MATERIAL);
        
        await zoomToElements(
          model,
          localIds,
          world,
          fragments,
          {
            zoomFactor: 1.5,
            showBoundingBox: true,
            boundingBoxDuration: 3000,
            highlightElements: false
          }
        );
      }
      
      await fragments.update(true);
      setSelectedLevel(level);
      
    } catch (error) {
      // Silenciar error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para activar modo aislamiento
  const activateIsolationMode = async () => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      for (const model of models) {
        try {
          const categories = await model.getCategories();
          
          for (const category of categories) {
            if (category === 'IFCSPACE') continue;
            
            const items = await model.getItemsOfCategory(category);
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.highlight(localIds, {
                color: new THREE.Color(0.5, 0.5, 0.5),
                opacity: 0.02,
                renderedFaces: FRAGS.RenderedFaces.TWO,
                transparent: true
              });
            }
          }
        } catch (error) {
          // Silenciar error
        }
      }
      
      for (const model of models) {
        try {
          const items = await model.getItemsOfCategory('IFCSPACE');
          const localIds = (await Promise.all(
            items.map(item => item.getLocalId())
          )).filter(id => id !== null) as number[];
          
          if (localIds.length > 0) {
            await model.highlight(localIds, NON_HIGHLIGHTED_MATERIAL);
          }
        } catch (error) {
          // Silenciar error
        }
      }
      
      await fragments.update(true);
      
      if (selectedSpace && selectedSpace.properties?.globalId && collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.showOnlySpaceGeometries(selectedSpace.properties.globalId);
      } else if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.showAllGeometries();
      }
      
      setIsolationActive(true);
    } catch (error) {
      // Silenciar error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para desactivar modo aislamiento
  const deactivateIsolationMode = async () => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      for (const model of models) {
        await resetView(model, world, fragments, true);
      }
      
      if (collectionGeometryHandler.isInitialized()) {
        collectionGeometryHandler.showAllGeometries();
      }
      
      setIsolationActive(false);
      setSelectedLevel(null);
      setSelectedSpace(null);
      
      await fragments.update(true);
    } catch (error) {
      // Silenciar error
    } finally { 
      setIsLoading(false);
    }
  };
  
  // Alternar expansión de nivel
  const toggleLevelExpansion = (level: string) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  // Función para abrir panel de colección
  const addToCollection = (space: SpaceElement) => {
    if (!space.properties?.globalId) {
      console.error('El espacio seleccionado no tiene un GUID válido:', space);
      setDebugMessage(prev => prev + `\nError: El espacio ${space.name} (ID: ${space.localId}) no tiene un GUID válido.`);
      return;
    }
    
    console.log('Abriendo formulario de colección para espacio:', {
      id: space.localId,
      name: space.name,
      guid: space.properties.globalId
    });
    
    setSelectedSpace(space);
    setShowCollectionPanel(true);
  };

  // Función para reservar espacio
  const reserveSpace = (space: SpaceElement) => {
    if (!space.properties?.globalId) {
      console.error('El espacio seleccionado no tiene un GUID válido:', space);
      setDebugMessage(prev => prev + `\nError: El espacio ${space.name} (ID: ${space.localId}) no tiene un GUID válido para reservar.`);
      return;
    }
    
    console.log('Abriendo formulario de reserva para espacio:', {
      id: space.localId,
      name: space.name,
      guid: space.properties.globalId
    });
    
    setSelectedSpace(space);
    setShowReservationPanel(true);
  };

  const handleReservationSubmit = async (formData: any) => {
    try {
      console.log('Datos de reserva a enviar:', formData);
      setDebugMessage(prev => prev + `\nEnviando datos de reserva para el espacio ${formData.spaceName} (${formData.spaceGuid})`);
      
      const response = {
        status: 'success',
        data: {
          schedule: { ...formData, id: `SCH-${Date.now()}` }
        },
        message: 'Reserva creada exitosamente'
      };
      
      setReservationResult(response);
      setSuccessMessage(`¡Reserva para "${formData.title}" creada con éxito!`);
      
      setTimeout(() => {
        setShowReservationPanel(false);
        setTimeout(() => setReservationResult(null), 500);
      }, 2000);
      
      return response;
    } catch (error) {
      console.error('Error al enviar reserva:', error);
      setDebugMessage(prev => prev + `\nError al enviar reserva: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };
  
  // Renderizado del componente
  return (
    <div className="spaces-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Building size={18} />
          <h3>Espacios del Modelo</h3>
        </div>
        <div>
          <button
            className="panel-debug-button"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            title="Mostrar/ocultar información de depuración"
          >
            <span>🐞</span>
          </button>
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
      </div>
      
      <div className="panel-content">
        {/* Barra de progreso optimizada */}
        <LoadingProgressBar progress={progress} isVisible={isLoading} />
        
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>
              {progress.total > 0 
                ? `Procesando lote ${progress.currentBatch || 0}/${progress.totalBatches || 0}...` 
                : 'Iniciando procesamiento optimizado...'
              }
            </span>
          </div>
        )}
        
        {/* Buscador */}
        <div className="search-container">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar espacios..."
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
            disabled={isLoading || spaces.length === 0}
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
        </div>
        
        {/* Información de debug */}
        {showDebugInfo && (
          <div className="debug-info">
            <h4>Información de depuración optimizada</h4>
            <div className="debug-content">
              <p>Total modelos: {models.length}</p>
              <p>Total espacios cargados: {totalSpacesCount}</p>
              <p>Niveles detectados: {levelsList.length}</p>
              <p>Progreso actual: {progress.percentage}%</p>
              {/* NUEVO: Información de caché */}
              <p>Estado de caché: {(() => {
                const cacheKey = generateCacheKey(models);
                const cachedData = spacesCache.get(cacheKey);
                if (cachedData && isCacheValid(cachedData)) {
                  return `✅ Activa (${new Date(cachedData.timestamp).toLocaleTimeString()})`;
                } else if (cachedData) {
                  return `⚠️ Expirada`;
                } else {
                  return `❌ No disponible`;
                }
              })()}</p>
              <p>Entradas en caché total: {spacesCache.size}</p>
              {collectionItems.length > 0 && (
                <p>Elementos de colección en espacio seleccionado: {collectionItems.length}</p>
              )}
              {progress.total > 0 && (
                <p>Procesamiento: {progress.processed}/{progress.total} espacios</p>
              )}
              <div style={{ marginTop: '10px', padding: '8px', background: '#151825', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '4px' }}>🗂️ Gestión de Caché:</div>
                <button 
                  onClick={() => {
                    spacesCache.clear();
                    setDebugMessage(prev => prev + '\n🗑️ Caché limpiada manualmente');
                  }}
                  style={{ 
                    background: '#ef4444', 
                    color: 'white', 
                    border: 'none', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  Limpiar Caché
                </button>
                <button 
                  onClick={() => {
                    cleanExpiredCache();
                    setDebugMessage(prev => prev + '\n🧹 Caché expirada eliminada');
                  }}
                  style={{ 
                    background: '#f59e0b', 
                    color: 'white', 
                    border: 'none', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Limpiar Expirada
                </button>
              </div>
              <pre>{debugMessage}</pre>
            </div>
          </div>
        )}
        
        {/* Estado actual */}
        <div className="panel-status">
          <span className="status-info">
            {selectedSpace ? (
              <>
                Espacio: {selectedSpace.name}
                {selectedSpace.longName && selectedSpace.longName !== selectedSpace.name && (
                  <span className="longname-info">LongName: {selectedSpace.longName}</span>
                )}
                {!selectedSpace.longName && selectedSpace.properties?.longName && (
                  <span className="longname-info">LongName: {selectedSpace.properties.longName}</span>
                )}
              </>
            ) : selectedLevel ? (
              `Nivel: ${selectedLevel}`
            ) : isolationActive ? (
              "Modo aislamiento activo"
            ) : spaces.length > 0 ? (
              `Total de espacios cargados: ${spaces.length}`
            ) : isLoading ? (
              "Cargando espacios optimizado..."
            ) : (
              "No se encontraron espacios"
            )}
          </span>
        </div>
        
        {spaces.length === 0 && !isLoading ? (
          <div className="no-spaces-message">
            <p>No se encontraron espacios (IFCSPACE) en los modelos cargados.</p>
            <p>Asegúrate de que los modelos contengan elementos con la categoría IFCSPACE.</p>
          </div>
        ) : (
          <>
            {/* Resultados de búsqueda virtualizados */}
            {searchTerm && (
              <div className="search-results">
                <h4>Resultados de búsqueda ({filteredSpaces.length})</h4>
                {filteredSpaces.length === 0 ? (
                  <div className="no-spaces">
                    No se encontraron espacios con "{searchTerm}".
                  </div>
                ) : (
                  <div className="search-spaces-list" style={{ height: '300px', border: '1px solid #2c3142' }}>
                    <List
                      height={300}
                      itemCount={filteredSpaces.length}
                      itemSize={ITEM_HEIGHT}
                      itemData={searchListData}
                    >
                      {VirtualizedSearchSpaceItem}
                    </List>
                  </div>
                )}
              </div>
            )}
            
            {/* Árbol de niveles virtualizado */}
            {!searchTerm && (
              <div className="levels-container">
                {levelsList.map(level => {
                  const isExpanded = expandedLevels.has(level);
                  const isActive = selectedLevel === level;
                  const spacesInLevel = spacesByLevel[level] || [];
                  const levelListData = getLevelListData(level);
                  
                  return (
                    <div key={level} className="level-group">
                      <div 
                        className={`level-header ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          toggleLevelExpansion(level);
                          if (!isActive) {
                            zoomToLevel(level);
                          }
                        }}
                      >
                        <div className="level-expand-icon">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <span className="level-name">{level}</span>
                        <span className="level-count">{spacesInLevel.length}</span>
                        
                        <button 
                          className="level-zoom-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            zoomToLevel(level);
                          }}
                          title="Zoom a nivel"
                        >
                          <ZoomIn size={14} />
                        </button>
                      </div>
                      
                      {isExpanded && spacesInLevel.length > 0 && (
                        <div className="spaces-list" style={{ height: Math.min(400, spacesInLevel.length * ITEM_HEIGHT), border: '1px solid #2c3142' }}>
                          <List
                            height={Math.min(400, spacesInLevel.length * ITEM_HEIGHT)}
                            itemCount={spacesInLevel.length}
                            itemSize={ITEM_HEIGHT}
                            itemData={levelListData}
                          >
                            {VirtualizedLevelSpaceItem}
                          </List>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Panel de detalles del espacio */}
      {selectedSpace && (
        <div className="space-detail-wrapper">
          <div 
            className="space-detail-header"
            onClick={() => setDetailsCollapsed(!detailsCollapsed)}
          >
            <h4>Detalles del Espacio</h4>
            <div className="space-detail-header-actions">
              <button 
                className="panel-debug-button"
                title={detailsCollapsed ? "Expandir" : "Colapsar"}
              >
                {detailsCollapsed ? <ChevronDown size={16} /> : <Minimize2 size={16} />}
              </button>
            </div>
          </div>
          
          {!detailsCollapsed && (
            <div className="space-detail-content">
              <div className="space-detail-item">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{selectedSpace.localId}</span>
              </div>
              <div className="space-detail-item">
                <span className="detail-label">Nombre:</span>
                <span className="detail-value">{selectedSpace.name}</span>
              </div>
              
              {(selectedSpace.longName || selectedSpace.properties?.longName) && 
              (selectedSpace.longName || selectedSpace.properties?.longName) !== selectedSpace.name && (
                <div className="space-detail-item highlight">
                  <span className="detail-label">LongName:</span>
                  <span className="detail-value">
                    {selectedSpace.longName || selectedSpace.properties?.longName}
                  </span>
                </div>
              )}
              
              {selectedSpace.properties?.objectType && (
                <div className="space-detail-item">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">{selectedSpace.properties.objectType}</span>
                </div>
              )}
              
              <div className="space-detail-item">
                <span className="detail-label">Nivel:</span>
                <span className="detail-value">{selectedSpace.level}</span>
              </div>
              
              {selectedSpace.dimensions && (
                <>
                  <div className="space-detail-item">
                    <span className="detail-label">Área:</span>
                    <span className="detail-value">{selectedSpace.dimensions.area.toFixed(2)} m²</span>
                  </div>
                  <div className="space-detail-item">
                    <span className="detail-label">Volumen:</span>
                    <span className="detail-value">{selectedSpace.dimensions.volume.toFixed(2)} m³</span>
                  </div>
                </>
              )}
              
              {selectedSpace.properties?.globalId && (
                <div className="space-detail-item">
                  <span className="detail-label">GUID:</span>
                  <span className="detail-value">{selectedSpace.properties.globalId}</span>
                </div>
              )}
              
              {selectedSpace.properties?.globalId && collectionItems.length > 0 && (
                <div className="space-detail-item highlight">
                  <span className="detail-label">Elementos de colección:</span>
                  <span className="detail-value">{collectionItems.length}</span>
                </div>
              )}
              
              {selectedSpace.properties?.labelValues && 
              Object.keys(selectedSpace.properties.labelValues).length > 0 && (
                <div className="ifc-properties-section">
                  <div className="ifc-property-group-title">Valores IFCLABEL</div>
                  {Object.entries(selectedSpace.properties.labelValues)
                    .slice(0, 5)
                    .map(([path, value], index) => (
                      <div key={index} className="ifc-property-item">
                        <span className="ifc-property-label">{path.split('.').pop()}</span>
                        <span className="ifc-property-value">{value}</span>
                      </div>
                    ))}
                  {Object.keys(selectedSpace.properties.labelValues).length > 5 && (
                    <div className="ifc-property-item">
                      <em>... y {Object.keys(selectedSpace.properties.labelValues).length - 5} más</em>
                    </div>
                  )}
                </div>
              )}
              
              <div className="detail-actions">
                <button 
                  className="detail-action-button"
                  onClick={() => addToCollection(selectedSpace)}
                >
                  <Plus size={16} />
                  <span>Agregar Colección</span>
                </button>
                
                <button 
                  className="detail-action-button secondary"
                  onClick={() => reserveSpace(selectedSpace)}
                >
                  <Calendar size={16} />
                  <span>Reservar Espacio</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Panel de Colecciones */}
      {showCollectionPanel && selectedSpace && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="max-w-4xl w-full max-h-[90vh] bg-[#1a1f2e] text-black shadow-lg rounded-lg border border-[#2c3142]">
            <CollectionForm
              onSubmit={saveCollectionItem}
              onCancel={() => setShowCollectionPanel(false)}
              spaceData={{
                guid: selectedSpace.properties?.globalId || '',
                id: selectedSpace.localId,
                name: selectedSpace.name,
                longName: selectedSpace.longName || selectedSpace.properties?.longName,
                modelId: selectedSpace.modelId,
                position: selectedSpace.position ? {
                  x: selectedSpace.position.x,
                  y: selectedSpace.position.y,
                  z: selectedSpace.position.z
                } : undefined
            }}
              onSelectPosition={(enable) => {
                if (enable) {
                  setDebugMessage(prev => prev + "\nModo de selección de posición activado");
                } else {
                  setDebugMessage(prev => prev + "\nModo de selección de posición desactivado");
                }
              }}
              onPositionSelected={(position) => {
                setDebugMessage(prev => prev + `\nPosición seleccionada: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Panel de Reservas */}
      {showReservationPanel && selectedSpace && selectedSpace.properties?.globalId && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <SpaceSchedule
            onSubmit={handleReservationSubmit}
            onCancel={() => setShowReservationPanel(false)}
            spaceData={{
              guid: selectedSpace.properties.globalId,
              id: selectedSpace.localId,
              name: selectedSpace.name,
              longName: selectedSpace.longName || selectedSpace.properties?.longName,
              modelId: selectedSpace.modelId,
              position: selectedSpace.position ? {
                x: selectedSpace.position.x,
                y: selectedSpace.position.y,
                z: selectedSpace.position.z
              } : undefined
            }}
            isEditMode={false}
          />
        </div>
      )}

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in-up">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage('')} 
              className="ml-4 text-white hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsPanel;