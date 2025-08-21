// utils/simpleResetUtils.ts - Versión simplificada basada en InventoryPanel

import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { resetView } from './ElementZoomUtils';

/**
 * Función simple de reset que replica exactamente la lógica de deactivateIsolationMode del InventoryPanel
 */
export const simpleResetToGeneralView = async (
  models: FRAGS.FragmentsModel[],
  world: OBC.World,
  fragments: FRAGS.FragmentsModels
): Promise<void> => {
  
  if (!models || !world || !fragments || models.length === 0) {
    throw new Error('Parámetros requeridos no disponibles');
  }

  try {
    console.log('🔄 Aplicando reset simple basado en InventoryPanel...');
    
    // PASO 1: Aplicar resetView para cada modelo (exactamente como en InventoryPanel)
    for (const model of models) {
      await resetView(model, world, fragments, true);
    }
    
    console.log('✅ Reset simple completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en reset simple:', error);
    throw error;
  }
};

/**
 * Función de reset completa que combina resetView con reposicionamiento de cámara
 */
export const completeResetToGeneralView = async (
  models: FRAGS.FragmentsModel[],
  world: OBC.World,
  fragments: FRAGS.FragmentsModels,
  options: {
    resetCamera?: boolean;
    zoomFactor?: number;
    animateCamera?: boolean;
  } = {}
): Promise<void> => {
  
  const {
    resetCamera = true,
    zoomFactor = 1.5,
    animateCamera = true
  } = options;

  if (!models || !world || !fragments || models.length === 0) {
    throw new Error('Parámetros requeridos no disponibles');
  }

  try {
    console.log('🔄 Aplicando reset completo...');
    
    // PASO 1: Aplicar resetView para cada modelo
    console.log('🧹 Limpiando materiales y highlights...');
    for (const model of models) {
      await resetView(model, world, fragments, true);
    }
    
    // PASO 2: Reposicionar cámara si está habilitado
    if (resetCamera && world.camera?.controls) {
      console.log('📸 Reposicionando cámara...');
      
      // Calcular bounding box combinado
      const combinedBox = new THREE.Box3();
      let hasValidBox = false;

      for (const model of models) {
        if (model.object) {
          const modelBox = new THREE.Box3();
          modelBox.expandByObject(model.object);
          
          // Verificar validez del bounding box
          const isValidMin = isFinite(modelBox.min.x) && isFinite(modelBox.min.y) && isFinite(modelBox.min.z);
          const isValidMax = isFinite(modelBox.max.x) && isFinite(modelBox.max.y) && isFinite(modelBox.max.z);
          
          if (isValidMin && isValidMax && !modelBox.isEmpty()) {
            if (!hasValidBox) {
              combinedBox.copy(modelBox);
              hasValidBox = true;
            } else {
              combinedBox.union(modelBox);
            }
          }
        }
      }

      if (hasValidBox) {
        // Calcular posición óptima de cámara
        const center = new THREE.Vector3();
        combinedBox.getCenter(center);
        
        const size = combinedBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = Math.max(maxDim * zoomFactor, 20);

        // Posición isométrica
        const cameraPosition = new THREE.Vector3(
          center.x + distance * 0.7,
          center.y + distance * 0.7,
          center.z + distance * 0.7
        );

        console.log(`📐 Centrando cámara en: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);

        // Mover cámara
        world.camera.controls.setLookAt(
          cameraPosition.x,
          cameraPosition.y,
          cameraPosition.z,
          center.x,
          center.y,
          center.z,
          animateCamera
        );
      } else {
        console.warn('⚠️ No se pudo calcular bounding box válido, usando reset básico de cámara');
        world.camera.controls.reset();
      }
    }
    
    // PASO 3: Forzar actualización
    console.log('🔄 Actualizando fragmentos...');
    await fragments.update(true);
    
    console.log('✅ Reset completo exitoso');
    
  } catch (error) {
    console.error('❌ Error en reset completo:', error);
    throw error;
  }
};