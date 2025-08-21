// src/components/BIMViewer/components/SpaceSensorPanel.tsx
import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Thermometer, Droplets, Users, Activity, Clock, AlertTriangle } from 'lucide-react';
import { SpaceSensorData } from '../types/sensorTypes';

interface SpaceSensorPanelProps {
  spaceInfo: SpaceSensorData | null;
  isVisible: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

type TabType = 'overview' | 'sensors' | 'history' | 'alerts';

const SpaceSensorPanel: React.FC<SpaceSensorPanelProps> = ({
  spaceInfo,
  isVisible,
  onClose,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simular datos históricos y alertas
  const [historicalData] = useState(() => 
    Array.from({ length: 24 }, (_, i) => ({
      hour: 23 - i,
      temperature: 20 + Math.sin(i * 0.5) * 3 + Math.random() * 2,
      humidity: 45 + Math.cos(i * 0.3) * 10 + Math.random() * 5,
      occupancy: Math.floor(Math.random() * 8)
    })).reverse()
  );

  const [alerts] = useState([
    { id: 1, type: 'warning', message: 'Temperatura por encima del rango óptimo', time: '14:30' },
    { id: 2, type: 'info', message: 'Sensor de humedad calibrado', time: '12:15' },
    { id: 3, type: 'critical', message: 'Pérdida de comunicación temporal con sensor', time: '09:45' }
  ]);

  if (!isVisible || !spaceInfo) return null;

  // Funciones auxiliares
  const getTemperatureColor = (temp: number) => {
    if (temp < 18) return 'text-blue-500';
    if (temp > 26) return 'text-red-500';
    if (temp >= 20 && temp <= 24) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getTemperatureStatus = (temp: number) => {
    if (temp < 18) return { status: 'Frío', color: 'bg-blue-100 text-blue-800' };
    if (temp > 26) return { status: 'Calor', color: 'bg-red-100 text-red-800' };
    if (temp >= 20 && temp <= 24) return { status: 'Óptimo', color: 'bg-green-100 text-green-800' };
    return { status: 'Moderado', color: 'bg-yellow-100 text-yellow-800' };
  };

  const getOccupancyStatus = (occupancy: number) => {
    if (occupancy === 0) return { status: 'Vacío', color: 'bg-gray-100 text-gray-800' };
    if (occupancy <= 3) return { status: 'Bajo', color: 'bg-green-100 text-green-800' };
    if (occupancy <= 6) return { status: 'Medio', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Alto', color: 'bg-red-100 text-red-800' };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular carga
    onRefresh();
    setIsRefreshing(false);
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Resumen', icon: Activity },
    { id: 'sensors' as TabType, label: 'Sensores', icon: Thermometer },
    { id: 'history' as TabType, label: 'Historial', icon: Clock },
    { id: 'alerts' as TabType, label: 'Alertas', icon: AlertTriangle }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {spaceInfo.spaceName}
            </h2>
            {spaceInfo.spaceLongName && spaceInfo.spaceLongName !== spaceInfo.spaceName && (
              <p className="text-sm text-gray-600 truncate">
                {spaceInfo.spaceLongName}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Temperatura */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg">
                      <Thermometer className={getTemperatureColor(spaceInfo.temperature)} size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Temperatura</p>
                      <p className={`text-2xl font-bold ${getTemperatureColor(spaceInfo.temperature)}`}>
                        {spaceInfo.temperature.toFixed(1)}°C
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTemperatureStatus(spaceInfo.temperature).color}`}>
                        {getTemperatureStatus(spaceInfo.temperature).status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Humedad */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg">
                      <Droplets className="text-blue-500" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Humedad</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {spaceInfo.humidity.toFixed(0)}%
                      </p>
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {spaceInfo.humidity < 40 ? 'Baja' : spaceInfo.humidity > 60 ? 'Alta' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ocupación */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg">
                      <Users className="text-purple-500" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Ocupación</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {spaceInfo.occupancy}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getOccupancyStatus(spaceInfo.occupancy).color}`}>
                        {getOccupancyStatus(spaceInfo.occupancy).status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado general */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Estado General</h3>
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    spaceInfo.quality === 'good' ? 'bg-green-500' :
                    spaceInfo.quality === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    Sistema de sensores:
                  </span>
                  <span className={`font-medium ${
                    spaceInfo.quality === 'good' ? 'text-green-600' :
                    spaceInfo.quality === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {spaceInfo.quality === 'good' ? 'Funcionando correctamente' :
                     spaceInfo.quality === 'warning' ? 'Con alertas menores' : 'Requiere atención'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Última actualización: {new Date(spaceInfo.timestamp).toLocaleString('es-ES')}
                </p>
              </div>
            </div>
          )}

          {/* Tab: Sensors */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Sensores Activos</h3>
              
              {/* Lista de sensores */}
              <div className="space-y-3">
                {[
                  { id: 'temp-001', name: 'Sensor de Temperatura #1', type: 'Temperatura', value: `${spaceInfo.temperature.toFixed(1)}°C`, status: 'online' },
                  { id: 'hum-001', name: 'Sensor de Humedad #1', type: 'Humedad', value: `${spaceInfo.humidity.toFixed(0)}%`, status: 'online' },
                  { id: 'occ-001', name: 'Sensor de Ocupación #1', type: 'Ocupación', value: `${spaceInfo.occupancy} personas`, status: 'online' },
                  { id: 'air-001', name: 'Sensor de Calidad de Aire', type: 'CO2', value: '420 ppm', status: 'warning' }
                ].map((sensor) => (
                  <div key={sensor.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{sensor.name}</h4>
                        <p className="text-sm text-gray-600">{sensor.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{sensor.value}</p>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            sensor.status === 'online' ? 'bg-green-500' :
                            sensor.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-500 capitalize">{sensor.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Últimas 24 Horas</h3>
              
              {/* Gráfico simple de temperaturas */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Temperatura</h4>
                <div className="flex items-end space-x-1 h-32">
                  {historicalData.slice(-12).map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${(data.temperature - 15) * 4}px` }}
                        title={`${data.temperature.toFixed(1)}°C`}
                      ></div>
                      <span className="text-xs text-gray-500 mt-1">
                        {String(data.hour).padStart(2, '0')}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabla de datos recientes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Datos Recientes</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Hora</th>
                        <th className="text-left py-2">Temperatura</th>
                        <th className="text-left py-2">Humedad</th>
                        <th className="text-left py-2">Ocupación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalData.slice(-6).reverse().map((data, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2">{String(data.hour).padStart(2, '0')}:00</td>
                          <td className="py-2">{data.temperature.toFixed(1)}°C</td>
                          <td className="py-2">{data.humidity.toFixed(0)}%</td>
                          <td className="py-2">{data.occupancy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Alerts */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Alertas y Notificaciones</h3>
              
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                    alert.type === 'critical' ? 'bg-red-50 border-red-500' :
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-blue-50 border-blue-500'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 ${
                        alert.type === 'critical' ? 'text-red-500' :
                        alert.type === 'warning' ? 'text-yellow-500' :
                        'text-blue-500'
                      }`}>
                        {alert.type === 'critical' ? '🔴' :
                         alert.type === 'warning' ? '🟡' : '🔵'}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          alert.type === 'critical' ? 'text-red-900' :
                          alert.type === 'warning' ? 'text-yellow-900' :
                          'text-blue-900'
                        }`}>
                          {alert.message}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Hoy a las {alert.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {alerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No hay alertas activas</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>ID del Espacio: {spaceInfo.spaceGuid.slice(-12)}</span>
            <span>Sistema IoT v2.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceSensorPanel;