// src/components/ViewerPanels/SensorsPanel/MockSensorsComponent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  sensorPanelStyles, 
  getStatusColor, 
  getStatusBadge, 
  getQualityColor, 
  getSensorItemClass 
} from './SensorPanelStyles';
import { 
  createMockSensors, 
  updateMockSensorValue, 
  MockSensorData 
} from '../../utils/mockSensorData';

interface MockSensorsProps {
  onSensorsChange: (sensors: MockSensorData[]) => void;
  onSensorSelect: (sensor: MockSensorData) => void;
  onError: (error: string | null) => void;
  onSuccess: (message: string | null) => void;
  selectedSensor: any;
}

const SensorIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 16 }) => {
  if (type === 'humidity') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    );
  }
  if (type === 'co2') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12h8"/>
        <path d="M12 8v8"/>
      </svg>
    );
  }
  if (type === 'light') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6m11-11h-6m-6 0H1"/>
    </svg>
  );
};

const MockSensorsComponent: React.FC<MockSensorsProps> = ({
  onSensorsChange,
  onSensorSelect,
  onError,
  onSuccess,
  selectedSensor
}) => {
  const [sensors, setSensors] = useState<MockSensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const mockUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Inicializar sensores ficticios
  useEffect(() => {
    console.log('🔵 Inicializando sensores ficticios...');
    
    const initializeMockSensors = async () => {
      setIsLoading(true);
      try {
        // Crear sensores ficticios solo para CO2, humedad e iluminación
        const allMockSensors = createMockSensors();
        const filteredMockSensors = allMockSensors.filter(sensor => 
          sensor.type === 'humidity' || 
          sensor.type === 'co2' || 
          sensor.type === 'light'
        );
        
        setSensors(filteredMockSensors);
        
        // Usar setTimeout para evitar setState durante render
        setTimeout(() => {
          onSensorsChange(filteredMockSensors);
        }, 0);
        
        console.log('✅ Sensores ficticios inicializados:', {
          total: filteredMockSensors.length,
          humidity: filteredMockSensors.filter(s => s.type === 'humidity').length,
          co2: filteredMockSensors.filter(s => s.type === 'co2').length,
          light: filteredMockSensors.filter(s => s.type === 'light').length
        });
        
      } catch (error) {
        console.error('❌ Error inicializando sensores ficticios:', error);
        onError('Error al inicializar sensores ficticios');
      } finally {
        setIsLoading(false);
      }
    };

    // Usar setTimeout para asegurar que no se ejecute durante el render
    const timer = setTimeout(() => {
      initializeMockSensors();
    }, 0);

    return () => clearTimeout(timer);
  }, []); // Remover dependencias para evitar re-ejecuciones

  // Configurar actualizaciones automáticas
  useEffect(() => {
    if (sensors.length > 0) {
      // Configurar actualizaciones automáticas cada 30 segundos
      mockUpdateInterval.current = setInterval(() => {
        setSensors(prevSensors => {
          const updatedSensors = prevSensors.map(sensor => updateMockSensorValue(sensor));
          
          // Usar setTimeout para evitar setState durante render
          setTimeout(() => {
            onSensorsChange(updatedSensors);
          }, 0);
          
          console.log('🔄 Sensores ficticios actualizados automáticamente');
          return updatedSensors;
        });
      }, 30000);

      return () => {
        if (mockUpdateInterval.current) {
          clearInterval(mockUpdateInterval.current);
        }
      };
    }
  }, [sensors.length, onSensorsChange]);

  // Funciones de control para sensores ficticios
  const handleResetSensor = (sensorId: string) => {
    setIsProcessing(true);
    
    setSensors(prev => {
      const updated = prev.map(sensor => {
        if (sensor.sensorId === sensorId) {
          return updateMockSensorValue(sensor);
        }
        return sensor;
      });
      
      // Usar setTimeout para evitar setState durante render
      setTimeout(() => {
        onSensorsChange(updated);
      }, 0);
      
      return updated;
    });
    
    onSuccess(`Sensor ficticio ${sensorId} reiniciado (simulado)`);
    
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(null);
    }, 1000);
  };

  const handleToggleStatus = (sensorId: string) => {
    setIsProcessing(true);
    
    setSensors(prev => {
      const updated = prev.map(sensor => {
        if (sensor.sensorId === sensorId) {
          const newStatus = sensor.status === 'active' ? 'inactive' : 'active';
          return {
            ...sensor,
            status: newStatus as 'active' | 'inactive' | 'error' | 'maintenance'
          };
        }
        return sensor;
      });
      
      // Usar setTimeout para evitar setState durante render
      setTimeout(() => {
        onSensorsChange(updated);
      }, 0);
      
      return updated;
    });
    
    onSuccess(`Estado del sensor ficticio ${sensorId} cambiado`);
    
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(null);
    }, 1000);
  };

  const handleSimulateError = (sensorId: string) => {
    setIsProcessing(true);
    
    setSensors(prev => {
      const updated = prev.map(sensor => {
        if (sensor.sensorId === sensorId) {
          return {
            ...sensor,
            status: 'error' as 'active' | 'inactive' | 'error' | 'maintenance',
            memoryStatus: {
              isRunning: false,
              hasError: true,
              errorMessage: 'Error simulado para demostración'
            }
          };
        }
        return sensor;
      });
      
      // Usar setTimeout para evitar setState durante render
      setTimeout(() => {
        onSensorsChange(updated);
      }, 0);
      
      return updated;
    });
    
    onSuccess(`Error simulado en sensor ${sensorId}`);
    
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(null);
    }, 1000);
  };

  const handleUpdateAll = () => {
    setIsProcessing(true);
    
    setSensors(prev => {
      const updated = prev.map(sensor => updateMockSensorValue(sensor));
      
      // Usar setTimeout para evitar setState durante render
      setTimeout(() => {
        onSensorsChange(updated);
      }, 0);
      
      return updated;
    });
    
    onSuccess('Todos los sensores ficticios actualizados');
    
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess(null);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className={sensorPanelStyles.states.loading}>
        <div className={sensorPanelStyles.states.loadingSpinner}></div>
        <div className="text-xs mt-2">Inicializando sensores ficticios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Controles para sensores ficticios */}
      <div className="bg-blue-900 bg-opacity-20 border border-blue-800 rounded p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-blue-400 text-sm font-semibold">
            🔵 Controles de Sensores Ficticios
          </h4>
          <button
            onClick={handleUpdateAll}
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
            disabled={isProcessing}
          >
            {isProcessing ? 'Actualizando...' : 'Actualizar Todos'}
          </button>
        </div>
        
        <div className="text-xs text-blue-200 space-y-1">
          <p>• <strong>Actualizaciones:</strong> Automáticas cada 30 segundos</p>
          <p>• <strong>Datos:</strong> Generados algorítmicamente con valores realistas</p>
          <p>• <strong>Propósito:</strong> Demostración mientras implementas sensores reales</p>
        </div>
      </div>

      {/* Lista de sensores ficticios */}
      {sensors.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          <div className="text-sm">No hay sensores ficticios disponibles</div>
          <div className="text-xs mt-1">Error en la inicialización</div>
        </div>
      ) : (
        sensors.map(sensor => {
          const hasError = sensor.memoryStatus?.hasError || false;
          
          return (
            <div
              key={sensor.sensorId}
              onClick={() => onSensorSelect(sensor)}
              className={getSensorItemClass(sensor, selectedSensor, hasError)}
            >
              <div className={sensorPanelStyles.sensorItem.content}>
                <div className={sensorPanelStyles.sensorItem.info}>
                  <div className={`${sensorPanelStyles.sensorItem.icon} ${getStatusColor(sensor.status, hasError)}`}>
                    <SensorIcon type={sensor.type} size={20} />
                  </div>
                  <div className={sensorPanelStyles.sensorItem.details}>
                    <h4 className={sensorPanelStyles.sensorItem.name}>
                      {sensor.name}
                      <span className="text-blue-400 text-xs ml-2">
                        {sensor.type === 'humidity' ? '💧' : 
                         sensor.type === 'co2' ? '🫁' : 
                         sensor.type === 'light' ? '💡' : '📊'} Ficticio
                      </span>
                    </h4>
                    <p className={sensorPanelStyles.sensorItem.location}>
                      {sensor.location?.spaceName || 'Sin ubicación'}
                    </p>
                    {sensor.lastReading && (
                      <p className={sensorPanelStyles.sensorItem.reading}>
                        <span className={getQualityColor(sensor.lastReading.quality, sensor.lastReading.value, sensor.config?.thresholds)}>
                          {sensor.lastReading.value?.toFixed(1)} {sensor.config?.unit}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(sensor.lastReading.timestamp).toLocaleTimeString()}
                        </span>
                      </p>
                    )}
                    <div className="text-xs text-blue-400 mt-1">
                      Actualizado cada 30s • Datos simulados
                    </div>
                  </div>
                </div>
                <div className={sensorPanelStyles.sensorItem.actions}>
                  <span className={getStatusBadge(sensor.status, hasError)}>
                    {hasError ? 'Error' : sensor.status}
                  </span>
                  
                  {/* Menú de controles ficticios */}
                  <div className="flex flex-col space-y-1">
                    {hasError ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetSensor(sensor.sensorId);
                        }}
                        className={`${sensorPanelStyles.buttons.success} ${sensorPanelStyles.buttons.small} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                        disabled={isProcessing}
                      >
                        Reiniciar
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(sensor.sensorId);
                          }}
                          className={`${sensor.status === 'active' ? sensorPanelStyles.buttons.danger : sensorPanelStyles.buttons.success} ${sensorPanelStyles.buttons.small} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                          disabled={isProcessing}
                        >
                          {sensor.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSimulateError(sensor.sensorId);
                          }}
                          className={`${sensorPanelStyles.buttons.warning} ${sensorPanelStyles.buttons.small} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                          disabled={isProcessing}
                        >
                          Simular Error
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Información adicional */}
      <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded border border-gray-700">
        <h5 className="text-xs font-semibold text-gray-300 mb-2">Estado del Sistema Ficticio</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Total:</span>
            <span className="ml-2 font-bold text-blue-400">{sensors.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Activos:</span>
            <span className="ml-2 font-bold text-green-400">
              {sensors.filter(s => s.status === 'active').length}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Con Error:</span>
            <span className="ml-2 font-bold text-red-400">
              {sensors.filter(s => s.status === 'error' || s.memoryStatus?.hasError).length}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Inactivos:</span>
            <span className="ml-2 font-bold text-gray-400">
              {sensors.filter(s => s.status === 'inactive').length}
            </span>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          <p>💡 <strong>Tip:</strong> Haz clic en un sensor para ver sus visualizaciones específicas</p>
        </div>
      </div>
    </div>
  );
};

export default MockSensorsComponent;