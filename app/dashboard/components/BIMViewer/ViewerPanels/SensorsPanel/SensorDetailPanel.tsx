// src/components/ViewerPanels/SensorsPanel/SensorDetailPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchSensorDetails, 
  fetchSensorReadings,
  startSensor,
  stopSensor,
  resetSensor,
  wsManager,
  Sensor,
  SensorReading 
} from '../../services/sensorApiService';
import { 
  sensorPanelStyles, 
  getStatusColor, 
  getStatusBadge, 
  getQualityColor,
  getSensorColor 
} from './SensorPanelStyles';
import {
  TemporalChart,
  SensorVisualization,
  HumidityGauge,
  TemperatureThermometer,
  CircularIndicator
} from './SensorVisualizations';
import { 
  generateMockReadings, 
  updateMockSensorValue,
  MockSensorData 
} from '../../utils/mockSensorData';

interface SensorDetailPanelProps {
  sensor: Sensor | null;
  wsConnected: boolean;
  onError: (error: string | null) => void;
  onSuccess: (message: string | null) => void;
}

const SensorIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 16 }) => {
  const icons = {
    temperature: '🌡️',
    humidity: '💧',
    occupancy: '👥',
    co2: '🫁',
    light: '💡'
  };
  
  return <span style={{ fontSize: size }}>{icons[type as keyof typeof icons] || '📊'}</span>;
};

