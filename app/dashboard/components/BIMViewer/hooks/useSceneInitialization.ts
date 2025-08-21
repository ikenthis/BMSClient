"use client";

import { useState, useEffect, useRef, RefObject } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { BIMViewerState } from '../utils/typeDefs';

/**
 * Hook para inicializar la escena 3D con ocultación automática de IFCSPACE
 */
export const useSceneInitialization = (
  containerRef: RefObject<HTMLDivElement>,
  modelUrl: string | null
): [
  BIMViewerState, 
  (url: string) => Promise<string | null>, 
  boolean
] => {
  // State inicial
  const [state, setState] = useState<BIMViewerState>({
    components: null,
    world: null,
    fragments: null,
    models: [],
    isLoading: true,
    error: null,
    status: "Initializing viewer...",
    selectedItem: null,
    showPropertyPanel: false,
    selectedItemData: null
  });
  
  // Referencias para evitar re-renders
  const initializedRef = useRef<boolean>(false);
  const loadedModelsRef = useRef<Map<string, FRAGS.FragmentsModel>>(new Map());
  
  // 🔥 NUEVA FUNCIÓN: Ocultar IFCSPACE automáticamente
  const hideIfcSpaceCategory = async (model: FRAGS.FragmentsModel): Promise<void> => {
    try {
      console.log(`🫥 Ocultando categoría IFCSPACE en modelo ${model.id}...`);
      
      // Verificar si el modelo tiene la categoría IFCSPACE
      const categories = await model.getCategories();
      
      if (!categories.includes('IFCSPACE')) {
        console.log(`ℹ️ Modelo ${model.id} no contiene espacios IFCSPACE`);
        return;
      }
      
      // Obtener todos los elementos IFCSPACE
      const spaceItems = await model.getItemsOfCategory('IFCSPACE');
      
      if (spaceItems.length === 0) {
        console.log(`⚠️ No hay elementos IFCSPACE en modelo ${model.id}`);
        return;
      }
      
      // Obtener los LocalIDs de todos los espacios
      const spaceLocalIds = (await Promise.all(
        spaceItems.map(async (item) => {
          try {
            return await item.getLocalId();
          } catch (error) {
            console.warn('Error obteniendo LocalID de espacio:', error);
            return null;
          }
        })
      )).filter(id => id !== null) as number[];
      
      if (spaceLocalIds.length === 0) {
        console.warn(`⚠️ No se pudieron obtener LocalIDs válidos para espacios en modelo ${model.id}`);
        return;
      }
      
      // Ocultar todos los espacios
      await model.setVisible(spaceLocalIds, false);
      
      console.log(`✅ Ocultados ${spaceLocalIds.length} espacios IFCSPACE en modelo ${model.id}`);
      
    } catch (error) {
      console.error(`❌ Error ocultando IFCSPACE en modelo ${model.id}:`, error);
    }
  };

  // Función para cargar un modelo - CORREGIDA para manejar IDs correctamente
  const loadModel = async (url: string): Promise<string | null> => {
    if (!state.fragments) {
      console.error("Cannot load model: Fragments engine not initialized");
      return null;
    }
    
    try {
      console.log(`📥 Loading model from: ${url}`);
      
      setState(prev => ({ ...prev, status: "Loading model..." }));
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const modelId = `model-${Date.now()}`;
      
      // Load model with specific ID using state.fragments
      await state.fragments.load(buffer, { modelId });
      
      // Esperar un momento para asegurar que el modelo esté completamente en la escena
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 🔥 CORREGIDO: NO ocultar aquí, se hará en el handler onItemSet
      console.log(`✅ Modelo ${modelId} cargado, la ocultación se aplicará automáticamente`);
      
      return modelId;
    } catch (err) {
      console.error(`❌ Error loading model:`, err);
      setState(prev => ({
        ...prev,
        error: `Loading failed: ${err instanceof Error ? err.message : String(err)}`
      }));
      return null;
    }
  };
  
  // Inicializar escena
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    
    initializedRef.current = true;
    
    const initScene = async () => {
      try {
        console.log("🔧 Initializing BIM scene...");
        setState(prev => ({ ...prev, isLoading: true, status: "Setting up scene..." }));
        
        // Reset model tracking
        loadedModelsRef.current.clear();
        
        // Create core components
        const comps = new OBC.Components();
        const worlds = comps.get(OBC.Worlds);
        
        const w = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
        w.scene = new OBC.SimpleScene(comps);
        w.scene.setup();
        w.scene.three.background = new THREE.Color(0x111827);

        // Add lights for better visualization
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        w.scene.three.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        w.scene.three.add(directionalLight);

        if (!containerRef.current) {
          throw new Error("Container ref is null when creating renderer");
        }
        
        w.renderer = new OBC.SimpleRenderer(comps, containerRef.current);
        w.camera = new OBC.SimpleCamera(comps);

        await comps.init();
        console.log("✅ Components initialized correctly");

        // Add grid
        const grids = comps.get(OBC.Grids);
        grids.create(w);

        // Initialize fragments
        console.log("🔄 Initializing Fragments engine...");
        setState(prev => ({ ...prev, status: "Initializing fragments engine..." }));

        // Setup fragments worker
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        
        if (!fetchedWorker.ok) {
          throw new Error(`Failed to fetch fragments worker: ${fetchedWorker.status}`);
        }
        
        const workerText = await fetchedWorker.text();
        const workerFile = new File([new Blob([workerText])], "worker.mjs", {
          type: "text/javascript",
        });
        const url = URL.createObjectURL(workerFile);
        const frags = new FRAGS.FragmentsModels(url);
        
        // Setup camera controls
        w.camera.controls.addEventListener("rest", () => frags.update(true));
        w.camera.controls.addEventListener("update", () => frags.update());
        
        // Flag para rastrear si es la primera carga de modelo
        let isFirstModelLoaded = true;
        
        // 🔥 CORREGIDO: Model loading handler con ocultación automática
        frags.models.list.onItemSet.add(async ({ key, value: model }) => {
          console.log(`🔄 Model loaded with ID: "${model.id || key}" (Key: ${key})`);
          
          try {
            // Connect with camera for culling and LOD
            model.useCamera(w.camera.three);
            
            // Add to scene
            w.scene.three.add(model.object);
            
            // Set model ID if not defined
            if (!model.id || model.id === "undefined") {
              const modelId = key || `model-${Date.now()}`;
              model.id = modelId;
            }
            
            // Add to our reference Map
            loadedModelsRef.current.set(model.id, model);
            
            // Update models state
            setState(prev => ({
              ...prev,
              models: Array.from(loadedModelsRef.current.values())
            }));
            
            // 🔥 CORREGIDO: Ocultar IFCSPACE con delay para asegurar que el modelo esté completamente cargado
            console.log(`🫥 Programando ocultación automática de IFCSPACE para modelo ${model.id}...`);
            
            // Usar setTimeout para asegurar que el modelo esté completamente procesado
            setTimeout(async () => {
              try {
                await hideIfcSpaceCategory(model);
                
                // Forzar actualización después de ocultar espacios
                await frags.update(true);
                console.log(`✅ IFCSPACE ocultado automáticamente en modelo ${model.id}`);
                
              } catch (hideError) {
                console.error(`❌ Error en ocultación diferida para modelo ${model.id}:`, hideError);
                
                // Intentar nuevamente con un delay mayor
                setTimeout(async () => {
                  try {
                    console.log(`🔄 Reintentando ocultación para modelo ${model.id}...`);
                    await hideIfcSpaceCategory(model);
                    await frags.update(true);
                    console.log(`✅ IFCSPACE ocultado en segundo intento para modelo ${model.id}`);
                  } catch (retryError) {
                    console.error(`❌ Error en segundo intento de ocultación para modelo ${model.id}:`, retryError);
                  }
                }, 2000);
              }
            }, 1000);
            
            // Si es el primer modelo, programar el autocentrado
            if (isFirstModelLoaded && model.object) {
              isFirstModelLoaded = false;
              
              // Programar el autocentrado con un delay mayor para después de ocultar espacios
              setTimeout(() => {
                const bbox = new THREE.Box3();
                bbox.expandByObject(model.object);
                
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                
                const size = bbox.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const distance = maxDim * 1.5;
                
                w.camera.controls.setLookAt(
                  center.x + distance,
                  center.y + distance * 0.5,
                  center.z + distance,
                  center.x,
                  center.y,
                  center.z,
                  true
                );
                
                console.log("✅ Modelo autocentrado después de la carga y ocultación");
              }, 2000); // Delay mayor para después de la ocultación
            }
            
          } catch (modelError) {
            console.error(`❌ Error procesando modelo ${model.id}:`, modelError);
          }
        });

        // Model removal handler
        frags.models.list.onItemDeleted.add(({ key: modelId }) => {
          console.log(`🗑️ Model removed: ${modelId}`);
          
          // Remove from reference Map
          loadedModelsRef.current.delete(modelId);
          
          // Update models state
          setState(prev => ({
            ...prev,
            models: Array.from(loadedModelsRef.current.values())
          }));
        });

        // Update central state
        setState(prev => ({
          ...prev,
          components: comps,
          world: w,
          fragments: frags
        }));

        console.log("✅ Fragments engine initialized correctly");
        
        // Now load the model directly
        if (modelUrl) {
          setState(prev => ({ ...prev, status: "Loading model..." }));
          await loadModel(modelUrl);
        }
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          status: "Viewer ready" 
        }));
        
      } catch (err) {
        console.error("❌ Viewer initialization error:", err);
        setState(prev => ({
          ...prev,
          error: `Initialization failed: ${err instanceof Error ? err.message : String(err)}`,
          isLoading: false,
          status: "Initialization error"
        }));
      }
    };

    initScene();

    return () => {
      console.log("🧹 Cleaning up viewer resources...");
      
      if (state.components) {
        state.components.dispose();
      }
      
      // Clean up created URLs
      URL.revokeObjectURL(URL);
    };
  }, [containerRef.current, modelUrl]);

  return [state, loadModel, initializedRef.current];
};