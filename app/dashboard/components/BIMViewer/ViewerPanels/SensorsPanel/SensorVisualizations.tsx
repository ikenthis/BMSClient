// src/components/ViewerPanels/SensorsPanel/SensorVisualizations.tsx
import React from 'react';
import { Line, Doughnut, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  ArcElement,
  BarElement,
  RadialLinearScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { sensorPanelStyles, getSensorColor } from './SensorPanelStyles';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  ArcElement,
  BarElement,
  RadialLinearScale
);

interface SensorReading {
  _id: string;
  sensorId: string;
  value: number;
  unit: string;
  quality?: string;
  timestamp: string;
  additionalData?: any;
}

interface Sensor {
  sensorId: string;
  name: string;
  type: string;
  config?: {
    unit?: string;
    thresholds?: {
      warning?: { min?: number; max?: number };
      critical?: { min?: number; max?: number };
    };
  };
  lastReading?: {
    value: number;
    timestamp: string;
    quality?: string;
  };
}

interface VisualizationProps {
  sensor: Sensor;
  readings?: SensorReading[];
  currentReading?: any;
}

// Gráfico de humedad tipo gauge/doughnut
export const HumidityGauge: React.FC<{ value: number; unit?: string }> = ({ 
  value, 
  unit = '%'
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const remainingValue = 100 - normalizedValue;
  
  const getHumidityColor = (val: number) => {
    if (val < 30) return '#EF4444'; // Muy seco - rojo
    if (val < 40) return '#F59E0B'; // Seco - amarillo
    if (val < 60) return '#10B981'; // Óptimo - verde
    if (val < 70) return '#3B82F6'; // Húmedo - azul
    return '#6366F1'; // Muy húmedo - índigo
  };
  
  const data = {
    datasets: [
      {
        data: [normalizedValue, remainingValue],
        backgroundColor: [
          getHumidityColor(normalizedValue),
          'rgba(75, 85, 99, 0.3)'
        ],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className={sensorPanelStyles.visualizations.gaugeContainer}>
      <Doughnut data={data} options={options} />
      <div className={sensorPanelStyles.visualizations.gaugeCenter}>
        <div className="text-center">
          <div className={sensorPanelStyles.visualizations.gaugeValue}>
            {normalizedValue.toFixed(1)}
          </div>
          <div className={sensorPanelStyles.visualizations.gaugeUnit}>{unit}</div>
          <div className="text-xs text-gray-500">Humedad</div>
        </div>
      </div>
    </div>
  );
};

// Gráfico de temperatura tipo termómetro
export const TemperatureThermometer: React.FC<{ value: number; unit?: string }> = ({ 
  value, 
  unit = '°C'
}) => {
  const normalizedValue = Math.min(Math.max(value, -20), 50); // Rango típico -20°C a 50°C
  const percentage = ((normalizedValue + 20) / 70) * 100; // Convertir a porcentaje

  const getTemperatureColor = (temp: number) => {
    if (temp < 10) return '#3B82F6'; // Frío - azul
    if (temp < 20) return '#10B981'; // Fresco - verde
    if (temp < 25) return '#F59E0B'; // Templado - amarillo
    if (temp < 30) return '#F97316'; // Cálido - naranja
    return '#EF4444'; // Caliente - rojo
  };

  return (
    <div className={sensorPanelStyles.visualizations.thermometerContainer}>
      <div className={sensorPanelStyles.visualizations.thermometerTube}>
        {/* Fondo del termómetro */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 via-green-500 to-red-500 opacity-30"></div>
        
        {/* Mercury/fluid */}
        <div 
          className="absolute bottom-0 w-full transition-all duration-500 ease-out rounded-full"
          style={{ 
            height: `${percentage}%`,
            backgroundColor: getTemperatureColor(normalizedValue)
          }}
        ></div>
        
        {/* Bulb at bottom */}
        <div 
          className={sensorPanelStyles.visualizations.thermometerBulb}
          style={{ backgroundColor: getTemperatureColor(normalizedValue) }}
        ></div>
      </div>
      
      {/* Value display */}
      <div className={sensorPanelStyles.visualizations.thermometerLabel}>
        <div className="text-xl font-bold text-white">{value.toFixed(1)}</div>
        <div className="text-xs text-gray-400">{unit}</div>
        <div className="text-xs text-gray-500">Temperatura</div>
      </div>
    </div>
  );
};

// Indicador circular para un solo parámetro
export const CircularIndicator: React.FC<{ 
  value: number; 
  max: number; 
  label: string; 
  unit: string; 
  color?: string;
}> = ({ value, max, label, unit, color = '#3B82F6' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 30;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className={sensorPanelStyles.visualizations.circularContainer}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r="30"
          fill="none"
          stroke="rgba(75, 85, 99, 0.3)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r="30"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      <div className={sensorPanelStyles.visualizations.circularCenter}>
        <div className="text-center">
          <div className={sensorPanelStyles.visualizations.circularValue}>
            {value.toFixed(0)}
          </div>
          <div className={sensorPanelStyles.visualizations.circularUnit}>{unit}</div>
        </div>
      </div>
    </div>
  );
};

// Gráfico de línea temporal principal
export const TemporalChart: React.FC<VisualizationProps> = ({ sensor, readings = [] }) => {
  if (readings.length === 0) return null;

  const sensorColor = getSensorColor(sensor.type);
  
  const chartData = {
    labels: readings.map(r => new Date(r.timestamp)),
    datasets: [
      {
        label: `${sensor.name} (${sensor.config?.unit || ''})`,
        data: readings.map(r => r.value),
        borderColor: sensorColor.primary,
        backgroundColor: sensorColor.secondary,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'minute' as const,
          tooltipFormat: 'dd/MM HH:mm',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          },
        },
        title: {
          display: true,
          text: 'Tiempo',
          color: '#9CA3AF',
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9CA3AF',
        }
      },
      y: {
        title: {
          display: true,
          text: sensor.config?.unit || 'Valor',
          color: '#9CA3AF',
        },
        beginAtZero: sensor.type === 'occupancy',
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        ticks: {
          color: '#9CA3AF',
        }
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: '#4B5563',
        borderWidth: 1,
      }
    },
  };

  return (
    <div className={sensorPanelStyles.chart.fullHeight}>
      <Line options={chartOptions as any} data={chartData} />
    </div>
  );
};

// Gráfico radar para múltiples parámetros
export const MultiParameterRadar: React.FC<{ 
  parameters: Array<{ label: string; value: number; max: number; color: string }> 
}> = ({ parameters }) => {
  const data = {
    labels: parameters.map(p => p.label),
    datasets: [
      {
        label: 'Valores Actuales',
        data: parameters.map(p => (p.value / p.max) * 100),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: parameters.map(p => p.color),
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: parameters.map(p => p.color),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        angleLines: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        pointLabels: {
          color: '#9CA3AF',
          font: {
            size: 12,
          },
        },
        ticks: {
          color: '#9CA3AF',
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className={sensorPanelStyles.chart.content}>
      <Radar data={data} options={options as any} />
    </div>
  );
};

// Gráfico de barras para comparación
export const ComparisonBarChart: React.FC<{ 
  sensors: Array<{ name: string; value: number; type: string }> 
}> = ({ sensors }) => {
  const data = {
    labels: sensors.map(s => s.name),
    datasets: [{
      label: 'Valores Actuales',
      data: sensors.map(s => s.value),
      backgroundColor: sensors.map(s => getSensorColor(s.type).primaryAlpha),
      borderColor: sensors.map(s => getSensorColor(s.type).primary),
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
      }
    },
    scales: {
      x: { 
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      },
      y: { 
        ticks: { color: '#9CA3AF' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      }
    }
  };

  return (
    <div className={sensorPanelStyles.chart.content}>
      <Bar data={data} options={options as any} />
    </div>
  );
};

// Layout de múltiples indicadores
export const MultiIndicatorGrid: React.FC<{ 
  sensors: Array<{ 
    sensor: Sensor; 
    currentReading: any; 
    max?: number; 
  }> 
}> = ({ sensors }) => {
  return (
    <div className={sensorPanelStyles.dashboard.grid}>
      {sensors.map(({ sensor, currentReading, max = 100 }) => {
        const sensorColor = getSensorColor(sensor.type);
        
        return (
          <div key={sensor.sensorId} className={sensorPanelStyles.dashboard.card}>
            <div className={sensorPanelStyles.dashboard.cardIcon}>
              {sensorColor.icon}
            </div>
            <h4 className={sensorPanelStyles.dashboard.cardTitle}>{sensor.name}</h4>
            <p className={sensorPanelStyles.dashboard.cardLocation}>
              {sensor.location?.spaceName || 'Sin ubicación'}
            </p>
            
            {/* Visualización específica por tipo */}
            <div className="mb-3">
              {sensor.type === 'humidity' ? (
                <HumidityGauge value={currentReading?.value || 0} />
              ) : sensor.type === 'temperature' ? (
                <TemperatureThermometer value={currentReading?.value || 0} />
              ) : (
                <CircularIndicator 
                  value={currentReading?.value || 0}
                  max={max}
                  label={sensor.name}
                  unit={sensor.config?.unit || ''}
                  color={sensorColor.primary}
                />
              )}
            </div>
            
            {/* Valor numérico */}
            <div className={sensorPanelStyles.dashboard.cardValue}>
              {currentReading?.value?.toFixed(1) || '--'}
              <span className={sensorPanelStyles.dashboard.cardUnit}>
                {sensor.config?.unit || ''}
              </span>
            </div>
            
            {/* Estado */}
            <div className="flex justify-center mt-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                sensor.status === 'active' ? 'bg-green-900 text-green-300' : 
                sensor.status === 'error' ? 'bg-red-900 text-red-300' :
                'bg-gray-600 text-gray-300'
              }`}>
                {sensor.status}
              </span>
            </div>
            
            {/* Última actualización */}
            {currentReading?.timestamp && (
              <div className={sensorPanelStyles.dashboard.cardTimestamp}>
                {new Date(currentReading.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Componente de visualización principal que decide qué mostrar según el tipo
export const SensorVisualization: React.FC<VisualizationProps> = ({ 
  sensor, 
  currentReading 
}) => {
  const sensorColor = getSensorColor(sensor.type);
  
  return (
    <div className="flex justify-center">
      {sensor.type === 'humidity' && (
        <HumidityGauge value={currentReading?.value || 0} />
      )}
      {sensor.type === 'temperature' && (
        <TemperatureThermometer value={currentReading?.value || 0} />
      )}
      {(sensor.type === 'co2' || sensor.type === 'occupancy' || sensor.type === 'light' || 
        !['humidity', 'temperature'].includes(sensor.type)) && (
        <CircularIndicator 
          value={currentReading?.value || 0}
          max={
            sensor.type === 'co2' ? 1000 : 
            sensor.type === 'occupancy' ? 20 : 
            sensor.type === 'light' ? 1000 : 100
          }
          label={sensor.name}
          unit={sensor.config?.unit || ''}
          color={sensorColor.primary}
        />
      )}
    </div>
  );
};