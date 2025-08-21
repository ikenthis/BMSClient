// src/components/ViewerPanels/SensorsPanel/RealSensorsComponent.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  wsManager,
  Sensor, 
  SystemStatus 
} from '../../services/sensorApiService';
import { 
  sensorPanelStyles, 
  getStatusColor, 
  getStatusBadge, 
  getQualityColor, 
  getSensorItemClass 
} from './SensorPanelStyles';
import SensorCard from './Components/SensorCard';

interface RealSensorsProps {
  selectedSpace?: any;
  onSensorsChange: (sensors: Sensor[]) => void;
  onSystemStatusChange: (status: SystemStatus) => void;
  onWebSocketStatusChange: (connected: boolean) => void;
  onSensorSelect: (sensor: Sensor) => void;
  onError: (error: string | null) => void;
  onSuccess: (message: string | null) => void;
  selectedSensor: any;
}

const SensorIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 16 }) => {
  if (type === 'temperature') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>
      </svg>
    );
  }
  if (type === 'occupancy') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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

const RealSensorsComponent: React.FC<RealSensorsProps> = ({
  selectedSpace,
  onSensorsChange,
  onSystemStatusChange,
  onWebSocketStatusChange,
  onSensorSelect,
  onError,
  onSuccess,
  selectedSensor
}) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [errorSensors, setErrorSensors] = useState<{ memorySensors: Sensor[]; databaseSensors: Sensor[] }>({ memorySensors: [], databaseSensors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showErrorSensors, setShowErrorSensors] = useState(false);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(true);

  // Estado para formulario
  const [testSensorForm, setTestSensorForm] = useState({
    spaceGuid: selectedSpace?.guid || '',
    spaceName: selectedSpace?.name || 'Espacio de Prueba'
  });

  // Referencias para WebSocket
  const generalSubscriptions = useRef<Function[]>([]);

  // Cargar sensores reales
  const loadRealSensors = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando sensores reales de la API...');
      
      const [sensorsData, statusData, errorSensorsData] = await Promise.all([
        fetchAllSensors(),
        getSystemStatus(),
        fetchErrorSensors()
      ]);
      
      // Filtrar solo sensores de temperatura y ocupación
      const realSensorsFiltered = sensorsData.filter(sensor => 
        sensor.type === 'temperature' || sensor.type === 'occupancy'
      );
      
      setSensors(realSensorsFiltered);
      setErrorSensors(errorSensorsData);
      setAutoRecoveryEnabled(statusData.system?.recoveryEnabled ?? true);
      
      // Notificar al componente padre
      onSensorsChange(realSensorsFiltered);
      onSystemStatusChange(statusData);
      onError(null);
      
      console.log('✅ Sensores reales cargados:', {
        totalFromAPI: sensorsData.length,
        filteredReal: realSensorsFiltered.length,
        temperature: realSensorsFiltered.filter(s => s.type === 'temperature').length,
        occupancy: realSensorsFiltered.filter(s => s.type === 'occupancy').length
      });
      
    } catch (err: any) {
      console.error("❌ Error loading real sensors:", err);
      onError(`Error API: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onSensorsChange, onSystemStatusChange, onError]);

  // Inicializar WebSocket y cargar datos
  useEffect(() => {
    console.log('🔌 Inicializando componente de sensores reales...');
    
    // Conectar WebSocket
    wsManager.connect();
    
    // Verificar estado de la conexión
    const checkConnection = setInterval(() => {
      const connected = wsManager.isWebSocketConnected();
      onWebSocketStatusChange(connected);
    }, 1000);
    
    // Suscribirse a eventos del sistema
    const systemSub = wsManager.subscribe('system', (data) => {
      console.log('📊 System event REAL:', data);
      if (data.type === 'systemStatus') {
        onSystemStatusChange(data);
      }
    });
    
    // Suscribirse a errores
    const errorSub = wsManager.subscribe('errors', (data) => {
      console.log('❌ Error event REAL:', data);
      loadRealSensors();
    });
    
    // Suscribirse a cambios de estado
    const statusSub = wsManager.subscribe('status', (data) => {
      console.log('🔄 Status event REAL:', data);
      loadRealSensors();
    });
    
    generalSubscriptions.current = [systemSub, errorSub, statusSub];
    
    // Cargar datos iniciales
    loadRealSensors();
    
    return () => {
      clearInterval(checkConnection);
      generalSubscriptions.current.forEach(unsub => unsub());
    };
  }, [loadRealSensors, onWebSocketStatusChange, onSystemStatusChange]);

  // Funciones de control
  const handleStartSensor = async (sensorId: string) => {
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await startSensor(sensorId);
      onSuccess(`Sensor ${sensorId} iniciado correctamente`);
      await loadRealSensors();
    } catch (err: any) {
      onError(err.message || 'Error al iniciar sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleStopSensor = async (sensorId: string) => {
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await stopSensor(sensorId);
      onSuccess(`Sensor ${sensorId} detenido correctamente`);
      await loadRealSensors();
    } catch (err: any) {
      onError(err.message || 'Error al detener sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleResetSensor = async (sensorId: string) => {
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await resetSensor(sensorId);
      onSuccess(`Sensor ${sensorId} reiniciado correctamente`);
      await loadRealSensors();
    } catch (err: any) {
      onError(err.message || 'Error al reiniciar sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleResetAllErrorSensors = async () => {
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      const result = await resetErrorSensors();
      onSuccess(`${result.success} sensores reiniciados correctamente, ${result.failed} fallidos`);
      await loadRealSensors();
    } catch (err: any) {
      onError(err.message || 'Error al reiniciar sensores');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleSetAutoRecovery = async (enabled: boolean) => {
    setIsProcessing(true);
    onError(null);
    
    try {
      const result = await setAutoRecovery(enabled);
      setAutoRecoveryEnabled(result);
      onSuccess(`Recuperación automática ${result ? 'habilitada' : 'deshabilitada'}`);
    } catch (err: any) {
      onError(err.message || 'Error al configurar recuperación automática');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleCreateTestSensors = async () => {
    if (!testSensorForm.spaceGuid) {
      onError('Por favor, ingresa un GUID de espacio');
      return;
    }

    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await createTestSensors(testSensorForm.spaceGuid, testSensorForm.spaceName);
      onSuccess('Sensores de prueba creados correctamente');
      setShowCreateForm(false);
      await loadRealSensors();
    } catch (err: any) {
      onError(err.message || 'Error al crear sensores de prueba');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 5000);
    }
  };

  if (isLoading && sensors.length === 0) {
    return (
      <div className={sensorPanelStyles.states.loading}>
        <div className={sensorPanelStyles.states.loadingSpinner}></div>
        <div className="text-xs mt-2">Cargando sensores reales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Panel de errores si los hay */}
      {errorSensors.memorySensors.length > 0 && (
        <div className="bg-red-900 bg-opacity-20 border border-red-800 rounded p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-red-400 text-sm font-semibold">
              ⚠️ Errores en Sensores Reales ({errorSensors.memorySensors.length})
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowErrorSensors(!showErrorSensors)}
                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
              >
                {showErrorSensors ? 'Ocultar' : 'Ver'}
              </button>
              <button
                onClick={handleResetAllErrorSensors}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                disabled={isProcessing}
              >
                Reiniciar Todos
              </button>
            </div>
          </div>

          {/* Switch para recuperación automática */}
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-xs">Auto-recuperación:</span>
            <button
              onClick={() => handleSetAutoRecovery(!autoRecoveryEnabled)}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                autoRecoveryEnabled ? 'bg-green-600' : 'bg-gray-600'
              }`}
              disabled={isProcessing}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                  autoRecoveryEnabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs">{autoRecoveryEnabled ? 'ON' : 'OFF'}</span>
          </div>

          {/* Lista de errores */}
          {showErrorSensors && (
            <div className="mt-2 space-y-1">
              {errorSensors.memorySensors.map(sensor => (
                <div key={sensor.sensorId} className="bg-gray-800 bg-opacity-60 rounded p-2 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <SensorIcon type={sensor.type} size={16} />
                    <div>
                      <div className="text-xs font-medium">{sensor.name}</div>
                      <div className="text-xs text-gray-400">{sensor.sensorId}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResetSensor(sensor.sensorId)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                    disabled={isProcessing}
                  >
                    Reset
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botón para crear sensores de prueba */}
      <div className="mb-3">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
          disabled={isProcessing}
        >
          + Crear Sensores de Prueba
        </button>

        {/* Formulario de creación */}
        {showCreateForm && (
          <div className="mt-2 p-3 bg-gray-700 rounded">
            <h4 className="text-sm font-medium mb-2">Crear Sensores de Prueba</h4>
            <input
              type="text"
              placeholder="GUID del espacio"
              value={testSensorForm.spaceGuid}
              onChange={(e) => setTestSensorForm({...testSensorForm, spaceGuid: e.target.value})}
              className="w-full px-3 py-2 bg-gray-600 rounded text-sm mb-2"
            />
            <input
              type="text"
              placeholder="Nombre del espacio"
              value={testSensorForm.spaceName}
              onChange={(e) => setTestSensorForm({...testSensorForm, spaceName: e.target.value})}
              className="w-full px-3 py-2 bg-gray-600 rounded text-sm mb-2"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreateTestSensors}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex-1"
                disabled={isProcessing}
              >
                {isProcessing ? 'Creando...' : 'Crear'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de sensores reales */}
      {sensors.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          <div className="text-sm">No hay sensores reales disponibles</div>
          <div className="text-xs mt-1">Verifica tu conexión API</div>
        </div>
      ) : (
        sensors.map(sensor => {
          const hasError = errorSensors.memorySensors.some(
            errSensor => errSensor.sensorId === sensor.sensorId
          );
          
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
                      <span className="text-green-400 text-xs ml-2">
                        {sensor.type === 'temperature' ? '🌡️' : '👥'} Real
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
                  </div>
                </div>
                <div className={sensorPanelStyles.sensorItem.actions}>
                  <span className={getStatusBadge(sensor.status, hasError)}>
                    {hasError ? 'Error' : sensor.status}
                  </span>
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
                  ) : sensor.status === 'inactive' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartSensor(sensor.sensorId);
                      }}
                      className={`${sensorPanelStyles.buttons.success} ${sensorPanelStyles.buttons.small} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                      disabled={isProcessing}
                    >
                      Iniciar
                    </button>
                  ) : sensor.status === 'active' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopSensor(sensor.sensorId);
                      }}
                      className={`${sensorPanelStyles.buttons.danger} ${sensorPanelStyles.buttons.small} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                      disabled={isProcessing}
                    >
                      Detener
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default RealSensorsComponent;