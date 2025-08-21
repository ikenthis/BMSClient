// useHeatMap.ts - Hook personalizado para gestión del mapa de calor 3D (CORREGIDO)
import { useState, useEffect, useCallback, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { heatMapVisualization, HeatMapData, HeatMapVisualizationConfig } from '../utils/HeatMapVisualization';
import { sensorSpaceIntegration, SensorSpaceMapping } from '../services/sensorSpaceIntegrationService';
import { SpaceElement } from '../../../utils/typeDefs';

export interface UseHeatMapOptions {
  world: OBC.World | null;
  fragments: FRAGS.FragmentsModels | null;
  spaces: SpaceElement[];
  autoInitialize?: boolean;
  config?: Partial<HeatMapVisualizationConfig>;
}

export interface UseHeatMapReturn {
  // Estado
  isActive: boolean;
  isInitialized: boolean;
  hasData: boolean;
  dataCount: number;
  currentData: HeatMapData[];
  mappings: SensorSpaceMapping[];
  stats: any;
  error: string | null;
  
  // Acciones
  initialize: () => Promise<void>;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  toggle: () => Promise<void>;
  refreshData: () => Promise<void>;
  configure: (config: Partial<HeatMapVisualizationConfig>) => void;
  
  // Utilidades
  getSpaceTemperature: (spaceGuid: string) => number | null;
  getSpaceData: (spaceGuid: string) => HeatMapData | null;
  getSensorsInSpace: (spaceGuid: string) => SensorSpaceMapping[];
}

export function useHeatMap({
  world,
  fragments,
  spaces,
  autoInitialize = true,
  config
}: UseHeatMapOptions): UseHeatMapReturn {
  
  // Estados
  const [isActive, setIsActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [dataCount, setDataCount] = useState(0);
  const [currentData, setCurrentData] = useState<HeatMapData[]>([]);
  const [mappings, setMappings] = useState<SensorSpaceMapping[]>([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState<string | null>(null);
  
  // Referencias para cleanup
  const eventListenersRef = useRef<(() => void)[]>([]);

  /**
   * 🔥 CORREGIDO: Inicializa el sistema de mapa de calor
   */
  const initialize = useCallback(async () => {
    if (!world || !fragments || isInitialized) {
      return;
    }

    try {
      console.log('🔥 === INICIALIZANDO SISTEMA DE MAPA DE CALOR (HOOK) ===');
      
      // 🔥 CORREGIDO: Inicializar visualización con await
      await heatMapVisualization.initialize(world, fragments);
      
      // Configurar si se proporcionó
      if (config) {
        heatMapVisualization.configure(config);
      }
      
      // Establecer espacios en el servicio de integración
      if (spaces.length > 0) {
        sensorSpaceIntegration.setSpacesCache(spaces);
        console.log(`📍 ${spaces.length} espacios establecidos en cache`);
      }
      
      // Inicializar integración sensor-espacio
      if (!sensorSpaceIntegration.initialized) {
        await sensorSpaceIntegration.initialize();
      }
      
      // Configurar listeners de eventos
      setupEventListeners();
      
      // Actualizar estados
      updateStates();
      
      setIsInitialized(true);
      setError(null);
      
      console.log('✅ Sistema de mapa de calor inicializado (HOOK)');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error inicializando mapa de calor:', err);
      setError(errorMessage);
    }
  }, [world, fragments, spaces, config, isInitialized]);

  /**
   * 🔥 CORREGIDO: Configura los listeners de eventos para batch processing
   */
  const setupEventListeners = useCallback(() => {
    // Limpiar listeners anteriores
    eventListenersRef.current.forEach(cleanup => cleanup());
    eventListenersRef.current = [];

    // 🔥 NUEVO: Listener para actualizaciones en batch
    const handleHeatMapBatchUpdate = (event: CustomEvent<{ data: HeatMapData[] }>) => {
      console.log(`🔥 Hook recibió batch update: ${event.detail.data.length} espacios`);
      
      setCurrentData(event.detail.data);
      setHasData(event.detail.data.length > 0);
      setDataCount(event.detail.data.length);
    };

    // 🔥 MANTENER: Listener individual para compatibilidad
    const handleHeatMapUpdate = (event: CustomEvent<HeatMapData>) => {
      console.log(`🔥 Hook recibió update individual: ${event.detail.spaceName}`);
      
      setCurrentData(prev => {
        const newData = [...prev];
        const existingIndex = newData.findIndex(d => d.spaceGuid === event.detail.spaceGuid);
        
        if (existingIndex >= 0) {
          newData[existingIndex] = event.detail;
        } else {
          newData.push(event.detail);
        }
        
        return newData;
      });
      
      setHasData(true);
      setDataCount(prev => Math.max(prev, currentData.length + 1));
    };

    // Listener para actualizaciones de mapeo
    const handleMappingUpdate = (event: CustomEvent) => {
      console.log('🔥 Hook recibió mapping update');
      setMappings(event.detail.mappings || []);
      updateStates();
    };

    // 🔥 REGISTRAR LISTENERS (batch + individual)
    window.addEventListener('heatMapDataUpdated', handleHeatMapBatchUpdate as EventListener);
    window.addEventListener('heatMapUpdate', handleHeatMapUpdate as EventListener);
    window.addEventListener('sensorMappingUpdate', handleMappingUpdate as EventListener);
    
    // Funciones de cleanup
    const cleanup1 = () => {
      window.removeEventListener('heatMapDataUpdated', handleHeatMapBatchUpdate as EventListener);
      console.log('🧹 Cleanup: heatMapDataUpdated listener removido');
    };
    const cleanup2 = () => {
      window.removeEventListener('heatMapUpdate', handleHeatMapUpdate as EventListener);
      console.log('🧹 Cleanup: heatMapUpdate listener removido');
    };
    const cleanup3 = () => {
      window.removeEventListener('sensorMappingUpdate', handleMappingUpdate as EventListener);
      console.log('🧹 Cleanup: sensorMappingUpdate listener removido');
    };
    
    eventListenersRef.current.push(cleanup1, cleanup2, cleanup3);
    
    console.log('🔥 Event listeners configurados para batch processing');
  }, [currentData.length]);

  /**
   * Actualiza los estados basados en los servicios
   */
  const updateStates = useCallback(() => {
    if (heatMapVisualization.hasData) {
      const data = heatMapVisualization.getCurrentData();
      setCurrentData(data);
      setHasData(true);
      setDataCount(heatMapVisualization.dataCount);
      console.log(`🔄 Estados actualizados: ${data.length} datos de calor`);
    }
    
    if (sensorSpaceIntegration.initialized) {
      setMappings(sensorSpaceIntegration.getAllMappings());
      setStats(sensorSpaceIntegration.getIntegrationStats());
    }
  }, []);

  /**
   * 🔥 CORREGIDO: Activa el mapa de calor
   */
  const activate = useCallback(async () => {
    if (!isInitialized) {
      console.log('🔄 No inicializado, inicializando primero...');
      await initialize();
    }
    
    try {
      console.log('🌡️ === ACTIVANDO MAPA DE CALOR (HOOK) ===');
      
      await heatMapVisualization.activateHeatMap();
      setIsActive(true);
      setError(null);
      
      // Refrescar datos
      await refreshData();
      
      console.log('✅ Mapa de calor activado (HOOK)');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error activando mapa de calor';
      console.error('❌ Error activando mapa de calor:', err);
      setError(errorMessage);
    }
  }, [isInitialized, initialize]);

  /**
   * 🔥 CORREGIDO: Desactiva el mapa de calor
   */
  const deactivate = useCallback(async () => {
    try {
      console.log('🌡️ === DESACTIVANDO MAPA DE CALOR (HOOK) ===');
      
      await heatMapVisualization.deactivateHeatMap();
      setIsActive(false);
      setError(null);
      
      console.log('✅ Mapa de calor desactivado (HOOK)');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desactivando mapa de calor';
      console.error('❌ Error desactivando mapa de calor:', err);
      setError(errorMessage);
    }
  }, []);

  /**
   * Toggle del mapa de calor
   */
  const toggle = useCallback(async () => {
    console.log(`🔄 Toggle mapa de calor: ${isActive ? 'desactivar' : 'activar'}`);
    
    if (isActive) {
      await deactivate();
    } else {
      await activate();
    }
  }, [isActive, activate, deactivate]);

  /**
   * 🔥 CORREGIDO: Refresca los datos del mapa de calor
   */
  const refreshData = useCallback(async () => {
    if (!sensorSpaceIntegration.initialized) {
      console.log('⚠️ Sensor integration no inicializado, no se pueden refrescar datos');
      return;
    }
    
    try {
      console.log('🔄 === REFRESCANDO DATOS DE MAPA DE CALOR (HOOK) ===');
      
      await sensorSpaceIntegration.refreshSensorData();
      updateStates();
      
      console.log('✅ Datos de mapa de calor refrescados (HOOK)');
      
    } catch (err) {
      console.warn('⚠️ Error refrescando datos:', err);
    }
  }, [updateStates]);

  /**
   * Configura el mapa de calor
   */
  const configure = useCallback((newConfig: Partial<HeatMapVisualizationConfig>) => {
    console.log('🔧 Configurando mapa de calor:', newConfig);
    heatMapVisualization.configure(newConfig);
  }, []);

  /**
   * Obtiene la temperatura de un espacio específico
   */
  const getSpaceTemperature = useCallback((spaceGuid: string): number | null => {
    const spaceData = currentData.find(d => d.spaceGuid === spaceGuid);
    return spaceData?.temperature || null;
  }, [currentData]);

  /**
   * Obtiene todos los datos de un espacio específico
   */
  const getSpaceData = useCallback((spaceGuid: string): HeatMapData | null => {
    return currentData.find(d => d.spaceGuid === spaceGuid) || null;
  }, [currentData]);

  /**
   * Obtiene los sensores de un espacio específico
   */
  const getSensorsInSpace = useCallback((spaceGuid: string): SensorSpaceMapping[] => {
    return sensorSpaceIntegration.getSensorsBySpace(spaceGuid);
  }, []);

  // 🔥 CORREGIDO: Inicialización automática
  useEffect(() => {
    if (autoInitialize && world && fragments && spaces.length > 0 && !isInitialized) {
      console.log('🚀 Auto-inicializando mapa de calor...');
      initialize();
    }
  }, [autoInitialize, world, fragments, spaces, isInitialized, initialize]);

  // Actualizar espacios cuando cambien
  useEffect(() => {
    if (isInitialized && spaces.length > 0) {
      console.log(`🔄 Actualizando cache de espacios: ${spaces.length} espacios`);
      sensorSpaceIntegration.setSpacesCache(spaces);
    }
  }, [spaces, isInitialized]);

  // 🔥 CORREGIDO: Cleanup al desmontar
  useEffect(() => {
    return () => {
      console.log('🧹 === CLEANUP HOOK HEATMAP ===');
      
      // Limpiar listeners
      eventListenersRef.current.forEach(cleanup => cleanup());
      
      // Desactivar si está activo
      if (isActive) {
        heatMapVisualization.deactivateHeatMap().catch(err => {
          console.warn('⚠️ Error en cleanup deactivateHeatMap:', err);
        });
      }
    };
  }, [isActive]);

  // 🔥 NUEVO: Debug effect para monitorear estado
  useEffect(() => {
    console.log('🔍 Hook HeatMap State Update:', {
      isActive,
      isInitialized,
      hasData,
      dataCount,
      currentDataLength: currentData.length,
      mappingsLength: mappings.length,
      error
    });
  }, [isActive, isInitialized, hasData, dataCount, currentData.length, mappings.length, error]);

  return {
    // Estado
    isActive,
    isInitialized,
    hasData,
    dataCount,
    currentData,
    mappings,
    stats,
    error,
    
    // Acciones
    initialize,
    activate,
    deactivate,
    toggle,
    refreshData,
    configure,
    
    // Utilidades
    getSpaceTemperature,
    getSpaceData,
    getSensorsInSpace
  };
}