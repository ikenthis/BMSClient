// src/components/ViewerPanels/SensorsPanel/components/SensorStatus.tsx
import React from 'react';
import { 
  sensorPanelStyles, 
  getStatusColor, 
  getStatusBadge, 
  getQualityColor 
} from '../SensorPanelStyles';
import { Sensor } from '../../../services/sensorApiService';
import { MockSensorData } from '../../../utils/mockSensorData';

interface SensorStatusProps {
  sensor: Sensor | MockSensorData;
  detailed?: boolean;
  showQuality?: boolean;
  showTimestamp?: boolean;
  size?: 'small' | 'normal' | 'large';
  orientation?: 'horizontal' | 'vertical';
}

const SensorStatus: React.FC<SensorStatusProps> = ({
  sensor,
  detailed = false,
  showQuality = true,
  showTimestamp = false,
  size = 'normal',
  orientation = 'vertical'
}) => {
  const isRealSensor = !sensor.sensorId.includes('MOCK');
  const hasError = sensor.status === 'error' || (sensor as any).memoryStatus?.hasError;
  const lastReading = sensor.lastReading;

  // Determinar el estado de conectividad
  const getConnectivityStatus = () => {
    if (!isRealSensor) {
      return { status: 'simulated', icon: '🔵', text: 'Simulado', color: 'text-blue-400' };
    }

    if (hasError) {
      return { status: 'error', icon: '🔴', text: 'Error', color: 'text-red-400' };
    }

    if (sensor.status === 'active') {
      return { status: 'connected', icon: '🟢', text: 'Conectado', color: 'text-green-400' };
    }

    return { status: 'disconnected', icon: '🟡', text: 'Desconectado', color: 'text-yellow-400' };
  };

  // Calcular tiempo desde la última lectura
  const getLastReadingAge = () => {
    if (!lastReading?.timestamp) return null;
    
    const now = new Date();
    const readingTime = new Date(lastReading.timestamp);
    const diffMs = now.getTime() - readingTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays}d`;
  };

  // Obtener el indicador de calidad de la señal
  const getSignalQuality = () => {
    if (!lastReading) return null;
    
    const age = getLastReadingAge();
    if (!age || age === 'Ahora mismo' || age.includes('m')) {
      return { level: 'excellent', icon: '📶', bars: 4, color: 'text-green-400' };
    } else if (age.includes('h') && parseInt(age) < 2) {
      return { level: 'good', icon: '📶', bars: 3, color: 'text-yellow-400' };
    } else if (age.includes('h')) {
      return { level: 'poor', icon: '📶', bars: 2, color: 'text-orange-400' };
    } else {
      return { level: 'none', icon: '📵', bars: 1, color: 'text-red-400' };
    }
  };

  const connectivity = getConnectivityStatus();
  const signalQuality = getSignalQuality();
  const lastReadingAge = getLastReadingAge();

  // Clase del contenedor según orientación
  const containerClass = orientation === 'horizontal' 
    ? 'flex items-center space-x-2' 
    : 'flex flex-col space-y-1';

  // Tamaños de texto según el size
  const textSizes = {
    small: 'text-xs',
    normal: 'text-sm',
    large: 'text-base'
  };

  // Versión simple (badges básicos)
  if (!detailed) {
    return (
      <div className={containerClass}>
        <span className={getStatusBadge(sensor.status, hasError)}>
          {hasError ? 'Error' : sensor.status}
        </span>
        
        {showQuality && lastReading?.quality && (
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            lastReading.quality === 'good' ? 'bg-green-900 text-green-300' :
            lastReading.quality === 'warning' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>
            {lastReading.quality}
          </span>
        )}
      </div>
    );
  }

  // Versión detallada
  return (
    <div className={`${containerClass} ${textSizes[size]}`}>
      
      {/* Estado principal del sensor */}
      <div className="flex items-center space-x-2">
        <span className={connectivity.color}>{connectivity.icon}</span>
        <span className={`font-medium ${connectivity.color}`}>
          {connectivity.text}
        </span>
        <span className={getStatusBadge(sensor.status, hasError)}>
          {hasError ? 'Error' : sensor.status}
        </span>
      </div>

      {/* Calidad de la señal/conexión */}
      {signalQuality && (
        <div className="flex items-center space-x-2">
          <span className={signalQuality.color}>{signalQuality.icon}</span>
          <div className="flex items-center space-x-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-1 h-3 rounded-full ${
                  i < signalQuality.bars 
                    ? signalQuality.color.replace('text-', 'bg-')
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          <span className={`text-xs ${signalQuality.color}`}>
            {signalQuality.level}
          </span>
        </div>
      )}

      {/* Calidad de datos */}
      {showQuality && lastReading?.quality && (
        <div className="flex items-center space-x-2">
          <span>📊</span>
          <span className={getQualityColor(lastReading.quality, lastReading.value, (sensor as any).config?.thresholds)}>
            Calidad: {lastReading.quality}
          </span>
        </div>
      )}

      {/* Timestamp de última lectura */}
      {showTimestamp && lastReadingAge && (
        <div className="flex items-center space-x-2 text-gray-400">
          <span>⏰</span>
          <span>{lastReadingAge}</span>
          {size === 'large' && lastReading?.timestamp && (
            <span className="text-xs">
              ({new Date(lastReading.timestamp).toLocaleString()})
            </span>
          )}
        </div>
      )}

      {/* Información adicional para sensores reales */}
      {isRealSensor && size === 'large' && (
        <div className="mt-2 space-y-1">
          {/* Estado de memoria */}
          {(sensor as Sensor).memoryStatus && (
            <div className="flex items-center space-x-2 text-xs">
              <span>💾</span>
              <span className={
                (sensor as Sensor).memoryStatus?.isRunning 
                  ? 'text-green-400' 
                  : 'text-red-400'
              }>
                Memoria: {(sensor as Sensor).memoryStatus?.isRunning ? 'OK' : 'Error'}
              </span>
            </div>
          )}

          {/* Estadísticas */}
          {(sensor as Sensor).statistics && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <span>📈</span>
                <span>Lecturas: {(sensor as Sensor).statistics?.totalReadings}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>📊</span>
                <span>Promedio: {(sensor as Sensor).statistics?.averageValue?.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información adicional para sensores ficticios */}
      {!isRealSensor && size === 'large' && (
        <div className="mt-2 space-y-1 text-xs text-blue-300">
          <div className="flex items-center space-x-2">
            <span>🎭</span>
            <span>Datos simulados</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🔄</span>
            <span>Auto-actualización activa</span>
          </div>
        </div>
      )}

      {/* Mensaje de error específico */}
      {hasError && (sensor as any).memoryStatus?.errorMessage && size !== 'small' && (
        <div className="mt-2 p-2 bg-red-900 bg-opacity-30 border border-red-800 rounded text-xs">
          <div className="flex items-start space-x-2">
            <span className="text-red-400 mt-0.5">⚠️</span>
            <div className="flex-1">
              <div className="font-medium text-red-300">Error detectado:</div>
              <div className="text-red-200">{(sensor as any).memoryStatus.errorMessage}</div>
              {(sensor as any).memoryStatus?.errorCount && (
                <div className="text-red-400 mt-1">
                  Ocurrencias: {(sensor as any).memoryStatus.errorCount}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicador de configuración */}
      {size === 'large' && (sensor as any).config && (
        <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
          <div className="font-medium text-gray-300 mb-1">⚙️ Configuración:</div>
          <div className="space-y-1">
            <div>Unidad: {(sensor as any).config.unit}</div>
            {(sensor as any).config.samplingInterval && (
              <div>Muestreo: {(sensor as any).config.samplingInterval / 1000}s</div>
            )}
            {(sensor as any).config.thresholds && (
              <div className="mt-1">
                <div className="text-yellow-400">
                  ⚠️ Umbrales configurados
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorStatus;