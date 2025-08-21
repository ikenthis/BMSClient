// src/components/ViewerPanels/SensorsPanel/SensorsPanelMain.tsx
import React, { useState, useEffect } from 'react';
import { 
  sensorPanelStyles, 
  customScrollbarCSS 
} from './SensorPanelStyles';
import RealSensorsComponent from './RealSensorsComponent';
import MockSensorsComponent from './MockSensorComponent'; // Cambio: sin "Component" extra
import SensorDetailPanel from './SensorDetailPanel';
import DashboardView from './DashboardView';
import { Sensor, SystemStatus } from '../../services/sensorApiService';
import { MockSensorData } from '../../utils/mockSensorData';

interface SensorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpace?: any;
}

const SensorsPanelMain: React.FC<SensorsPanelProps> = ({ isOpen, onClose, selectedSpace }) => {
  // Estados principales
  const [realSensors, setRealSensors] = useState<Sensor[]>([]);
  const [mockSensors, setMockSensors] = useState<MockSensorData[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<any | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Función para obtener fuente de datos
  const getDataSource = () => {
    const realCount = realSensors.length;
    const mockCount = mockSensors.length;
    
    if (realCount > 0 && mockCount > 0) {
      return `🟡 MIXTOS (${realCount} Reales + ${mockCount} Ficticios)`;
    } else if (realCount > 0) {
      return '🟢 DATOS REALES (API + WebSocket)';
    } else if (mockCount > 0) {
      return '🔵 DATOS FICTICIOS (Demo)';
    } else {
      return '🔴 SIN DATOS';
    }
  };

  // Calcular estado del sistema combinado
  const getCombinedSystemStatus = () => {
    if (!systemStatus) return null;
    
    const totalSensors = realSensors.length + mockSensors.length;
    const activeSensors = realSensors.filter(s => s.status === 'active').length + 
                         mockSensors.filter(s => s.status === 'active').length;
    
    return {
      ...systemStatus,
      sensors: {
        ...systemStatus.sensors,
        total: totalSensors,
        active: activeSensors
      }
    };
  };

  const combinedSystemStatus = getCombinedSystemStatus();

  if (!isOpen) return null;

  return (
    <div className={sensorPanelStyles.container} style={{ zIndex: 9999 }}>
      {/* Header fijo */}
      <div className={sensorPanelStyles.header.main}>
        <div className={sensorPanelStyles.header.info}>
          <h2 className={sensorPanelStyles.header.title}>Sistema de Sensores IoT</h2>
          
          {/* Indicador de fuente de datos */}
          <div className="bg-gray-800 px-3 py-1 rounded-lg">
            <span className="text-sm font-medium">{getDataSource()}</span>
          </div>
          
          {combinedSystemStatus && (
            <div className={sensorPanelStyles.header.systemInfo}>
              <span className={sensorPanelStyles.text.label}>Sistema:</span>
              <span className={combinedSystemStatus.system?.isRunning ? sensorPanelStyles.text.systemActive : sensorPanelStyles.text.systemInactive}>
                {combinedSystemStatus.system?.isRunning ? 'Activo' : 'Inactivo'}
              </span>
              <span className={`${sensorPanelStyles.text.label} ml-2`}>Sensores activos:</span>
              <span className={sensorPanelStyles.text.activeCount}>{combinedSystemStatus.sensors?.active || 0}</span>
              <span className={`ml-2 ${wsConnected ? sensorPanelStyles.text.wsConnected : sensorPanelStyles.text.wsDisconnected}`}>
                {wsConnected ? '🔌 WebSocket Conectado' : '⚠️ WebSocket Desconectado'}
              </span>
            </div>
          )}
        </div>
        
        <div className={sensorPanelStyles.header.controls}>
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={sensorPanelStyles.buttons.purple}
          >
            {showDashboard ? 'Vista Lista' : 'Dashboard'}
          </button>
          <button 
            onClick={onClose} 
            className={sensorPanelStyles.header.closeButton}
          >
            ×
          </button>
        </div>
      </div>

      {/* Mensajes de estado */}
      {(error || successMessage) && (
        <div className={sensorPanelStyles.messages.container}>
          {error && (
            <div className={sensorPanelStyles.messages.error}>
              ❌ {error}
            </div>
          )}
          {successMessage && (
            <div className={sensorPanelStyles.messages.success}>
              ✅ {successMessage}
            </div>
          )}
        </div>
      )}

      {/* Contenido principal */}
      <div className={sensorPanelStyles.content.main}>
        {showDashboard ? (
          /* Vista Dashboard */
          <DashboardView 
            realSensors={realSensors}
            mockSensors={mockSensors}
            onSensorSelect={(sensor) => {
              setSelectedSensor(sensor);
              setShowDashboard(false);
            }}
          />
        ) : (
          /* Vista de lista con paneles separados */
          <div className={sensorPanelStyles.content.split}>
            {/* Panel izquierdo - Lista de sensores */}
            <div className={sensorPanelStyles.leftPanel.container}>
              {/* Header con estadísticas */}
              <div className={sensorPanelStyles.leftPanel.header}>
                <h3 className={sensorPanelStyles.leftPanel.title}>
                  Sensores ({realSensors.length + mockSensors.length})
                </h3>
                
                {/* Estadísticas separadas */}
                <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                  <div className={sensorPanelStyles.stats.item}>
                    <span className={sensorPanelStyles.text.label}>Total:</span>
                    <span className="ml-2 font-bold">{realSensors.length + mockSensors.length}</span>
                  </div>
                  <div className={sensorPanelStyles.stats.item}>
                    <span className={sensorPanelStyles.text.label}>Reales:</span>
                    <span className={`ml-2 font-bold ${sensorPanelStyles.text.successText}`}>{realSensors.length}</span>
                  </div>
                  <div className={sensorPanelStyles.stats.item}>
                    <span className={sensorPanelStyles.text.label}>Ficticios:</span>
                    <span className="ml-2 font-bold text-blue-400">{mockSensors.length}</span>
                  </div>
                </div>
              </div>

              {/* Lista con scroll */}
              <div className={sensorPanelStyles.leftPanel.list}>
                <div className={sensorPanelStyles.leftPanel.grid}>
                  {/* Sección de Sensores Reales */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-green-400 mb-2 px-2">
                      🟢 Sensores Reales (WebSocket)
                    </h4>
                    <RealSensorsComponent 
                      selectedSpace={selectedSpace}
                      onSensorsChange={setRealSensors}
                      onSystemStatusChange={setSystemStatus}
                      onWebSocketStatusChange={setWsConnected}
                      onSensorSelect={setSelectedSensor}
                      onError={setError}
                      onSuccess={setSuccessMessage}
                      selectedSensor={selectedSensor}
                    />
                  </div>

                  {/* Sección de Sensores Ficticios */}
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-2 px-2">
                      🔵 Sensores Ficticios (Demo)
                    </h4>
                    <MockSensorsComponent 
                      onSensorsChange={setMockSensors}
                      onSensorSelect={setSelectedSensor}
                      onError={setError}
                      onSuccess={setSuccessMessage}
                      selectedSensor={selectedSensor}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel derecho - Detalles del sensor */}
            <div className={sensorPanelStyles.rightPanel.container}>
              <SensorDetailPanel 
                sensor={selectedSensor}
                wsConnected={wsConnected}
                onError={setError}
                onSuccess={setSuccessMessage}
              />
            </div>
          </div>
        )}
      </div>

      {/* CSS personalizado */}
      <style jsx>{`
        ${customScrollbarCSS}
      `}</style>
    </div>
  );
};

export default SensorsPanelMain;