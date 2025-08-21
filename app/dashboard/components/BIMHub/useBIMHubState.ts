import { useState, useEffect } from 'react';
import axios, { AxiosInstance } from 'axios';
import { API_URL_BIM } from '@/server';
import { BIMModel, BIMHubState, ApiConfig } from './types';

export const useBIMHubState = () => {
  const [error, setError] = useState(null);
  const [state, setState] = useState<BIMHubState>({
    models: [],
    selectedModel: null,
    isLoading: true,
    error: null
  });

  // Configuración de Axios
  const apiConfig: ApiConfig = {
    baseURL: API_URL_BIM as string,
    withCredentials: true
  };

  const api: AxiosInstance = axios.create(apiConfig);

  // Interceptor para manejar errores globalmente
  api.interceptors.response.use(
    response => response,
    error => {
      const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Error en la solicitud';
      setState(prev => ({ ...prev, error: errorMessage }));
      return Promise.reject(error);
    }
  );

  // Cargar modelos desde la API
  const loadModels = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data } = await api.get('/models');
      const models: BIMModel[] = data.data || data || [];
      
      setState(prev => ({
        ...prev,
        models,
        isLoading: false
      }));
      
    } catch (err) {
      console.error('Error loading models:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Cargar un nuevo modelo
  const uploadModel = async (formData: FormData): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Extraer datos para crear el modelo
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const fileUrl = formData.get('fileUrl') as string;
      const fileType = formData.get('fileType') as string;
      const metadataStr = formData.get('metadata') as string;
      const originalFileName = formData.get('originalFileName') as string;
      const size = formData.get('size') as string;
      const uploadDate = formData.get('uploadDate') as string || new Date().toISOString();
      
      console.log("Modelo a registrar:", {
        name,
        description,
        fileUrl: fileUrl ? `${fileUrl.substring(0, 20)}...` : undefined,
        fileType,
        hasMetadata: !!metadataStr
      });
      
      // Si tenemos una URL de Firebase, vamos a crear el modelo con esos datos
      if (fileUrl) {
        // Crear objeto con los datos necesarios para la API
        const modelData = {
          name,
          description,
          fileUrl,
          fileType,
          originalFileName: originalFileName || name,
          size: size ? parseInt(size) : undefined,
          uploadDate,
          lastModified: new Date().toISOString(),
          metadata: metadataStr ? JSON.parse(metadataStr) : undefined,
        };
        
        try {
          // Primero intentar como JSON directamente
          console.log("Intentando registrar el modelo con JSON");
          const response = await api.post('/models', modelData, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          console.log("Modelo registrado con éxito:", response.data);
        } catch (jsonErr) {
          console.error("Error al registrar como JSON, intentando multipart:", jsonErr);
          
          // Si falla, intentar con FormData como fallback
          await api.post('/models', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      } else {
        console.log("No hay URL de Firebase, usando método original");
        // Fallback al método original de carga si no hay URL de Firebase
        await api.post('/models', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      await loadModels();
      return true;
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error uploading model:', err);
        setState(prev => ({ ...prev, error: "Error al registrar el modelo: " + err.message }));
      } else {
        console.error('Unknown error:', err);
        setState(prev => ({ ...prev, error: "Error desconocido" }));
      }
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Eliminar un modelo
  const deleteModel = async (modelId: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await api.delete(`/models/${modelId}`);
      
      setState(prev => ({
        ...prev,
        selectedModel: prev.selectedModel?._id === modelId ? null : prev.selectedModel,
        isLoading: false
      }));
      
      await loadModels();
    } catch (err) {
      console.error('Error deleting model:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Seleccionar un modelo
  const selectModel = (model: BIMModel | null) => {
    setState(prev => ({ ...prev, selectedModel: model }));
  };

  // Cargar modelos al montar
  useEffect(() => {
    loadModels();
  }, []);

  return {
    ...state,
    loadModels,
    uploadModel,
    deleteModel,
    selectModel,
    setError,
    api
  };
};