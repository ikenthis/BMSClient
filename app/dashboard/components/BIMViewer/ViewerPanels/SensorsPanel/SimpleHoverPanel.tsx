// SimpleHoverPanel.tsx - Panel simple que usa los eventos existentes del viewer
import React, { useState, useEffect, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import HeatMapHoverPanel from './HeatMapHover';
import { sensorDataService } from './services/SensorDataService';
import { SpaceSensorData } from './MapHoverManager';

interface SimpleHoverPanelProps {
  world: OBC.World | null;
  fragments: FRAGS.FragmentsModels | null;
  isHeatMapActive: boolean;
  heatMapData: Map<string, any>; // Los datos del HeatMap que ya tienes
  useTestData?: boolean;
}

const SimpleHoverPanel: React.FC<SimpleHoverPanelProps> = ({
  world,
  fragments,
  isHeatMapActive,
  heatMapData,
  useTestData = true
}) => {
  
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentSpaceData, setCurrentSpaceData] = useState<SpaceSensorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<any>(null);
  
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  // Función para extraer propiedades IFC
  const extractPropertyValue = (data: any, propertyName: string): string => {
    if (!data) return '';
    
    if (data[propertyName] !== undefined) {
      const prop = data[propertyName];
      if (typeof prop === 'object' && prop && prop.type === 'IFCLABEL' && prop.value !== undefined) {
        return prop.value;
      }
      if (typeof prop !== 'object' || prop === null) {
        return String(prop);
      }
    }
    
    if (data.properties && data.properties[propertyName] !== undefined) {
      const prop = data.properties[propertyName];
      if (typeof prop === 'object' && prop && prop.value !== undefined) {
        return typeof prop.value === 'string' ? prop.value : String(prop.value);
      }
      if (typeof prop !== 'object' || prop === null) {
        return String(prop);
      }
    }
    
    return '';
  };

  // Función para obtener datos del espacio
  const getSpaceData = async (spaceGuid: string, spaceName: string): Promise<SpaceSensorData | null> => {
    try {
      if (useTestData) {
        return await sensorDataService.getTestSpaceData(spaceGuid, spaceName);
      } else {
        return await sensorDataService.getSpaceSensorData(spaceGuid);
      }
    } catch (error) {
      console.error('Error obteniendo datos del espacio:', error);
      return null;
    }
  };

  // Función para verificar si un elemento es un espacio con datos de HeatMap
  const checkIfSpaceWithHeatMap = async (element: { model: FRAGS.FragmentsModel; localId: number }) => {
    if (!element || !fragments) return null;

    try {
      // Verificar si es IFCSPACE
      const categories = await element.model.getCategories();
      if (!categories.includes('IFCSPACE')) return null;

      // Verificar si este localId corresponde a un espacio
      const spaceItems = await element.model.getItemsOfCategory('IFCSPACE');
      let spaceGuid: string | null = null;
      let spaceName: string = '';

      for (const item of spaceItems) {
        const itemLocalId = await item.getLocalId();
        if (itemLocalId === element.localId) {
          try {
            spaceGuid = await item.getGuid();
            
            // Obtener nombre
            const itemsData = await element.model.getItemsData([element.localId], {
              includeProperties: true,
              includeGeometry: false,
              includeMaterials: false
            });
            
            if (itemsData && itemsData.length > 0) {
              spaceName = extractPropertyValue(itemsData[0], 'Name') || `Espacio ${element.localId}`;
              
              // Filtrar áreas que empiecen con "Área:"
              if (spaceName.startsWith('Área:')) {
                return null;
              }
            }
            break;
          } catch (error) {
            continue;
          }
        }
      }

      // Verificar si este espacio tiene datos en el HeatMap
      if (spaceGuid) {
        const hasHeatMapData = heatMapData.has(spaceGuid) || 
                              Array.from(heatMapData.keys()).some(key => 
                                key.includes(spaceGuid.substring(0, 8)) || 
                                spaceGuid.includes(key.substring(0, 8))
                              );
        
        if (hasHeatMapData) {
          return { spaceGuid, spaceName };
        }
      }

      return null;
    } catch (error) {
      console.warn('Error verificando espacio:', error);
      return null;
    }
  };

  // Configurar listeners de mouse
  useEffect(() => {
    if (!world || !isHeatMapActive) return;

    const canvas = world.renderer?.three.domElement;
    if (!canvas) return;

    let currentElement: any = null;

    const handleMouseMove = async (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });

      // Si hay un timeout pendiente, cancelarlo
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = null;
      }

      // Obtener el elemento seleccionado actual del mundo (si existe)
      // Esto asume que tienes acceso al elemento seleccionado globalmente
      const selectedElement = (window as any).currentSelectedElement || 
                            (window as any).hoveredElement ||
                            currentElement;

      if (selectedElement) {
        // Configurar timeout para mostrar panel después de un delay
        hoverTimeout.current = setTimeout(async () => {
          const spaceInfo = await checkIfSpaceWithHeatMap(selectedElement);
          
          if (spaceInfo) {
            console.log(`🎯 Hover sobre espacio con HeatMap: ${spaceInfo.spaceName}`);
            setHoveredElement(selectedElement);
            setIsVisible(true);
            setIsLoading(true);
            
            try {
              const data = await getSpaceData(spaceInfo.spaceGuid, spaceInfo.spaceName);
              setCurrentSpaceData(data);
            } catch (error) {
              console.error('Error cargando datos:', error);
              setCurrentSpaceData(null);
            } finally {
              setIsLoading(false);
            }
          } else {
            setIsVisible(false);
            setCurrentSpaceData(null);
            setHoveredElement(null);
          }
        }, 300); // 300ms delay
      }
    };

    const handleMouseLeave = () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = null;
      }
      setIsVisible(false);
      setCurrentSpaceData(null);
      setHoveredElement(null);
    };

    // Agregar listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
    };
  }, [world, isHeatMapActive, heatMapData, useTestData]);

  // Limpiar cuando se desactiva el HeatMap
  useEffect(() => {
    if (!isHeatMapActive) {
      setIsVisible(false);
      setCurrentSpaceData(null);
      setHoveredElement(null);
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
        hoverTimeout.current = null;
      }
    }
  }, [isHeatMapActive]);

  if (!isHeatMapActive) {
    return null;
  }

  return (
    <HeatMapHoverPanel
      isVisible={isVisible}
      position={mousePosition}
      spaceData={currentSpaceData}
      isLoading={isLoading}
    />
  );
};

export default SimpleHoverPanel;