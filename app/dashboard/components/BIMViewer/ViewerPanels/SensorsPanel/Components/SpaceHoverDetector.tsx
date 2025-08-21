// src/components/BIMViewer/components/SpaceHoverDetector.tsx
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { useSpaceSensorInfo } from '../hooks/useSpaceSensorInfo';
import { SpaceElement } from '../../../utils/typeDefs';
import SpaceSensorTooltip from './SpaceSensorTooltip';
import SpaceSensorPanel from './SpaceSensorPanel';

interface SpaceHoverDetectorProps {
  world: OBC.World | null;
  fragments: FRAGS.FragmentsModels | null;
  spaces: SpaceElement[];
  containerRef: React.RefObject<HTMLDivElement>;
  isHeatMapActive: boolean;
  enableHover?: boolean;
  showPanel?: boolean;
  onSpaceSelected?: (spaceGuid: string, spaceName: string) => void;
}

const SpaceHoverDetector: React.FC<SpaceHoverDetectorProps> = ({
  world,
  fragments,
  spaces,
  containerRef,
  isHeatMapActive,
  enableHover = true,
  showPanel = true,
  onSpaceSelected
}) => {
  // Estados locales
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedSpaceForPanel, setSelectedSpaceForPanel] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  
  // Referencias para raycasting
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const lastHoveredSpaceRef = useRef<string | null>(null);

  // Hook para información de espacios con sensores
  const spaceSensorInfo = useSpaceSensorInfo(spaces, {
    autoUpdate: true,
    updateInterval: 30000,
    enableHover: enableHover && isHeatMapActive
  });

  /**
   * 🔥 FUNCIÓN CLAVE: Detectar espacios bajo el cursor
   */
  const detectSpaceUnderCursor = useCallback((event: MouseEvent): string | null => {
    if (!world?.scene?.three.scene || !world.camera.controls?.object || !fragments) {
      return null;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    try {
      // Calcular coordenadas normalizadas del mouse
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Configurar raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, world.camera.controls.object);

      // Obtener todos los objetos visibles de la escena
      const intersectableObjects: THREE.Object3D[] = [];
      world.scene.three.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.visible) {
          intersectableObjects.push(child);
        }
      });

      if (intersectableObjects.length === 0) return null;

      // Realizar intersección
      const intersects = raycasterRef.current.intersectObjects(intersectableObjects, false);

      if (intersects.length === 0) return null;

      const intersectedObject = intersects[0].object;

      // Buscar el espacio correspondiente en los fragmentos
      for (const model of fragments.models.list.values()) {
        try {
          // Método 1: Buscar por userData directamente
          if (intersectedObject.userData?.spaceGuid) {
            return intersectedObject.userData.spaceGuid;
          }

          // Método 2: Buscar por geometría y comparar con espacios conocidos
          const fragmentID = intersectedObject.parent?.userData?.fragmentID;
          if (fragmentID) {
            const fragment = model.getFragmentById(fragmentID);
            if (fragment) {
              // Buscar espacios en este modelo
              const categories = await model.getCategories();
              if (categories.includes('IFCSPACE')) {
                const spaceItems = await model.getItemsOfCategory('IFCSPACE');
                
                // Buscar coincidencia por posición/geometría
                for (const space of spaceItems) {
                  const localId = await space.getLocalId();
                  if (localId === null) continue;
                  
                  const guid = await space.getGuid();
                  if (!guid) continue;

                  // Verificar si este espacio contiene el punto intersectado
                  const boxes = await model.getBoxes([localId]);
                  if (boxes && boxes.length > 0) {
                    const box = boxes[0];
                    const point = intersects[0].point;
                    
                    // Verificar si el punto está dentro del bounding box del espacio
                    if (point.x >= box.min.x && point.x <= box.max.x &&
                        point.y >= box.min.y && point.y <= box.max.y &&
                        point.z >= box.min.z && point.z <= box.max.z) {
                      return guid;
                    }
                  }
                }
              }
            }
          }

          // Método 3: Buscar por localId si está disponible
          if (intersectedObject.userData?.localId) {
            const localId = intersectedObject.userData.localId;
            
            // Verificar si es un espacio
            const itemsData = await model.getItemsData([localId], {
              includeGeometry: false,
              includeMaterials: false,
              includeProperties: true
            });
            
            if (itemsData && itemsData.length > 0 && itemsData[0].type === 'IFCSPACE') {
              // Obtener el item para conseguir su GUID
              const spaceItems = await model.getItemsOfCategory('IFCSPACE');
              for (const space of spaceItems) {
                const spaceLocalId = await space.getLocalId();
                if (spaceLocalId === localId) {
                  const guid = await space.getGuid();
                  return guid;
                }
              }
            }
          }
        } catch (error) {
          // Continuar con el siguiente modelo si hay error
          continue;
        }
      }

      return null;
    } catch (error) {
      console.warn('Error detectando espacio:', error);
      return null;
    }
  }, [world, fragments, containerRef]);

  /**
   * Maneja eventos de mouse para hover
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enableHover || !isHeatMapActive) return;

    // Actualizar posición del mouse
    setMousePosition({ x: event.clientX, y: event.clientY });

    // Detectar espacio bajo el cursor
    const spaceGuid = detectSpaceUnderCursor(event);
    
    if (spaceGuid && spaceGuid !== lastHoveredSpaceRef.current) {
      // Nuevo espacio detectado
      lastHoveredSpaceRef.current = spaceGuid;
      spaceSensorInfo.handleSpaceHover(spaceGuid, { x: event.clientX, y: event.clientY });
      
      console.log(`🖱️ Hover sobre espacio: ${spaceGuid.slice(-8)}`);
    } else if (!spaceGuid && lastHoveredSpaceRef.current) {
      // Ya no hay espacio bajo el cursor
      lastHoveredSpaceRef.current = null;
      spaceSensorInfo.handleSpaceHover(null);
    }
  }, [enableHover, isHeatMapActive, detectSpaceUnderCursor, spaceSensorInfo]);

  /**
   * Maneja clicks en espacios
   */
  const handleSpaceClick = useCallback((event: MouseEvent) => {
    if (!enableHover || !isHeatMapActive) return;

    const spaceGuid = detectSpaceUnderCursor(event);
    
    if (spaceGuid) {
      const spaceInfo = spaceSensorInfo.getSpaceInfo(spaceGuid);
      if (spaceInfo) {
        setSelectedSpaceForPanel(spaceGuid);
        if (showPanel) {
          setShowDetailPanel(true);
        }
        
        // Callback opcional para notificar selección
        if (onSpaceSelected) {
          onSpaceSelected(spaceGuid, spaceInfo.spaceName);
        }
        
        console.log(`🖱️ Click en espacio: ${spaceInfo.spaceName}`);
      }
    }
  }, [enableHover, isHeatMapActive, detectSpaceUnderCursor, spaceSensorInfo, showPanel, onSpaceSelected]);

  /**
   * Maneja doble click para abrir panel
   */
  const handleDoubleClick = useCallback((event: MouseEvent) => {
    if (!enableHover || !isHeatMapActive) return;

    const spaceGuid = detectSpaceUnderCursor(event);
    
    if (spaceGuid) {
      const spaceInfo = spaceSensorInfo.getSpaceInfo(spaceGuid);
      if (spaceInfo) {
        setSelectedSpaceForPanel(spaceGuid);
        setShowDetailPanel(true);
        
        console.log(`🖱️ Doble click en espacio: ${spaceInfo.spaceName} - Abriendo panel`);
      }
    }
  }, [enableHover, isHeatMapActive, detectSpaceUnderCursor, spaceSensorInfo]);

  /**
   * Configura eventos de mouse en el contenedor
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableHover) return;

    // Configurar eventos
    container.addEventListener('mousemove', handleMouseMove, { passive: true });
    container.addEventListener('click', handleSpaceClick);
    container.addEventListener('dblclick', handleDoubleClick);

    // Cleanup
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleSpaceClick);
      container.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleMouseMove, handleSpaceClick, handleDoubleClick, enableHover]);

  /**
   * Limpia hover cuando se desactiva el heatmap
   */
  useEffect(() => {
    if (!isHeatMapActive) {
      lastHoveredSpaceRef.current = null;
      spaceSensorInfo.handleSpaceHover(null);
      setShowDetailPanel(false);
    }
  }, [isHeatMapActive, spaceSensorInfo]);

  // Solo renderizar si el hover está habilitado
  if (!enableHover) return null;

  return (
    <>
      {/* Tooltip de hover */}
      <SpaceSensorTooltip
        spaceInfo={spaceSensorInfo.hoveredSpace}
        position={spaceSensorInfo.hoverPosition || mousePosition}
        visible={spaceSensorInfo.isHovering && !!spaceSensorInfo.hoveredSpace && isHeatMapActive}
      />

      {/* Panel de información detallada */}
      {showPanel && (
        <SpaceSensorPanel
          spaceInfo={selectedSpaceForPanel ? spaceSensorInfo.getSpaceInfo(selectedSpaceForPanel) : null}
          isVisible={showDetailPanel}
          onClose={() => setShowDetailPanel(false)}
          onRefresh={() => {
            if (selectedSpaceForPanel) {
              spaceSensorInfo.refreshSpaceInfo(selectedSpaceForPanel);
            }
          }}
        />
      )}
    </>
  );
};

export default SpaceHoverDetector;