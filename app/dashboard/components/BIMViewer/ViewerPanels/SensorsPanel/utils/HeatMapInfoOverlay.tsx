// HeatMapInfoOverlay.tsx - Overlay simple que se activa con elementos seleccionados
import React, { useState, useEffect } from 'react';
import * as FRAGS from '@thatopen/fragments';
import { 
  Thermometer, 
  Users, 
  Droplets,
  Activity,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface SensorInfo {
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

interface SpaceInfo {
  spaceGuid: string;
  spaceName: string;
  temperature?: number;
  humidity?: number;
  occupancy?: number;
  quality: 'good' | 'warning' | 'critical' | 'error';
  timestamp: string;
  sensors: SensorInfo[];
}

interface HeatMapInfoOverlayProps {
  selectedElement: { model: FRAGS.FragmentsModel; localId: number } | null;
  selectedElementData: any; // Los datos que ya obtienes del elemento seleccionado
  isHeatMapActive: boolean;
  heatMapData: Map<string, any>; // Los datos del HeatMap
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  useTestData?: boolean;
}

const HeatMapInfoOverlay: React.FC<HeatMapInfoOverlayProps> = ({
  selectedElement,
  selectedElementData,
  isHeatMapActive,
  heatMapData,
  position = 'top-right',
  useTestData = true
}) => {
  
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para generar datos de prueba
  const generateTestData = (spaceGuid: string, spaceName: string): SpaceInfo => {
    const temperature = 20 + Math.random() * 8; // 20-28°C
    const occupancy = Math.floor(Math.random() * 25); // 0-25 personas
    const humidity = 40 + Math.random() * 20; // 40-60%
    const now = new Date().toISOString();

    return {
      spaceGuid,
      spaceName,
      temperature,
      humidity,
      occupancy,
      quality: temperature > 26 ? 'warning' : temperature > 28 ? 'critical' : 'good',
      timestamp: now,
      sensors: [
        {
          sensorId: `TEMP-${spaceGuid.slice(-4)}`,
          sensorName: `Sensor Temperatura ${spaceName}`,
          type: 'temperature',
          value: temperature,
          unit: '°C',
          quality: temperature > 26 ? 'warning' : 'good',
          timestamp: now,
          additionalData: {
            humidity,
            heatIndex: temperature + (humidity * 0.1)
          }
        },
        {
          sensorId: `OCC-${spaceGuid.slice(-4)}`,
          sensorName: `Sensor Ocupación ${spaceName}`,
          type: 'occupancy',
          value: occupancy,
          unit: 'personas',
          quality: occupancy > 20 ? 'warning' : 'good',
          timestamp: now,
          additionalData: {
            capacity: 30,
            occupancyRate: `${Math.round((occupancy / 30) * 100)}%`,
            confidence: 85 + Math.random() * 10
          }
        }
      ]
    };
  };

  // Función para extraer propiedades
  const extractPropertyValue = (data: any, propertyName: string): string => {
    if (!data) return '';
    
    if (data[propertyName] !== undefined) {
      const prop = data[propertyName];
      if (typeof prop === 'object' && prop && prop.value !== undefined) {
        return String(prop.value);
      }
      if (typeof prop !== 'object' || prop === null) {
        return String(prop);
      }
    }
    
    return '';
  };

  // Verificar si el elemento seleccionado es un espacio con datos de HeatMap
  useEffect(() => {
    const checkSpaceData = async () => {
      if (!selectedElement || !selectedElementData || !isHeatMapActive) {
        setSpaceInfo(null);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Verificar si es un espacio IFCSPACE
        const category = selectedElementData._category?.value || selectedElementData.type;
        if (category !== 'IFCSPACE') {
          setSpaceInfo(null);
          return;
        }

        // Obtener GUID del espacio
        const spaceGuid = selectedElementData._guid?.value || 
                         selectedElementData.GlobalId?.value ||
                         selectedElementData.guid;

        if (!spaceGuid) {
          setSpaceInfo(null);
          return;
        }

        // Obtener nombre del espacio
        const spaceName = extractPropertyValue(selectedElementData, 'Name') || 
                         `Espacio ${selectedElement.localId}`;

        // Filtrar áreas
        if (spaceName.startsWith('Área:')) {
          setSpaceInfo(null);
          return;
        }

        // Verificar si hay datos de HeatMap para este espacio
        const hasHeatMapData = heatMapData.has(spaceGuid) ||
                              Array.from(heatMapData.keys()).some(key => 
                                key.includes(spaceGuid.substring(0, 8)) || 
                                spaceGuid.includes(key.substring(0, 8))
                              );

        if (!hasHeatMapData) {
          setSpaceInfo(null);
          return;
        }

        console.log(`📊 Generando info para espacio: ${spaceName} (${spaceGuid.slice(-8)}...)`);

        // Generar o obtener datos
        let data: SpaceInfo;
        
        if (useTestData) {
          data = generateTestData(spaceGuid, spaceName);
          // Simular delay
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          // Aquí conectarías con tu backend real
          // const response = await fetch(`/api/iot/sensors/space/${spaceGuid}`);
          // data = await response.json();
          data = generateTestData(spaceGuid, spaceName); // Fallback por ahora
        }

        setSpaceInfo(data);

      } catch (err) {
        console.error('Error obteniendo datos del espacio:', err);
        setError('Error cargando datos de sensores');
        setSpaceInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSpaceData();
  }, [selectedElement, selectedElementData, isHeatMapActive, heatMapData, useTestData]);

  // Función para obtener color según calidad
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Función para obtener icono según calidad
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
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString();
  };

  // Función para obtener color de temperatura
  const getTemperatureColor = (temp: number) => {
    if (temp < 18) return 'text-blue-400';
    if (temp < 20) return 'text-cyan-400';
    if (temp <= 24) return 'text-green-400';
    if (temp <= 27) return 'text-yellow-400';
    if (temp <= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  if (!isHeatMapActive || !spaceInfo) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="text-blue-400" size={16} />
            <h3 className="text-white font-medium text-sm truncate">
              {spaceInfo.spaceName}
            </h3>
          </div>
          <div className={`flex items-center space-x-1 ${getQualityColor(spaceInfo.quality)}`}>
            {getQualityIcon(spaceInfo.quality)}
            <span className="text-xs uppercase font-medium">
              {spaceInfo.quality}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            <span className="ml-2 text-gray-400 text-sm">Cargando...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm text-center py-4">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Métricas principales */}
            <div className="grid grid-cols-2 gap-3">
              {/* Temperatura */}
              {spaceInfo.temperature !== undefined && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Thermometer className={getTemperatureColor(spaceInfo.temperature)} size={14} />
                    <span className="text-gray-300 text-xs">Temperatura</span>
                  </div>
                  <div className={`text-lg font-bold ${getTemperatureColor(spaceInfo.temperature)}`}>
                    {spaceInfo.temperature.toFixed(1)}°C
                  </div>
                  {spaceInfo.humidity && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Droplets className="text-cyan-400" size={10} />
                      <span className="text-cyan-400 text-xs">
                        {spaceInfo.humidity.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Ocupación */}
              {spaceInfo.occupancy !== undefined && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Users className="text-purple-400" size={14} />
                    <span className="text-gray-300 text-xs">Ocupación</span>
                  </div>
                  <div className="text-lg font-bold text-purple-400">
                    {Math.round(spaceInfo.occupancy)}
                  </div>
                  {spaceInfo.sensors.find(s => s.type === 'occupancy')?.additionalData?.occupancyRate && (
                    <div className="text-xs text-gray-400 mt-1">
                      {spaceInfo.sensors.find(s => s.type === 'occupancy')?.additionalData?.occupancyRate}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sensores */}
            <div className="space-y-2">
              <h4 className="text-gray-300 text-xs font-medium flex items-center">
                <Activity size={12} className="mr-1" />
                Sensores ({spaceInfo.sensors.length})
              </h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {spaceInfo.sensors.map((sensor, index) => (
                  <div key={sensor.sensorId} className="bg-gray-800/30 rounded p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {sensor.type === 'temperature' ? (
                          <Thermometer size={10} className="text-red-400" />
                        ) : (
                          <Users size={10} className="text-blue-400" />
                        )}
                        <span className="text-gray-300 text-xs truncate">
                          {sensor.sensorName}
                        </span>
                      </div>
                      <div className={`flex items-center space-x-1 ${getQualityColor(sensor.quality)}`}>
                        {getQualityIcon(sensor.quality)}
                      </div>
                    </div>
                    <div className="text-white text-sm font-medium">
                      {sensor.value} {sensor.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock size={10} />
                  <span>Actualizado</span>
                </div>
                <span>{formatTimestamp(spaceInfo.timestamp)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatMapInfoOverlay;