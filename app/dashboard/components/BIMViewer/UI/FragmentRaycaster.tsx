"use client";

import { useEffect } from 'react';
import * as THREE from 'three';
import { useBIMViewerContext } from '../BimViewerContext';
import useFragmentsRaycaster from '../hooks/useFragmentRaycaster';

interface FragmentsRaycasterProps {
  enabled?: boolean;
  highlightColor?: string;
  highlightOpacity?: number;
}

/**
 * Componente funcional que agrega capacidad de raycasting al visor BIM
 * Este componente no renderiza nada visual, solo añade funcionalidad
 */
const FragmentsRaycaster: React.FC<FragmentsRaycasterProps> = ({
  enabled = true,
  highlightColor = '#a4a9fc',
  highlightOpacity = 0.7
}) => {
  // Obtener contexto del visor
  const { viewerState } = useBIMViewerContext();
  
  // Obtener estado y referencias necesarias
  const { 
    models, 
    world,
    setHoveredItem,
    containerRef
  } = viewerState;

  // Configurar material de resaltado
  const highlightMaterial = {
    color: new THREE.Color(highlightColor),
    renderedFaces: 2, // Equivalente a FRAGS.RenderedFaces.TWO
    opacity: highlightOpacity,
    transparent: true
  };

  // Para simplicidad, usar el primer modelo disponible
  // Esto podría extenderse para hacer raycasting en todos los modelos
  const activeModel = models.length > 0 ? models[0] : null;
  
  // Configurar el raycaster usando nuestro hook personalizado
  const { hoveredItem } = useFragmentsRaycaster({
    model: activeModel,
    camera: world?.camera?.three || null,
    domElement: containerRef.current,
    enabled,
    highlightMaterial,
    onHover: (data) => {
      if (data && activeModel) {
        // Actualizar estado del elemento bajo el cursor
        setHoveredItem({
          localId: data.id || data.expressID || data.entityID,
          model: activeModel,
          data
        });
      } else {
        // Limpiar estado cuando no hay elemento bajo el cursor
        setHoveredItem(null);
      }
    }
  });

  // Sincronizar el estado del elemento hover con el contexto
  useEffect(() => {
    // La sincronización ocurre en el callback onHover
  }, [hoveredItem]);

  // Este componente no renderiza nada visual
  return null;
};

export default FragmentsRaycaster;