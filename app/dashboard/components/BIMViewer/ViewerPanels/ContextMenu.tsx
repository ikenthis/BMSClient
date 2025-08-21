//ContextMenu.tsx

"use client";

import React from 'react';
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  item: { model: FRAGS.FragmentsModel; localId: number } | null;
}

export interface ContextMenuHandlersProps {
  world: OBC.World | null;
  models: FRAGS.FragmentsModel[];
  fragments: FRAGS.FragmentsModels | null;
  showPropertyPanel: boolean;
  setShowPropertyPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowToolbar: React.Dispatch<React.SetStateAction<boolean>>;
  selectElement: (item: { model: FRAGS.FragmentsModel; localId: number } | null) => Promise<void>;
  selectElementAndShowProperties: (item: { model: FRAGS.FragmentsModel; localId: number } | null) => Promise<void>;
}

export function useContextMenuHandlers({
  world,
  models,
  fragments,
  showPropertyPanel,
  setShowPropertyPanel,
  setShowToolbar,
  selectElement,
  selectElementAndShowProperties
}: ContextMenuHandlersProps) {
  // Estado para el menú contextual
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    item: null
  });

  // Realiza un raycasting y devuelve el primer elemento encontrado
  const performRaycasting = async (event: React.MouseEvent | MouseEvent) => {
    if (!fragments || models.length === 0 || !world?.camera?.three || !world?.renderer?.three?.domElement) {
      return null;
    }
    
    // Obtener coordenadas del click
    const mouse = new THREE.Vector2();
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    // Intentar realizar raycasting en todos los modelos cargados
    for (const model of models) {
      try {
        const result = await model.raycast({
          camera: world.camera.three,
          mouse,
          dom: world.renderer.three.domElement,
        });
        
        if (result) {
          return {
            model,
            localId: result.localId
          };
        }
      } catch (error) {
        console.warn("Error en raycasting:", error);
      }
    }
    
    return null;
  };

  // Función para manejar el click derecho
  const handleContextMenu = async (event: React.MouseEvent) => {
    event.preventDefault(); // Prevenir el menú contextual del navegador
    
    // Realizar raycasting
    const hitResult = await performRaycasting(event);
    
    // Si encontramos un elemento, mostrar menú contextual
    if (hitResult) {
      // También seleccionamos el elemento (lo resaltamos) como si hubiéramos hecho click izquierdo
      await selectElement(hitResult);
      
      // Mostramos el menú contextual
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        item: hitResult
      });
    } else {
      // Si click en vacío, ocultar menú contextual
      setContextMenu(prev => ({
        ...prev,
        visible: false,
        item: null
      }));
      
      // También deseleccionamos elemento
      selectElement(null);
    }
  };
  
  // Función para manejar el click normal (izquierdo)
  const handleNormalClick = async (event: React.MouseEvent) => {
    // Ocultar el menú contextual si está visible
    if (contextMenu.visible) {
      hideContextMenu();
      return;
    }
    
    // Si el panel de propiedades está abierto, lo cerramos al hacer click en cualquier lugar
    if (showPropertyPanel) {
      setShowPropertyPanel(false);
      setShowToolbar(true);
      return;
    }
    
    // Realizar raycasting
    const hitResult = await performRaycasting(event);
    
    // Solo seleccionamos el elemento (o deseleccionamos si es vacío)
    await selectElement(hitResult);
  };
    
  // Función para ocultar el menú contextual
  const hideContextMenu = () => {
    setContextMenu(prev => ({
      ...prev,
      visible: false
    }));
  };
  
  // Función para mostrar propiedades desde el menú contextual
  const showPropertiesFromContext = () => {
    if (contextMenu.item) {
      // Usar la función unificada para seleccionar y mostrar propiedades
      selectElementAndShowProperties(contextMenu.item);
      
      // Ocultar menú contextual después de seleccionar
      hideContextMenu();
    }
  };

  return {
    contextMenu,
    setContextMenu,
    performRaycasting,
    handleContextMenu,
    handleNormalClick,
    hideContextMenu,
    showPropertiesFromContext
  };
}

export default useContextMenuHandlers;