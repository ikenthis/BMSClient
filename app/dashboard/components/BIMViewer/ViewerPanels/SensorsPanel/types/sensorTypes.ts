// src/components/BIMViewer/types/sensorTypes.ts

export interface SpaceSensorData {
  spaceGuid: string;
  spaceName: string;
  spaceLongName?: string;
  temperature: number;
  humidity: number;
  occupancy: number;
  timestamp: string;
  quality: 'good' | 'warning' | 'critical';
  sensors?: SensorInfo[];
  alerts?: AlertInfo[];
}

export interface SensorInfo {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'occupancy' | 'air_quality' | 'light' | 'noise';
  value: number | string;
  unit: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  lastUpdate: string;
  batteryLevel?: number;
  location?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface AlertInfo {
  id: string;
  type: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  source?: string;
}

export interface SpacePosition {
  x: number;
  y: number;
}

export interface HoverInfo {
  isHovering: boolean;
  hoveredSpace: SpaceSensorData | null;
  hoverPosition: SpacePosition | null;
}

export interface SpaceSensorSettings {
  autoUpdate: boolean;
  updateInterval: number;
  enableHover: boolean;
  showTooltip: boolean;
  showPanel: boolean;
}

export interface HistoricalDataPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
  occupancy: number;
  airQuality?: number;
}

export interface SensorThresholds {
  temperature: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
  humidity: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
  occupancy: {
    max: number;
    warning: number;
  };
}

// Tipos específicos para integración con HeatMap
export interface HeatMapSensorData {
  spaceGuid: string;
  spaceName: string;
  temperature: number;
  quality: 'good' | 'warning' | 'critical';
  timestamp: string;
  additionalData?: {
    humidity: number;
    occupancy: number;
    airQuality?: number;
  };
}

// Tipos para el servicio de espacios con sensores
export interface SpaceSensorService {
  getSpaceInfo: (spaceGuid: string) => Promise<SpaceSensorData | null>;
  getSpacesWithSensors: () => Promise<SpaceSensorData[]>;
  updateSpaceData: (spaceGuid: string, data: Partial<SpaceSensorData>) => Promise<void>;
  subscribeToSpaceUpdates: (spaceGuid: string, callback: (data: SpaceSensorData) => void) => () => void;
  getHistoricalData: (spaceGuid: string, hours: number) => Promise<HistoricalDataPoint[]>;
}

// Configuración por defecto
export const DEFAULT_SENSOR_THRESHOLDS: SensorThresholds = {
  temperature: {
    min: 16,
    max: 28,
    optimal: { min: 20, max: 24 }
  },
  humidity: {
    min: 30,
    max: 70,
    optimal: { min: 40, max: 60 }
  },
  occupancy: {
    max: 10,
    warning: 8
  }
};

export const DEFAULT_SENSOR_SETTINGS: SpaceSensorSettings = {
  autoUpdate: true,
  updateInterval: 30000, // 30 segundos
  enableHover: true,
  showTooltip: true,
  showPanel: true
};

// Utilidades para validación y conversión de datos
export const validateSensorData = (data: any): data is SpaceSensorData => {
  return (
    typeof data === 'object' &&
    typeof data.spaceGuid === 'string' &&
    typeof data.spaceName === 'string' &&
    typeof data.temperature === 'number' &&
    typeof data.humidity === 'number' &&
    typeof data.occupancy === 'number' &&
    typeof data.timestamp === 'string' &&
    ['good', 'warning', 'critical'].includes(data.quality)
  );
};

export const generateMockSensorData = (spaceGuid: string, spaceName: string): SpaceSensorData => {
  const temperature = 18 + Math.random() * 8; // 18-26°C
  const humidity = 40 + Math.random() * 20; // 40-60%
  const occupancy = Math.floor(Math.random() * 8); // 0-7 personas
  
  let quality: 'good' | 'warning' | 'critical' = 'good';
  if (temperature < 18 || temperature > 26 || humidity < 35 || humidity > 65) {
    quality = 'warning';
  }
  if (temperature < 16 || temperature > 28 || humidity < 30 || humidity > 70) {
    quality = 'critical';
  }

  return {
    spaceGuid,
    spaceName,
    temperature,
    humidity,
    occupancy,
    timestamp: new Date().toISOString(),
    quality,
    sensors: [
      {
        id: `temp-${spaceGuid.slice(-4)}`,
        name: 'Sensor de Temperatura',
        type: 'temperature',
        value: temperature,
        unit: '°C',
        status: 'online',
        lastUpdate: new Date().toISOString(),
        batteryLevel: 85 + Math.random() * 15
      },
      {
        id: `hum-${spaceGuid.slice(-4)}`,
        name: 'Sensor de Humedad',
        type: 'humidity',
        value: humidity,
        unit: '%',
        status: 'online',
        lastUpdate: new Date().toISOString(),
        batteryLevel: 75 + Math.random() * 20
      },
      {
        id: `occ-${spaceGuid.slice(-4)}`,
        name: 'Sensor de Ocupación',
        type: 'occupancy',
        value: occupancy,
        unit: 'personas',
        status: 'online',
        lastUpdate: new Date().toISOString(),
        batteryLevel: 90 + Math.random() * 10
      }
    ]
  };
};