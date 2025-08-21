// src/components/ViewerPanels/SensorsPanel/SensorsPanelReal.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  fetchAllSensors, 
  fetchSensorDetails, 
  fetchSensorReadings,
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
  SensorReading,
  SystemStatus 
} from '../../services/sensorApiService';
import { 
  sensorPanelStyles, 
  getStatusColor, 
  getStatusBadge, 
  getQualityColor, 
  getSensorItemClass,
  getSensorIcon,
  customScrollbarCSS 
} from './SensorPanelStyles';
import {
  TemporalChart,
  SensorVisualization,
  MultiIndicatorGrid,
  ComparisonBarChart,
  MultiParameterRadar
} from './SensorVisualizations';

interface SensorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpace?: any;
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

const SensorsPanelReal: React.FC<SensorsPanelProps> = ({ isOpen, onClose, selectedSpace }) => {
  // Estados reales conectados a tu API
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [currentReading, setCurrentReading] = useState<Sensor['lastReading'] | null>(null);
  const [historicalReadings, setHistoricalReadings] = useState<SensorReading[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [errorSensors, setErrorSensors] = useState<{
    memorySensors: Sensor[];
    databaseSensors: Sensor[];
  }>({ memorySensors: [], databaseSensors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showErrorSensors, setShowErrorSensors] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Estado para el formulario de creación de sensores de prueba
  const [testSensorForm, setTestSensorForm] = useState({
    spaceGuid: selectedSpace?.guid || '',
    spaceName: selectedSpace?.name || 'Espacio de Prueba'
  });

  // Referencias para desuscribirse de WebSocket
  const sensorSubscriptions = useRef<Record<string, Function>>({});
  const generalSubscriptions = useRef<Function[]>([]);

  // Cargar lista de sensores y estado del sistema REAL
  const loadSensorsAndStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Cargando datos reales de la API...');
      
      const [sensorsData, statusData, errorSensorsData] = await Promise.all([
        fetchAllSensors(),           // TU API REAL
        getSystemStatus(),           // TU API REAL
        fetchErrorSensors()          // TU API REAL
      ]);
      
      setSensors(sensorsData);
      setSystemStatus(statusData);
      setErrorSensors(errorSensorsData);
      setAutoRecoveryEnabled(statusData.system?.recoveryEnabled ?? true);
      setError(null);
      
      console.log('✅ Datos reales cargados exitosamente:', {
        sensorsCount: sensorsData.length,
        activeCount: statusData.sensors?.active,
        errorCount: statusData.sensors?.errorInMemory
      });
      
    } catch (err: any) {
      console.error("❌ Error loading real sensors:", err);
      setError(err.message || 'Error al cargar sensores reales de la API');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos históricos REALES del sensor seleccionado
  const fetchRealSensorData = useCallback(async (sensorId: string) => {
    if (!sensorId) return;
    
    try {
      console.log(`🔄 Cargando datos reales del sensor: ${sensorId}`);
      
      const [details, history] = await Promise.all([
        fetchSensorDetails(sensorId),      // TU API REAL
        fetchSensorReadings(sensorId, 100) // TU API REAL - últimas 100 lecturas
      ]);
      
      setSelectedSensor(details);
      setCurrentReading(details.lastReading || null);
      
      // Ordenar lecturas por timestamp
      const sortedReadings = history.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setHistoricalReadings(sortedReadings);
      
      console.log('✅ Datos del sensor cargados:', {
        sensorId,
        readingsCount: sortedReadings.length,
        lastValue: details.lastReading?.value,
        lastTimestamp: details.lastReading?.timestamp
      });
      
      setError(null);
      
    } catch (err: any) {
      console.error(`❌ Error fetching real sensor data:`, err);
      setError(err.message || 'Error al cargar datos del sensor desde la API');
    }
  }, []);

  // Conectar WebSocket REAL cuando el panel se abre
  useEffect(() => {
    if (isOpen) {
      console.log('🔌 Conectando WebSocket real...');
      
      // Conectar a tu WebSocket real
      wsManager.connect();
      
      // Verificar estado de conexión
      const checkConnection = setInterval(() => {
        const connected = wsManager.isWebSocketConnected();
        setWsConnected(connected);
        if (connected !== wsConnected) {
          console.log('📡 WebSocket status changed:', connected ? 'Conectado' : 'Desconectado');
        }
      }, 1000);
      
      // Suscribirse a eventos REALES del sistema
      const systemSub = wsManager.subscribe('system', (data) => {
        console.log('📊 System event REAL:', data);
        if (data.type === 'systemStatus') {
          setSystemStatus(data);
          setAutoRecoveryEnabled(data.system?.recoveryEnabled ?? true);
        }
      });
      
      // Suscribirse a errores REALES
      const errorSub = wsManager.subscribe('errors', (data) => {
        console.log('❌ Error event REAL:', data);
        loadSensorsAndStatus(); // Recargar cuando hay errores
      });
      
      // Suscribirse a cambios de estado REALES
      const statusSub = wsManager.subscribe('status', (data) => {
        console.log('🔄 Status event REAL:', data);
        loadSensorsAndStatus();
        
        // Si es el sensor seleccionado, actualizar detalles
        if (selectedSensor && data.sensorId === selectedSensor.sensorId) {
          fetchRealSensorData(data.sensorId);
        }
      });
      
      // Guardar referencia para desuscribirse después
      generalSubscriptions.current = [systemSub, errorSub, statusSub];
      
      // Cargar datos iniciales REALES
      loadSensorsAndStatus();
      
      return () => {
        clearInterval(checkConnection);
        // Desuscribirse de todos los eventos
        generalSubscriptions.current.forEach(unsub => unsub());
      };
    } else {
      // Limpiar estado cuando se cierra
      setSensors([]);
      setSelectedSensor(null);
      setCurrentReading(null);
      setHistoricalReadings([]);
      setSystemStatus(null);
      setErrorSensors({ memorySensors: [], databaseSensors: [] });
      
      // Desconectar WebSocket
      wsManager.disconnect();
    }
  }, [isOpen, loadSensorsAndStatus]);

  // Cargar datos REALES del sensor seleccionado
  useEffect(() => {
    if (selectedSensor?.sensorId) {
      fetchRealSensorData(selectedSensor.sensorId);
      
      // Suscribirse a actualizaciones EN TIEMPO REAL del sensor
      const sensorSub = wsManager.subscribeSensor(selectedSensor.sensorId, (data) => {
        console.log(`📡 Sensor ${selectedSensor.sensorId} update REAL:`, data);
        
        if (data.type === 'reading') {
          // Actualizar lectura actual con datos REALES
          const newReading: SensorReading = {
            _id: data._id || `reading-${Date.now()}`,
            sensorId: data.sensorId,
            value: data.value,
            unit: data.unit,
            quality: data.quality,
            timestamp: data.timestamp,
            additionalData: data.additionalData
          };
          
          // Actualizar lectura actual
          setCurrentReading({
            value: data.value,
            timestamp: data.timestamp,
            quality: data.quality
          });
          
          // Añadir al histórico real
          setHistoricalReadings(prev => {
            const newReadings = [...prev, newReading].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            return newReadings.slice(-100); // Mantener últimas 100
          });
        }
        
        // Si es un cambio de estado, actualizar detalles del sensor
        if (data.type === 'status' || data.type === 'error') {
          fetchRealSensorData(selectedSensor.sensorId);
        }
      });
      
      return () => sensorSub();
    }
  }, [selectedSensor?.sensorId, fetchRealSensorData]);

  // Manejo de eventos con APIs REALES
  const handleSensorSelect = (sensor: Sensor) => {
    // Desuscribirse del sensor anterior si existe
    if (selectedSensor?.sensorId && sensorSubscriptions.current[selectedSensor.sensorId]) {
      sensorSubscriptions.current[selectedSensor.sensorId]();
      delete sensorSubscriptions.current[selectedSensor.sensorId];
    }
    
    setSelectedSensor(sensor);
    setCurrentReading(sensor.lastReading || null);
    setHistoricalReadings([]);
  };

  const handleStartSensor = async (sensorId: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await startSensor(sensorId); // TU API REAL
      setSuccessMessage(`Sensor ${sensorId} iniciado correctamente`);
      await loadSensorsAndStatus();
      
      if (selectedSensor?.sensorId === sensorId) {
        const updatedSensor = await fetchSensorDetails(sensorId); // TU API REAL
        setSelectedSensor(updatedSensor);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleStopSensor = async (sensorId: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await stopSensor(sensorId); // TU API REAL
      setSuccessMessage(`Sensor ${sensorId} detenido correctamente`);
      await loadSensorsAndStatus();
      
      if (selectedSensor?.sensorId === sensorId) {
        const updatedSensor = await fetchSensorDetails(sensorId); // TU API REAL
        setSelectedSensor(updatedSensor);
      }
    } catch (err: any) {
      setError(err.message || 'Error al detener sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleResetSensor = async (sensorId: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await resetSensor(sensorId); // TU API REAL
      setSuccessMessage(`Sensor ${sensorId} reiniciado correctamente`);
      await loadSensorsAndStatus();
      
      if (selectedSensor?.sensorId === sensorId) {
        const updatedSensor = await fetchSensorDetails(sensorId); // TU API REAL
        setSelectedSensor(updatedSensor);
      }
    } catch (err: any) {
      setError(err.message || 'Error al reiniciar sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleResetAllErrorSensors = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const result = await resetErrorSensors(); // TU API REAL
      setSuccessMessage(`${result.success} sensores reiniciados correctamente, ${result.failed} fallidos`);
      await loadSensorsAndStatus();
    } catch (err: any) {
      setError(err.message || 'Error al reiniciar sensores');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleSetAutoRecovery = async (enabled: boolean) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await setAutoRecovery(enabled); // TU API REAL
      setAutoRecoveryEnabled(result);
      setSuccessMessage(`Recuperación automática ${result ? 'habilitada' : 'deshabilitada'}`);
    } catch (err: any) {
      setError(err.message || 'Error al configurar recuperación automática');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleCreateTestSensors = async () => {
    if (!testSensorForm.spaceGuid) {
      setError('Por favor, ingresa un GUID de espacio');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await createTestSensors(testSensorForm.spaceGuid, testSensorForm.spaceName); // TU API REAL
      setSuccessMessage('Sensores de prueba creados correctamente');
      setShowCreateForm(false);
      await loadSensorsAndStatus();
    } catch (err: any) {
      setError(err.message || 'Error al crear sensores de prueba');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  // Función para verificar fuente de datos
  const getDataSource = () => {
    if (sensors.length === 0) return 'Sin datos';
    
    const hasRealApiStructure = sensors.every(sensor => 
      sensor.sensorId && 
      sensor.name && 
      sensor.type &&
      sensor.location
    );
    
    if (hasRealApiStructure && wsConnected) {
      return '🟢 DATOS REALES (API + WebSocket)';
    } else if (hasRealApiStructure) {
      return '🟡 DATOS REALES (Solo API)';
    } else {
      return '🔴 DATOS SIMULADOS';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={sensorPanelStyles.container}>
      {/* Header fijo con indicador de datos reales */}
      <div className={sensorPanelStyles.header.main}>
        <div className={sensorPanelStyles.header.info}>
          <h2 className={sensorPanelStyles.header.title}>Sistema de Sensores IoT</h2>
          
          {/* Indicador de fuente de datos */}
          <div className="bg-gray-800 px-3 py-1 rounded-lg">
            <span className="text-sm font-medium">{getDataSource()}</span>
          </div>
          
          {systemStatus && (
            <div className={sensorPanelStyles.header.systemInfo}>
              <span className={sensorPanelStyles.text.label}>Sistema:</span>
              <span className={systemStatus.system?.isRunning ? sensorPanelStyles.text.systemActive : sensorPanelStyles.text.systemInactive}>
                {systemStatus.system?.isRunning ? 'Activo' : 'Inactivo'}
              </span>
              <span className={`${sensorPanelStyles.text.label} ml-2`}>Sensores activos:</span>
              <span className={sensorPanelStyles.text.activeCount}>{systemStatus.sensors?.active || 0}</span>
              <span className={`ml-2 ${wsConnected ? sensorPanelStyles.text.wsConnected : sensorPanelStyles.text.wsDisconnected}`}>
                {wsConnected ? '🔌 WebSocket Conectado' : '⚠️ WebSocket Desconectado'}
              </span>
            </div>
          )}
        </div>
        
        <div className={sensorPanelStyles.header.controls}>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={sensorPanelStyles.buttons.purple}
          >
            {showDashboard ? 'Vista Lista' : 'Dashboard'}
          </button>
          <button 
            onClick={onClose} 
            className={sensorPanelStyles.header.closeButton}
          >
            ×
          </button>
        </div>
      </div>

      {/* Mensajes de estado fijos */}
      {(error || successMessage || isLoading) && (
        <div className={sensorPanelStyles.messages.container}>
          {error && (
            <div className={sensorPanelStyles.messages.error}>
              ❌ {error}
            </div>
          )}
          {successMessage && (
            <div className={sensorPanelStyles.messages.success}>
              ✅ {successMessage}
            </div>
          )}
          {isLoading && (
            <div className={sensorPanelStyles.messages.loading}>
              <div className={sensorPanelStyles.states.loadingText}></div>
              Cargando datos reales de la API...
            </div>
          )}
        </div>
      )}

      {/* Panel de errores */}
      {systemStatus && (systemStatus.sensors.errorInMemory > 0 || systemStatus.sensors.error > 0) && (
        <div className={sensorPanelStyles.errorPanel.container}>
          <div className={sensorPanelStyles.errorPanel.header}>
            <h3 className={sensorPanelStyles.errorPanel.title}>
              ⚠️ Sensores con Error: {systemStatus.sensors.errorInMemory} (en memoria) / {systemStatus.sensors.error} (en BD)
            </h3>
            <div className={sensorPanelStyles.errorPanel.controls}>
              <button
                onClick={() => setShowErrorSensors(!showErrorSensors)}
                className={sensorPanelStyles.buttons.primary}
              >
                {showErrorSensors ? 'Ocultar Detalles' : 'Ver Detalles'}
              </button>
              <button
                onClick={handleResetAllErrorSensors}
                className={`${sensorPanelStyles.buttons.success} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? 'Procesando...' : 'Reiniciar Todos'}
              </button>
            </div>
          </div>
          
          {/* Switch para activar/desactivar recuperación automática */}
          <div className={sensorPanelStyles.toggle.container}>
            <span className={sensorPanelStyles.toggle.label}>Recuperación Automática:</span>
            <button
              onClick={() => handleSetAutoRecovery(!autoRecoveryEnabled)}
              className={`${sensorPanelStyles.toggle.switch} ${
                autoRecoveryEnabled ? sensorPanelStyles.toggle.switchEnabled : sensorPanelStyles.toggle.switchDisabled
              }`}
              disabled={isProcessing}
            >
              <span
                className={`${sensorPanelStyles.toggle.indicator} ${
                  autoRecoveryEnabled ? sensorPanelStyles.toggle.indicatorEnabled : sensorPanelStyles.toggle.indicatorDisabled
                }`}
              />
            </button>
            <span className={sensorPanelStyles.toggle.label}>{autoRecoveryEnabled ? 'Activada' : 'Desactivada'}</span>
          </div>
          
          {/* Lista de sensores con error */}
          {showErrorSensors && (
            <div className={sensorPanelStyles.errorPanel.list}>
              <div className="grid grid-cols-1 gap-2">
                {errorSensors.memorySensors.map(sensor => (
                  <div key={sensor.sensorId} className={sensorPanelStyles.errorPanel.item}>
                    <div className={sensorPanelStyles.errorPanel.itemContent}>
                      <div className={sensorPanelStyles.text.errorText}>
                        <SensorIcon type={sensor.type} />
                      </div>
                      <div>
                        <div className={sensorPanelStyles.errorPanel.itemDetails}>{sensor.name}</div>
                        <div className={sensorPanelStyles.errorPanel.itemId}>{sensor.sensorId}</div>
                        {sensor.errorMessage && (
                          <div className={sensorPanelStyles.errorPanel.itemError}>{sensor.errorMessage}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResetSensor(sensor.sensorId)}
                      className={`${sensorPanelStyles.buttons.success} ${sensorPanelStyles.buttons.small} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                      disabled={isProcessing}
                    >
                      Reiniciar
                    </button>
                  </div>
                ))}
                {errorSensors.memorySensors.length === 0 && (
                  <div className={sensorPanelStyles.errorPanel.emptyState}>
                    No hay sensores con error en memoria actualmente
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenido principal con scroll */}
      <div className={sensorPanelStyles.content.main}>
        {sensors.length === 0 && !isLoading ? (
          <div className={sensorPanelStyles.states.empty}>
            <div className={sensorPanelStyles.states.emptyContent}>
              <div className={sensorPanelStyles.states.emptyIcon}>📡</div>
              <p className={sensorPanelStyles.states.emptyTitle}>No hay sensores disponibles</p>
              <p className={sensorPanelStyles.states.emptyDescription}>
                Verifica que tu API esté funcionando y que existan sensores configurados
              </p>
              <button
                onClick={loadSensorsAndStatus}
                className={`${sensorPanelStyles.buttons.primary} mt-4`}
              >
                🔄 Reintentar Carga
              </button>
            </div>
          </div>
        ) : showDashboard ? (
          /* Vista Dashboard con datos REALES */
          <div className={sensorPanelStyles.content.dashboard}>
            <div className={sensorPanelStyles.infoPanel.base}>
              <div className={sensorPanelStyles.dashboard.header}>
                <h3 className={sensorPanelStyles.dashboard.title}>Dashboard de Sensores Reales</h3>
                <div className={sensorPanelStyles.dashboard.timestamp}>
                  Última actualización: {new Date().toLocaleTimeString()}
                </div>
              </div>
              
              {/* Grid de sensores reales con visualizaciones mejoradas */}
              <MultiIndicatorGrid 
                sensors={sensors.map(sensor => ({
                  sensor,
                  currentReading: sensor.lastReading,
                  max: sensor.type === 'co2' ? 1000 : 
                       sensor.type === 'occupancy' ? 20 : 
                       sensor.type === 'light' ? 1000 : 100
                }))}
              />

              {/* Gráficos comparativos con datos reales */}
              <div className={sensorPanelStyles.dashboard.chartsGrid}>
                <div className={sensorPanelStyles.dashboard.chartCard}>
                  <h4 className="font-semibold mb-3">Comparación de Valores</h4>
                  <ComparisonBarChart 
                    sensors={sensors.filter(s => s.lastReading?.value).map(sensor => ({
                      name: sensor.name,
                      value: sensor.lastReading?.value || 0,
                      type: sensor.type
                    }))}
                  />
                </div>

                <div className={sensorPanelStyles.dashboard.chartCard}>
                  <h4 className="font-semibold mb-3">Resumen de Calidad</h4>
                  <MultiParameterRadar 
                    parameters={sensors.slice(0, 5).map(sensor => ({
                      label: sensor.name.split(' ')[0], // Nombre corto
                      value: sensor.lastReading?.value || 0,
                      max: sensor.type === 'co2' ? 1000 : 
                           sensor.type === 'occupancy' ? 20 : 100,
                      color: sensor.status === 'active' ? '#10B981' : '#EF4444'
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Lista detallada de sensores reales */}
            <div className={sensorPanelStyles.detailedList.container}>
              <h3 className={sensorPanelStyles.dashboard.title}>Todos los Sensores</h3>
              <div className="space-y-4">
                {sensors.map(sensor => (
                  <div key={sensor.sensorId} className={sensorPanelStyles.detailedList.item}>
                    <div className={sensorPanelStyles.detailedList.itemInfo}>
                      <div className={sensorPanelStyles.detailedList.itemIcon}>
                        {getSensorIcon(sensor.type)}
                      </div>
                      <div>
                        <h4 className={sensorPanelStyles.detailedList.itemDetails}>{sensor.name}</h4>
                        <p className={sensorPanelStyles.detailedList.itemLocation}>
                          {sensor.location?.spaceName || 'Sin ubicación'}
                        </p>
                        <p className={sensorPanelStyles.detailedList.itemReading}>
                          {sensor.lastReading?.value?.toFixed(1)} {sensor.config?.unit}
                        </p>
                      </div>
                    </div>
                    <div className={sensorPanelStyles.detailedList.itemActions}>
                      <span className={getStatusBadge(sensor.status, sensor.memoryStatus?.hasError)}>
                        {sensor.memoryStatus?.hasError ? 'Error' : sensor.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedSensor(sensor);
                          setShowDashboard(false);
                        }}
                        className={sensorPanelStyles.buttons.primary}
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Vista de lista original con datos REALES y scroll mejorado */
          <div className={sensorPanelStyles.content.split}>
            {/* Panel izquierdo con sensores reales */}
            <div className={sensorPanelStyles.leftPanel.container}>
              {/* Controles fijos */}
              <div className={sensorPanelStyles.leftPanel.header}>
                <div className={sensorPanelStyles.leftPanel.controls}>
                  <h3 className={sensorPanelStyles.leftPanel.title}>Sensores Reales ({sensors.length})</h3>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className={`${sensorPanelStyles.buttons.primary} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                    disabled={isProcessing}
                  >
                    + Crear Prueba
                  </button>
                </div>

                {/* Formulario de creación de sensores de prueba */}
                {showCreateForm && (
                  <div className={sensorPanelStyles.form.container}>
                    <h4 className={sensorPanelStyles.form.title}>Crear Sensores de Prueba</h4>
                    <input
                      type="text"
                      placeholder="GUID del espacio"
                      value={testSensorForm.spaceGuid}
                      onChange={(e) => setTestSensorForm({...testSensorForm, spaceGuid: e.target.value})}
                      className={sensorPanelStyles.form.input}
                    />
                    <input
                      type="text"
                      placeholder="Nombre del espacio"
                      value={testSensorForm.spaceName}
                      onChange={(e) => setTestSensorForm({...testSensorForm, spaceName: e.target.value})}
                      className={sensorPanelStyles.form.input}
                    />
                    <div className={sensorPanelStyles.form.controls}>
                      <button
                        onClick={handleCreateTestSensors}
                        className={`${sensorPanelStyles.buttons.success} flex-1 ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                        disabled={isProcessing}
                      >
                        {isProcessing ? 'Creando...' : 'Crear'}
                      </button>
                      <button
                        onClick={() => setShowCreateForm(false)}
                        className={sensorPanelStyles.buttons.secondary}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Estadísticas reales */}
                {systemStatus && (
                  <div className={sensorPanelStyles.stats.grid}>
                    <div className={sensorPanelStyles.stats.item}>
                      <span className={sensorPanelStyles.text.label}>Total:</span>
                      <span className="ml-2 font-bold">{systemStatus.sensors?.total || 0}</span>
                    </div>
                    <div className={sensorPanelStyles.stats.item}>
                      <span className={sensorPanelStyles.text.label}>Activos:</span>
                      <span className={`ml-2 font-bold ${sensorPanelStyles.text.successText}`}>{systemStatus.sensors?.active || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de sensores reales con scroll */}
              <div className={sensorPanelStyles.leftPanel.list}>
                {isLoading && sensors.length === 0 ? (
                  <div className={sensorPanelStyles.states.loading}>
                    <div className={sensorPanelStyles.states.loadingSpinner}></div>
                    Cargando sensores reales...
                  </div>
                ) : (
                  <div className={sensorPanelStyles.leftPanel.grid}>
                    {sensors.map(sensor => {
                      // Verificar si tiene error en memoria
                      const hasError = errorSensors.memorySensors.some(
                        errSensor => errSensor.sensorId === sensor.sensorId
                      );
                      
                      return (
                        <div
                          key={sensor.sensorId}
                          onClick={() => handleSensorSelect(sensor)}
                          className={getSensorItemClass(sensor, selectedSensor, hasError)}
                        >
                          <div className={sensorPanelStyles.sensorItem.content}>
                            <div className={sensorPanelStyles.sensorItem.info}>
                              <div className={`${sensorPanelStyles.sensorItem.icon} ${getStatusColor(sensor.status, hasError)}`}>
                                <SensorIcon type={sensor.type} size={20} />
                              </div>
                              <div className={sensorPanelStyles.sensorItem.details}>
                                <h4 className={sensorPanelStyles.sensorItem.name}>{sensor.name}</h4>
                                <p className={sensorPanelStyles.sensorItem.location}>
                                  {sensor.location?.spaceName || sensor.location?.zone || 'Sin ubicación'}
                                </p>
                                {sensor.lastReading && (
                                  <p className={sensorPanelStyles.sensorItem.reading}>
                                    <span className={getQualityColor(sensor.lastReading.quality, sensor.lastReading.value, sensor.config?.thresholds)}>
                                      {sensor.lastReading.value?.toFixed(1)} {sensor.config?.unit}
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
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Panel derecho con detalles del sensor seleccionado (datos REALES) */}
            <div className={sensorPanelStyles.rightPanel.container}>
              {selectedSensor ? (
                <div className={sensorPanelStyles.rightPanel.content}>
                  <div className={sensorPanelStyles.rightPanel.padding}>
                    {/* Información del sensor real */}
                    <div className={sensorPanelStyles.infoPanel.base}>
                      <div className={sensorPanelStyles.infoPanel.header}>
                        <div className={sensorPanelStyles.infoPanel.title}>
                          <div className={`${getStatusColor(selectedSensor.status, selectedSensor.memoryStatus?.hasError)} text-2xl`}>
                            <SensorIcon type={selectedSensor.type} size={24} />
                          </div>
                          <div>
                            <h3 className={sensorPanelStyles.infoPanel.name}>{selectedSensor.name}</h3>
                            <p className={sensorPanelStyles.infoPanel.id}>{selectedSensor.sensorId}</p>
                            <p className="text-xs text-green-400">📡 Datos en tiempo real</p>
                            {selectedSensor.memoryStatus?.hasError && (
                              <p className={sensorPanelStyles.text.errorText}>{selectedSensor.memoryStatus.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={getStatusBadge(selectedSensor.status, selectedSensor.memoryStatus?.hasError)}>
                            {selectedSensor.memoryStatus?.hasError ? 'Error' : selectedSensor.status}
                          </span>
                          {selectedSensor.memoryStatus?.hasError ? (
                            <button
                              onClick={() => handleResetSensor(selectedSensor.sensorId)}
                              className={`${sensorPanelStyles.buttons.success} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                              disabled={isProcessing}
                            >
                              {isProcessing ? 'Procesando...' : 'Reiniciar Sensor'}
                            </button>
                          ) : selectedSensor.status === 'inactive' ? (
                            <button
                              onClick={() => handleStartSensor(selectedSensor.sensorId)}
                              className={`${sensorPanelStyles.buttons.success} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                              disabled={isProcessing}
                            >
                              {isProcessing ? 'Procesando...' : 'Iniciar Sensor'}
                            </button>
                          ) : selectedSensor.status === 'active' ? (
                            <button
                              onClick={() => handleStopSensor(selectedSensor.sensorId)}
                              className={`${sensorPanelStyles.buttons.danger} ${isProcessing ? sensorPanelStyles.buttons.disabled : ''}`}
                              disabled={isProcessing}
                            >
                              {isProcessing ? 'Procesando...' : 'Detener Sensor'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {/* Estado de WebSocket para este sensor */}
                      {wsConnected && (
                        <div className={sensorPanelStyles.infoPanel.wsStatus}>
                          ⚡ Recibiendo actualizaciones en tiempo real vía WebSocket
                        </div>
                      )}

                      {/* Grid de lecturas actuales reales */}
                      {currentReading ? (
                        <div className={sensorPanelStyles.readingsGrid.container}>
                          <div className={sensorPanelStyles.readingsGrid.card}>
                            <p className={sensorPanelStyles.readingsGrid.label}>Valor Actual</p>
                            <p className={sensorPanelStyles.readingsGrid.value}>
                              <span className={getQualityColor(currentReading.quality, currentReading.value, selectedSensor.config?.thresholds)}>
                                {currentReading.value?.toFixed(1)} {selectedSensor.config?.unit || ''}
                              </span>
                            </p>
                          </div>
                          <div className={sensorPanelStyles.readingsGrid.card}>
                            <p className={sensorPanelStyles.readingsGrid.label}>Calidad</p>
                            <p className={`${sensorPanelStyles.readingsGrid.valueLarge} ${getQualityColor(currentReading.quality)}`}>
                              {currentReading.quality || 'N/A'}
                            </p>
                          </div>
                          <div className={sensorPanelStyles.readingsGrid.card}>
                            <p className={sensorPanelStyles.readingsGrid.label}>Última Actualización</p>
                            <p className={sensorPanelStyles.readingsGrid.valueSmall}>
                              {new Date(currentReading.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className={sensorPanelStyles.readingsGrid.card}>
                            <p className={sensorPanelStyles.readingsGrid.label}>Ubicación</p>
                            <p className={`${sensorPanelStyles.readingsGrid.valueSmall} truncate`}>
                              {selectedSensor.location?.spaceName || 'Sin definir'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className={sensorPanelStyles.states.inactive}>
                          {selectedSensor.status === 'inactive' ? 
                            'Sensor inactivo. Haz clic en "Iniciar Sensor" para comenzar a recibir lecturas.' :
                            'No hay lecturas disponibles'
                          }
                        </div>
                      )}

                      {/* Umbrales */}
                      {selectedSensor.config?.thresholds && (
                        <div className={sensorPanelStyles.thresholds.container}>
                          <p className={sensorPanelStyles.thresholds.title}>Umbrales Configurados</p>
                          <div className={sensorPanelStyles.thresholds.grid}>
                            {selectedSensor.config.thresholds.warning && (
                              <>
                                <div>Advertencia Min: <span className="text-yellow-400">{selectedSensor.config.thresholds.warning.min}</span></div>
                                <div>Advertencia Max: <span className="text-yellow-400">{selectedSensor.config.thresholds.warning.max}</span></div>
                              </>
                            )}
                            {selectedSensor.config.thresholds.critical && (
                              <>
                                <div>Crítico Min: <span className="text-red-400">{selectedSensor.config.thresholds.critical.min}</span></div>
                                <div>Crítico Max: <span className="text-red-400">{selectedSensor.config.thresholds.critical.max}</span></div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Visualización especial según tipo de sensor REAL */}
                    <div className={sensorPanelStyles.infoPanel.base}>
                      <h4 className={sensorPanelStyles.chart.title}>Visualización en Tiempo Real</h4>
                      <SensorVisualization 
                        sensor={selectedSensor}
                        currentReading={currentReading}
                      />
                    </div>

                    {/* Gráfico histórico con datos REALES */}
                    {historicalReadings.length > 0 && (
                      <div className={sensorPanelStyles.chart.container}>
                        <h4 className={sensorPanelStyles.chart.title}>
                          Histórico Real - {historicalReadings.length} lecturas
                        </h4>
                        <TemporalChart 
                          sensor={selectedSensor}
                          readings={historicalReadings}
                        />
                      </div>
                    )}

                    {/* Información adicional del sensor real */}
                    <div className={sensorPanelStyles.additionalInfo.container}>
                      <h4 className={sensorPanelStyles.additionalInfo.title}>Información del Sensor</h4>
                      <div className={sensorPanelStyles.additionalInfo.grid}>
                        <div>
                          <span className={sensorPanelStyles.text.label}>Tipo:</span>
                          <span className="ml-2 capitalize">{selectedSensor.type}</span>
                        </div>
                        <div>
                          <span className={sensorPanelStyles.text.label}>Intervalo:</span>
                          <span className="ml-2">{(selectedSensor.config?.samplingInterval || 60000) / 1000}s</span>
                        </div>
                        <div>
                          <span className={sensorPanelStyles.text.label}>Piso:</span>
                          <span className="ml-2">{selectedSensor.location?.floor || 'N/A'}</span>
                        </div>
                        <div>
                          <span className={sensorPanelStyles.text.label}>Zona:</span>
                          <span className="ml-2">{selectedSensor.location?.zone || 'N/A'}</span>
                        </div>
                        {selectedSensor.statistics && (
                          <>
                            <div>
                              <span className={sensorPanelStyles.text.label}>Total lecturas:</span>
                              <span className="ml-2">{selectedSensor.statistics.totalReadings || 0}</span>
                            </div>
                            <div>
                              <span className={sensorPanelStyles.text.label}>Promedio:</span>
                              <span className="ml-2">
                                {selectedSensor.statistics.averageValue?.toFixed(2) || 'N/A'} {selectedSensor.config?.unit}
                              </span>
                            </div>
                          </>
                        )}
                        {selectedSensor.memoryStatus && (
                          <div className={sensorPanelStyles.additionalInfo.separator}>
                            <span className={sensorPanelStyles.text.label}>Estado en memoria:</span>
                            <span className="ml-2">
                              {selectedSensor.memoryStatus.isRunning ? 'Ejecutándose' : 'Detenido'}, 
                              {selectedSensor.memoryStatus.hasError ? ' Con error' : ' Sin errores'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={sensorPanelStyles.states.empty}>
                  <div className={sensorPanelStyles.states.emptyContent}>
                    <div className={sensorPanelStyles.states.emptyIcon}>📡</div>
                    <p className={sensorPanelStyles.states.emptyTitle}>Selecciona un sensor</p>
                    <p className={sensorPanelStyles.states.emptyDescription}>
                      Elige un sensor de la lista para ver sus datos reales en tiempo real
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CSS personalizado para scrollbar */}
      <style jsx>{`
        ${customScrollbarCSS}
      `}</style>
    </div>
  );
};

export default SensorsPanelReal;