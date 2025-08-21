// HeatMapHoverPanel.tsx - Panel flotante con datos de sensores al hacer hover
import React, { useState, useEffect, useRef } from 'react';
import { 
  Thermometer, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Droplets,
  Calendar,
  MapPin
} from 'lucide-react';

// Interfaces para los datos
interface SensorData {
  sensorId: string;
  sensorName: string;
  type: 'temperature' | 'occupancy';
  value: number;
  unit: string;
  quality: 'good' | 'warning' | 'critical' | 'error';
  timestamp: string;
  additionalData?: {
    humidity?: number;
    heatIndex?: number;
    confidence?: number;
    capacity?: number;
    occupancyRate?: string;
  };
}

interface SpaceData {
  spaceGuid: string;
  spaceName: string;
  temperature?: number;
  humidity?: number;
  occupancy?: number;
  airQuality?: number;
  timestamp: string;
  quality: 'good' | 'warning' | 'critical' | 'error';
  sensors?: SensorData[];
}

interface HeatMapHoverPanelProps {
  isVisible: boolean;
  position: { x: number; y: number };
  spaceData: SpaceData | null;
  isLoading?: boolean;
  className?: string;
}

const HeatMapHoverPanel: React.FC<HeatMapHoverPanelProps> = ({
  isVisible,
  position,
  spaceData,
  isLoading = false,
  className = ''
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Ajustar posición para que no se salga de la pantalla
  useEffect(() => {
    if (!isVisible || !panelRef.current) return;

    const panel = panelRef.current;
    const rect = panel.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let newX = position.x;
    let newY = position.y;

    // Ajustar horizontalmente
    if (position.x + rect.width > viewport.width - 20) {
      newX = position.x - rect.width - 20;
    }

    // Ajustar verticalmente
    if (position.y + rect.height > viewport.height - 20) {
      newY = position.y - rect.height - 20;
    }

    // Asegurar que no se salga por arriba o izquierda
    newX = Math.max(20, newX);
    newY = Math.max(20, newY);

    setAdjustedPosition({ x: newX, y: newY });
  }, [position, isVisible]);

  // Función para obtener el color según la calidad
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Función para obtener el icono según la calidad
  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'good': return <CheckCircle size={14} />;
      case 'warning': return <AlertTriangle size={14} />;
      case 'critical': return <AlertTriangle size={14} />;
      case 'error': return <XCircle size={14} />;
      default: return <Activity size={14} />;
    }
  };

  // Función para formatear timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Función para obtener el color de temperatura
  const getTemperatureColor = (temp: number) => {
    if (temp < 18) return 'text-blue-400';
    if (temp < 20) return 'text-cyan-400';
    if (temp <= 24) return 'text-green-400';
    if (temp <= 27) return 'text-yellow-400';
    if (temp <= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  // Función para obtener el color de ocupación
  const getOccupancyColor = (occupancy: number, capacity?: number) => {
    if (!capacity) return 'text-blue-400';
    const percentage = (occupancy / capacity) * 100;
    if (percentage < 50) return 'text-green-400';
    if (percentage < 75) return 'text-yellow-400';
    if (percentage < 90) return 'text-orange-400';
    return 'text-red-400';
  };

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className={`fixed z-[60] pointer-events-none transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: 'translate(10px, -10px)'
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl min-w-[320px] max-w-[400px]">
        {/* Header del panel */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="text-blue-400" size={16} />
              <h3 className="text-white font-medium text-sm truncate">
                {spaceData?.spaceName || 'Espacio sin nombre'}
              </h3>
            </div>
            <div className={`flex items-center space-x-1 ${getQualityColor(spaceData?.quality || 'good')}`}>
              {getQualityIcon(spaceData?.quality || 'good')}
              <span className="text-xs uppercase font-medium">
                {spaceData?.quality || 'good'}
              </span>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="ml-2 text-gray-400 text-sm">Cargando datos...</span>
            </div>
          ) : spaceData ? (
            <div className="space-y-4">
              {/* Métricas principales */}
              <div className="grid grid-cols-2 gap-3">
                {/* Temperatura */}
                {spaceData.temperature !== undefined && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Thermometer className={getTemperatureColor(spaceData.temperature)} size={16} />
                      <span className="text-gray-300 text-xs font-medium">Temperatura</span>
                    </div>
                    <div className={`text-lg font-bold ${getTemperatureColor(spaceData.temperature)}`}>
                      {spaceData.temperature.toFixed(1)}°C
                    </div>
                    {spaceData.humidity && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Droplets className="text-cyan-400" size={12} />
                        <span className="text-cyan-400 text-xs">
                          {spaceData.humidity.toFixed(0)}% húmedo
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Ocupación */}
                {spaceData.occupancy !== undefined && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="text-purple-400" size={16} />
                      <span className="text-gray-300 text-xs font-medium">Ocupación</span>
                    </div>
                    <div className="text-lg font-bold text-purple-400">
                      {Math.round(spaceData.occupancy)} personas
                    </div>
                    {spaceData.sensors && spaceData.sensors.find(s => s.type === 'occupancy')?.additionalData?.occupancyRate && (
                      <div className="text-xs text-gray-400 mt-1">
                        {spaceData.sensors.find(s => s.type === 'occupancy')?.additionalData?.occupancyRate} capacidad
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Información de sensores */}
              {spaceData.sensors && spaceData.sensors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-gray-300 text-xs font-medium flex items-center">
                    <Activity size={14} className="mr-1" />
                    Sensores Activos ({spaceData.sensors.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {spaceData.sensors.map((sensor, index) => (
                      <div key={sensor.sensorId} className="bg-gray-800/30 rounded-md p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {sensor.type === 'temperature' ? (
                              <Thermometer size={12} className="text-red-400" />
                            ) : (
                              <Users size={12} className="text-blue-400" />
                            )}
                            <span className="text-gray-300 text-xs font-medium truncate">
                              {sensor.sensorName}
                            </span>
                          </div>
                          <div className={`flex items-center space-x-1 ${getQualityColor(sensor.quality)}`}>
                            {getQualityIcon(sensor.quality)}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-white text-sm font-medium">
                            {sensor.value} {sensor.unit}
                          </span>
                          {sensor.additionalData?.confidence && (
                            <span className="text-gray-400 text-xs">
                              {Math.round(sensor.additionalData.confidence)}% conf.
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información temporal */}
              <div className="pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Calendar size={12} />
                    <span>Última actualización</span>
                  </div>
                  <span className="font-mono">
                    {formatTimestamp(spaceData.timestamp)}
                  </span>
                </div>
              </div>

              {/* GUID del espacio (para debug) */}
              <div className="text-xs text-gray-500 font-mono truncate">
                ID: {spaceData.spaceGuid.slice(-8)}...
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <XCircle className="text-gray-500 mb-2 mx-auto" size={24} />
                <span className="text-gray-400 text-sm">No hay datos disponibles</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Indicador de flecha */}
      <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-900 border-l border-t border-gray-600 transform rotate-45"></div>
    </div>
  );
};

export default HeatMapHoverPanel;