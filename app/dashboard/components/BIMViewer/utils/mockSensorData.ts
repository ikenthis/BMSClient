// src/utils/mockSensorData.ts
// Datos ficticios para sensores adicionales

export interface MockSensorData {
  sensorId: string;
  name: string;
  type: 'temperature' | 'humidity' | 'co2' | 'occupancy' | 'light';
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  location: {
    spaceName: string;
    floor?: string;
    zone?: string;
  };
  config: {
    unit: string;
    samplingInterval: number;
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
  statistics?: {
    totalReadings: number;
    averageValue: number;
  };
  memoryStatus?: {
    isRunning: boolean;
    hasError: boolean;
    errorMessage?: string;
  };
}

// Generar valor realista según el tipo de sensor
const generateRealisticValue = (type: string): number => {
  const now = Date.now();
  const timeVariation = Math.sin(now / 300000) * 0.3; // Variación cada 5 minutos
  const randomNoise = (Math.random() - 0.5) * 0.2;
  
  switch (type) {
    case 'temperature':
      return 22 + timeVariation * 4 + randomNoise * 2; // 20-26°C típico
    case 'humidity':
      return 55 + timeVariation * 15 + randomNoise * 5; // 40-70% típico
    case 'co2':
      return 600 + timeVariation * 200 + randomNoise * 50; // 400-800 ppm típico
    case 'light':
      return 350 + timeVariation * 200 + randomNoise * 50; // 150-550 lux típico
    case 'occupancy':
      return Math.max(0, Math.round(5 + timeVariation * 3 + randomNoise * 2)); // 0-8 personas
    default:
      return 50 + randomNoise * 10;
  }
};

// Determinar calidad basada en el valor y tipo
const getQuality = (value: number, type: string): 'good' | 'warning' | 'critical' => {
  switch (type) {
    case 'temperature':
      if (value < 18 || value > 26) return 'warning';
      if (value < 15 || value > 30) return 'critical';
      return 'good';
    case 'humidity':
      if (value < 40 || value > 70) return 'warning';
      if (value < 30 || value > 80) return 'critical';
      return 'good';
    case 'co2':
      if (value > 800) return 'warning';
      if (value > 1000) return 'critical';
      return 'good';
    case 'light':
      if (value < 200 || value > 500) return 'warning';
      if (value < 100 || value > 600) return 'critical';
      return 'good';
    default:
      return 'good';
  }
};

// Crear sensores ficticios adicionales
export const createMockSensors = (): MockSensorData[] => {
  const baseTime = new Date().toISOString();
  
  return [
    // Sensor de Humedad
    {
      sensorId: 'HUM-001-MOCK',
      name: 'Sensor Humedad Oficina A',
      type: 'humidity',
      status: 'active',
      location: {
        spaceName: 'Oficina Principal',
        floor: '2',
        zone: 'Norte'
      },
      config: {
        unit: '%',
        samplingInterval: 30000,
        thresholds: {
          warning: { min: 40, max: 70 },
          critical: { min: 30, max: 80 }
        }
      },
      lastReading: {
        value: generateRealisticValue('humidity'),
        timestamp: baseTime,
        quality: 'good'
      },
      statistics: {
        totalReadings: 2840,
        averageValue: 58.3
      },
      memoryStatus: {
        isRunning: true,
        hasError: false
      }
    },
    
    // Sensor de CO2
    {
      sensorId: 'CO2-001-MOCK',
      name: 'Sensor CO2 Sala Reuniones',
      type: 'co2',
      status: 'active',
      location: {
        spaceName: 'Sala de Reuniones B',
        floor: '2',
        zone: 'Sur'
      },
      config: {
        unit: 'ppm',
        samplingInterval: 60000,
        thresholds: {
          warning: { max: 800 },
          critical: { max: 1000 }
        }
      },
      lastReading: {
        value: generateRealisticValue('co2'),
        timestamp: baseTime,
        quality: 'good'
      },
      statistics: {
        totalReadings: 1420,
        averageValue: 720.5
      },
      memoryStatus: {
        isRunning: true,
        hasError: false
      }
    },
    
    // Sensor de Iluminación
    {
      sensorId: 'LUX-001-MOCK',
      name: 'Sensor Iluminación Pasillo',
      type: 'light',
      status: 'active',
      location: {
        spaceName: 'Pasillo Central',
        floor: '2',
        zone: 'Centro'
      },
      config: {
        unit: 'lux',
        samplingInterval: 120000,
        thresholds: {
          warning: { min: 200, max: 500 },
          critical: { min: 100, max: 600 }
        }
      },
      lastReading: {
        value: generateRealisticValue('light'),
        timestamp: baseTime,
        quality: 'good'
      },
      statistics: {
        totalReadings: 710,
        averageValue: 385.2
      },
      memoryStatus: {
        isRunning: true,
        hasError: false
      }
    },
    
    // Segundo sensor de Humedad (con warning)
    {
      sensorId: 'HUM-002-MOCK',
      name: 'Sensor Humedad Oficina B',
      type: 'humidity',
      status: 'active',
      location: {
        spaceName: 'Oficina Secundaria',
        floor: '3',
        zone: 'Este'
      },
      config: {
        unit: '%',
        samplingInterval: 30000,
        thresholds: {
          warning: { min: 40, max: 70 },
          critical: { min: 30, max: 80 }
        }
      },
      lastReading: {
        value: 75, // Valor que genera warning
        timestamp: baseTime,
        quality: 'warning'
      },
      statistics: {
        totalReadings: 1980,
        averageValue: 62.1
      },
      memoryStatus: {
        isRunning: true,
        hasError: false
      }
    },
    
    // Sensor de CO2 con problema
    {
      sensorId: 'CO2-002-MOCK',
      name: 'Sensor CO2 Auditorio',
      type: 'co2',
      status: 'error',
      location: {
        spaceName: 'Auditorio Principal',
        floor: '1',
        zone: 'Oeste'
      },
      config: {
        unit: 'ppm',
        samplingInterval: 60000,
        thresholds: {
          warning: { max: 800 },
          critical: { max: 1000 }
        }
      },
      lastReading: {
        value: 1050, // Valor crítico
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
        quality: 'critical'
      },
      statistics: {
        totalReadings: 890,
        averageValue: 850.7
      },
      memoryStatus: {
        isRunning: false,
        hasError: true,
        errorMessage: 'Sensor desconectado - revisar conexión'
      }
    },
    
    // Sensor de Iluminación inactivo
    {
      sensorId: 'LUX-002-MOCK',
      name: 'Sensor Iluminación Almacén',
      type: 'light',
      status: 'inactive',
      location: {
        spaceName: 'Almacén General',
        floor: '0',
        zone: 'Sótano'
      },
      config: {
        unit: 'lux',
        samplingInterval: 300000, // 5 minutos
        thresholds: {
          warning: { min: 50, max: 400 },
          critical: { min: 20, max: 500 }
        }
      },
      lastReading: {
        value: 125,
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutos atrás
        quality: 'good'
      },
      statistics: {
        totalReadings: 445,
        averageValue: 178.9
      },
      memoryStatus: {
        isRunning: false,
        hasError: false
      }
    }
  ];
};

// Generar lecturas históricas ficticias
export const generateMockReadings = (sensorId: string, sensorType: string, count: number = 50) => {
  const readings = [];
  const now = Date.now();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now - (i * 60000)).toISOString(); // Cada minuto
    const baseValue = generateRealisticValue(sensorType);
    const value = Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.1); // ±10% variación
    
    readings.push({
      _id: `reading-${sensorId}-${i}`,
      sensorId,
      value,
      unit: getUnitForType(sensorType),
      quality: getQuality(value, sensorType),
      timestamp,
      additionalData: {}
    });
  }
  
  return readings;
};

const getUnitForType = (type: string): string => {
  switch (type) {
    case 'temperature': return '°C';
    case 'humidity': return '%';
    case 'co2': return 'ppm';
    case 'light': return 'lux';
    case 'occupancy': return 'personas';
    default: return '';
  }
};

// Actualizar valores en tiempo real (simulación)
export const updateMockSensorValue = (sensor: MockSensorData): MockSensorData => {
  const newValue = generateRealisticValue(sensor.type);
  const quality = getQuality(newValue, sensor.type);
  
  return {
    ...sensor,
    lastReading: {
      value: newValue,
      timestamp: new Date().toISOString(),
      quality
    }
  };
};

// Estado del sistema actualizado con sensores ficticios
export const getMockSystemStatus = (realSensors: any[], mockSensors: MockSensorData[]) => {
  const allSensors = [...realSensors, ...mockSensors];
  const activeSensors = allSensors.filter(s => s.status === 'active').length;
  const errorSensors = allSensors.filter(s => s.status === 'error').length;
  const inactiveSensors = allSensors.filter(s => s.status === 'inactive').length;
  const errorInMemory = allSensors.filter(s => s.memoryStatus?.hasError).length;
  
  return {
    system: {
      isRunning: true, // Sistema activo con sensores ficticios
      recoveryEnabled: true
    },
    sensors: {
      total: allSensors.length,
      active: activeSensors,
      inactive: inactiveSensors,
      error: errorSensors,
      errorInMemory: errorInMemory
    }
  };
};