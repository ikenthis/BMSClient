// src/components/BIMViewer/components/SpaceSensorTooltip.tsx
import React from 'react';
import { SpaceSensorData } from '../types/sensorTypes';

interface SpaceSensorTooltipProps {
  spaceInfo: SpaceSensorData | null;
  position: { x: number; y: number };
  visible: boolean;
}

const SpaceSensorTooltip: React.FC<SpaceSensorTooltipProps> = ({
  spaceInfo,
  position,
  visible
}) => {
  if (!visible || !spaceInfo) return null;

  // Función para obtener el color basado en temperatura
  const getTemperatureColor = (temp: number) => {
    if (temp < 18) return 'text-blue-400';
    if (temp > 26) return 'text-red-400';
    if (temp >= 20 && temp <= 24) return 'text-green-400';
    return 'text-yellow-400';
  };

  // Función para obtener el icono de calidad
  const getQualityIcon = (quality: 'good' | 'warning' | 'critical') => {
    switch (quality) {
      case 'good': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  // Función para obtener el color de ocupación
  const getOccupancyColor = (occupancy: number) => {
    if (occupancy === 0) return 'text-gray-400';
    if (occupancy <= 3) return 'text-green-400';
    if (occupancy <= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Calcular posición del tooltip (evitar que se salga de la pantalla)
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x + 15, window.innerWidth - 280), // Ancho aprox del tooltip
    top: Math.max(position.y - 10, 10),
    zIndex: 1000,
    pointerEvents: 'none'
  };

  return (
    <div
      style={tooltipStyle}
      className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl p-3 text-white text-sm min-w-[260px] animate-in fade-in duration-200"
    >
      {/* Header con nombre del espacio */}
      <div className="border-b border-gray-700 pb-2 mb-2">
        <h3 className="font-semibold text-white truncate" title={spaceInfo.spaceName}>
          {spaceInfo.spaceName}
        </h3>
        {spaceInfo.spaceLongName && spaceInfo.spaceLongName !== spaceInfo.spaceName && (
          <p className="text-xs text-gray-400 truncate" title={spaceInfo.spaceLongName}>
            {spaceInfo.spaceLongName}
          </p>
        )}
      </div>

      {/* Información de sensores */}
      <div className="space-y-1.5">
        {/* Temperatura */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 flex items-center">
            🌡️ Temperatura:
          </span>
          <span className={`font-medium ${getTemperatureColor(spaceInfo.temperature)}`}>
            {spaceInfo.temperature.toFixed(1)}°C
          </span>
        </div>

        {/* Humedad */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 flex items-center">
            💧 Humedad:
          </span>
          <span className="text-blue-300 font-medium">
            {spaceInfo.humidity.toFixed(0)}%
          </span>
        </div>

        {/* Ocupación */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 flex items-center">
            👥 Ocupación:
          </span>
          <span className={`font-medium ${getOccupancyColor(spaceInfo.occupancy)}`}>
            {spaceInfo.occupancy} personas
          </span>
        </div>

        {/* Calidad de datos */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300 flex items-center">
            📊 Estado:
          </span>
          <span className="font-medium flex items-center space-x-1">
            <span>{getQualityIcon(spaceInfo.quality)}</span>
            <span className={
              spaceInfo.quality === 'good' ? 'text-green-400' :
              spaceInfo.quality === 'warning' ? 'text-yellow-400' :
              'text-red-400'
            }>
              {spaceInfo.quality === 'good' ? 'Óptimo' :
               spaceInfo.quality === 'warning' ? 'Alerta' : 'Crítico'}
            </span>
          </span>
        </div>
      </div>

      {/* Footer con timestamp */}
      {spaceInfo.timestamp && (
        <div className="border-t border-gray-700 pt-2 mt-2">
          <p className="text-xs text-gray-500">
            Actualizado: {new Date(spaceInfo.timestamp).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}

      {/* Indicación de interacción */}
      <div className="border-t border-gray-700 pt-2 mt-2">
        <p className="text-xs text-gray-500 text-center">
          🖱️ Click para seleccionar • 🖱️🖱️ Doble click para más info
        </p>
      </div>
    </div>
  );
};

export default SpaceSensorTooltip;