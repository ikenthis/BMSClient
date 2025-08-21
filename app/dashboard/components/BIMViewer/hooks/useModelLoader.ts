"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';

/**
 * Hook para manejar el centrado de modelos
 */
export const useModelLoader = (
  world: OBC.World | null, 
  models: FRAGS.FragmentsModel[],
  onModelLoaded?: (models: FRAGS.FragmentsModel[]) => void
) => {
  // Referencia para controlar si el modelo ya fue centrado
  const centeredRef = useRef<boolean>(false);
  
  // Referencias para evitar re-renders innecesarios
  const worldRef = useRef<OBC.World | null>(null);
  const modelsRef = useRef<FRAGS.FragmentsModel[]>([]);
  
  // Actualizar referencias cuando cambien las props
  useEffect(() => {
    worldRef.current = world;
    modelsRef.current = models;
  }, [world, models]);
  
  // Función para centrar el modelo en la vista
  const centerModel = useCallback(() => {
    if (!worldRef.current || modelsRef.current.length === 0) {
      console.log("No se puede centrar: mundo o modelos no están listos");
      return;
    }
    
    try {
      console.log("🎯 Centrando vista del modelo...");
      const bbox = new THREE.Box3();
      let hasGeometry = false;
      
      // Calcular bounding box de todos los modelos
      modelsRef.current.forEach(m => {
        if (m.object) {
          bbox.expandByObject(m.object);
          hasGeometry = true;
        }
      });
      
      if (!hasGeometry) {
        console.warn("⚠️ No se puede centrar: no hay geometría visible");
        return;
      }
      
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 1.5; // Distancia óptima para ver todo el modelo
      
      // Animar cámara al centro con un offset apropiado para una buena vista
      worldRef.current.camera.controls.setLookAt(
        center.x + distance,
        center.y + distance * 0.5,
        center.z + distance,
        center.x,
        center.y,
        center.z,
        true // Animar el movimiento
      );
      
      console.log("✅ Vista centrada en los modelos");
    } catch (error) {
      console.error("❌ Error al centrar la vista:", error);
    }
  }, []);
  
  // Autocentrar cuando se carguen modelos
  useEffect(() => {
    if (models.length > 0) {
      console.log(`🔔 Modelos actualizados. Modelos cargados: ${models.length}`);
      
      // Centrar modelo después de la carga
      if (!centeredRef.current) {
        // Usar un pequeño delay para asegurar que el modelo esté completamente cargado en la escena
        const timeoutId = setTimeout(() => {
          centerModel();
          centeredRef.current = true;
        }, 500); // 500ms para dar tiempo a que el modelo se cargue completamente
        
        // Limpieza del timeout
        return () => clearTimeout(timeoutId);
      }
      
      // Notificar vía callback si está proporcionado
      if (onModelLoaded) {
        onModelLoaded(models);
      }
    }
  }, [models, onModelLoaded, centerModel]);
  
  return { centerModel };
};

export default useModelLoader;