// src/hooks/useSpaceSensorInfo.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sensor, SensorReading } from '../../../services/sensorApiService';
import { SpaceElement } from '../../../utils/typeDefs';
import { sensorSpaceIntegration, SensorSpaceMapping } from '../services/sensorSpaceIntegrationService';
import { heatMapVisualization, HeatMapData } from '../utils/HeatMapVisualization';

export interface SpaceSensorInfo {
  spaceGuid: string;
  spaceName: string;
  sensors: SensorSpaceMapping[];
  temperature?: {
    current: number;
    unit: string;
    quality: 'good' | 'warning' | 'critical' | 'error';
    timestamp: string;
    sensor?: SensorSpaceMapping;
  };
  occupancy?: {
    current: number;
    unit: string;
    quality: 'good' | 'warning' | 'critical' | 'error';
    timestamp: string;
    sensor?: SensorSpaceMapping;
  };
  humidity?: {
    current: number;
    unit: string;
    timestamp: string;
  };
  airQuality?: {
    current: number;
    unit: string;
    timestamp: string;
  };
  lastUpdate: string;
  isActive: boolean;
  alertCount: number;
}

export interface UseSpaceSensorInfoOptions {
  autoUpdate?: boolean;
  updateInterval?: number;
  enableHover?: boolean;
}

export interface UseSpaceSensorInfoReturn {
  // Estado del hover
  hoveredSpace: SpaceSensorInfo | null;
  isHovering: boolean;
  hoverPosition: { x: number; y: number } | null;
  
  // Información de espacios
  getSpaceInfo: (spaceGuid: string) => SpaceSensorInfo | null;
  getAllSpacesInfo: () => SpaceSensorInfo[];
  
  // Control de hover
  handleSpaceHover: (spaceGuid: string | null, position?: { x: number; y: number }) => void;
  
  // Utilidades
  refreshSpaceInfo: (spaceGuid?: string) => Promise<void>;
  isSpaceActive: (spaceGuid: string) => boolean;
  getSpaceTemperature: (spaceGuid: string) => number | null;
  getSpaceOccupancy: (spaceGuid: string) => number | null;
}

