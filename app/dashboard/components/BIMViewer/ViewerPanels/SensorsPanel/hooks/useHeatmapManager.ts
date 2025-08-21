// src/components/ViewerPanels/SensorsPanel/hooks/useHeatmapManager.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import * as THREE from 'three';
import { fetchAllSensors, wsManager, Sensor } from '../../../services/sensorApiService';

// Interfaces del hook
interface SpaceElement {
  modelId: string;
  model: FRAGS.FragmentsModel;
  localId: number;
  properties?: {
    globalId?: string;
    name?: string;
    longName?: string;
  };
}

interface SensorSpaceAssociation {
  sensorId: string;
  sensor: Sensor;
  spaceGuid: string;
  spaceName: string;
  spaceElement?: SpaceElement;
  isActive: boolean;
  lastTemperature?: number;
  lastReading?: Date;
  quality?: 'good' | 'warning' | 'critical' | 'error';
}

interface HeatmapConfig {
  enabled: boolean;
  minTemp: number;
  maxTemp: number;
  opacity: number;
  updateInterval: number;
}

interface UseHeatmapManagerProps {
  models: FRAGS.FragmentsModel[];
  fragments: FRAGS.FragmentsManager | null;
  world: OBC.World | null;
  autoLoad?: boolean;
}

interface UseHeatmapManagerReturn {
  // Estado
  isEnabled: boolean;
  associations: SensorSpaceAssociation[];
  spaces: SpaceElement[];
  sensors: Sensor[];
  config: HeatmapConfig;
  isLoading: boolean;
  error: string | null;
  
  // Acciones
  toggleHeatmap: () => void;
  loadData: () => Promise<void>;
  createAssociation: (sensor: Sensor, space: SpaceElement) => void;
  removeAssociation: (sensorId: string) => void;
  updateConfig: (newConfig: Partial<HeatmapConfig>) => void;
  clearHeatmap: () => Promise<void>;
  applyHeatmap: () => Promise<void>;
  
  // Utilidades
  getTemperatureColor: (temperature: number) => THREE.Color;
  getAssociationBySpace: (spaceGuid: string) => SensorSpaceAssociation | undefined;
  getAssociationBySensor: (sensorId: string) => SensorSpaceAssociation | undefined;
  hasHeatmapData: boolean;
}

// Colores para el mapa de calor
const TEMPERATURE_COLORS = {
  cold: new THREE.Color(0x0066cc),
  cool: new THREE.Color(0x00cccc),
  comfortable: new THREE.Color(0x00cc00),
  warm: new THREE.Color(0xcccc00),
  hot: new THREE.Color(0xcc6600),
  critical: new THREE.Color(0xcc0000)
};

const DEFAULT_CONFIG: HeatmapConfig = {
  enabled: false,
  minTemp: 18,
  maxTemp: 28,
  opacity: 0.7,
  updateInterval: 30000
};

export const useHeatmapManager = ({
  models,
  fragments,
  world,
  autoLoad = true
}: UseHeatmapManagerProps): UseHeatmapManagerReturn => {
  
  // Estados principales
  const [isEnabled, setIsEnabled] = useState(false);
  const [associations, setAssociations] = useState<SensorSpaceAssociation[]>([]);
  const [spaces, setSpaces] = useState<SpaceElement[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [config, setConfig] = useState<HeatmapConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Referencias
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const originalMaterialsRef = useRef<Map<string, FRAGS.MaterialDefinition>>(new Map());
  const wsSubscriptionRef = useRef<Function | null>(null);

  // Función auxiliar para extraer propiedades IFC
  const extractPropertyValue = useCallback((data: any, propertyName: string): string => {
    if (!data) return '';
    
    if (data[propertyName] !== undefined) {
      const prop = data[propertyName];
      if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
        return prop.value;
      }
      if (typeof prop !== 'object' || prop === null) {
        return String(prop);
      }
    }
    
    if (data.properties && data.properties[propertyName] !== undefined) {
      const prop = data.properties[propertyName];
      if (typeof prop === 'object' && prop && prop.value !== undefined) {
        return typeof prop.value === 'string' ? prop.value : String(prop.value);
      }
      if (typeof prop !== 'object' || prop === null) {
        return String(prop);
      }
    }
    
    return '';
  }, []);

  // Cargar espacios
  const loadSpaces = useCallback(async () => {
    if (!models.length) return [];
    
    const allSpaces: SpaceElement[] = [];
    
    try {
      for (const model of models) {
        const categories = await model.getCategories();
        if (!categories.includes('IFCSPACE')) continue;
        
        const items = await model.getItemsOfCategory('IFCSPACE');
        
        for (const item of items) {
          const localId = await item.getLocalId();
          if (localId === null) continue;
          
          let guid = null;
          try {
            guid = await item.getGuid();
          } catch (error) {
            console.warn(`No se pudo obtener GUID para espacio ${localId}`);
          }
          
          const itemsData = await model.getItemsData([localId], {
            includeGeometry: false,
            includeMaterials: false,
            includeProperties: true
          });
          
          if (!itemsData || itemsData.length === 0) continue;
          
          const data = itemsData[0];
          const name = extractPropertyValue(data, 'Name') || `Espacio ${localId}`;
          const longName = extractPropertyValue(data, 'LongName');

          // FILTRO: Excluir áreas que empiecen con "Área:"
          if (name && name.startsWith('Área:')) {
            console.log(`Excluido área: ${name} (ID: ${localId})`);
            continue; // Saltar este elemento
          }
          
          if (guid) {
            const spaceElement: SpaceElement = {
              modelId: model.id,
              model,
              localId,
              properties: {
                globalId: guid,
                name,
                longName
              }
            };
            
            allSpaces.push(spaceElement);
          }
        }
      }
      
      return allSpaces;
    } catch (error) {
      console.error('Error cargando espacios:', error);
      throw error;
    }
  }, [models, extractPropertyValue]);

  // Cargar sensores de temperatura
  const loadTemperatureSensors = useCallback(async () => {
    try {
      const allSensors = await fetchAllSensors();
      return allSensors.filter(sensor => 
        sensor.type === 'temperature' && sensor.status === 'active'
      );
    } catch (error) {
      console.error('Error cargando sensores:', error);
      throw error;
    }
  }, []);

  // Cargar todos los datos
  const loadData = useCallback(async () => {
    if (!models.length) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [loadedSpaces, loadedSensors] = await Promise.all([
        loadSpaces(),
        loadTemperatureSensors()
      ]);
      
      setSpaces(loadedSpaces);
      setSensors(loadedSensors);
      
      console.log(`Datos cargados: ${loadedSpaces.length} espacios, ${loadedSensors.length} sensores`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error cargando datos para mapa de calor:', err);
    } finally {
      setIsLoading(false);
    }
  }, [models.length, loadSpaces, loadTemperatureSensors]);

  // Obtener color basado en temperatura
  const getTemperatureColor = useCallback((temperature: number): THREE.Color => {
    const { minTemp, maxTemp } = config;
    
    if (temperature < minTemp - 2) return TEMPERATURE_COLORS.cold;
    if (temperature < minTemp) return TEMPERATURE_COLORS.cool;
    if (temperature <= maxTemp) return TEMPERATURE_COLORS.comfortable;
    if (temperature <= maxTemp + 2) return TEMPERATURE_COLORS.warm;
    if (temperature <= maxTemp + 5) return TEMPERATURE_COLORS.hot;
    return TEMPERATURE_COLORS.critical;
  }, [config]);

  // Crear asociación
  const createAssociation = useCallback((sensor: Sensor, space: SpaceElement) => {
    if (!space.properties?.globalId) {
      setError('El espacio seleccionado no tiene un GUID válido');
      return;
    }

    const newAssociation: SensorSpaceAssociation = {
      sensorId: sensor.sensorId,
      sensor,
      spaceGuid: space.properties.globalId,
      spaceName: space.properties.name || `Espacio ${space.localId}`,
      spaceElement: space,
      isActive: true,
      lastTemperature: sensor.lastReading?.value,
      lastReading: sensor.lastReading?.timestamp ? new Date(sensor.lastReading.timestamp) : undefined,
      quality: sensor.lastReading?.quality || 'good'
    };

    setAssociations(prev => {
      const filtered = prev.filter(assoc => 
        assoc.sensorId !== sensor.sensorId && assoc.spaceGuid !== space.properties!.globalId
      );
      return [...filtered, newAssociation];
    });

    console.log(`Asociación creada: Sensor ${sensor.name} → Espacio ${space.properties.name}`);
  }, []);

  // Eliminar asociación
  const removeAssociation = useCallback((sensorId: string) => {
    setAssociations(prev => prev.filter(assoc => assoc.sensorId !== sensorId));
  }, []);

  // Aplicar mapa de calor
  const applyHeatmap = useCallback(async () => {
    if (!fragments || !models.length || !isEnabled) return;

    try {
      // Aplicar colores basados en temperatura
      for (const association of associations) {
        if (!association.isActive || !association.lastTemperature || !association.spaceElement) continue;

        const { spaceElement, lastTemperature } = association;
        const color = getTemperatureColor(lastTemperature);

        const material: FRAGS.MaterialDefinition = {
          color,
          opacity: config.opacity,
          transparent: true,
          renderedFaces: FRAGS.RenderedFaces.TWO
        };

        await spaceElement.model.highlight([spaceElement.localId], material);
      }

      // Actualizar fragmentos
      await fragments.update(true);
      
      console.log(`Mapa de calor aplicado a ${associations.filter(a => a.isActive && a.lastTemperature).length} espacios`);
    } catch (error) {
      console.error('Error aplicando mapa de calor:', error);
      setError('Error al aplicar mapa de calor');
    }
  }, [fragments, models, isEnabled, associations, getTemperatureColor, config.opacity]);

  // Limpiar mapa de calor
  const clearHeatmap = useCallback(async () => {
    if (!fragments || !models.length) return;

    try {
      for (const model of models) {
        await model.resetHighlights();
      }
      await fragments.update(true);
      console.log('Mapa de calor limpiado');
    } catch (error) {
      console.error('Error limpiando mapa de calor:', error);
      setError('Error al limpiar mapa de calor');
    }
  }, [fragments, models]);

  // Toggle del mapa de calor
  const toggleHeatmap = useCallback(() => {
    setIsEnabled(prev => !prev);
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Actualizar configuración
  const updateConfig = useCallback((newConfig: Partial<HeatmapConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Actualizar lecturas de sensores
  const updateSensorReadings = useCallback(() => {
    setAssociations(prev => prev.map(assoc => {
      const updatedSensor = sensors.find(s => s.sensorId === assoc.sensorId);
      if (updatedSensor && updatedSensor.lastReading) {
        return {
          ...assoc,
          sensor: updatedSensor,
          lastTemperature: updatedSensor.lastReading.value,
          lastReading: new Date(updatedSensor.lastReading.timestamp),
          quality: updatedSensor.lastReading.quality || 'good'
        };
      }
      return assoc;
    }));
  }, [sensors]);

  // Funciones de utilidad
  const getAssociationBySpace = useCallback((spaceGuid: string) => {
    return associations.find(assoc => assoc.spaceGuid === spaceGuid);
  }, [associations]);

  const getAssociationBySensor = useCallback((sensorId: string) => {
    return associations.find(assoc => assoc.sensorId === sensorId);
  }, [associations]);

  // WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    if (associations.length > 0 && isEnabled) {
      wsManager.connect();
      
      const subscription = wsManager.subscribe('readings', (data) => {
        if (data.type === 'reading' && data.sensorType === 'temperature') {
          const association = associations.find(assoc => assoc.sensorId === data.sensorId);
          if (association) {
            updateSensorReadings();
            console.log(`Actualización WebSocket recibida para sensor ${data.sensorId}: ${data.value}°C`);
          }
        }
      });
      
      wsSubscriptionRef.current = subscription;
      
      return () => {
        if (wsSubscriptionRef.current) {
          wsSubscriptionRef.current();
        }
      };
    }
  }, [associations, isEnabled, updateSensorReadings]);

  // Efecto para aplicar/limpiar mapa de calor
  useEffect(() => {
    if (isEnabled && associations.length > 0) {
      applyHeatmap();
      
      // Configurar actualización automática
      if (config.updateInterval > 0) {
        updateIntervalRef.current = setInterval(() => {
          updateSensorReadings();
          applyHeatmap();
        }, config.updateInterval);
      }
    } else {
      clearHeatmap();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isEnabled, associations, config.updateInterval, applyHeatmap, clearHeatmap, updateSensorReadings]);

  // Auto-cargar datos
  useEffect(() => {
    if (autoLoad && models.length > 0) {
      loadData();
    }
  }, [autoLoad, models.length, loadData]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (isEnabled) {
        clearHeatmap();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (wsSubscriptionRef.current) {
        wsSubscriptionRef.current();
      }
    };
  }, [clearHeatmap, isEnabled]);

  return {
    // Estado
    isEnabled,
    associations,
    spaces,
    sensors,
    config,
    isLoading,
    error,
    
    // Acciones
    toggleHeatmap,
    loadData,
    createAssociation,
    removeAssociation,
    updateConfig,
    clearHeatmap,
    applyHeatmap,
    
    // Utilidades
    getTemperatureColor,
    getAssociationBySpace,
    getAssociationBySensor,
    hasHeatmapData: associations.length > 0
  };
};