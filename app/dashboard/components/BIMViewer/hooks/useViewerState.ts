"use client";

// useViewerState.ts - Versión optimizada para evitar re-renderizaciones excesivas
import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { 
  UseViewerStateProps, 
  ViewerState,
  SelectedModelItem 
} from '../types';

/**
 * Hook robusto para visualizar modelos BIM utilizando @thatopen/fragments
 * Implementa un enfoque basado en eventos para mayor compatibilidad con múltiples modelos
 * - Versión optimizada para evitar re-renderizaciones excesivas
 */
export const useViewerState = ({
  modelUrls = [],
  onModelLoaded,
  onItemSelected,
  containerRef: externalContainerRef
}: UseViewerStateProps): ViewerState => {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;

  // Core viewer state
  const [components, setComponents] = useState<OBC.Components | null>(null);
  const [world, setWorld] = useState<OBC.World | null>(null);
  const [fragments, setFragments] = useState<FRAGS.FragmentsModels | null>(null);
  const [models, setModels] = useState<FRAGS.FragmentsModel[]>([]);
  const [selectedItem, setSelectedItem] = useState<FRAGS.ItemData | null>(null);
  const [selectedModelItem, setSelectedModelItem] = useState<SelectedModelItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing viewer...");
  
  // Referencias para manejo de estado y evitar re-renderizaciones
  const loadedModelsRef = useRef<Map<string, FRAGS.FragmentsModel>>(new Map());
  const modelsLoadedCountRef = useRef(0);
  const modelUpdateTimeoutRef = useRef<any>(null);
  const prevModelsLengthRef = useRef<number>(0);
  const modelChangeHandledRef = useRef<boolean>(false);
  const isInitializingRef = useRef<boolean>(true);

  // Initialize scene - ejecutado una sola vez
  useEffect(() => {
    if (!containerRef.current) {
      console.error("Container ref is not available yet");
      return;
    }

    const initScene = async () => {
      try {
        console.log("🔧 Inicializando escena BIM...");
        setIsLoading(true);
        setStatus("Setting up scene...");
        isInitializingRef.current = true;
        
        // Reset del contador de modelos y mapa al inicializar
        modelsLoadedCountRef.current = 0;
        loadedModelsRef.current.clear();
        
        // Create core components
        const comps = new OBC.Components();
        const worlds = comps.get(OBC.Worlds);
        
        const w = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
        w.scene = new OBC.SimpleScene(comps);
        w.scene.setup();
        w.scene.three.background = new THREE.Color(0x111827);

        // Añadir luces para mejor visualización
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        w.scene.three.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        w.scene.three.add(directionalLight);

        w.renderer = new OBC.SimpleRenderer(comps, containerRef.current!);
        w.camera = new OBC.SimpleCamera(comps);

        await comps.init();
        console.log("✅ Componentes inicializados correctamente");

        // Add grid
        const grids = comps.get(OBC.Grids);
        grids.create(w);

        // Initialize fragments
        console.log("🔄 Inicializando Fragments engine...");
        setStatus("Initializing fragments engine...");

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
        
        // Setup camera controls - Importante para el renderizado adecuado
        w.camera.controls.addEventListener("rest", () => frags.update(true));
        w.camera.controls.addEventListener("update", () => frags.update());
        
        // OPTIMIZACIÓN: Gestión centralizada de eventos de modelos
        const processModelChanges = () => {
          // Cancelar cualquier actualización pendiente
          if (modelUpdateTimeoutRef.current) {
            clearTimeout(modelUpdateTimeoutRef.current);
          }
          
          // Usar timeout para agrupar múltiples cambios en una sola actualización
          modelUpdateTimeoutRef.current = setTimeout(() => {
            const currentModels = Array.from(loadedModelsRef.current.values());
            // Solo actualizar si realmente hay cambios
            if (currentModels.length !== prevModelsLengthRef.current) {
              console.log(`📊 Actualizando estado de modelos: ${currentModels.length} modelos`);
              prevModelsLengthRef.current = currentModels.length;
              setModels(currentModels);
              
              // Marcar el cambio como manejado para evitar notificaciones duplicadas
              modelChangeHandledRef.current = true;
            }
          }, 100);
        };
        
        // PUNTO CLAVE: Establecer el manejador de eventos ANTES de cargar modelos
        frags.models.list.onItemSet.add(({ key, value: model }) => {
          // Evitar logs duplicados, solo log básico
          console.log(`🔄 Modelo cargado con ID: "${model.id || key}"`);
          modelsLoadedCountRef.current++;
          
          // Conectar con la cámara para culling y LOD
          model.useCamera(w.camera.three);
          
          // Añadir a la escena
          w.scene.three.add(model.object);
          
          // Definir ID del modelo si no tiene uno
          if (!model.id || model.id === "undefined") {
            const modelId = key || `model-${modelsLoadedCountRef.current}`;
            // @ts-ignore - Acceder directamente a la propiedad privada como fix crítico
            model.id = modelId;
          }
          
          // Agregar a nuestro Map de referencia usando el ID corregido
          loadedModelsRef.current.set(model.id, model);
          
          // Procesar cambios de manera optimizada
          processModelChanges();
          
          // Actualizar fragmentos para que el modelo sea visible inmediatamente
          frags.update(true);
        });

        // Optimizar también el manejador de eliminación
        frags.models.list.onItemDeleted.add(({ key: modelId }) => {
          // Solo log simple
          console.log(`🗑️ Modelo eliminado: ${modelId}`);
          
          // Eliminar del Map de referencia
          loadedModelsRef.current.delete(modelId);
          
          // Procesar cambios de manera optimizada
          processModelChanges();
        });

        // Actualizar estado central una sola vez
        setComponents(comps);
        setWorld(w);
        setFragments(frags);

        console.log("✅ Fragments engine inicializado correctamente");
        
        // Marcar como inicializado
        isInitializingRef.current = false;
        setIsLoading(false);
        setStatus("Viewer ready");
        
        // Ahora que todo está configurado, cargamos los modelos si hay URLs
        if (modelUrls.length) {
          console.log(`📋 Inicializando carga de ${modelUrls.length} modelos...`);
          await loadModels(frags, modelUrls);
        }
        
      } catch (err) {
        console.error("❌ Error de inicialización del visor:", err);
        setError(`Initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
        setStatus("Initialization error");
        isInitializingRef.current = false;
      }
    };

    initScene();

    return () => {
      console.log("🧹 Limpiando recursos del visor...");
      
      // Limpiar timeout pendiente
      if (modelUpdateTimeoutRef.current) {
        clearTimeout(modelUpdateTimeoutRef.current);
      }
      
      if (components) {
        components.dispose();
      }
      
      // Limpiar URL creadas
      URL.revokeObjectURL(URL);
    };
  }, []); // Solo ejecutar una vez

  // OPTIMIZACIÓN: Notificar cambios de modelos solo cuando realmente cambien
  useEffect(() => {
    // Solo continuar si:
    // 1. Hay modelos cargados
    // 2. Existe un callback
    // 3. No estamos en proceso de inicialización
    // 4. El número de modelos ha cambiado o es la primera carga
    if (
      models.length > 0 && 
      onModelLoaded && 
      !isInitializingRef.current && 
      (models.length !== prevModelsLengthRef.current || modelChangeHandledRef.current)
    ) {
      console.log(`🔔 Notificando cambio en modelos. Modelos cargados: ${models.length}`);
      
      // Actualizar referencia para evitar notificaciones duplicadas
      prevModelsLengthRef.current = models.length;
      modelChangeHandledRef.current = false;
      
      // Notificar
      onModelLoaded(models);
    }
  }, [models, onModelLoaded]);

  // Model loading function - Función mejorada para cargar modelos
  const loadModels = useCallback(async (frags: FRAGS.FragmentsModels, urls: string[]) => {
    if (!urls.length || !frags) return [];
    
    try {
      setIsLoading(true);
      setStatus(`Loading ${urls.length} models...`);
      
      // Limpiar modelos existentes con IDs problemáticos
      const problematicIds = ["firebase-file", "firebase-file-undefined"];
      for (const id of problematicIds) {
        if (loadedModelsRef.current.has(id)) {
          console.log(`🧹 Eliminando modelo con ID problemático: ${id}`);
          await frags.disposeModel(id);
          loadedModelsRef.current.delete(id);
        }
      }
      
      const loadPromises = urls.map(async (modelUrl, index) => {
        try {
          setStatus(`Loading model ${index + 1} of ${urls.length}...`);
          console.log(`📥 Cargando modelo ${index + 1}/${urls.length}: ${modelUrl}`);
          
          // Extraer ID único del modelo desde la URL
          const urlParts = modelUrl.split('/');
          let modelId = "";
          for (let i = 0; i < urlParts.length; i++) {
            if (urlParts[i] === "models" && i + 1 < urlParts.length) {
              modelId = urlParts[i + 1];
              break;
            }
          }
          
          // Verificar que el ID extraído sea válido
          if (!modelId || modelId === "firebase-file" || modelId.includes("undefined")) {
            modelId = `model-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          }
          
          console.log(`🏷️ ID para el modelo: "${modelId}"`);
          
          const response = await fetch(modelUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          const buffer = await response.arrayBuffer();
          
          // Si un modelo con este ID ya existe, eliminarlo
          if (loadedModelsRef.current.has(modelId)) {
            console.log(`⚠️ Ya existe un modelo con ID ${modelId}, reemplazándolo...`);
            await frags.disposeModel(modelId);
            loadedModelsRef.current.delete(modelId);
          }
          
          // Cargar el modelo con el ID determinado
          await frags.load(buffer, { modelId });
          
          return modelId;
        } catch (err) {
          console.error(`❌ Error al cargar modelo ${modelUrl}:`, err);
          setStatus(`Failed to load model ${index + 1}`);
          return null;
        }
      });
      
      // Esperar a que todos los modelos se carguen
      const loadedIds = await Promise.all(loadPromises);
      const validLoadedIds = loadedIds.filter(Boolean);
      console.log(`📋 Modelos cargados: ${validLoadedIds.join(', ')}`);
      
      // Verificación final y centrado
      setTimeout(() => {
        if (world && loadedModelsRef.current.size > 0) {
          centerModel();
        }
        
        setIsLoading(false);
        setStatus("Models loaded successfully");
      }, 500);
      
      // Devolver los modelos actuales (no usar aquí, puede no estar actualizado)
      return Array.from(loadedModelsRef.current.values());
    } catch (err) {
      console.error("❌ Error en la carga de modelos:", err);
      setError(`Loading failed: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
      setStatus("Loading error");
      return [];
    }
  }, []); // Sin dependencias para evitar recreación constante

  // Función para agregar nuevos modelos 
  const addModels = useCallback(async (urls: string[]) => {
    if (!fragments || !urls.length) {
      return [];
    }
    
    console.log(`📦 Agregando ${urls.length} modelos adicionales...`);
    return loadModels(fragments, urls);
  }, [fragments, loadModels]);

  // Función para exportar datos binarios de un modelo
  const exportModelData = useCallback(async (modelId: string) => {
    if (!fragments) return null;
    
    try {
      const model = fragments.models.list.get(modelId);
      if (!model) {
        throw new Error(`Modelo con ID ${modelId} no encontrado`);
      }
      
      const buffer = await model.getBuffer(false);
      return { name: model.id, buffer };
    } catch (err) {
      console.error(`❌ Error al exportar modelo ${modelId}:`, err);
      return null;
    }
  }, [fragments]);

  // Función para eliminar un modelo específico
  const removeModel = useCallback(async (modelId: string) => {
    if (!fragments) return false;
    
    try {
      console.log(`🗑️ Eliminando modelo ${modelId}...`);
      await fragments.disposeModel(modelId);
      return true;
    } catch (err) {
      console.error(`❌ Error al eliminar modelo ${modelId}:`, err);
      return false;
    }
  }, [fragments]);

  // Función para centrar la vista en el modelo
  const centerModel = useCallback(() => {
    if (!world || models.length === 0) return;
    
    try {
      const bbox = new THREE.Box3();
      let hasGeometry = false;
      
      // Calcular bounding box de todos los modelos
      models.forEach(m => {
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
      const distance = maxDim * 1.5;
      
      // Animar cámara al centro
      world.camera.controls.setLookAt(
        center.x + distance,
        center.y + distance * 0.5,
        center.z + distance,
        center.x,
        center.y,
        center.z,
        true
      );
      
      console.log("🎯 Vista centrada en modelos");
      setStatus("View centered on models");
    } catch (error) {
      console.error("❌ Error al centrar vista:", error);
    }
  }, [world, models]);

  // Obtener IDs de todos los modelos cargados
  const getModelIds = useCallback(() => {
    return models.map(model => model.id);
  }, [models]);

  // Verificar estado de modelos (para debug)
  const checkModelState = useCallback(() => {
    console.log("📊 Estado actual de modelos:");
    console.log(`- Modelos en estado React: ${models.length}`);
    console.log(`- Modelos en referencia Map: ${loadedModelsRef.current.size}`);
    if (fragments) {
      console.log(`- Modelos en FragmentsModels: ${fragments.models.list.size}`);
    }
    return {
      reactModels: models.length,
      refMapModels: loadedModelsRef.current.size,
      fragmentsModels: fragments ? fragments.models.list.size : 0
    };
  }, [models, fragments]);

  // Devolver estado y funciones útiles
  return {
    containerRef,
    components,
    world,
    fragments,
    models,
    selectedItem,
    selectedModelItem,
    isLoading,
    error,
    status,
    setStatus,
    centerModel,
    addModels,
    removeModel,
    exportModelData,
    getModelIds,
    checkModelState
  };
};