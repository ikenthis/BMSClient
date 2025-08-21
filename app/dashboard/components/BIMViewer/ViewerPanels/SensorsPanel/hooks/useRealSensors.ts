// src/components/ViewerPanels/SensorsPanel/hooks/useRealSensors.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchAllSensors,
  fetchErrorSensors,
  startSensor,
  stopSensor,
  resetSensor,
  resetErrorSensors,
  createTestSensors,
  getSystemStatus,
  setAutoRecovery,
  Sensor,
  SystemStatus
} from '../../../services/sensorApiService';

interface UseRealSensorsOptions {
  autoLoad?: boolean;
  filterTypes?: string[];
  pollInterval?: number;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface UseRealSensorsReturn {
  // State
  sensors: Sensor[];
  errorSensors: { memorySensors: Sensor[]; databaseSensors: Sensor[] };
  systemStatus: SystemStatus | null;
  isLoading: boolean;
  isProcessing: boolean;
  autoRecoveryEnabled: boolean;
  
  // Actions
  loadSensors: () => Promise<void>;
  refreshErrorSensors: () => Promise<void>;
  controlSensor: (sensorId: string, action: 'start' | 'stop' | 'reset') => Promise<void>;
  resetAllErrors: () => Promise<void>;
  toggleAutoRecovery: (enabled?: boolean) => Promise<void>;
  createTestSensorsForSpace: (spaceGuid: string, spaceName: string) => Promise<void>;
  
  // Utilities
  getSensorById: (sensorId: string) => Sensor | undefined;
  getSensorsByType: (type: string) => Sensor[];
  getActiveSensors: () => Sensor[];
  getErrorSensors: () => Sensor[];
}

export const useRealSensors = (options: UseRealSensorsOptions = {}): UseRealSensorsReturn => {
  const {
    autoLoad = true,
    filterTypes = [],
    pollInterval = 30000, // 30 segundos
    onError,
    onSuccess
  } = options;

  // State
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [errorSensors, setErrorSensors] = useState<{ memorySensors: Sensor[]; databaseSensors: Sensor[] }>({
    memorySensors: [],
    databaseSensors: []
  });
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(true);

  // Refs para cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Función para manejar errores
  const handleError = useCallback((error: any, context: string) => {
    const message = error?.message || `Error en ${context}`;
    console.error(`❌ ${context}:`, error);
    
    if (onError) {
      onError(message);
    }
    
    return message;
  }, [onError]);

  // Función para manejar éxito
  const handleSuccess = useCallback((message: string) => {
    console.log(`✅ ${message}`);
    
    if (onSuccess) {
      onSuccess(message);
    }
  }, [onSuccess]);

  // Cargar sensores desde la API
  const loadSensors = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsLoading(true);
    
    try {
      console.log('🔄 Cargando sensores reales...');
      
      const [sensorsData, statusData, errorSensorsData] = await Promise.all([
        fetchAllSensors(),
        getSystemStatus().catch(err => {
          console.warn('No se pudo obtener el estado del sistema:', err);
          return null;
        }),
        fetchErrorSensors().catch(err => {
          console.warn('No se pudieron obtener sensores con error:', err);
          return { memorySensors: [], databaseSensors: [] };
        })
      ]);
      
      if (!mountedRef.current) return;
      
      // Filtrar por tipos si se especifica
      let filteredSensors = sensorsData;
      if (filterTypes.length > 0) {
        filteredSensors = sensorsData.filter(sensor => 
          filterTypes.includes(sensor.type)
        );
      }
      
      setSensors(filteredSensors);
      setErrorSensors(errorSensorsData);
      
      if (statusData) {
        setSystemStatus(statusData);
        setAutoRecoveryEnabled(statusData.system?.recoveryEnabled ?? true);
      }
      
      console.log('✅ Sensores reales cargados:', {
        total: sensorsData.length,
        filtered: filteredSensors.length,
        errors: errorSensorsData.memorySensors.length,
        types: [...new Set(filteredSensors.map(s => s.type))]
      });
      
    } catch (error) {
      handleError(error, 'loadSensors');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filterTypes, handleError]);

  // Recargar solo sensores con error
  const refreshErrorSensors = useCallback(async () => {
    try {
      const errorSensorsData = await fetchErrorSensors();
      if (mountedRef.current) {
        setErrorSensors(errorSensorsData);
      }
    } catch (error) {
      handleError(error, 'refreshErrorSensors');
    }
  }, [handleError]);

  // Controlar un sensor individual
  const controlSensor = useCallback(async (sensorId: string, action: 'start' | 'stop' | 'reset') => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      console.log(`🔄 ${action} sensor ${sensorId}...`);
      
      switch (action) {
        case 'start':
          await startSensor(sensorId);
          handleSuccess(`Sensor ${sensorId} iniciado correctamente`);
          break;
        case 'stop':
          await stopSensor(sensorId);
          handleSuccess(`Sensor ${sensorId} detenido correctamente`);
          break;
        case 'reset':
          await resetSensor(sensorId);
          handleSuccess(`Sensor ${sensorId} reiniciado correctamente`);
          break;
      }
      
      // Recargar datos después de la acción
      await loadSensors();
      
    } catch (error) {
      handleError(error, `controlSensor-${action}`);
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, handleError, handleSuccess, loadSensors]);

  // Reiniciar todos los sensores con error
  const resetAllErrors = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      console.log('🔄 Reiniciando todos los sensores con error...');
      
      const result = await resetErrorSensors();
      
      handleSuccess(
        `${result.success} sensores reiniciados correctamente, ${result.failed} fallaron`
      );
      
      if (result.errors.length > 0) {
        console.warn('Errores en algunos sensores:', result.errors);
      }
      
      // Recargar datos
      await loadSensors();
      
    } catch (error) {
      handleError(error, 'resetAllErrors');
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, handleError, handleSuccess, loadSensors]);

  // Toggle recuperación automática
  const toggleAutoRecovery = useCallback(async (enabled?: boolean) => {
    const newState = enabled !== undefined ? enabled : !autoRecoveryEnabled;
    
    try {
      console.log(`🔄 ${newState ? 'Habilitando' : 'Deshabilitando'} recuperación automática...`);
      
      const result = await setAutoRecovery(newState);
      
      if (mountedRef.current) {
        setAutoRecoveryEnabled(result);
      }
      
      handleSuccess(
        `Recuperación automática ${result ? 'habilitada' : 'deshabilitada'}`
      );
      
    } catch (error) {
      handleError(error, 'toggleAutoRecovery');
    }
  }, [autoRecoveryEnabled, handleError, handleSuccess]);

  // Crear sensores de prueba
  const createTestSensorsForSpace = useCallback(async (spaceGuid: string, spaceName: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      console.log(`🔄 Creando sensores de prueba para ${spaceName}...`);
      
      const newSensors = await createTestSensors(spaceGuid, spaceName);
      
      handleSuccess(
        `${newSensors.length} sensores de prueba creados correctamente`
      );
      
      // Recargar sensores para incluir los nuevos
      await loadSensors();
      
    } catch (error) {
      handleError(error, 'createTestSensorsForSpace');
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, handleError, handleSuccess, loadSensors]);

  // Utilidades
  const getSensorById = useCallback((sensorId: string) => {
    return sensors.find(sensor => sensor.sensorId === sensorId);
  }, [sensors]);

  const getSensorsByType = useCallback((type: string) => {
    return sensors.filter(sensor => sensor.type === type);
  }, [sensors]);

  const getActiveSensors = useCallback(() => {
    return sensors.filter(sensor => sensor.status === 'active');
  }, [sensors]);

  const getErrorSensors = useCallback(() => {
    return sensors.filter(sensor => 
      sensor.status === 'error' || sensor.memoryStatus?.hasError
    );
  }, [sensors]);

  // Auto-load al montar
  useEffect(() => {
    if (autoLoad) {
      loadSensors();
    }
  }, [autoLoad, loadSensors]);

  // Polling automático
  useEffect(() => {
    if (pollInterval > 0 && sensors.length > 0) {
      pollIntervalRef.current = setInterval(() => {
        if (mountedRef.current && !isLoading && !isProcessing) {
          loadSensors();
        }
      }, pollInterval);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [pollInterval, sensors.length, isLoading, isProcessing, loadSensors]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    sensors,
    errorSensors,
    systemStatus,
    isLoading,
    isProcessing,
    autoRecoveryEnabled,
    
    // Actions
    loadSensors,
    refreshErrorSensors,
    controlSensor,
    resetAllErrors,
    toggleAutoRecovery,
    createTestSensorsForSpace,
    
    // Utilities
    getSensorById,
    getSensorsByType,
    getActiveSensors,
    getErrorSensors
  };
};