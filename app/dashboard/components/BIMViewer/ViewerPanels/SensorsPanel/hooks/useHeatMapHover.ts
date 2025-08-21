// useHeatMapHover.ts - Hook para manejar el hover del HeatMap
import { useState, useEffect, useCallback } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { 
  heatMapHoverManager, 
  HoverEventData, 
  SpaceSensorData 
} from '../MapHoverManager'; // Asegúrate de que la ruta sea correcta
import { sensorDataService } from '../services/SensorDataService';

interface UseHeatMapHoverProps {
  world: OBC.World | null;
  fragments: FRAGS.FragmentsModels | null;
  isHeatMapActive: boolean;
  useTestData?: boolean; // Para usar datos de prueba cuando no hay backend
}

interface UseHeatMapHoverReturn {
  // Estado del hover
  isHovering: boolean;
  hoveredSpace: HoverEventData | null;
  spaceData: SpaceSensorData | null;
  mousePosition: { x: number; y: number };
  
  // Estado de carga
  isLoadingData: boolean;
  error: string | null;
  
  // Funciones
  forceRefresh: () => void;
  clearCache: () => void;
  
  // Estadísticas
  spacesCount: number;
  cacheStats: { size: number; timeout: number };
}

export const useHeatMapHover = ({
  world,
  fragments,
  isHeatMapActive,
  useTestData = false
}: UseHeatMapHoverProps): UseHeatMapHoverReturn => {
  
  // Estados del hover
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredSpace, setHoveredSpace] = useState<HoverEventData | null>(null);
  const [spaceData, setSpaceData] = useState<SpaceSensorData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Estados de carga
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de estadísticas
  const [spacesCount, setSpacesCount] = useState(0);
  const [cacheStats, setCacheStats] = useState({ size: 0, timeout: 30000 });

  // Inicializar el gestor de hover
  useEffect(() => {
    if (world && fragments) {
      console.log('🖱️ Inicializando HeatMapHover...');
      heatMapHoverManager.initialize(world, fragments);
      setSpacesCount(heatMapHoverManager.spacesCount);
      
      return () => {
        heatMapHoverManager.dispose();
      };
    }
  }, [world, fragments]);

  // Activar/desactivar según el estado del HeatMap
  useEffect(() => {
    console.log(`🖱️ ${isHeatMapActive ? 'Activando' : 'Desactivando'} sistema de hover`);
    heatMapHoverManager.setActive(isHeatMapActive);
    
    if (!isHeatMapActive) {
      // Limpiar estado cuando se desactiva
      setIsHovering(false);
      setHoveredSpace(null);
      setSpaceData(null);
      setError(null);
    }
  }, [isHeatMapActive]);

  // Configurar callbacks del gestor de hover
  useEffect(() => {
    // Callback para cuando se hace hover sobre un espacio
    heatMapHoverManager.onSpaceHover(async (data: HoverEventData) => {
      console.log(`🎯 Hover sobre espacio: ${data.spaceName} (${data.spaceGuid.slice(-8)}...)`);
      
      setIsHovering(true);
      setHoveredSpace(data);
      setMousePosition(data.mousePosition);
      setError(null);
      
      // Cargar datos de sensores
      await loadSpaceData(data.spaceGuid, data.spaceName);
    });

    // Callback para cuando se deja de hacer hover
    heatMapHoverManager.onSpaceLeave(() => {
      console.log('🚫 Saliendo del hover');
      setIsHovering(false);
      setHoveredSpace(null);
      setSpaceData(null);
      setIsLoadingData(false);
      setError(null);
    });

    // Callback para solicitar datos de sensores
    heatMapHoverManager.onSpaceDataRequest(async (spaceGuid: string) => {
      return await fetchSpaceData(spaceGuid);
    });

  }, [useTestData]);

  // Función para cargar datos de un espacio
  const loadSpaceData = useCallback(async (spaceGuid: string, spaceName: string) => {
    try {
      setIsLoadingData(true);
      setError(null);
      
      console.log(`📊 Cargando datos para ${spaceName}...`);
      
      let data: SpaceSensorData | null = null;
      
      if (useTestData) {
        // Usar datos de prueba
        console.log('🧪 Usando datos de prueba');
        data = await sensorDataService.getTestSpaceData(spaceGuid, spaceName);
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        // Usar datos reales del backend
        data = await sensorDataService.getSpaceSensorData(spaceGuid);
      }
      
      if (data) {
        console.log(`✅ Datos cargados para ${spaceName}:`, {
          temperature: data.temperature,
          occupancy: data.occupancy,
          sensors: data.sensors.length,
          quality: data.quality
        });
        setSpaceData(data);
      } else {
        console.warn(`⚠️ No se encontraron datos para ${spaceName}`);
        setError('No hay datos de sensores disponibles para este espacio');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`❌ Error cargando datos para ${spaceName}:`, err);
      setError(`Error cargando datos: ${errorMessage}`);
      setSpaceData(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [useTestData]);

  // Función para obtener datos de un espacio (usado por el callback)
  const fetchSpaceData = useCallback(async (spaceGuid: string): Promise<SpaceSensorData | null> => {
    try {
      if (useTestData) {
        return await sensorDataService.getTestSpaceData(spaceGuid, 'Espacio de prueba');
      } else {
        return await sensorDataService.getSpaceSensorData(spaceGuid);
      }
    } catch (error) {
      console.error('Error fetching space data:', error);
      return null;
    }
  }, [useTestData]);

  // Función para forzar actualización
  const forceRefresh = useCallback(() => {
    console.log('🔄 Forzando actualización de datos...');
    sensorDataService.clearCache();
    
    if (hoveredSpace) {
      loadSpaceData(hoveredSpace.spaceGuid, hoveredSpace.spaceName);
    }
    
    // Actualizar estadísticas
    setCacheStats(sensorDataService.getCacheStats());
  }, [hoveredSpace, loadSpaceData]);

  // Función para limpiar cache
  const clearCache = useCallback(() => {
    console.log('🧹 Limpiando cache...');
    sensorDataService.clearCache();
    heatMapHoverManager.clearCache();
    setCacheStats(sensorDataService.getCacheStats());
  }, []);

  // Actualizar estadísticas periódicamente
  useEffect(() => {
    const updateStats = () => {
      setCacheStats(sensorDataService.getCacheStats());
      setSpacesCount(heatMapHoverManager.spacesCount);
    };

    // Actualizar inmediatamente
    updateStats();

    // Actualizar cada 10 segundos
    const interval = setInterval(updateStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Estado del hover
    isHovering,
    hoveredSpace,
    spaceData,
    mousePosition,
    
    // Estado de carga
    isLoadingData,
    error,
    
    // Funciones
    forceRefresh,
    clearCache,
    
    // Estadísticas
    spacesCount,
    cacheStats
  };
};