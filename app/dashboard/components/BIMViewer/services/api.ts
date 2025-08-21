// api.ts - Servicio actualizado para comunicación con el backend
import { API_URL_BIM } from '@/server';
import { ModelInfo } from '../types';


interface ElementData {
  _id: string;
  modelId: string;
  expressId: number;
  type: string;
  name: string;
  category: string;
  properties: Record<string, any>;
  propertySets: Array<{
    name: string;
    properties: Record<string, any>;
  }>;
  visible: boolean;
  selectable: boolean;
}

interface FilterOptions {
  categories?: string[];
  types?: string[];
  properties?: Record<string, any>;
  expressIds?: number[];
  category?: string; // Para compatibilidad
  property?: {
    name: string;
    value: any;
  };
}

// URL base para la API - cambia esto a tu URL real de API


// Timeout para las peticiones en milisegundos
const REQUEST_TIMEOUT = 10000; // 10 segundos

/**
 * Función para abortar peticiones si tardan demasiado
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Manejar respuestas de la API y errores
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData?.message || response.statusText || `Error: ${response.status}`);
    } catch (e) {
      // Si no podemos analizar JSON, usar statusText
      throw new Error(`Error API (${response.status}): ${response.statusText || 'Error desconocido'}`);
    }
  }
  
  try {
    const jsonData = await response.json();
    return jsonData.data || jsonData; // Manejar ambos formatos de respuesta
  } catch (e) {
    // Error al analizar JSON
    throw new Error('Error al procesar la respuesta');
  }
}

/**
 * Servicio de API
 */
export const api = {
  /**
   * Obtener todos los modelos desde la base de datos
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models`);
      const result = await handleResponse<{models: ModelInfo[]} | ModelInfo[]>(response);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(result)) {
        return result;
      } else {
        return result.models || [];
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  },
  
  /**
   * Obtener un modelo específico por ID
   */
  async getModel(id: string): Promise<ModelInfo> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models/${id}`);
      const result = await handleResponse<{model: ModelInfo} | ModelInfo>(response);
      
      // Manejar diferentes formatos de respuesta
      return 'model' in result ? result.model : result;
    } catch (error) {
      console.error(`Error fetching model ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Subir un nuevo modelo
   */
  async uploadModel(file: File, metadata: Partial<ModelInfo>): Promise<ModelInfo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models`, {
        method: 'POST',
        body: formData,
      });
      
      const result = await handleResponse<{model: ModelInfo} | ModelInfo>(response);
      return 'model' in result ? result.model : result;
    } catch (error) {
      console.error('Error uploading model:', error);
      throw error;
    }
  },
  
  /**
   * Actualizar metadatos del modelo
   */
  async updateModel(id: string, metadata: Partial<ModelInfo>): Promise<ModelInfo> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });
      
      const result = await handleResponse<{model: ModelInfo} | ModelInfo>(response);
      return 'model' in result ? result.model : result;
    } catch (error) {
      console.error(`Error updating model ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Eliminar un modelo
   */
  async deleteModel(id: string): Promise<void> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models/${id}`, {
        method: 'DELETE',
      });
      
      await handleResponse<void>(response);
    } catch (error) {
      console.error(`Error deleting model ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtener elementos de un modelo
   */
  async getElements(modelId: string, options?: FilterOptions): Promise<ElementData[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options) {
        if (options.categories?.length) {
          queryParams.append('categories', options.categories.join(','));
        }
        
        if (options.types?.length) {
          queryParams.append('types', options.types.join(','));
        }
        
        if (options.expressIds?.length) {
          queryParams.append('expressIds', options.expressIds.join(','));
        }
        
        // Manejar filtro por categoría simple
        if (options.category) {
          queryParams.append('categories', options.category);
        }
        
        // Manejar propiedad individual
        if (options.property) {
          queryParams.append(`property[${options.property.name}]`, String(options.property.value));
        }
        
        // Manejar múltiples propiedades
        if (options.properties) {
          for (const [key, value] of Object.entries(options.properties)) {
            queryParams.append(`property[${key}]`, String(value));
          }
        }
      }
      
      const url = `${API_URL_BIM}/models/${modelId}/elements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetchWithTimeout(url);
      
      const result = await handleResponse<{elements: ElementData[]} | ElementData[]>(response);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(result)) {
        return result;
      } else {
        return result.elements || [];
      }
    } catch (error) {
      console.error(`Error fetching elements for model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtener un elemento específico
   */
  async getElement(modelId: string, expressId: number): Promise<ElementData> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models/${modelId}/elements/${expressId}`);
      const result = await handleResponse<{element: ElementData} | ElementData>(response);
      
      // Manejar diferentes formatos de respuesta
      return 'element' in result ? result.element : result;
    } catch (error) {
      console.error(`Error fetching element ${expressId} for model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Actualizar propiedades de un elemento
   */
  async updateElement(modelId: string, expressId: number, data: Partial<ElementData>): Promise<ElementData> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models/${modelId}/elements/${expressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const result = await handleResponse<{element: ElementData} | ElementData>(response);
      return 'element' in result ? result.element : result;
    } catch (error) {
      console.error(`Error updating element ${expressId} for model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Obtener todas las categorías de un modelo
   */
  async getCategories(modelId: string): Promise<string[]> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/models/${modelId}/categories`);
      const result = await handleResponse<{categories: string[]} | string[]>(response);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(result)) {
        return result;
      } else {
        return result.categories || [];
      }
    } catch (error) {
      console.error(`Error fetching categories for model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Filtrar elementos por valores de propiedades
   */
  async filterElements(modelId: string, filters: Record<string, any>): Promise<ElementData[]> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/elements/filter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          filters,
        }),
      });
      
      const result = await handleResponse<{elements: ElementData[]} | ElementData[]>(response);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(result)) {
        return result;
      } else {
        return result.elements || [];
      }
    } catch (error) {
      console.error(`Error filtering elements for model ${modelId}:`, error);
      throw error;
    }
  },
  
  /**
   * Actualizar visibilidad de múltiples elementos
   */
  async updateElementsVisibility(modelId: string, elementIds: string[], visible: boolean): Promise<{modifiedCount: number}> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/elements/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          elementIds,
          visible
        }),
      });
      
      return handleResponse<{modifiedCount: number}>(response);
    } catch (error) {
      console.error(`Error updating elements visibility:`, error);
      throw error;
    }
  },
  
  /**
   * Obtener nombres de propiedades únicas
   */
  async getPropertyNames(modelId: string): Promise<string[]> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/elements/properties?modelId=${modelId}`);
      const result = await handleResponse<{propertyNames: string[]} | string[]>(response);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(result)) {
        return result;
      } else {
        return result.propertyNames || [];
      }
    } catch (error) {
      console.error(`Error fetching property names:`, error);
      throw error;
    }
  },
  
  /**
   * Obtener valores únicos para una propiedad
   */
  async getPropertyValues(modelId: string, propertyName: string): Promise<any[]> {
    try {
      const response = await fetchWithTimeout(`${API_URL_BIM}/elements/property/${propertyName}/values?modelId=${modelId}`);
      const result = await handleResponse<{values: any[]} | any[]>(response);
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(result)) {
        return result;
      } else {
        return result.values || [];
      }
    } catch (error) {
      console.error(`Error fetching property values:`, error);
      throw error;
    }
  }
};