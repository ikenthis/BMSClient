// HeatMapControlPanel.tsx - Panel de control avanzado para el mapa de calor
import React, { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Eye, 
  EyeOff, 
  Settings, 
  RefreshCw, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Sliders,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UseHeatMapReturn } from './hooks/useHeatMap';
import { HeatMapVisualizationConfig } from './utils/HeatMapVisualization';
interface HeatMapControlPanelProps {
  heatMapHook: UseHeatMapReturn;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  className?: string;
}

const HeatMapControlPanel: React.FC<HeatMapControlPanelProps> = ({
  heatMapHook,
  isOpen,
  onClose,
  position = 'right',
  className = ''
}) => {
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [tempConfig, setTempConfig] = useState<Partial<HeatMapVisualizationConfig>>({
    temperatureRange: {
      min: 18,
      max: 28,
      optimal: { min: 20, max: 24 }
    },
    opacity: 0.7,
    showLabels: true,
    animateTransitions: true
  });

  // Estado para mostrar estadísticas detalladas
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  // Actualizar configuración cuando cambie el hook
  useEffect(() => {
    if (heatMapHook.isInitialized) {
      // Aquí podrías obtener la configuración actual si el hook la expusiera
    }
  }, [heatMapHook.isInitialized]);

  // Aplicar configuración
  const applyConfig = () => {
    heatMapHook.configure(tempConfig);
    console.log('🔧 Configuración aplicada al mapa de calor');
  };

  // Obtener color de estado según la calidad
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-orange-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Obtener icono de estado según la calidad
  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'good': return <CheckCircle size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'critical': return <AlertTriangle size={16} />;
      case 'error': return <XCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed top-4 ${position}-4 z-50 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Thermometer className="text-red-400" size={20} />
          <h3 className="text-white font-medium">Mapa de Calor 3D</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Estado general */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${heatMapHook.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className="text-sm text-gray-300">
              {heatMapHook.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <button
            onClick={heatMapHook.toggle}
            disabled={!heatMapHook.isInitialized}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              heatMapHook.isActive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed'
            }`}
          >
            {heatMapHook.isActive ? (
              <>
                <EyeOff size={14} className="inline mr-1" />
                Desactivar
              </>
            ) : (
              <>
                <Eye size={14} className="inline mr-1" />
                Activar
              </>
            )}
          </button>
        </div>

        {/* Error state */}
        {heatMapHook.error && (
          <div className="bg-red-900/50 border border-red-600 rounded p-2 mb-3">
            <div className="flex items-center space-x-2">
              <XCircle size={16} className="text-red-400" />
              <span className="text-red-200 text-sm">{heatMapHook.error}</span>
            </div>
          </div>
        )}

        {/* Estadísticas básicas */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-400">Espacios con datos</div>
            <div className="text-white font-medium">{heatMapHook.dataCount}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-400">Sensores mapeados</div>
            <div className="text-white font-medium">{heatMapHook.mappings.length}</div>
          </div>
        </div>
      </div>

      {/* Datos actuales */}
      {heatMapHook.currentData.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">Datos Actuales</h4>
            <button
              onClick={() => setShowDetailedStats(!showDetailedStats)}
              className="text-gray-400 hover:text-white"
            >
              {showDetailedStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {heatMapHook.currentData.slice(0, showDetailedStats ? undefined : 3).map((data, index) => (
              <div key={data.spaceGuid} className="bg-gray-800/50 rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {data.spaceName}
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-blue-300 text-xs">
                        🌡️ {data.temperature.toFixed(1)}°C
                      </span>
                      {data.humidity && (
                        <span className="text-cyan-300 text-xs">
                          💧 {data.humidity.toFixed(0)}%
                        </span>
                      )}
                      {data.occupancy && (
                        <span className="text-purple-300 text-xs">
                          👥 {data.occupancy}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 ${getQualityColor(data.quality)}`}>
                    {getQualityIcon(data.quality)}
                    <span className="text-xs uppercase">{data.quality}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!showDetailedStats && heatMapHook.currentData.length > 3 && (
            <div className="text-center mt-2">
              <button
                onClick={() => setShowDetailedStats(true)}
                className="text-gray-400 hover:text-white text-xs"
              >
                Ver {heatMapHook.currentData.length - 3} más...
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controles */}
      <div className="p-4 border-b border-gray-700">
        <div className="space-y-2">
          <button
            onClick={heatMapHook.refreshData}
            disabled={!heatMapHook.isInitialized}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors"
          >
            <RefreshCw size={14} />
            <span>Actualizar Datos</span>
          </button>

          <button
            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
            className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm transition-colors"
          >
            <Settings size={14} />
            <span>Configuración</span>
            {isConfigExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Panel de configuración */}
      {isConfigExpanded && (
        <div className="p-4 border-b border-gray-700 bg-gray-800/30">
          <h5 className="text-white font-medium mb-3 flex items-center">
            <Sliders size={16} className="mr-2" />
            Configuración Avanzada
          </h5>

          <div className="space-y-4">
            {/* Rango de temperatura */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Rango de Temperatura (°C)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Mínima</label>
                  <input
                    type="number"
                    value={tempConfig.temperatureRange?.min || 18}
                    onChange={(e) => setTempConfig(prev => ({
                      ...prev,
                      temperatureRange: {
                        ...prev.temperatureRange!,
                        min: parseFloat(e.target.value)
                      }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Máxima</label>
                  <input
                    type="number"
                    value={tempConfig.temperatureRange?.max || 28}
                    onChange={(e) => setTempConfig(prev => ({
                      ...prev,
                      temperatureRange: {
                        ...prev.temperatureRange!,
                        max: parseFloat(e.target.value)
                      }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Rango óptimo */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Rango Óptimo (°C)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Mín. Óptima</label>
                  <input
                    type="number"
                    value={tempConfig.temperatureRange?.optimal?.min || 20}
                    onChange={(e) => setTempConfig(prev => ({
                      ...prev,
                      temperatureRange: {
                        ...prev.temperatureRange!,
                        optimal: {
                          ...prev.temperatureRange!.optimal!,
                          min: parseFloat(e.target.value)
                        }
                      }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Máx. Óptima</label>
                  <input
                    type="number"
                    value={tempConfig.temperatureRange?.optimal?.max || 24}
                    onChange={(e) => setTempConfig(prev => ({
                      ...prev,
                      temperatureRange: {
                        ...prev.temperatureRange!,
                        optimal: {
                          ...prev.temperatureRange!.optimal!,
                          max: parseFloat(e.target.value)
                        }
                      }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Opacidad */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Opacidad: {Math.round((tempConfig.opacity || 0.7) * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={tempConfig.opacity || 0.7}
                onChange={(e) => setTempConfig(prev => ({
                  ...prev,
                  opacity: parseFloat(e.target.value)
                }))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Opciones adicionales */}
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tempConfig.showLabels || false}
                  onChange={(e) => setTempConfig(prev => ({
                    ...prev,
                    showLabels: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-gray-300 text-sm">Mostrar etiquetas</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tempConfig.animateTransitions || false}
                  onChange={(e) => setTempConfig(prev => ({
                    ...prev,
                    animateTransitions: e.target.checked
                  }))}
                  className="rounded"
                />
                <span className="text-gray-300 text-sm">Animaciones suaves</span>
              </label>
            </div>

            {/* Botón aplicar */}
            <button
              onClick={applyConfig}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-3 rounded text-sm transition-colors"
            >
              Aplicar Configuración
            </button>
          </div>
        </div>
      )}

      {/* Estadísticas del sistema */}
      {Object.keys(heatMapHook.stats).length > 0 && (
        <div className="p-4">
          <h5 className="text-white font-medium mb-2 flex items-center">
            <BarChart3 size={16} className="mr-2" />
            Estadísticas del Sistema
          </h5>
          <div className="space-y-1 text-xs text-gray-400">
            <div>Espacios totales: {heatMapHook.stats.spacesAvailable || 0}</div>
            <div>Espacios con sensores: {heatMapHook.stats.spacesWithSensors || 0}</div>
            <div>Sensores con lecturas: {heatMapHook.stats.sensorsWithReadings || 0}</div>
            <div>Tasa de integración: {heatMapHook.stats.integrationRate || '0%'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatMapControlPanel;