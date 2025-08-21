// src/utils/mockSensorData.ts
import { SensorReading } from '../../../services/sensorApiService';

export interface MockSensorData {
  sensorId: string;
  name: string;
  type: 'temperature' | 'humidity' | 'occupancy' | 'co2' | 'light';
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  location?: {
    spaceName?: string;
    zone?: string;
    floor?: string;
  };
  config: {
    unit: string;
    samplingInterval?: number;
    thresholds?: {
      warning?: { min?: number; max?: number };
      critical?: { min?: number; max?: number };
    };
  };
  lastReading: {
    value: number;
    timestamp: string;
    quality: 'good' | 'warning' | 'critical';
  };
  memoryStatus?: {
    isRunning: boolean;
    hasError: boolean;
    errorMessage?: string;
  };
}

// Configuraciones base para cada tipo de sensor
const SENSOR_CONFIGS = {
  temperature: {
    unit: '°C',
    baseValue: 22,
    variation: 5,
    min: 15,
    max: 35,
    thresholds: {
      warning: { min: 18, max: 28 },
      critical: { min: 16, max: 32 }
    }
  },
  humidity: {
    unit: '%',
    baseValue: 45,
    variation: 15,
    min: 20,
    max: 80,
    thresholds: {
      warning: { min: 30, max: 70 },
      critical: { min: 25, max: 75 }
    }
  },
  occupancy: {
    unit: 'personas',
    baseValue: 5,
    variation: 8,
    min: 0,
    max: 20,
    thresholds: {
      warning: { max: 15 },
      critical: { max: 18 }
    }
  },
  co2: {
    unit: 'ppm',
    baseValue: 450,
    variation: 200,
    min: 300,
    max: 1200,
    thresholds: {
      warning: { max: 800 },
      critical: { max: 1000 }
    }
  },
  light: {
    unit: 'lux',
    baseValue: 300,
    variation: 200,
    min: 50,
    max: 1000,
    thresholds: {
      warning: { min: 100, max: 800 },
      critical: { min: 50, max: 900 }
    }
  }
};

// Nombres de espacios ficticios
const MOCK_SPACES = [
  'Sala de Reuniones Alpha',
  'Oficina Principal',
  'Área de Trabajo Beta',
  'Sala de Conferencias',
  'Laboratorio Gamma',
  'Recepción',
  'Cafetería',
  'Sala de Servidores',
  'Área de Desarrollo',
  'Sala de Juntas'
];

const ZONES = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
const FLOORS = ['Planta Baja', 'Piso 1', 'Piso 2', 'Piso 3'];

/**
 * Genera un valor aleatorio dentro de un rango con tendencia hacia el valor base
 */
function generateRandomValue(config: any): number {
  const { baseValue, variation, min, max } = config;
  
  // Generar variación usando distribución normal simplificada
  const random1 = Math.random();
  const random2 = Math.random();
  const gaussian = (random1 + random2) / 2; // Aproximación a distribución normal
  
  // Aplicar variación
  const variance = (gaussian - 0.5) * variation;
  let value = baseValue + variance;
  
  // Asegurar que esté dentro del rango
  value = Math.max(min, Math.min(max, value));
  
  return Math.round(value * 100) / 100; // Redondear a 2 decimales
}

/**
 * Determina la calidad basada en umbrales
 */
function determineQuality(value: number, thresholds: any): 'good' | 'warning' | 'critical' {
  if (!thresholds) return 'good';
  
  const { warning, critical } = thresholds;
  
  // Verificar umbrales críticos
  if (critical) {
    if ((critical.min !== undefined && value < critical.min) ||
        (critical.max !== undefined && value > critical.max)) {
      return 'critical';
    }
  }
  
  // Verificar umbrales de advertencia
  if (warning) {
    if ((warning.min !== undefined && value < warning.min) ||
        (warning.max !== undefined && value > warning.max)) {
      return 'warning';
    }
  }
  
  return 'good';
}

/**
 * Genera un sensor ficticio individual
 */
function generateMockSensor(type: keyof typeof SENSOR_CONFIGS, index: number): MockSensorData {
  const config = SENSOR_CONFIGS[type];
  const value = generateRandomValue(config);
  const quality = determineQuality(value, config.thresholds);
  
  // Simular algunos sensores con errores ocasionalmente
  const hasError = Math.random() < 0.1; // 10% de probabilidad de error
  const status = hasError ? 'error' : (Math.random() < 0.9 ? 'active' : 'inactive');
  
  return {
    sensorId: `MOCK_${type.toUpperCase()}_${String(index).padStart(3, '0')}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Sensor ${index}`,
    type,
    status,
    location: {
      spaceName: MOCK_SPACES[Math.floor(Math.random() * MOCK_SPACES.length)],
      zone: ZONES[Math.floor(Math.random() * ZONES.length)],
      floor: FLOORS[Math.floor(Math.random() * FLOORS.length)]
    },
    config: {
      unit: config.unit,
      samplingInterval: 30000, // 30 segundos
      thresholds: config.thresholds
    },
    lastReading: {
      value,
      timestamp: new Date().toISOString(),
      quality
    },
    memoryStatus: hasError ? {
      isRunning: false,
      hasError: true,
      errorMessage: `Error simulado en sensor ${type}`
    } : {
      isRunning: status === 'active',
      hasError: false
    }
  };
}

/**
 * Crea un conjunto de sensores ficticios
 */
export function createMockSensors(): MockSensorData[] {
  const sensors: MockSensorData[] = [];
  
  // Crear 2-3 sensores por tipo
  Object.keys(SENSOR_CONFIGS).forEach((type, typeIndex) => {
    const sensorType = type as keyof typeof SENSOR_CONFIGS;
    const count = Math.floor(Math.random() * 2) + 2; // 2-3 sensores por tipo
    
    for (let i = 1; i <= count; i++) {
      const globalIndex = typeIndex * 10 + i;
      sensors.push(generateMockSensor(sensorType, globalIndex));
    }
  });
  
  console.log(`🔵 Generados ${sensors.length} sensores ficticios:`, {
    temperature: sensors.filter(s => s.type === 'temperature').length,
    humidity: sensors.filter(s => s.type === 'humidity').length,
    occupancy: sensors.filter(s => s.type === 'occupancy').length,
    co2: sensors.filter(s => s.type === 'co2').length,
    light: sensors.filter(s => s.type === 'light').length
  });
  
  return sensors;
}

/**
 * Actualiza el valor de un sensor ficticio
 */
export function updateMockSensorValue(sensor: MockSensorData): MockSensorData {
  const config = SENSOR_CONFIGS[sensor.type];
  
  // Si el sensor tiene error, a veces se puede "recuperar"
  if (sensor.memoryStatus?.hasError && Math.random() < 0.3) {
    return {
      ...sensor,
      status: 'active',
      memoryStatus: {
        isRunning: true,
        hasError: false
      },
      lastReading: {
        value: generateRandomValue(config),
        timestamp: new Date().toISOString(),
        quality: 'good'
      }
    };
  }
  
  // Si el sensor está activo, generar nueva lectura
  if (sensor.status === 'active' && !sensor.memoryStatus?.hasError) {
    const newValue = generateRandomValue(config);
    const quality = determineQuality(newValue, config.thresholds);
    
    return {
      ...sensor,
      lastReading: {
        value: newValue,
        timestamp: new Date().toISOString(),
        quality
      }
    };
  }
  
  // Para sensores inactivos o con error, no cambiar el valor
  return sensor;
}

/**
 * Genera un historial de lecturas ficticias para un sensor
 */
export function generateMockReadings(
  sensorId: string, 
  sensorType: keyof typeof SENSOR_CONFIGS, 
  count: number = 100
): SensorReading[] {
  const config = SENSOR_CONFIGS[sensorType];
  const readings: SensorReading[] = [];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000)); // Cada 5 minutos
    const value = generateRandomValue(config);
    const quality = determineQuality(value, config.thresholds);
    
    readings.push({
      _id: `mock_reading_${sensorId}_${i}`,
      sensorId,
      value,
      unit: config.unit,
      quality,
      timestamp: timestamp.toISOString(),
      additionalData: {
        simulated: true,
        generatedAt: new Date().toISOString()
      }
    });
  }
  
  return readings;
}

/**
 * Simula datos de entorno para un espacio
 */
export function generateMockEnvironmentData(spaceGuid: string) {
  const sensors = createMockSensors().slice(0, 5); // Máximo 5 sensores por espacio
  
  return {
    spaceGuid,
    timestamp: new Date().toISOString(),
    sensors: sensors.map(sensor => ({
      sensorId: sensor.sensorId,
      type: sensor.type,
      value: sensor.lastReading.value,
      unit: sensor.config.unit,
      quality: sensor.lastReading.quality,
      status: sensor.status
    })),
    summary: {
      totalSensors: sensors.length,
      activeSensors: sensors.filter(s => s.status === 'active').length,
      alertsCount: sensors.filter(s => s.lastReading.quality !== 'good').length,
      averageValues: Object.keys(SENSOR_CONFIGS).reduce((acc, type) => {
        const typeSensors = sensors.filter(s => s.type === type);
        if (typeSensors.length > 0) {
          acc[type] = typeSensors.reduce((sum, s) => sum + s.lastReading.value, 0) / typeSensors.length;
        }
        return acc;
      }, {} as Record<string, number>)
    }
  };
}

/**
 * Genera alertas ficticias
 */
export function generateMockAlerts(sensors: MockSensorData[]) {
  const alerts = sensors
    .filter(sensor => sensor.lastReading.quality !== 'good')
    .map(sensor => ({
      _id: `alert_${sensor.sensorId}_${Date.now()}`,
      sensorId: sensor.sensorId,
      sensorName: sensor.name,
      type: sensor.lastReading.quality,
      message: `${sensor.name} reporta ${sensor.lastReading.quality === 'warning' ? 'advertencia' : 'estado crítico'}`,
      value: sensor.lastReading.value,
      unit: sensor.config.unit,
      threshold: sensor.lastReading.quality === 'critical' ? 'critical' : 'warning',
      timestamp: sensor.lastReading.timestamp,
      acknowledged: Math.random() < 0.3, // 30% de alertas ya reconocidas
      location: sensor.location
    }));
  
  return {
    alerts,
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.type === 'critical').length,
    warningAlerts: alerts.filter(a => a.type === 'warning').length,
    unacknowledgedAlerts: alerts.filter(a => !a.acknowledged).length
  };
}

export default {
  createMockSensors,
  updateMockSensorValue,
  generateMockReadings,
  generateMockEnvironmentData,
  generateMockAlerts
};