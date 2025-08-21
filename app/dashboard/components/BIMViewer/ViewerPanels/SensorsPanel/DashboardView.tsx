// src/components/ViewerPanels/SensorsPanel/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { 
  sensorPanelStyles, 
  getSensorColor,
  getStatusColor,
  getQualityColor 
} from './SensorPanelStyles';
import {
  MultiIndicatorGrid,
  ComparisonBarChart,
  MultiParameterRadar,
  TemporalChart
} from './SensorVisualizations';
import { Sensor } from '../../services/sensorApiService';
import { MockSensorData, generateMockAlerts } from '../SensorsPanel/utils/mockSensorData';

interface DashboardViewProps {
  realSensors: Sensor[];
  mockSensors: MockSensorData[];
  onSensorSelect: (sensor: Sensor | MockSensorData) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  realSensors,
  mockSensors,
  onSensorSelect
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'alerts'>('overview');
  const [alertsData, setAlertsData] = useState<any>(null);

  // Combinar sensores reales y ficticios para el dashboard
  const allSensors = [...realSensors, ...mockSensors];
  
  // Calcular estadísticas generales
  const totalSensors = allSensors.length;
  const activeSensors = allSensors.filter(s => s.status === 'active').length;
  const errorSensors = allSensors.filter(s => 
    s.status === 'error' || (s as any).memoryStatus?.hasError
  ).length;
  const inactiveSensors = allSensors.filter(s => s.status === 'inactive').length;

  // Generar datos de alertas
  useEffect(() => {
    const alerts = generateMockAlerts(mockSensors);
    setAlertsData(alerts);
  }, [mockSensors]);

  // Agrupar sensores por tipo para visualizaciones
  const sensorsByType = allSensors.reduce((acc, sensor) => {
    if (!acc[sensor.type]) {
      acc[sensor.type] = [];
    }
    acc[sensor.type].push(sensor);
    return acc;
  }, {} as Record<string, (Sensor | MockSensorData)[]>);

  // Preparar datos para gráfico de comparación
  const comparisonData = Object.entries(sensorsByType).map(([type, sensors]) => {
    const activeSensorsOfType = sensors.filter(s => s.status === 'active');
    const avgValue = activeSensorsOfType.length > 0 
      ? activeSensorsOfType.reduce((sum, s) => sum + (s.lastReading?.value || 0), 0) / activeSensorsOfType.length
      : 0;
    
    return {
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(avgValue * 100) / 100,
      type
    };
  });

  // Preparar datos para radar chart
  const radarParameters = Object.entries(sensorsByType).map(([type, sensors]) => {
    const sensorColor = getSensorColor(type);
    const activeSensors = sensors.filter(s => s.status === 'active');
    const avgValue = activeSensors.length > 0 
      ? activeSensors.reduce((sum, s) => sum + (s.lastReading?.value || 0), 0) / activeSensors.length
      : 0;
    
    // Definir valores máximos por tipo para normalizar
    const maxValues = {
      temperature: 35,
      humidity: 100,
      co2: 1000,
      occupancy: 20,
      light: 1000
    };
    
    return {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: avgValue,
      max: maxValues[type as keyof typeof maxValues] || 100,
      color: sensorColor.primary
    };
  });

  // Preparar sensores para el grid de indicadores
  const gridSensors = allSensors
    .filter(s => s.status === 'active' && s.lastReading)
    .slice(0, 8) // Máximo 8 sensores en el grid
    .map(sensor => ({
      sensor,
      currentReading: sensor.lastReading,
      max: sensor.type === 'temperature' ? 35 :
           sensor.type === 'humidity' ? 100 :
           sensor.type === 'co2' ? 1000 :
           sensor.type === 'occupancy' ? 20 :
           sensor.type === 'light' ? 1000 : 100
    }));

  return (
    <div className={sensorPanelStyles.content.dashboard}>
      {/* Header del Dashboard */}
      <div className={sensorPanelStyles.dashboard.header}>
        <div>
          <h2 className={sensorPanelStyles.dashboard.title}>Dashboard IoT</h2>
          <p className={sensorPanelStyles.dashboard.timestamp}>
            Última actualización: {new Date().toLocaleString()}
          </p>
        </div>
        
        {/* Selector de vista */}
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedView('overview')}
            className={`${sensorPanelStyles.buttons.secondary} ${
              selectedView === 'overview' ? 'bg-blue-600' : ''
            }`}
          >
            Vista General
          </button>
          <button
            onClick={() => setSelectedView('detailed')}
            className={`${sensorPanelStyles.buttons.secondary} ${
              selectedView === 'detailed' ? 'bg-blue-600' : ''
            }`}
          >
            Detallado
          </button>
          <button
            onClick={() => setSelectedView('alerts')}
            className={`${sensorPanelStyles.buttons.secondary} ${
              selectedView === 'alerts' ? 'bg-blue-600' : ''
            }`}
          >
            Alertas ({alertsData?.totalAlerts || 0})
          </button>
        </div>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">📊</div>
          <div className="font-medium text-sm mb-1">Total Sensores</div>
          <div className="text-2xl font-bold text-white">{totalSensors}</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-medium text-sm mb-1">Activos</div>
          <div className="text-2xl font-bold text-green-400">{activeSensors}</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="font-medium text-sm mb-1">Con Error</div>
          <div className="text-2xl font-bold text-red-400">{errorSensors}</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">⏸️</div>
          <div className="font-medium text-sm mb-1">Inactivos</div>
          <div className="text-2xl font-bold text-gray-400">{inactiveSensors}</div>
        </div>
      </div>

      {/* Contenido según la vista seleccionada */}
      {selectedView === 'overview' && (
        <>
          {/* Grid de indicadores principales */}
          {gridSensors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Sensores Activos</h3>
              <MultiIndicatorGrid sensors={gridSensors} />
            </div>
          )}

          {/* Gráficos de análisis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gráfico de comparación por tipo */}
            <div className={sensorPanelStyles.chart.container}>
              <h4 className={sensorPanelStyles.chart.title}>Valores Promedio por Tipo</h4>
              <ComparisonBarChart sensors={comparisonData} />
            </div>

            {/* Radar chart */}
            <div className={sensorPanelStyles.chart.container}>
              <h4 className={sensorPanelStyles.chart.title}>Vista Radar - Estado General</h4>
              <MultiParameterRadar parameters={radarParameters} />
            </div>
          </div>
        </>
      )}

      {selectedView === 'detailed' && (
        <>
          {/* Lista detallada de sensores */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Lista Detallada de Sensores</h3>
            
            {Object.entries(sensorsByType).map(([type, sensors]) => (
              <div key={type} className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-md font-semibold mb-3 flex items-center">
                  <span className="mr-2">{getSensorColor(type).icon}</span>
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({sensors.length})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sensors.map(sensor => {
                    const hasError = sensor.status === 'error' || (sensor as any).memoryStatus?.hasError;
                    
                    return (
                      <div
                        key={sensor.sensorId}
                        onClick={() => onSensorSelect(sensor)}
                        className="bg-gray-700 rounded p-3 cursor-pointer hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-sm truncate flex-1">{sensor.name}</h5>
                          <span className={`text-xs px-2 py-1 rounded ${
                            hasError ? 'bg-red-900 text-red-300' :
                            sensor.status === 'active' ? 'bg-green-900 text-green-300' :
                            'bg-gray-600 text-gray-300'
                          }`}>
                            {hasError ? 'Error' : sensor.status}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-400 mb-2">
                          {sensor.location?.spaceName || 'Sin ubicación'}
                        </p>
                        
                        {sensor.lastReading && (
                          <div className="flex justify-between items-center">
                            <span className={`font-bold ${getQualityColor(
                              sensor.lastReading.quality,
                              sensor.lastReading.value,
                              (sensor as any).config?.thresholds
                            )}`}>
                              {sensor.lastReading.value?.toFixed(1)} {(sensor as any).config?.unit}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(sensor.lastReading.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedView === 'alerts' && alertsData && (
        <>
          {/* Panel de alertas */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Alertas Activas</h3>
              <div className="flex space-x-4 text-sm">
                <span className="text-red-400">
                  Críticas: {alertsData.criticalAlerts}
                </span>
                <span className="text-yellow-400">
                  Advertencias: {alertsData.warningAlerts}
                </span>
                <span className="text-gray-400">
                  No reconocidas: {alertsData.unacknowledgedAlerts}
                </span>
              </div>
            </div>

            {alertsData.alerts.length === 0 ? (
              <div className="bg-green-900 bg-opacity-20 border border-green-800 rounded p-6 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h4 className="text-green-400 font-semibold mb-2">¡Todo en orden!</h4>
                <p className="text-green-200">No hay alertas activas en este momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertsData.alerts.map((alert: any, index: number) => (
                  <div
                    key={alert._id}
                    className={`rounded-lg p-4 border ${
                      alert.type === 'critical' 
                        ? 'bg-red-900 bg-opacity-30 border-red-800' 
                        : 'bg-yellow-900 bg-opacity-30 border-yellow-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-lg ${
                            alert.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {alert.type === 'critical' ? '🚨' : '⚠️'}
                          </span>
                          <h4 className="font-semibold">{alert.sensorName}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            alert.type === 'critical' 
                              ? 'bg-red-700 text-red-200' 
                              : 'bg-yellow-700 text-yellow-200'
                          }`}>
                            {alert.type.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-sm mb-2">{alert.message}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>📍 {alert.location?.spaceName}</span>
                          <span>📊 {alert.value} {alert.unit}</span>
                          <span>⏰ {new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        {alert.acknowledged ? (
                          <span className="text-xs bg-green-700 text-green-200 px-2 py-1 rounded">
                            Reconocida
                          </span>
                        ) : (
                          <button className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
                            Reconocer
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            const sensor = allSensors.find(s => s.sensorId === alert.sensorId);
                            if (sensor) onSensorSelect(sensor);
                          }}
                          className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                        >
                          Ver Sensor
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Información adicional del sistema */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Distribución por Tipo</h4>
          <div className="space-y-2">
            {Object.entries(sensorsByType).map(([type, sensors]) => {
              const sensorColor = getSensorColor(type);
              const activeCount = sensors.filter(s => s.status === 'active').length;
              
              return (
                <div key={type} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span>{sensorColor.icon}</span>
                    <span className="text-sm">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-green-400">{activeCount}</span>
                    <span className="text-gray-400">/{sensors.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Estado del Sistema</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tasa de éxito:</span>
              <span className="text-green-400">
                {totalSensors > 0 ? Math.round((activeSensors / totalSensors) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sensores reales:</span>
              <span className="text-blue-400">{realSensors.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Sensores ficticios:</span>
              <span className="text-purple-400">{mockSensors.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Última actualización:</span>
              <span className="text-gray-400">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;