export function useSpaceSensorInfo(
  spaces: SpaceElement[],
  options: UseSpaceSensorInfoOptions = {}
): UseSpaceSensorInfoReturn {
  
  const {
    autoUpdate = true,
    updateInterval = 30000, // 30 segundos
    enableHover = true
  } = options;

  // Estados
  const [spacesInfo, setSpacesInfo] = useState<Map<string, SpaceSensorInfo>>(new Map());
  const [hoveredSpace, setHoveredSpace] = useState<SpaceSensorInfo | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Referencias
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  /**
   * Construye la información completa de un espacio
   */
  const buildSpaceInfo = useCallback((spaceGuid: string): SpaceSensorInfo | null => {
    // Encontrar el espacio
    const space = spaces.find(s => s.properties?.globalId === spaceGuid);
    if (!space) return null;

    // Obtener sensores del espacio
    const spaceSensors = sensorSpaceIntegration.getSensorsBySpace(spaceGuid);
    
    if (spaceSensors.length === 0) {
      return {
        spaceGuid,
        spaceName: space.properties?.name || 'Espacio sin nombre',
        sensors: [],
        lastUpdate: new Date().toISOString(),
        isActive: false,
        alertCount: 0
      };
    }

    // Procesar sensores por tipo
    const temperatureSensors = spaceSensors.filter(s => s.sensor.type === 'temperature');
    const occupancySensors = spaceSensors.filter(s => s.sensor.type === 'occupancy');
    
    // Obtener datos de temperatura
    let temperatureInfo = undefined;
    if (temperatureSensors.length > 0) {
      const tempSensor = temperatureSensors[0]; // Usar el primero disponible
      if (tempSensor.lastReading) {
        temperatureInfo = {
          current: tempSensor.lastReading.value,
          unit: tempSensor.lastReading.unit || '°C',
          quality: tempSensor.lastReading.quality,
          timestamp: tempSensor.lastReading.timestamp,
          sensor: tempSensor
        };
      }
    }

    // Obtener datos de ocupación
    let occupancyInfo = undefined;
    if (occupancySensors.length > 0) {
      const occSensor = occupancySensors[0];
      if (occSensor.lastReading) {
        occupancyInfo = {
          current: occSensor.lastReading.value,
          unit: 'personas',
          quality: occSensor.lastReading.quality,
          timestamp: occSensor.lastReading.timestamp,
          sensor: occSensor
        };
      }
    }

    // Obtener datos de humedad (desde additionalData)
    let humidityInfo = undefined;
    const humiditySensor = spaceSensors.find(s => 
      s.lastReading?.additionalData?.humidity !== undefined
    );
    if (humiditySensor?.lastReading?.additionalData?.humidity) {
      humidityInfo = {
        current: humiditySensor.lastReading.additionalData.humidity,
        unit: '%',
        timestamp: humiditySensor.lastReading.timestamp
      };
    }

    // Contar alertas (sensores con quality warning/critical/error)
    const alertCount = spaceSensors.filter(s => 
      s.lastReading?.quality && 
      ['warning', 'critical', 'error'].includes(s.lastReading.quality)
    ).length;

    // Determinar última actualización
    const lastUpdateTimes = spaceSensors
      .map(s => s.lastReading?.timestamp)
      .filter(t => t)
      .map(t => new Date(t!).getTime());
    
    const lastUpdate = lastUpdateTimes.length > 0 
      ? new Date(Math.max(...lastUpdateTimes)).toISOString()
      : new Date().toISOString();

    return {
      spaceGuid,
      spaceName: space.properties?.name || space.properties?.longName || 'Espacio sin nombre',
      sensors: spaceSensors,
      temperature: temperatureInfo,
      occupancy: occupancyInfo,
      humidity: humidityInfo,
      lastUpdate,
      isActive: spaceSensors.some(s => s.lastReading),
      alertCount
    };
  }, [spaces]);

  /**
   * Actualiza la información de todos los espacios o uno específico
   */
  const refreshSpaceInfo = useCallback(async (spaceGuid?: string) => {
    if (isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    
    try {
      if (spaceGuid) {
        // Actualizar espacio específico
        const spaceInfo = buildSpaceInfo(spaceGuid);
        if (spaceInfo) {
          setSpacesInfo(prev => new Map(prev.set(spaceGuid, spaceInfo)));
          
          // Actualizar hoveredSpace si es el mismo
          if (hoveredSpace?.spaceGuid === spaceGuid) {
            setHoveredSpace(spaceInfo);
          }
        }
      } else {
        // Actualizar todos los espacios que tienen sensores
        const newSpacesInfo = new Map<string, SpaceSensorInfo>();
        
        // Obtener todos los espacios con sensores
        const spacesWithSensors = sensorSpaceIntegration.getSpacesWithSensors();
        
        for (const guid of spacesWithSensors) {
          const spaceInfo = buildSpaceInfo(guid);
          if (spaceInfo) {
            newSpacesInfo.set(guid, spaceInfo);
          }
        }
        
        setSpacesInfo(newSpacesInfo);
        
        // Actualizar hoveredSpace si existe
        if (hoveredSpace) {
          const updatedHoveredSpace = newSpacesInfo.get(hoveredSpace.spaceGuid);
          if (updatedHoveredSpace) {
            setHoveredSpace(updatedHoveredSpace);
          }
        }
      }
      
      console.log(`📊 Información de espacios actualizada${spaceGuid ? ` para ${spaceGuid.slice(-8)}` : ''}`);
      
    } catch (error) {
      console.error('❌ Error actualizando información de espacios:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [buildSpaceInfo, hoveredSpace]);

  /**
   * Maneja el hover sobre un espacio
   */
  const handleSpaceHover = useCallback((
    spaceGuid: string | null, 
    position?: { x: number; y: number }
  ) => {
    if (!enableHover) return;

    if (spaceGuid) {
      const spaceInfo = spacesInfo.get(spaceGuid) || buildSpaceInfo(spaceGuid);
      
      if (spaceInfo) {
        setHoveredSpace(spaceInfo);
        setIsHovering(true);
        
        if (position) {
          setHoverPosition(position);
        }
        
        console.log(`🖱️ Hover activado en espacio: ${spaceInfo.spaceName}`);
      }
    } else {
      setHoveredSpace(null);
      setIsHovering(false);
      setHoverPosition(null);
    }
  }, [enableHover, spacesInfo, buildSpaceInfo]);

  /**
   * Obtiene información de un espacio específico
   */
  const getSpaceInfo = useCallback((spaceGuid: string): SpaceSensorInfo | null => {
    return spacesInfo.get(spaceGuid) || buildSpaceInfo(spaceGuid);
  }, [spacesInfo, buildSpaceInfo]);

  /**
   * Obtiene información de todos los espacios
   */
  const getAllSpacesInfo = useCallback((): SpaceSensorInfo[] => {
    return Array.from(spacesInfo.values());
  }, [spacesInfo]);

  /**
   * Verifica si un espacio está activo (tiene lecturas recientes)
   */
  const isSpaceActive = useCallback((spaceGuid: string): boolean => {
    const spaceInfo = getSpaceInfo(spaceGuid);
    return spaceInfo?.isActive || false;
  }, [getSpaceInfo]);

  /**
   * Obtiene la temperatura actual de un espacio
   */
  const getSpaceTemperature = useCallback((spaceGuid: string): number | null => {
    const spaceInfo = getSpaceInfo(spaceGuid);
    return spaceInfo?.temperature?.current || null;
  }, [getSpaceInfo]);

  /**
   * Obtiene la ocupación actual de un espacio
   */
  const getSpaceOccupancy = useCallback((spaceGuid: string): number | null => {
    const spaceInfo = getSpaceInfo(spaceGuid);
    return spaceInfo?.occupancy?.current || null;
  }, [getSpaceInfo]);

  // Efecto para actualización automática
  useEffect(() => {
    if (autoUpdate) {
      const startAutoUpdate = () => {
        updateIntervalRef.current = setInterval(() => {
          refreshSpaceInfo();
        }, updateInterval);
      };

      // Actualización inicial
      refreshSpaceInfo();
      
      // Iniciar actualización automática
      startAutoUpdate();

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    }
  }, [autoUpdate, updateInterval, refreshSpaceInfo]);

  // Escuchar eventos de actualización de sensores
  useEffect(() => {
    const handleSensorUpdate = (event: CustomEvent) => {
      console.log('🔄 Sensor update recibido, refrescando información...');
      refreshSpaceInfo();
    };

    const handleHeatMapUpdate = (event: CustomEvent<HeatMapData>) => {
      console.log('🌡️ HeatMap update recibido, refrescando espacio específico...');
      refreshSpaceInfo(event.detail.spaceGuid);
    };

    window.addEventListener('sensorMappingUpdate', handleSensorUpdate as EventListener);
    window.addEventListener('heatMapUpdate', handleHeatMapUpdate as EventListener);
    window.addEventListener('heatMapDataUpdated', handleSensorUpdate as EventListener);

    return () => {
      window.removeEventListener('sensorMappingUpdate', handleSensorUpdate as EventListener);
      window.removeEventListener('heatMapUpdate', handleHeatMapUpdate as EventListener);
      window.removeEventListener('heatMapDataUpdated', handleSensorUpdate as EventListener);
    };
  }, [refreshSpaceInfo]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    // Estado del hover
    hoveredSpace,
    isHovering,
    hoverPosition,
    
    // Información de espacios
    getSpaceInfo,
    getAllSpacesInfo,
    
    // Control de hover
    handleSpaceHover,
    
    // Utilidades
    refreshSpaceInfo,
    isSpaceActive,
    getSpaceTemperature,
    getSpaceOccupancy
  };
}
