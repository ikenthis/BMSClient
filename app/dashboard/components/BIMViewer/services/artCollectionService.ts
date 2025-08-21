// services/artCollectionService.ts
import axios, { AxiosResponse } from 'axios';
import { API_COLLECTION } from '@/server';

// Tipos para los datos de la colección
export interface ArtCollectionItemFormData {
  itemId: string;
  name: string;
  description: string;
  type: string;
  author: string;
  creationDate: string;
  period: string;
  technique: string;
  materials: string[];
  dimensions: {
    height?: number;
    width?: number;
    depth?: number;
    diameter?: number;
    weight?: number;
    unit: string;
  };
  restaurationSchedule: {
    startDate: Date | null;
    endDate: Date | null;
    status: string;
  };
  spaceGuid: string;
  spaceId: number;
  spaceName: string;
  spaceLongName?: string; 
  modelId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
  modelUrl: string;
  modelType: string;
  images: {
    url: string;
    type: string;
    description: string;
  }[];
  conservationState: {
    initialState: {
      rating: number;
      description: string;
      date: Date | null;
    };
  };
  assignedRestorers: {
    name: string;
    email: string;
    role: string;
  }[];
  notes: string;
  tags: string[];
}

// Tipo para filtros
interface Filters {
  spaceGuid?: string;
  type?: string;
  status?: string;
  archived?: string;
  search?: string;
  [key: string]: any;
}

// Tipo para respuestas de la API
interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

// Tipo para el espacio
interface SpaceElement {
  properties?: {
    globalId?: string;
    longName?: string;
  };
  longName?: string;
}

// CORREGIR LA URL BASE - Añadir comprobación y logging para depuración
const API_URL = API_COLLECTION || 'http://localhost:4000/api';
console.log('API_URL para colecciones:', API_URL); // Para depuración

// Crear una instancia de Axios con configuración
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Caché para almacenar los espacios y sus longNames
let spacesCache: SpaceElement[] = [];

// Función para establecer la caché de espacios
const setSpacesCache = (spaces: SpaceElement[]) => {
  console.log('Actualizando caché de espacios:', spaces.length);
  spacesCache = spaces;
};

// Función para enriquecer los elementos con spaceLongName
const enrichItemsWithLongName = (items: ArtCollectionItemFormData[]): ArtCollectionItemFormData[] => {
  if (!items || items.length === 0 || spacesCache.length === 0) {
    return items;
  }

  return items.map(item => {
    // Si ya tiene spaceLongName, lo mantenemos
    if (item.spaceLongName) {
      return item;
    }

    // Buscar el espacio correspondiente en la caché
    const space = spacesCache.find(s => s.properties?.globalId === item.spaceGuid);
    
    // Enriquecer el item con el longName
    return {
      ...item,
      spaceLongName: space?.properties?.longName || space?.longName || ''
    };
  });
};

// CORREGIR LAS RUTAS DE API - Asegúrate de que estén alineadas con tu backend
const artCollectionService = {
  // Exportar la función para establecer la caché
  setSpacesCache,

  // Obtener todos los elementos
  getAllItems: async (filters = {}) => {
    try {
      // Corregido para usar la ruta exacta
      const response = await apiClient.get('/api/art-collection', { params: filters });
      console.log('Response getAllItems:', response.data); // Para depuración
      
      // Enriquecer los elementos con spaceLongName si la respuesta es exitosa
      if (response.data?.status === 'success' && response.data?.data?.items) {
        response.data.data.items = enrichItemsWithLongName(response.data.data.items);
        console.log('Elementos enriquecidos con longName:', response.data.data.items);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener elementos de colección:', error);
      // Añadir más información del error para depuración
      if (axios.isAxiosError(error)) {
        console.error('URL:', `${API_URL}/api/art-collection`);
        console.error('Status:', error.response?.status);
        console.error('Detail:', error.response?.data);
      }
      throw error;
    }
  },

  // Crear nuevo elemento - Esta es la función que está fallando con 404
  createItem: async (itemData) => {
    try {
      // Imprimir la URL completa para depuración
      console.log('Request URL:', `${API_URL}/api/art-collection`);
      console.log('Request data:', itemData);
      
      // Asegurarse de que itemData tiene spaceLongName antes de enviarlo
      if (!itemData.spaceLongName && itemData.spaceGuid) {
        const space = spacesCache.find(s => s.properties?.globalId === itemData.spaceGuid);
        if (space) {
          itemData.spaceLongName = space.properties?.longName || space.longName || '';
          console.log('Añadido spaceLongName automáticamente:', itemData.spaceLongName);
        }
      }
      
      const response = await apiClient.post('/api/art-collection', itemData);
      return response.data;
    } catch (error) {
      console.error('Error al crear elemento de colección:', error);
      // Añadir más información del error para depuración
      if (axios.isAxiosError(error)) {
        console.error('URL:', `${API_URL}/api/art-collection`);
        console.error('Status:', error.response?.status);
        console.error('Detail:', error.response?.data);
      }
      throw error;
    }
  },

  // Actualizar elemento
  updateItem: async (id: string, itemData: Partial<ArtCollectionItemFormData>): Promise<ApiResponse<{ item: ArtCollectionItemFormData }>> => {
    try {
      // Asegurarse de que itemData tiene spaceLongName antes de enviarlo
      if (!itemData.spaceLongName && itemData.spaceGuid) {
        const space = spacesCache.find(s => s.properties?.globalId === itemData.spaceGuid);
        if (space) {
          itemData.spaceLongName = space.properties?.longName || space.longName || '';
        }
      }
      
      const response: AxiosResponse<ApiResponse<{ item: ArtCollectionItemFormData }>> = 
        await apiClient.put(`/api/art-collection/${id}`, itemData);
      
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar elemento de colección con ID ${id}:`, error);
      throw error;
    }
  },

  // Eliminar elemento
  deleteItem: async (id: string): Promise<ApiResponse<{}>> => {
    try {
      const response: AxiosResponse<ApiResponse<{}>> = 
        await apiClient.delete(`/api/art-collection/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar elemento de colección con ID ${id}:`, error);
      throw error;
    }
  },

  // Obtener elementos por espacio
  getItemsBySpace: async (spaceGuid: string): Promise<ApiResponse<{ items: ArtCollectionItemFormData[] }>> => {
    try {
      const response: AxiosResponse<ApiResponse<{ items: ArtCollectionItemFormData[] }>> = 
        await apiClient.get(`/api/art-collection/space/${spaceGuid}`);
      
      // Enriquecer los elementos con spaceLongName si la respuesta es exitosa
      if (response.data?.status === 'success' && response.data?.data?.items) {
        // Primero buscar el espacio en la caché
        const space = spacesCache.find(s => s.properties?.globalId === spaceGuid);
        const spaceLongName = space?.properties?.longName || space?.longName || '';
        
        // Añadir longName a cada elemento
        response.data.data.items = response.data.data.items.map(item => ({
          ...item,
          spaceLongName: item.spaceLongName || spaceLongName
        }));
        
        console.log(`Elementos para espacio ${spaceGuid} enriquecidos con longName:`, spaceLongName);
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error al obtener elementos para el espacio ${spaceGuid}:`, error);
      throw error;
    }
  },

  // Archivar/desarchivar elemento
  toggleArchiveStatus: async (id: string, isArchived: boolean): Promise<ApiResponse<{ item: ArtCollectionItemFormData }>> => {
    try {
      const response: AxiosResponse<ApiResponse<{ item: ArtCollectionItemFormData }>> = 
        await apiClient.patch(`/api/art-collection/${id}/archive`, { isArchived });
      
      // Enriquecer el elemento con spaceLongName si es necesario
      if (response.data?.status === 'success' && response.data?.data?.item) {
        const item = response.data.data.item;
        if (!item.spaceLongName && item.spaceGuid) {
          const space = spacesCache.find(s => s.properties?.globalId === item.spaceGuid);
          if (space) {
            response.data.data.item.spaceLongName = space.properties?.longName || space.longName || '';
          }
        }
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error al cambiar estado de archivo del elemento ${id}:`, error);
      throw error;
    }
  },

  // Obtener estadísticas
  getStats: async (): Promise<ApiResponse<{
    totalItems: number;
    byType: { _id: string; count: number }[];
    byStatus: { _id: string; count: number }[];
    delayedItems: number;
  }>> => {
    try {
      const response: AxiosResponse<ApiResponse<{
        totalItems: number;
        byType: { _id: string; count: number }[];
        byStatus: { _id: string; count: number }[];
        delayedItems: number;
      }>> = await apiClient.get('/api/art-collection/stats');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de la colección:', error);
      throw error;
    }
  }
};

export default {
  ...artCollectionService,
  setSpacesCache // Asegurarse de que la función se exporte
};