const SensorDetailPanel: React.FC<SensorDetailPanelProps> = ({
  sensor,
  wsConnected,
  onError,
  onSuccess
}) => {
  const [currentReading, setCurrentReading] = useState<any>(null);
  const [historicalReadings, setHistoricalReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChart, setShowChart] = useState(true);

  // Determinar si es sensor real o ficticio basado en el sensorId
  const isRealSensor = sensor && !sensor.sensorId.includes('MOCK');
  const isMockSensor = sensor && sensor.sensorId.includes('MOCK');

  // Cargar datos del sensor
  const loadSensorData = useCallback(async () => {
    if (!sensor) return;
    
    setIsLoading(true);
    try {
      if (isRealSensor) {
        // Cargar datos reales desde la API usando tu servicio actual
        console.log(`🔄 Cargando datos reales del sensor: ${sensor.sensorId}`);
        
        const [details, readings] = await Promise.all([
          fetchSensorDetails(sensor.sensorId),
          fetchSensorReadings(sensor.sensorId, 100)
        ]);
        
        setCurrentReading(details.lastReading || null);
        setHistoricalReadings(readings.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
        
        console.log('✅ Datos reales cargados:', {
          sensorId: sensor.sensorId,
          readingsCount: readings.length,
          lastValue: details.lastReading?.value,
          statistics: details.statistics,
          memoryStatus: details.memoryStatus
        });
        
      } else if (isMockSensor) {
        // Cargar datos ficticios
        console.log(`🔄 Cargando datos ficticios del sensor: ${sensor.sensorId}`);
        
        const mockHistory = generateMockReadings(sensor.sensorId, sensor.type, 100);
        
        setCurrentReading(sensor.lastReading);
        setHistoricalReadings(mockHistory);
        
        console.log('✅ Datos ficticios cargados:', {
          sensorId: sensor.sensorId,
          readingsCount: mockHistory.length,
          lastValue: sensor.lastReading?.value
        });
      }
      
      onError(null);
      
    } catch (err: any) {
      console.error(`❌ Error cargando datos del sensor:`, err);
      onError(err.message || 'Error al cargar datos del sensor');
    } finally {
      setIsLoading(false);
    }
  }, [sensor, isRealSensor, isMockSensor, onError]);

  // Cargar datos cuando cambia el sensor
  useEffect(() => {
    if (sensor) {
      loadSensorData();
    } else {
      setCurrentReading(null);
      setHistoricalReadings([]);
    }
  }, [sensor, loadSensorData]);

  // Suscribirse a WebSocket para sensores reales usando tu WebSocketManager
  useEffect(() => {
    if (isRealSensor && wsConnected) {
      console.log(`📡 Suscribiendo a WebSocket para sensor real: ${sensor.sensorId}`);
      
      const subscription = wsManager.subscribeSensor(sensor.sensorId, (data) => {
        console.log(`📡 Actualización WebSocket del sensor ${sensor.sensorId}:`, data);
        
        if (data.type === 'reading') {
          const newReading: SensorReading = {
            _id: data._id || `reading-${Date.now()}`,
            sensorId: data.sensorId,
            value: data.value,
            unit: data.unit || sensor.config?.unit || '',
            quality: data.quality || 'good',
            timestamp: data.timestamp,
            additionalData: data.additionalData
          };
          
          // Actualizar lectura actual
          setCurrentReading({
            value: data.value,
            timestamp: data.timestamp,
            quality: data.quality || 'good'
          });
          
          // Añadir al histórico
          setHistoricalReadings(prev => {
            const newReadings = [...prev, newReading].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            return newReadings.slice(-100); // Mantener últimas 100
          });
        }
      });
      
      return () => subscription();
    }
  }, [sensor, isRealSensor, wsConnected]);

  // Funciones de control para sensores reales
  const handleStartSensor = async () => {
    if (!isRealSensor) return;
    
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await startSensor(sensor.sensorId);
      onSuccess(`Sensor ${sensor.sensorId} iniciado correctamente`);
      await loadSensorData();
    } catch (err: any) {
      onError(err.message || 'Error al iniciar sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleStopSensor = async () => {
    if (!isRealSensor) return;
    
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await stopSensor(sensor.sensorId);
      onSuccess(`Sensor ${sensor.sensorId} detenido correctamente`);
      await loadSensorData();
    } catch (err: any) {
      onError(err.message || 'Error al detener sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  const handleResetSensor = async () => {
    if (!isRealSensor) return;
    
    setIsProcessing(true);
    onError(null);
    onSuccess(null);
    
    try {
      await resetSensor(sensor.sensorId);
      onSuccess(`Sensor ${sensor.sensorId} reiniciado correctamente`);
      await loadSensorData();
    } catch (err: any) {
      onError(err.message || 'Error al reiniciar sensor');
    } finally {
      setIsProcessing(false);
      setTimeout(() => onSuccess(null), 3000);
    }
  };

  // Función para actualizar sensor ficticio
  const handleUpdateMockSensor = () => {
    if (!isMockSensor) return;
    
    const updatedSensor = updateMockSensorValue(sensor as MockSensorData);
    setCurrentReading(updatedSensor.lastReading);
    
    // Añadir nueva lectura al histórico
    const newReading = {
      _id: `reading-${Date.now()}`,
      sensorId: updatedSensor.sensorId,
      value: updatedSensor.lastReading.value,
      unit: updatedSensor.config.unit,
      quality: updatedSensor.lastReading.quality,
      timestamp: updatedSensor.lastReading.timestamp,
      additionalData: {}
    };
    
    setHistoricalReadings(prev => {
      const newReadings = [...prev, newReading].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return newReadings.slice(-100);
    });
    
    onSuccess(`Sensor ficticio ${sensor.sensorId} actualizado`);
    setTimeout(() => onSuccess(null), 2000);
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className={sensorPanelStyles.states.loading}>
        <div className={sensorPanelStyles.states.loadingSpinner}></div>
        <div className="text-xs mt-2">Cargando datos del sensor...</div>
      </div>
    );
  }

  // Sin sensor seleccionado
  if (!sensor) {
    return (
      <div className={sensorPanelStyles.states.empty}>
        <div className={sensorPanelStyles.states.emptyContent}>
          <div className={sensorPanelStyles.states.emptyIcon}>📊</div>
          <h3 className={sensorPanelStyles.states.emptyTitle}>Selecciona un Sensor</h3>
          <p className={sensorPanelStyles.states.emptyDescription}>
            Elige un sensor de la lista para ver sus detalles y visualizaciones
          </p>
        </div>
      </div>
    );
  }

  const sensorColor = getSensorColor(sensor.type);
  const hasError = sensor.status === 'error' || sensor.memoryStatus?.hasError;

  return (
    <div className={sensorPanelStyles.rightPanel.content}>
      <div className={sensorPanelStyles.rightPanel.padding}>
        
        {/* Header del sensor */}
        <div className={sensorPanelStyles.infoPanel.base}>
          <div className={sensorPanelStyles.infoPanel.header}>
            <div className={sensorPanelStyles.infoPanel.title}>
              <SensorIcon type={sensor.type} size={24} />
              <div>
                <h3 className={sensorPanelStyles.infoPanel.name}>
                  {sensor.name}
                  <span className={`ml-2 ${isRealSensor ? 'text-green-400' : 'text-blue-400'}`}>
                    {isRealSensor ? '🟢 Real' : '🔵 Ficticio'}
                  </span>
                </h3>
                <p className={sensorPanelStyles.infoPanel.id}>{sensor.sensorId}</p>
              </div>
            </div>
            
            {/* Estado y controles */}
            <div className="flex flex-col items-end space-y-2">
              <span className={getStatusBadge(sensor.status, hasError)}>
                {hasError ? 'Error' : sensor.status}
              </span>
              
              {/* Botones de control */}
              {isRealSensor ? (
                <div className="flex space-x-2">
                  {hasError ? (
                    <button
                      onClick={handleResetSensor}
                      className={`${sensorPanelStyles.buttons.success} ${sensorPanelStyles.buttons.small}`}
                      disabled={isProcessing}
                    >
                      Reiniciar
                    </button>
                  ) : sensor.status === 'inactive' ? (
                    <button
                      onClick={handleStartSensor}
                      className={`${sensorPanelStyles.buttons.success} ${sensorPanelStyles.buttons.small}`}
                      disabled={isProcessing}
                    >
                      Iniciar
                    </button>
                  ) : (
                    <button
                      onClick={handleStopSensor}
                      className={`${sensorPanelStyles.buttons.danger} ${sensorPanelStyles.buttons.small}`}
                      disabled={isProcessing}
                    >
                      Detener
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleUpdateMockSensor}
                  className={`${sensorPanelStyles.buttons.secondary} ${sensorPanelStyles.buttons.small}`}
                >
                  Actualizar Valor
                </button>
              )}
            </div>
          </div>

          {/* Estado WebSocket para sensores reales */}
          {isRealSensor && (
            <div className={sensorPanelStyles.infoPanel.wsStatus}>
              📡 WebSocket: {wsConnected ? 
                <span className="text-green-400">Conectado</span> : 
                <span className="text-yellow-400">Desconectado</span>
              }
            </div>
          )}
        </div>

        {/* Lectura actual con visualización específica */}
        {currentReading && (
          <div className={sensorPanelStyles.infoPanel.base}>
            <h4 className="text-lg font-semibold mb-4">Lectura Actual</h4>
            
            {/* Visualización específica por tipo de sensor */}
            <div className="mb-6">
              <SensorVisualization 
                sensor={sensor}
                currentReading={currentReading}
              />
            </div>

            {/* Grid de información */}
            <div className={sensorPanelStyles.readingsGrid.container}>
              <div className={sensorPanelStyles.readingsGrid.card}>
                <div className={sensorPanelStyles.readingsGrid.label}>Valor</div>
                <div className={`${sensorPanelStyles.readingsGrid.value} ${getQualityColor(currentReading.quality, currentReading.value, sensor.config?.thresholds)}`}>
                  {currentReading.value?.toFixed(2) || '--'}
                  <span className="text-sm ml-1">{sensor.config?.unit || ''}</span>
                </div>
              </div>
              
              <div className={sensorPanelStyles.readingsGrid.card}>
                <div className={sensorPanelStyles.readingsGrid.label}>Calidad</div>
                <div className={`${sensorPanelStyles.readingsGrid.valueLarge} ${getQualityColor(currentReading.quality)}`}>
                  {currentReading.quality || 'N/A'}
                </div>
              </div>
              
              <div className={sensorPanelStyles.readingsGrid.card}>
                <div className={sensorPanelStyles.readingsGrid.label}>Última Actualización</div>
                <div className={sensorPanelStyles.readingsGrid.valueSmall}>
                  {new Date(currentReading.timestamp).toLocaleString()}
                </div>
              </div>
              
              <div className={sensorPanelStyles.readingsGrid.card}>
                <div className={sensorPanelStyles.readingsGrid.label}>Estado</div>
                <div className={`${sensorPanelStyles.readingsGrid.valueLarge} ${getStatusColor(sensor.status, hasError)}`}>
                  {sensor.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información del sensor */}
        <div className={sensorPanelStyles.additionalInfo.container}>
          <h4 className={sensorPanelStyles.additionalInfo.title}>Información del Sensor</h4>
          
          <div className={sensorPanelStyles.additionalInfo.grid}>
            <div>
              <span className="text-gray-400">Tipo:</span>
              <span className="ml-2 font-medium">{sensor.type}</span>
            </div>
            <div>
              <span className="text-gray-400">Ubicación:</span>
              <span className="ml-2 font-medium">{sensor.location?.spaceName || 'No definida'}</span>
            </div>
            <div>
              <span className="text-gray-400">Zona:</span>
              <span className="ml-2 font-medium">{sensor.location?.zone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Piso:</span>
              <span className="ml-2 font-medium">{sensor.location?.floor || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Unidad:</span>
              <span className="ml-2 font-medium">{sensor.config?.unit || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Fuente:</span>
              <span className="ml-2 font-medium">{isRealSensor ? 'API Real' : 'Datos Ficticios'}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Lecturas:</span>
              <span className="ml-2 font-medium">{sensor.statistics?.totalReadings || historicalReadings.length}</span>
            </div>
            
            {/* Separador */}
            <div className={sensorPanelStyles.additionalInfo.separator}></div>
            
            {/* Estadísticas del sensor real */}
            {sensor.statistics && (
              <>
                <div className="col-span-2">
                  <span className="text-gray-400 font-medium">Estadísticas:</span>
                </div>
                <div>
                  <span className="text-gray-400">Promedio:</span>
                  <span className="ml-2 font-medium">{sensor.statistics.averageValue?.toFixed(2) || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rango:</span>
                  <span className="ml-2 font-medium">
                    {sensor.statistics.minValue?.toFixed(1)} - {sensor.statistics.maxValue?.toFixed(1)}
                  </span>
                </div>
                <div className={sensorPanelStyles.additionalInfo.separator}></div>
              </>
            )}
            
            {sensor.config?.thresholds && (
              <>
                <div className="col-span-2">
                  <span className="text-gray-400 font-medium">Umbrales Configurados:</span>
                </div>
                {sensor.config.thresholds.warning && (
                  <div className="col-span-2 text-sm">
                    <span className="text-yellow-400">⚠️ Advertencia:</span>
                    <span className="ml-2">
                      {sensor.config.thresholds.warning.min !== undefined && `Min: ${sensor.config.thresholds.warning.min}`}
                      {sensor.config.thresholds.warning.min !== undefined && sensor.config.thresholds.warning.max !== undefined && ' • '}
                      {sensor.config.thresholds.warning.max !== undefined && `Max: ${sensor.config.thresholds.warning.max}`}
                    </span>
                  </div>
                )}
                {sensor.config.thresholds.critical && (
                  <div className="col-span-2 text-sm">
                    <span className="text-red-400">🚨 Crítico:</span>
                    <span className="ml-2">
                      {sensor.config.thresholds.critical.min !== undefined && `Min: ${sensor.config.thresholds.critical.min}`}
                      {sensor.config.thresholds.critical.min !== undefined && sensor.config.thresholds.critical.max !== undefined && ' • '}
                      {sensor.config.thresholds.critical.max !== undefined && `Max: ${sensor.config.thresholds.critical.max}`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Gráfico temporal */}
        {historicalReadings.length > 0 && (
          <div className={sensorPanelStyles.chart.container}>
            <div className="flex justify-between items-center mb-3">
              <h4 className={sensorPanelStyles.chart.title}>Historial Temporal</h4>
              <button
                onClick={() => setShowChart(!showChart)}
                className={sensorPanelStyles.buttons.secondary}
              >
                {showChart ? 'Ocultar' : 'Mostrar'} Gráfico
              </button>
            </div>
            
            {showChart && (
              <div className={sensorPanelStyles.chart.fullHeight}>
                <TemporalChart 
                  sensor={sensor}
                  readings={historicalReadings}
                  currentReading={currentReading}
                />
              </div>
            )}
            
            {/* Estadísticas del historial */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-700 p-2 rounded text-center">
                <div className="text-gray-400">Lecturas</div>
                <div className="font-bold">{historicalReadings.length}</div>
              </div>
              <div className="bg-gray-700 p-2 rounded text-center">
                <div className="text-gray-400">Promedio</div>
                <div className="font-bold">
                  {historicalReadings.length > 0 ? 
                    (historicalReadings.reduce((sum, r) => sum + r.value, 0) / historicalReadings.length).toFixed(1) : 
                    '--'
                  }
                </div>
              </div>
              <div className="bg-gray-700 p-2 rounded text-center">
                <div className="text-gray-400">Rango</div>
                <div className="font-bold text-xs">
                  {historicalReadings.length > 0 ? 
                    `${Math.min(...historicalReadings.map(r => r.value)).toFixed(1)} - ${Math.max(...historicalReadings.map(r => r.value)).toFixed(1)}` :
                    '--'
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Estado de error específico */}
        {hasError && sensor.memoryStatus?.errorMessage && (
          <div className="bg-red-900 bg-opacity-30 border border-red-800 rounded p-3">
            <h5 className="text-red-400 font-semibold mb-2">Detalles del Error</h5>
            <p className="text-red-200 text-sm">{sensor.memoryStatus.errorMessage}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default SensorDetailPanel;