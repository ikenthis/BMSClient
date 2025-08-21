// src/services/sensorApiService.ts
import axios, { AxiosError } from 'axios';
import { API_COLLECTION } from '@/server';

// Interfaces actualizadas
export interface Sensor {
  _id: string;
  sensorId: string;
  name: string;
  type: 'temperature' | 'occupancy' | string;
  location: {
    spaceGuid?: string;
    spaceName?: string;
    floor?: string;
    zone?: string;
  };
  status: 'active' | 'inactive' | 'error' | 'maintenance' | 'calibrating';
  lastReading?: {
    value: number;
    timestamp: string;
    quality: 'good' | 'warning' | 'critical' | 'error';
  };
  config?: {
    unit?: string;
    samplingInterval?: number;
    thresholds?: {
      min?: number;
      max?: number;
      warning?: { min?: number; max?: number };
      critical?: { min?: number; max?: number };
    }
  };
  statistics?: {
    totalReadings: number;
    averageValue?: number;
    minValue?: number;
    maxValue?: number;
  };
  // Nuevos campos para estado de error
  memoryStatus?: {
    isRunning: boolean;
    hasError: boolean;
    errorMessage?: string;
    errorCount?: number;
  };
}

export interface SensorReading {
  _id: string;
  sensorId: string;
  value: number;
  unit: string;
  quality: string;
  timestamp: string;
  additionalData?: {
    humidity?: number;
    heatIndex?: number;
    detectionType?: string;
    confidence?: number;
    occupancyRate?: string;
  };
}

export interface SystemStatus {
  timestamp: string;
  sensors: {
    total: number;
    active: number;
    error: number;
    errorInMemory: number; // Nuevo campo
    inactive: number;
    running: number;
  };
  readings: {
    recentCount: number;
    rate: string;
  };
  alerts: {
    lastHour: number;
  };
  system: {
    uptime: number;
    isRunning: boolean;
    recoveryEnabled?: boolean; // Nuevo campo
  };
}

// API Response structure
interface ApiResponse<T> {
  status: string;
  results?: number;
  total?: number;
  data: T;
  message?: string;
}

// API Configuration
const API_URL_BASE = API_COLLECTION || 'http://localhost:4000';
console.log('API_URL_BASE para Sensor IoT Service:', API_URL_BASE);

const apiClient = axios.create({
  baseURL: API_URL_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const IOT_API_PATH = '/api/iot';

// Error handler helper
const handleApiError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error('Status:', axiosError.response?.status);
    console.error('Detail:', axiosError.response?.data);
    
    // Return a more user-friendly error message
    const message = (axiosError.response?.data as any)?.message || 
                   axiosError.message || 
                   'Error de conexión';
    throw new Error(message);
  }
  throw error;
};

// === WEBSOCKET CLIENT ===

export interface WebSocketEvent {
  type: string;
  sensorId?: string;
  timestamp: string;
  [key: string]: any;
}

export interface WebSocketManagerOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onReconnect?: (attemptCount: number) => void;
  onReconnectFailed?: () => void;
  debug?: boolean;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private options: WebSocketManagerOptions;
  private isConnected: boolean = false;
  private intentionalClose: boolean = false;
  
  constructor(
    serverUrl: string = API_URL_BASE.replace('http', 'ws'),
    options: WebSocketManagerOptions = {}
  ) {
    this.url = `${serverUrl}/ws`;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.options = options;
    
    // Inicializar con algunas suscripciones comunes
    this.subscriptions.set('system', new Set());
    this.subscriptions.set('readings', new Set());
    this.subscriptions.set('alerts', new Set());
    this.subscriptions.set('errors', new Set());
    this.subscriptions.set('status', new Set());
  }
  
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.logDebug('WebSocket already connected or connecting');
      return;
    }
    
    this.intentionalClose = false;
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = (event) => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logDebug('WebSocket connected');
        
        // Resubscribir a canales
        this.resubscribe();
        
        if (this.options.onOpen) {
          this.options.onOpen(event);
        }
      };
      
      this.ws.onclose = (event) => {
        this.isConnected = false;
        this.logDebug(`WebSocket closed: ${event.code} - ${event.reason}`);
        
        if (!this.intentionalClose) {
          this.attemptReconnect();
        }
        
        if (this.options.onClose) {
          this.options.onClose(event);
        }
      };
      
      this.ws.onerror = (event) => {
        this.logDebug('WebSocket error:', event);
        
        if (this.options.onError) {
          this.options.onError(event);
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
          
          if (this.options.onMessage) {
            this.options.onMessage(event);
          }
        } catch (error) {
          this.logDebug('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      this.logDebug('Error creating WebSocket:', error);
      this.attemptReconnect();
    }
  }
  
  private resubscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    // Resubscribir a todos los canales que tengan suscriptores
    for (const [channel, subscribers] of this.subscriptions.entries()) {
      if (subscribers.size > 0) {
        this.sendSubscription(channel, true);
      }
    }
  }
  
  private handleMessage(data: WebSocketEvent): void {
    const { type } = data;
    
    // Manejar mensajes de sistema
    if (type === 'connection' || type === 'system') {
      this.notifySubscribers('system', data);
      return;
    }
    
    // Determinar los canales para notificar
    if (data.sensorId) {
      // Notificar a los suscriptores del sensor específico
      this.notifySubscribers(`sensor:${data.sensorId}`, data);
    }
    
    // Notificar a los suscriptores del tipo de evento
    this.notifySubscribers(type, data);
    
    // Para lecturas, alertas, etc.
    switch (type) {
      case 'reading':
        this.notifySubscribers('readings', data);
        break;
      case 'alert':
        this.notifySubscribers('alerts', data);
        break;
      case 'error':
        this.notifySubscribers('errors', data);
        break;
      case 'status':
        this.notifySubscribers('status', data);
        break;
    }
  }
  
  private notifySubscribers(channel: string, data: any): void {
    const subscribers = this.subscriptions.get(channel);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logDebug(`Error in subscriber callback for ${channel}:`, error);
        }
      });
    }
  }
  
  private attemptReconnect(): void {
    if (this.reconnectTimer !== null || this.intentionalClose) return;
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.logDebug(`Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      
      if (this.options.onReconnectFailed) {
        this.options.onReconnectFailed();
      }
      
      return;
    }
    
    this.logDebug(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    if (this.options.onReconnect) {
      this.options.onReconnect(this.reconnectAttempts);
    }
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }
  
  subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      
      // Si ya estamos conectados, enviar suscripción
      if (this.isConnected) {
        this.sendSubscription(channel, true);
      }
    }
    
    const subscribers = this.subscriptions.get(channel)!;
    subscribers.add(callback);
    
    // Devolver función para desuscribirse
    return () => {
      subscribers.delete(callback);
      
      // Si no quedan suscriptores, cancelar suscripción
      if (subscribers.size === 0) {
        this.sendSubscription(channel, false);
      }
    };
  }
  
  private sendSubscription(channel: string, subscribe: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      this.ws.send(JSON.stringify({
        action: subscribe ? 'subscribe' : 'unsubscribe',
        channel
      }));
      
      this.logDebug(`${subscribe ? 'Subscribed to' : 'Unsubscribed from'} ${channel}`);
    } catch (error) {
      this.logDebug(`Error ${subscribe ? 'subscribing to' : 'unsubscribing from'} ${channel}:`, error);
    }
  }
  
  subscribeSensor(sensorId: string, callback: (data: any) => void): () => void {
    return this.subscribe(`sensor:${sensorId}`, callback);
  }
  
  subscribeAll(callback: (data: any) => void): () => void {
    return this.subscribe('readings', callback);
  }
  
  subscribeAlerts(callback: (data: any) => void): () => void {
    return this.subscribe('alerts', callback);
  }
  
  subscribeErrors(callback: (data: any) => void): () => void {
    return this.subscribe('errors', callback);
  }
  
  sendCommand(action: string, params: any = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logDebug('WebSocket not connected, attempting to connect...');
      this.connect();
      return;
    }
    
    try {
      this.ws.send(JSON.stringify({
        action,
        ...params
      }));
    } catch (error) {
      this.logDebug(`Error sending command ${action}:`, error);
    }
  }
  
  getSensorsList(): void {
    this.sendCommand('getSensors');
  }
  
  getSensorDetails(sensorId: string): void {
    this.sendCommand('getSensorDetails', { sensorId });
  }
  
  controlSensor(sensorId: string, command: 'start' | 'stop' | 'reset' | 'restart'): void {
    this.sendCommand('controlSensor', { sensorId, command });
  }
  
  sendPing(): void {
    this.sendCommand('ping');
  }
  
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
  
  disconnect(): void {
    this.intentionalClose = true;
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Closed by client');
      this.ws = null;
      this.isConnected = false;
    }
  }
  
  private logDebug(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[WebSocketManager] ${message}`, ...args);
    }
  }
}

// Singleton WebSocket Manager
export const wsManager = new WebSocketManager(undefined, { debug: true });

// === SENSOR MANAGEMENT ===

export const fetchAllSensors = async (): Promise<Sensor[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ sensors: Sensor[] }>>(
      `${IOT_API_PATH}/sensors?limit=100`
    );
    return response.data.data.sensors;
  } catch (error) {
    handleApiError(error, 'fetchAllSensors');
    return [];
  }
};

export const fetchSensorDetails = async (sensorId: string): Promise<Sensor> => {
  try {
    const response = await apiClient.get<ApiResponse<{ 
      sensor: Sensor; 
      statistics?: any; 
      memoryStatus?: any;
    }>>(
      `${IOT_API_PATH}/sensors/${sensorId}`
    );
    
    // Merge statistics if provided
    const sensor = response.data.data.sensor;
    if (response.data.data.statistics) {
      sensor.statistics = response.data.data.statistics;
    }
    
    // Add memory status if provided
    if (response.data.data.memoryStatus) {
      sensor.memoryStatus = response.data.data.memoryStatus;
    }
    
    return sensor;
  } catch (error) {
    handleApiError(error, 'fetchSensorDetails');
    throw error;
  }
};

export const fetchSensorReadings = async (
  sensorId: string, 
  limit: number = 60
): Promise<SensorReading[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ readings: SensorReading[] }>>(
      `${IOT_API_PATH}/sensors/${sensorId}/readings?limit=${limit}`
    );
    return response.data.data.readings;
  } catch (error) {
    handleApiError(error, 'fetchSensorReadings');
    return [];
  }
};

// Nuevo método para obtener sensores con error
export const fetchErrorSensors = async (): Promise<{
  memorySensors: Sensor[],
  databaseSensors: Sensor[]
}> => {
  try {
    const response = await apiClient.get<ApiResponse<{
      memorySensors: Sensor[],
      databaseSensors: Sensor[]
    }>>(
      `${IOT_API_PATH}/sensors/errors`
    );
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'fetchErrorSensors');
    return { memorySensors: [], databaseSensors: [] };
  }
};

// === SENSOR CONTROL ===

export const startSensor = async (sensorId: string): Promise<void> => {
  try {
    await apiClient.post(`${IOT_API_PATH}/sensors/${sensorId}/start`);
  } catch (error) {
    handleApiError(error, 'startSensor');
  }
};

export const stopSensor = async (sensorId: string): Promise<void> => {
  try {
    await apiClient.post(`${IOT_API_PATH}/sensors/${sensorId}/stop`);
  } catch (error) {
    handleApiError(error, 'stopSensor');
  }
};

// Nuevo método para reiniciar un sensor
export const resetSensor = async (sensorId: string): Promise<void> => {
  try {
    await apiClient.post(`${IOT_API_PATH}/sensors/${sensorId}/reset`);
  } catch (error) {
    handleApiError(error, 'resetSensor');
  }
};

export const startAllSensors = async (): Promise<void> => {
  try {
    await apiClient.post(`${IOT_API_PATH}/sensors/control/start-all`);
  } catch (error) {
    handleApiError(error, 'startAllSensors');
  }
};

export const stopAllSensors = async (): Promise<void> => {
  try {
    await apiClient.post(`${IOT_API_PATH}/sensors/control/stop-all`);
  } catch (error) {
    handleApiError(error, 'stopAllSensors');
  }
};

// Nuevo método para reiniciar todos los sensores con error
export const resetErrorSensors = async (): Promise<{ 
  success: number;
  failed: number;
  errors: Array<{ sensorId: string; error: string }>;
}> => {
  try {
    const response = await apiClient.post<ApiResponse<{
      results: {
        success: number;
        failed: number;
        errors: Array<{ sensorId: string; error: string }>;
      }
    }>>(
      `${IOT_API_PATH}/sensors/control/reset-errors`
    );
    return response.data.data.results;
  } catch (error) {
    handleApiError(error, 'resetErrorSensors');
    return { success: 0, failed: 0, errors: [] };
  }
};

// Nuevo método para establecer la recuperación automática
export const setAutoRecovery = async (enabled: boolean): Promise<boolean> => {
  try {
    const response = await apiClient.post<ApiResponse<{
      autoRecoveryEnabled: boolean;
    }>>(
      `${IOT_API_PATH}/sensors/control/auto-recovery`,
      { enabled }
    );
    return response.data.data.autoRecoveryEnabled;
  } catch (error) {
    handleApiError(error, 'setAutoRecovery');
    return false;
  }
};

// === SENSOR CREATION ===

export const createSensor = async (sensorConfig: any): Promise<Sensor> => {
  try {
    const response = await apiClient.post<ApiResponse<{ sensor: Sensor }>>(
      `${IOT_API_PATH}/sensors`,
      sensorConfig
    );
    return response.data.data.sensor;
  } catch (error) {
    handleApiError(error, 'createSensor');
    throw error;
  }
};

export const createTestSensors = async (
  spaceGuid: string, 
  spaceName: string
): Promise<Sensor[]> => {
  try {
    const response = await apiClient.post<ApiResponse<{ sensors: Sensor[] }>>(
      `${IOT_API_PATH}/simulate/create-test-sensors`,
      { spaceGuid, spaceName }
    );
    return response.data.data.sensors;
  } catch (error) {
    handleApiError(error, 'createTestSensors');
    throw error;
  }
};

// === SYSTEM STATUS ===

export const getSystemStatus = async (): Promise<SystemStatus> => {
  try {
    const response = await apiClient.get<ApiResponse<{ systemStatus: SystemStatus }>>(
      `${IOT_API_PATH}/system/status`
    );
    return response.data.data.systemStatus;
  } catch (error) {
    handleApiError(error, 'getSystemStatus');
    throw error;
  }
};

// === SPACE ENVIRONMENT ===

export const fetchSpaceEnvironment = async (spaceGuid: string) => {
  try {
    const response = await apiClient.get<ApiResponse<{ environment: any }>>(
      `${IOT_API_PATH}/spaces/${spaceGuid}/environment`
    );
    return response.data.data.environment;
  } catch (error) {
    handleApiError(error, 'fetchSpaceEnvironment');
    throw error;
  }
};

// === ALERTS ===

export const fetchActiveAlerts = async (hours: number = 1) => {
  try {
    const response = await apiClient.get<ApiResponse<{ 
      alerts: any[]; 
      alertsBySensor: any[];
      totalAlerts: number;
      sensorsAffected: number;
    }>>(
      `${IOT_API_PATH}/alerts?hours=${hours}`
    );
    return response.data.data;
  } catch (error) {
    handleApiError(error, 'fetchActiveAlerts');
    throw error;
  }
};

// === STATISTICS ===

export const fetchSensorStatistics = async (sensorId: string, hours: number = 24) => {
  try {
    const response = await apiClient.get<ApiResponse<{ statistics: any }>>(
      `${IOT_API_PATH}/sensors/${sensorId}/statistics?hours=${hours}`
    );
    return response.data.data.statistics;
  } catch (error) {
    handleApiError(error, 'fetchSensorStatistics');
    throw error;
  }
};

export const fetchHourlyAverages = async (sensorId: string, hours: number = 24) => {
  try {
    const response = await apiClient.get<ApiResponse<{ hourlyAverages: any[] }>>(
      `${IOT_API_PATH}/sensors/${sensorId}/hourly?hours=${hours}`
    );
    return response.data.data.hourlyAverages;
  } catch (error) {
    handleApiError(error, 'fetchHourlyAverages');
    return [];
  }
};

// === SIMULATION (Development only) ===

export const simulateTemperatureChange = async (
  sensorId: string, 
  change: number
): Promise<void> => {
  try {
    await apiClient.post(
      `${IOT_API_PATH}/simulate/temperature/${sensorId}`,
      { change }
    );
  } catch (error) {
    handleApiError(error, 'simulateTemperatureChange');
  }
};

export const simulateOccupancyEvent = async (
  sensorId: string, 
  eventType: 'entry' | 'exit',
  count: number = 1
): Promise<void> => {
  try {
    await apiClient.post(
      `${IOT_API_PATH}/simulate/occupancy/${sensorId}`,
      { eventType, count }
    );
  } catch (error) {
    handleApiError(error, 'simulateOccupancyEvent');
  }
};

// === EXPORT DATA ===

export const exportSensorData = async (
  sensorId: string,
  start: string,
  end: string
): Promise<Blob> => {
  try {
    const response = await apiClient.get(
      `${IOT_API_PATH}/export/csv?sensorId=${sensorId}&start=${start}&end=${end}`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'exportSensorData');
    throw error;
  }
};

export const mapSensorToSpace3D = async (
    sensorId: string, 
    spaceData: {
      spaceGuid: string;
      spaceName: string;
      spaceLongName?: string;
      modelId: string;
      localId: number;
    }
  ): Promise<void> => {
    try {
      await apiClient.post(`${IOT_API_PATH}/sensors/${sensorId}/map-to-space`, spaceData);
    } catch (error) {
      handleApiError(error, 'mapSensorToSpace3D');
    }
  };

  // Obtener sensores por espacio 3D
  export const getSensorsBySpace3D = async (spaceGuid: string): Promise<Sensor[]> => {
    try {
      const response = await apiClient.get<ApiResponse<{ sensors: Sensor[] }>>(
        `${IOT_API_PATH}/spaces/${spaceGuid}/sensors`
      );
      return response.data.data.sensors;
    } catch (error) {
      handleApiError(error, 'getSensorsBySpace3D');
      return [];
    }
  };

  // Obtener datos de mapa de calor
  export const getHeatMapData = async (spaceGuid?: string) => {
    try {
      const url = spaceGuid 
        ? `${IOT_API_PATH}/heatmap/${spaceGuid}`
        : `${IOT_API_PATH}/heatmap`;
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      handleApiError(error, 'getHeatMapData');
      return null;
    }
  };