"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';

export interface ModelManagementProps {
  initialModelUrls?: string[];
  modelUrl?: string | null;
  fragments: FRAGS.FragmentsModels | null;
  models: FRAGS.FragmentsModel[];
  world: OBC.World | null;
  // Aquí cambiamos la firma para que solo acepte url
  loadModel: (url: string) => Promise<string | null>;
  centerModel: () => void;
}

export interface ModelManagementResult {
  currentModelUrls: string[];
  isLoadingModels: boolean;
  needsReload: boolean;
  primaryModelUrl: string | null;
  loadedModelUrls: Set<string>;
  setCurrentModelUrls: (urls: string[]) => void;
  setIsLoadingModels: (loading: boolean) => void;
  setNeedsReload: (needsReload: boolean) => void;
  handleModelUrlsChange: (urls: string[]) => Promise<{ success: boolean; message?: string }>;
}

export function useModelManagementHandlers({
  initialModelUrls,
  modelUrl,
  fragments,
  models,
  world,
  loadModel,
  centerModel
}: ModelManagementProps): ModelManagementResult {
  // Estado para las URLs de los modelos
  const [currentModelUrls, setCurrentModelUrls] = useState<string[]>(initialModelUrls || []);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [loadedModelUrls, setLoadedModelUrls] = useState<Set<string>>(new Set());
  
  // Referencia para almacenar todas las URLs cargadas
  const loadedUrlsRef = useRef<Set<string>>(new Set());
  
  // Primera URL a cargar (prioridad: modelUrl > primera URL del array)
  const primaryModelUrl = modelUrl || (currentModelUrls && currentModelUrls[0]) || null;

  // Actualizar loadedModelUrls cuando cambian los modelos
  useEffect(() => {
    if (models.length > 0) {
      // Extraer URLs de los modelos actuales
      const modelUrls = models
        .map(model => model.url || '')
        .filter(url => url !== '');
      
      const updatedUrls = new Set(loadedUrlsRef.current);
      modelUrls.forEach(url => updatedUrls.add(url));
      
      // Actualizar tanto el estado como la referencia
      setLoadedModelUrls(updatedUrls);
      loadedUrlsRef.current = updatedUrls;
      
      console.log("[DEBUG] Modelos cargados actualmente:", Array.from(updatedUrls));
    }
  }, [models]);

  // Función de utilidad para normalizar URLs (eliminar posibles parámetros o diferencias menores)
  const normalizeUrl = (url: string): string => {
    // Si necesitas normalizar las URLs, implementa aquí la lógica
    // Por ejemplo, quitar parámetros de consulta, normalizar protocolo, etc.
    return url.trim();
  };

  // Manejar el cambio de URLs desde el ModelSwitcher
  const handleModelUrlsChange = useCallback(async (urls: string[]): Promise<{ success: boolean; message?: string }> => {
    if (!urls || urls.length === 0 || !fragments) {
      return { success: false, message: "No hay modelos para cargar o el visor no está inicializado" };
    }

    // Normalizar las URLs entrantes
    const normalizedUrls = urls.map(normalizeUrl);
    
    // Comprobar si hay modelos duplicados
    const alreadyLoadedUrls = normalizedUrls.filter(url => {
      // Verificar si la URL ya está en nuestro conjunto de URLs cargadas
      return Array.from(loadedUrlsRef.current).some(loadedUrl => 
        normalizeUrl(loadedUrl) === url
      );
    });
    
    // Si todos los modelos ya están cargados, mostrar mensaje
    if (alreadyLoadedUrls.length > 0) {
      if (alreadyLoadedUrls.length === normalizedUrls.length) {
        return { 
          success: false, 
          message: `Ya ${alreadyLoadedUrls.length > 1 ? 'están' : 'está'} cargado${alreadyLoadedUrls.length > 1 ? 's' : ''} ${alreadyLoadedUrls.length > 1 ? 'estos modelos' : 'este modelo'} en el visor` 
        };
      } 
      
      // Si solo algunos modelos están duplicados, informar pero continuar
      console.warn(`Se detectaron ${alreadyLoadedUrls.length} modelos ya cargados. Solo se cargarán los nuevos.`);
      
      // Filtrar para quedarnos solo con URLs no cargadas
      const uniqueUrls = normalizedUrls.filter(url => !alreadyLoadedUrls.includes(url));
      
      if (uniqueUrls.length === 0) {
        return {
          success: false,
          message: "Todos los modelos seleccionados ya están cargados"
        };
      }
      
      urls = uniqueUrls;
    }
    
    // La lógica existente para remover modelos
    if (fragments && models.length > 0) {
      // Remover cada modelo existente de la escena
      for (const model of models) {
        try {
          if (model.object && world?.scene?.three) {
            world.scene.three.remove(model.object);
          }
          // Si hay un método dispose o similar, úsalo
          if (model.dispose) {
            model.dispose();
          }
        } catch (error) {
          console.warn("Error removing model:", error);
        }
      }
      
      // Limpiar el FragmentsModels
      if (fragments.models?.list) {
        // Si existe un método clear, úsalo; de lo contrario, intenta limpiar manualmente
        if (fragments.models.list.clear) {
          fragments.models.list.clear();
        } else {
          // Eliminar manualmente cada modelo de la lista
          const modelsList = Array.from(fragments.models.list.values());
          for (const model of modelsList) {
            if (fragments.models.list.delete) {
              fragments.models.list.delete(model.id);
            }
          }
        }
      }
    }
    
    // Pre-registro de URLs para evitar duplicados durante la carga
    urls.forEach(url => {
      loadedUrlsRef.current.add(url);
    });
    
    // Actualizar las URLs y marcar que necesita recarga
    setCurrentModelUrls(urls);
    setNeedsReload(true);
    
    return { 
      success: true, 
      message: `Se cargarán ${urls.length} modelo${urls.length > 1 ? 's' : ''}`
    };
  }, [fragments, models, world]);

  // Efecto para cargar los modelos cuando cambien las URLs
  useEffect(() => {
    if (!fragments || !needsReload || isLoadingModels) return;
    
    const loadNewModels = async () => {
      if (currentModelUrls.length === 0) {
        setNeedsReload(false);
        return;
      }
      
      setIsLoadingModels(true);
      try {
        for (const url of currentModelUrls) {
          // Antes de cargar, verificar si ya está cargado
          if (!Array.from(loadedUrlsRef.current).some(loadedUrl => 
            normalizeUrl(loadedUrl) === normalizeUrl(url) && 
            loadedUrl !== url // Ignorar la misma URL exacta que estamos a punto de cargar
          )) {
            // Aquí llamamos a loadModel solo con la URL
            await loadModel(url);
            console.log(`[DEBUG] Modelo cargado: ${url}`);
          } else {
            console.log(`[DEBUG] Omitiendo modelo ya cargado: ${url}`);
          }
        }
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        setIsLoadingModels(false);
        setNeedsReload(false);
      }
    };
    
    loadNewModels();
  }, [fragments, currentModelUrls, loadModel, needsReload, isLoadingModels]);

  // Efecto para asegurar que el modelo se centre cuando cambie el estado de carga
  useEffect(() => {
    if (!isLoadingModels && models.length > 0) {
      const timeoutId = setTimeout(() => {
        centerModel();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoadingModels, models.length, centerModel]);

  return {
    currentModelUrls,
    isLoadingModels,
    needsReload,
    primaryModelUrl,
    loadedModelUrls,
    setCurrentModelUrls,
    setIsLoadingModels,
    setNeedsReload,
    handleModelUrlsChange
  };
}

export default useModelManagementHandlers;