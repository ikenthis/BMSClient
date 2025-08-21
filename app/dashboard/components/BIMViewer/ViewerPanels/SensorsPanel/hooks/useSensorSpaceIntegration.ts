// src/hooks/useSensorSpaceIntegration.ts

import { useState, useEffect, useCallback } from 'react';
import { Sensor } from '../../../services/sensorApiService';
import { SpaceElement } from '../../../';
import { sensorSpaceIntegration, SensorSpaceMapping, HeatMapData } from '../services/sensorSpaceIntegrationService';
import { heatMapVisualization } from '../utils/HeatMapVisualization';

export const useSensorSpaceIntegration = (
  sensors: Sensor[],
  spaces: SpaceElement[]
) => {
  const [mappedSensors, setMappedSensors] = useState<Map<string, SensorSpaceMapping>>(new Map());
  const [heatMapActive, setHeatMapActive] = useState(false);
  const [heatMapData, setHeatMapData] = useState<Map<string, HeatMapData>>(new Map());

  // Sincronizar espacios con el servicio
  useEffect(() => {
    if (spaces.length > 0) {
      sensorSpaceIntegration.setSpacesCache(spaces);
    }
  }, [spaces]);

  // Auto-mapear sensores por nombre
  useEffect(() => {
    if (sensors.length > 0 && spaces.length > 0) {
      sensorSpaceIntegration.autoMapSensorsByName(sensors);
      setMappedSensors(new Map(sensorSpaceIntegration.getSpacesBySensor()));
    }
  }, [sensors, spaces]);

  // Escuchar actualizaciones del mapa de calor
  useEffect(() => {
    const handleHeatMapUpdate = (event: CustomEvent<HeatMapData>) => {
      setHeatMapData(prev => new Map(prev.set(event.detail.spaceGuid, event.detail)));
    };

    window.addEventListener('heatMapUpdate', handleHeatMapUpdate as EventListener);
    
    return () => {
      window.removeEventListener('heatMapUpdate', handleHeatMapUpdate as EventListener);
    };
  }, []);

  const mapSensorToSpace = useCallback((sensor: Sensor, spaceGuid: string) => {
    const success = sensorSpaceIntegration.mapSensorToSpace(sensor, spaceGuid);
    if (success) {
      setMappedSensors(new Map(sensorSpaceIntegration.getSpacesBySensor()));
    }
    return success;
  }, []);

  const toggleHeatMap = useCallback(async () => {
    if (heatMapActive) {
      await heatMapVisualization.deactivateHeatMap();
      setHeatMapActive(false);
    } else {
      await heatMapVisualization.activateHeatMap();
      setHeatMapActive(true);
    }
  }, [heatMapActive]);

  const getSensorsBySpace = useCallback((spaceGuid: string) => {
    return sensorSpaceIntegration.getSensorsBySpace(spaceGuid);
  }, []);

  return {
    mappedSensors,
    heatMapActive,
    heatMapData,
    mapSensorToSpace,
    toggleHeatMap,
    getSensorsBySpace,
    availableSpaces: spaces
  };
};