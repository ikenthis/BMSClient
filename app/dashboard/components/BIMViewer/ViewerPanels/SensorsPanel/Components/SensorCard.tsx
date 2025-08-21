// src/components/ViewerPanels/SensorsPanel/Components/SensorCard.tsx
import React from 'react';
import { Sensor } from '../../../services/sensorApiService';
import { getSensorItemClass, getStatusColor, getQualityColor } from '../SensorPanelStyles';

interface SensorCardProps {
  sensor: Sensor;
  isSelected?: boolean;
  isMapped?: boolean;
  isProcessing?: boolean;
  onSelect?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onMapToSpace?: () => void;
  className?: string;
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

const SensorCard: React.FC<SensorCardProps> = ({
  sensor,
  isSelected = false,
  isMapped = false,
  isProcessing = false,
  onSelect,
  onStart,
  onStop,
  onReset,
  onMapToSpace,
  className = ''
}) => {
  const getTemperatureIcon = (temp: number) => {
    if (temp < 18) return '🧊';
    if (temp < 22) return '❄️';
    if (temp < 26) return '🌡️';
    if (temp < 28) return '🔥';
    return '🌋';
  };

  const getTemperatureClass = (temp: number) => {
    if (temp < 18) return 'cold';
    if (temp < 22) return 'cool';
    if (temp < 26) return 'comfortable';
    if (temp < 28) return 'warm';
    return 'hot';
  };

  const hasError = sensor.memoryStatus?.hasError || sensor.status === 'error';

  return (
    <div 
      className={`${getSensorItemClass(sensor, isSelected, isMapped)} ${className}`}
      onClick={onSelect}
    >
      {/* Header del sensor */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-medium text-white truncate flex items-center">
            <SensorIcon type={sensor.type} size={16} />
            <span className="ml-2">{sensor.name}</span>
            <span className="text-green-400 text-xs ml-2 flex items-center">
              Real
            </span>
            {isMapped && (
              <span className="text-blue-400 text-xs ml-2 flex items-center">
                📍 Mapeado
              </span>
            )}
          </h4>
          <p className="text-xs text-gray-400 capitalize">{sensor.type}</p>
          <p className="text-xs text-gray-500">
            {sensor.location?.spaceName || 'Sin ubicación'}
          </p>
        </div>
        
        {/* Indicador de temperatura si es sensor de temperatura */}
        {sensor.type === 'temperature' && sensor.lastReading && (
          <div className={`sensor-temp-badge text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${
            getTemperatureClass(sensor.lastReading.value)
          }`}>
            <span className="sensor-temp-icon">
              {getTemperatureIcon(sensor.lastReading.value)}
            </span>
            <span>{sensor.lastReading.value.toFixed(1)}°C</span>
          </div>
        )}
      </div>

      {/* Estado del sensor */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            hasError ? 'bg-red-400' :
            sensor.status === 'active' ? 'bg-green-400' : 
            sensor.status === 'error' ? 'bg-red-400' : 
            'bg-yellow-400'
          }`} />
          <span className={`text-xs capitalize ${getStatusColor(sensor.status)}`}>
            {hasError ? 'Error en memoria' : sensor.status}
          </span>
        </div>
        
        {sensor.memoryStatus?.hasError && (
          <span className="text-xs text-red-400">
            ⚠️ {sensor.memoryStatus.errorCount} errores
          </span>
        )}
      </div>

      {/* Botón de mapeo si no está mapeado */}
      {!isMapped && onMapToSpace && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMapToSpace();
          }}
          className="w-full mb-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50"
          disabled={isProcessing}
          title="Mapear sensor al espacio 3D"
        >
          📍 Mapear a Espacio 3D
        </button>
      )}

      {/* Información de mapeo si está mapeado */}
      {isMapped && (
        <div className="sensor-space-info bg-blue-900/20 border border-blue-700 rounded p-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="space-icon">📍</span>
            <div className="flex-1">
              <div className="text-xs text-blue-400 font-medium">
                Mapeado a espacio 3D
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Última lectura */}
      {sensor.lastReading && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Última lectura:</span>
            <span className={`font-medium ${getQualityColor(sensor.lastReading.quality)}`}>
              {sensor.lastReading.value?.toFixed(1)} {sensor.config?.unit || ''}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(sensor.lastReading.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Controles del sensor */}
      <div className="flex space-x-1 mt-2">
        {hasError ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset?.();
            }}
            className="flex-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            🔄 Reiniciar
          </button>
        ) : sensor.status === 'inactive' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart?.();
            }}
            className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            ▶️ Iniciar
          </button>
        ) : sensor.status === 'active' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop?.();
            }}
            className="flex-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            ⏸️ Detener
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default SensorCard;