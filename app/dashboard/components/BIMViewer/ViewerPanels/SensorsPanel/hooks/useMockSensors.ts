    // src/components/ViewerPanels/SensorsPanel/hooks/useMockSensors.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createMockSensors,
  updateMockSensorValue,
  generateMockAlerts,
  MockSensorData
} from '../../../utils/mockSensorData';

interface UseMockSensorsOptions {
  autoGenerate?: boolean;
  filterTypes?: string[];
  updateInterval?: number;
  maxSensorsPerType?: number;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface UseMockSensorsReturn {
  // State
  sensors: MockSensorData[];
  alerts: any;
  isLoading: boolean;
  isProcessing: boolean;
  updateInterval: number;
  
  // Actions
  generateSensors: () => void;
  updateSensor: (sensorId: string) => void;
  updateAllSensors: () => void;
  toggleSensorStatus: (sensorId: string) => void;
  simulateError: (sensorId: string) => void;
  resetSensor: (sensorId: string) => void;
  removeSensor: (sensorId: string) => void;
  addCustomSensor: (config: Partial<MockSensorData>) => void;
  
  // Configuration
  setUpdateInterval: (interval: number) => void;
  pauseUpdates: () => void;
  resumeUpdates: () => void;
  
  // Utilities
  getSensorById: (sensorId: string) => MockSensorData | undefined;
  getSensorsByType: (type: string) => MockSensorData[];
  getActiveSensors: () => MockSensorData[];
  getErrorSensors: () => MockSensorData[];
  getStatistics: () => {
    total: number;
    active: number;
    error: number;
    inactive: number;
    byType: Record<string, number>;
  };
}

export const useMockSensors = (options: UseMockSensorsOptions = {}): UseMockSensorsReturn => {
  const {
    autoGenerate = true,
    filterTypes = [],
    updateInterval: initialUpdateInterval = 30000, // 30 segundos
    maxSensorsPerType = 3,
    onError,
    onSuccess
  } = options;

  // State
  const [sensors, setSensors] = useState<MockSensorData[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateInterval, setUpdateIntervalState] = useState(initialUpdateInterval);
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Función para manejar errores
  const handleError = useCallback((error: any, context: string) => {
    const message = error?.message || `Error en ${context}`;
    console.error(`❌ Mock Sensors ${context}:`, error);
    
    if (onError) {
      onError(message);
    }
  }, [onError]);

  // Función para manejar éxito
  const handleSuccess = useCallback((message: string) => {
    console.log(`✅ Mock Sensors: ${message}`);
    
    if (onSuccess) {
      onSuccess(message);
    }
  }, [onSuccess]);

  // Generar sensores ficticios
  const generateSensors = useCallback(() => {
    setIsLoading(true);
    
    try {
      console.log('🔵 Generando sensores ficticios...');
      
      let allMockSensors = createMockSensors();
      
      // Filtrar por tipos si se especifica
      if (filterTypes.length > 0) {
        allMockSensors = allMockSensors.filter(sensor => 
          filterTypes.includes(sensor.type)
        );
      }
      
      // Limitar número de sensores por tipo
      const limitedSensors: MockSensorData[] = [];
      const typeCount: Record<string, number> = {};
      
      allMockSensors.forEach(sensor => {
        const currentCount = typeCount[sensor.type] || 0;
        if (currentCount < maxSensorsPerType) {
          limitedSensors.push(sensor);
          typeCount[sensor.type] = currentCount + 1;
        }
      });
      
      if (mountedRef.current) {
        setSensors(limitedSensors);
        
        // Generar alertas iniciales
        const initialAlerts = generateMockAlerts(limitedSensors);
        setAlerts(initialAlerts);
        
        handleSuccess(
          `${limitedSensors.length} sensores ficticios generados (${Object.keys(typeCount).length} tipos)`
        );
      }
      
    } catch (error) {
      handleError(error, 'generateSensors');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filterTypes, maxSensorsPerType, handleError, handleSuccess]);

  // Actualizar un sensor específico
  const updateSensor = useCallback((sensorId: string) => {
    setSensors(prevSensors => {
      const newSensors = prevSensors.map(sensor => {
        if (sensor.sensorId === sensorId) {
          const updated = updateMockSensorValue(sensor);
          console.log(`🔄 Sensor ${sensorId} actualizado:`, {
            oldValue: sensor.lastReading.value,
            newValue: updated.lastReading.value
          });
          return updated;
        }
        return sensor;
      });
      
      // Actualizar alertas
      const newAlerts = generateMockAlerts(newSensors);
      setAlerts(newAlerts);
      
      return newSensors;
    });
    
    handleSuccess(`Sensor ${sensorId} actualizado`);
  }, [handleSuccess]);

  // Actualizar todos los sensores
  const updateAllSensors = useCallback(() => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      setSensors(prevSensors => {
        const updatedSensors = prevSensors.map(sensor => updateMockSensorValue(sensor));
        
        // Actualizar alertas
        const newAlerts = generateMockAlerts(updatedSensors);
        setAlerts(newAlerts);
        
        console.log('🔄 Todos los sensores ficticios actualizados');
        return updatedSensors;
      });
      
      handleSuccess('Todos los sensores ficticios actualizados');
      
    } catch (error) {
      handleError(error, 'updateAllSensors');
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [isProcessing, handleError, handleSuccess]);

  // Toggle estado de un sensor
  const toggleSensorStatus = useCallback((sensorId: string) => {
    setSensors(prevSensors => {
      const newSensors = prevSensors.map(sensor => {
        if (sensor.sensorId === sensorId) {
          const newStatus = sensor.status === 'active' ? 'inactive' : 'active';
          return {
            ...sensor,
            status: newStatus,
            memoryStatus: {
              ...sensor.memoryStatus,
              isRunning: newStatus === 'active',
              hasError: false
            }
          };
        }
        return sensor;
      });
      
      // Actualizar alertas
      const newAlerts = generateMockAlerts(newSensors);
      setAlerts(newAlerts);
      
      return newSensors;
    });
    
    handleSuccess(`Estado del sensor ${sensorId} cambiado`);
  }, [handleSuccess]);

  // Simular error en un sensor
  const simulateError = useCallback((sensorId: string) => {
    setSensors(prevSensors => {
      const newSensors = prevSensors.map(sensor => {
        if (sensor.sensorId === sensorId) {
          return {
            ...sensor,
            status: 'error',
            memoryStatus: {
              isRunning: false,
              hasError: true,
              errorMessage: `Error simulado en sensor ${sensor.type} para demostración`
            }
          };
        }
        return sensor;
      });
      
      // Actualizar alertas
      const newAlerts = generateMockAlerts(newSensors);
      setAlerts(newAlerts);
      
      return newSensors;
    });
    
    handleSuccess(`Error simulado en sensor ${sensorId}`);
  }, [handleSuccess]);

  // Reiniciar un sensor (limpiar errores)
  const resetSensor = useCallback((sensorId: string) => {
    setSensors(prevSensors => {
      const newSensors = prevSensors.map(sensor => {
        if (sensor.sensorId === sensorId) {
          const resetSensor = updateMockSensorValue({
            ...sensor,
            status: 'active',
            memoryStatus: {
              isRunning: true,
              hasError: false
            }
          });
          return resetSensor;
        }
        return sensor;
      });
      
      // Actualizar alertas
      const newAlerts = generateMockAlerts(newSensors);
      setAlerts(newAlerts);
      
      return newSensors;
    });
    
    handleSuccess(`Sensor ${sensorId} reiniciado`);
  }, [handleSuccess]);

  // Remover un sensor
  const removeSensor = useCallback((sensorId: string) => {
    setSensors(prevSensors => {
      const filtered = prevSensors.filter(sensor => sensor.sensorId !== sensorId);
      
      // Actualizar alertas
      const newAlerts = generateMockAlerts(filtered);
      setAlerts(newAlerts);
      
      return filtered;
    });
    
    handleSuccess(`Sensor ${sensorId} removido`);
  }, [handleSuccess]);

  // Agregar sensor personalizado
  const addCustomSensor = useCallback((config: Partial<MockSensorData>) => {
    const newSensorId = `MOCK_CUSTOM_${Date.now()}`;
    
    const newSensor: MockSensorData = {
      sensorId: newSensorId,
      name: config.name || `Sensor Personalizado ${newSensorId.slice(-3)}`,
      type: config.type || 'temperature',
      status: config.status || 'active',
      location: config.location || { spaceName: 'Espacio Personalizado' },
      config: config.config || { unit: '°C' },
      lastReading: config.lastReading || {
        value: 22.5,
        timestamp: new Date().toISOString(),
        quality: 'good'
      },
      memoryStatus: config.memoryStatus || {
        isRunning: true,
        hasError: false
      }
    };
    
    setSensors(prevSensors => {
      const newSensors = [...prevSensors, newSensor];
      
      // Actualizar alertas
      const newAlerts = generateMockAlerts(newSensors);
      setAlerts(newAlerts);
      
      return newSensors;
    });
    
    handleSuccess(`Sensor personalizado ${newSensorId} agregado`);
  }, [handleSuccess]);

  // Configuración del intervalo de actualización
  const setUpdateInterval = useCallback((interval: number) => {
    setUpdateIntervalState(interval);
    handleSuccess(`Intervalo de actualización establecido a ${interval / 1000}s`);
  }, [handleSuccess]);

  // Pausar actualizaciones automáticas
  const pauseUpdates = useCallback(() => {
    setIsPaused(true);
    handleSuccess('Actualizaciones automáticas pausadas');
  }, [handleSuccess]);

  // Reanudar actualizaciones automáticas
  const resumeUpdates = useCallback(() => {
    setIsPaused(false);
    handleSuccess('Actualizaciones automáticas reanudadas');
  }, [handleSuccess]);

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

  const getStatistics = useCallback(() => {
    const total = sensors.length;
    const active = sensors.filter(s => s.status === 'active').length;
    const error = sensors.filter(s => s.status === 'error' || s.memoryStatus?.hasError).length;
    const inactive = sensors.filter(s => s.status === 'inactive').length;
    
    const byType = sensors.reduce((acc, sensor) => {
      acc[sensor.type] = (acc[sensor.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, active, error, inactive, byType };
  }, [sensors]);

  // Auto-generar al montar
  useEffect(() => {
    if (autoGenerate && sensors.length === 0) {
      generateSensors();
    }
  }, [autoGenerate, sensors.length, generateSensors]);

  // Configurar actualización automática
  useEffect(() => {
    if (updateInterval > 0 && sensors.length > 0 && !isPaused) {
      updateIntervalRef.current = setInterval(() => {
        if (mountedRef.current && !isProcessing) {
          updateAllSensors();
        }
      }, updateInterval);
      
      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
      };
    }
  }, [updateInterval, sensors.length, isPaused, isProcessing, updateAllSensors]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    sensors,
    alerts,
    isLoading,
    isProcessing,
    updateInterval,
    
    // Actions
    generateSensors,
    updateSensor,
    updateAllSensors,
    toggleSensorStatus,
    simulateError,
    resetSensor,
    removeSensor,
    addCustomSensor,
    
    // Configuration
    setUpdateInterval,
    pauseUpdates,
    resumeUpdates,
    
    // Utilities
    getSensorById,
    getSensorsByType,
    getActiveSensors,
    getErrorSensors,
    getStatistics
  };
};