// services/spaceScheduleService.ts
import axios, { AxiosResponse } from 'axios';
import { API_COLLECTION } from '@/server';

// Tipos para los datos de programación
export interface ScheduleData {
  scheduleId: string;
  title: string;
  description: string;
  activityType: string;
  startDate: Date | string;
  endDate: Date | string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  status: string;
  priority: string;
  spaceGuid: string;
  spaceId: number;
  spaceName: string;
  spaceLongName?: string;
  modelId: string;
  responsible: {
    name: string;
    email: string;
    department: string;
    phone: string;
  };
  participants: {
    name: string;
    email: string;
    role: string;
  }[];
  tags: string[];
  approvalStatus: string;
  estimatedAttendance: number;
}

// Tipo para filtros
interface Filters {
  spaceGuid?: string;
  activityType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
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

// URL base para la API
const API_URL = API_COLLECTION || 'http://localhost:4000/api';
console.log('API_URL para programación de espacios:', API_URL);

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
  console.log('Actualizando caché de espacios en spaceScheduleService:', spaces.length);
  spacesCache = spaces;
};

// Función para obtener la caché de espacios
const getSpacesCache = (): SpaceElement[] => {
  return spacesCache;
};

// Función para enriquecer los programas con spaceLongName
const enrichSchedulesWithLongName = (schedules: ScheduleData[]): ScheduleData[] => {
  if (!schedules || schedules.length === 0 || spacesCache.length === 0) {
    return schedules;
  }

  return schedules.map(schedule => {
    // Si ya tiene spaceLongName, lo mantenemos
    if (schedule.spaceLongName) {
      return schedule;
    }

    // Buscar el espacio correspondiente en la caché
    const space = spacesCache.find(s => s.properties?.globalId === schedule.spaceGuid);
    
    // Enriquecer el schedule con el longName
    return {
      ...schedule,
      spaceLongName: space?.properties?.longName || space?.longName || ''
    };
  });
};

const spaceScheduleService = {
  // Exportar las funciones para manejar la caché
  setSpacesCache,
  getSpacesCache,

  // Obtener todos los programas
  getAllSchedules: async (filters = {}) => {
    try {
      const response = await apiClient.get('/api/space-schedule', { params: filters });
      console.log('Response getAllSchedules:', response.data);
      
      // Enriquecer los programas con spaceLongName si la respuesta es exitosa
      if (response.data?.status === 'success' && response.data?.data?.schedules) {
        response.data.data.schedules = enrichSchedulesWithLongName(response.data.data.schedules);
        console.log('Programas enriquecidos con longName:', response.data.data.schedules);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener programas de espacios:', error);
      if (axios.isAxiosError(error)) {
        console.error('URL:', `${API_URL}/api/space-schedule`);
        console.error('Status:', error.response?.status);
        console.error('Detail:', error.response?.data);
      }
      throw error;
    }
  },

  // Crear nuevo programa
  createSchedule: async (scheduleData: Partial<ScheduleData>) => {
    try {
      console.log('Request URL:', `${API_URL}/api/space-schedule`);
      console.log('Request data:', scheduleData);
      
      // Asegurarse de que scheduleData tiene spaceLongName antes de enviarlo
      if (!scheduleData.spaceLongName && scheduleData.spaceGuid) {
        const space = spacesCache.find(s => s.properties?.globalId === scheduleData.spaceGuid);
        if (space) {
          scheduleData.spaceLongName = space.properties?.longName || space.longName || '';
          console.log('Añadido spaceLongName automáticamente:', scheduleData.spaceLongName);
        }
      }
      
      const response = await apiClient.post('/api/space-schedule', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error al crear programa de espacio:', error);
      if (axios.isAxiosError(error)) {
        console.error('URL:', `${API_URL}/api/space-schedule`);
        console.error('Status:', error.response?.status);
        console.error('Detail:', error.response?.data);
      }
      throw error;
    }
  },

  // Actualizar programa
  updateSchedule: async (id: string, scheduleData: Partial<ScheduleData>): Promise<ApiResponse<{ schedule: ScheduleData }>> => {
    try {
      // Asegurarse de que scheduleData tiene spaceLongName antes de enviarlo
      if (!scheduleData.spaceLongName && scheduleData.spaceGuid) {
        const space = spacesCache.find(s => s.properties?.globalId === scheduleData.spaceGuid);
        if (space) {
          scheduleData.spaceLongName = space.properties?.longName || space.longName || '';
        }
      }
      
      const response: AxiosResponse<ApiResponse<{ schedule: ScheduleData }>> = 
        await apiClient.put(`/api/space-schedule/${id}`, scheduleData);
      
      return response.data;
    } catch (error) {
      console.error(`Error al actualizar programa con ID ${id}:`, error);
      throw error;
    }
  },

  // Eliminar programa
  deleteSchedule: async (id: string): Promise<ApiResponse<{}>> => {
    try {
      const response: AxiosResponse<ApiResponse<{}>> = 
        await apiClient.delete(`/api/space-schedule/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error al eliminar programa con ID ${id}:`, error);
      throw error;
    }
  },

  // Obtener programas por espacio
  getSchedulesBySpace: async (spaceGuid: string): Promise<ApiResponse<{ schedules: ScheduleData[] }>> => {
    try {
      const response: AxiosResponse<ApiResponse<{ schedules: ScheduleData[] }>> = 
        await apiClient.get(`/api/space-schedule/space/${spaceGuid}`);
      
      // Enriquecer los programas con spaceLongName si la respuesta es exitosa
      if (response.data?.status === 'success' && response.data?.data?.schedules) {
        // Primero buscar el espacio en la caché
        const space = spacesCache.find(s => s.properties?.globalId === spaceGuid);
        const spaceLongName = space?.properties?.longName || space?.longName || '';
        
        // Añadir longName a cada programa
        response.data.data.schedules = response.data.data.schedules.map(schedule => ({
          ...schedule,
          spaceLongName: schedule.spaceLongName || spaceLongName
        }));
        
        console.log(`Programas para espacio ${spaceGuid} enriquecidos con longName:`, spaceLongName);
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error al obtener programas para el espacio ${spaceGuid}:`, error);
      throw error;
    }
  },
  
  // Obtener programas por fecha
  getSchedulesByDate: async (startDate: string, endDate: string): Promise<ApiResponse<{ schedules: ScheduleData[] }>> => {
    try {
      const response: AxiosResponse<ApiResponse<{ schedules: ScheduleData[] }>> = 
        await apiClient.get('/api/space-schedule/date', { 
          params: { startDate, endDate } 
        });
      
      // Enriquecer los programas con spaceLongName si la respuesta es exitosa
      if (response.data?.status === 'success' && response.data?.data?.schedules) {
        response.data.data.schedules = enrichSchedulesWithLongName(response.data.data.schedules);
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error al obtener programas para el rango de fechas:`, error);
      throw error;
    }
  },

  // Obtener estadísticas
  getStats: async (): Promise<ApiResponse<{
    totalSchedules: number;
    byType: { _id: string; count: number }[];
    byStatus: { _id: string; count: number }[];
    upcomingEvents: number;
  }>> => {
    try {
      const response: AxiosResponse<ApiResponse<{
        totalSchedules: number;
        byType: { _id: string; count: number }[];
        byStatus: { _id: string; count: number }[];
        upcomingEvents: number;
      }>> = await apiClient.get('/api/space-schedule/stats');
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas de programación:', error);
      throw error;
    }
  }
};

export default {
  ...spaceScheduleService,
  setSpacesCache,
  getSpacesCache
};