"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL_BIM } from '@/server';
import { ModelInfo } from '../types';

interface UseBIMDataProps {
  autoLoad?: boolean;
  modelId?: string;
}

export function useBIMData({ autoLoad = false, modelId }: UseBIMDataProps = {}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar los modelos desde la API
  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Llamar a la API para obtener la lista de modelos
      const response = await axios.get(`${API_URL_BIM}/models`, {
        withCredentials: true
      });
      
      if (response.data.status === 'success' && response.data.data.models) {
        const loadedModels: ModelInfo[] = response.data.data.models;
        setModels(loadedModels);
        
        // Si hay un modelId específico, seleccionarlo
        if (modelId) {
          const model = loadedModels.find(m => m._id === modelId);
          if (model) {
            setSelectedModel(model);
          }
        } else if (loadedModels.length > 0 && !selectedModel) {
          // Seleccionar el primer modelo si no hay uno seleccionado
          setSelectedModel(loadedModels[0]);
        }
      } else {
        throw new Error('Formato de respuesta inesperado');
      }
    } catch (err: any) {
      console.error('Error al cargar modelos BIM:', err);
      setError(err.response?.data?.message || err.message || 'Error al cargar modelos');
    } finally {
      setIsLoading(false);
    }
  }, [modelId, selectedModel]);

  // Función para seleccionar un modelo
  const selectModel = useCallback((model: ModelInfo) => {
    setSelectedModel(model);
  }, []);

  // Función para obtener detalle de un modelo por su ID
  const getModelById = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Primero, verificar si ya tenemos este modelo en la lista
      const existingModel = models.find(m => m._id === id);
      if (existingModel) {
        setSelectedModel(existingModel);
        setIsLoading(false);
        return existingModel;
      }
      
      // Si no está en la lista, obtenerlo de la API
      const response = await axios.get(`${API_URL_BIM}/models/${id}`, {
        withCredentials: true
      });
      
      if (response.data.status === 'success' && response.data.data.model) {
        const model = response.data.data.model;
        setSelectedModel(model);
        
        // Añadirlo a la lista de modelos si no existe
        setModels(prev => {
          if (!prev.some(m => m._id === model._id)) {
            return [...prev, model];
          }
          return prev;
        });
        
        return model;
      } else {
        throw new Error('Formato de respuesta inesperado');
      }
    } catch (err: any) {
      console.error(`Error al obtener modelo con ID ${id}:`, err);
      setError(err.response?.data?.message || err.message || `Error al obtener modelo con ID ${id}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [models]);

  // Función para buscar modelos por nombre o ID
  const searchModels = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Llamar a la API para buscar modelos
      const response = await axios.get(`${API_URL_BIM}/models`, {
        params: { search: query },
        withCredentials: true
      });
      
      if (response.data.status === 'success' && response.data.data.models) {
        return response.data.data.models;
      } else {
        throw new Error('Formato de respuesta inesperado');
      }
    } catch (err: any) {
      console.error('Error al buscar modelos:', err);
      setError(err.response?.data?.message || err.message || 'Error al buscar modelos');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar modelos automáticamente si autoLoad es true
  useEffect(() => {
    if (autoLoad) {
      loadModels();
    }
  }, [autoLoad, loadModels]);

  // Cargar un modelo específico si se proporciona modelId
  useEffect(() => {
    if (modelId) {
      getModelById(modelId);
    }
  }, [modelId, getModelById]);

  return {
    models,
    selectedModel,
    isLoading,
    error,
    loadModels,
    selectModel,
    getModelById,
    searchModels
  };
}