// src/components/ViewerPanels/SensorsPanel/components/SensorControls.tsx
import React, { useState } from 'react';
import { sensorPanelStyles } from '../SensorPanelStyles';
import { Sensor } from '../../../services/sensorApiService';
import { MockSensorData } from '../../../utils/mockSensorData';

interface SensorControlsProps {
  sensor: Sensor | MockSensorData;
  isProcessing?: boolean;
  onControl: (sensorId: string, action: 'start' | 'stop' | 'reset' | 'update') => void;
  size?: 'small' | 'normal' | 'large';
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
}

const SensorControls: React.FC<SensorControlsProps> = ({
  sensor,
  isProcessing = false,
  onControl,
  size = 'normal',
  orientation = 'vertical',
  showLabels = true
}) => {
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  
  const isRealSensor = !sensor.sensorId.includes('MOCK');
  const hasError = sensor.status === 'error' || (sensor as any).memoryStatus?.hasError;

  // Configuración de estilos según el tamaño
  const sizeClasses = {
    small: `${sensorPanelStyles.buttons.small} text-xs`,
    normal: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const containerClasses = orientation === 'horizontal' 
    ? 'flex space-x-1' 
    : 'flex flex-col space-y-1';

  const handleAction = (action: 'start' | 'stop' | 'reset' | 'update', requiresConfirm = false) => {
    if (requiresConfirm && showConfirm !== action) {
      setShowConfirm(action);
      setTimeout(() => setShowConfirm(null), 3000); // Auto-cancelar después de 3s
      return;
    }

    setShowConfirm(null);
    onControl(sensor.sensorId, action);
  };

  const getButtonClass = (baseClass: string) => {
    return `${baseClass} ${sizeClasses[size]} ${
      isProcessing ? sensorPanelStyles.buttons.disabled : ''
    } transition-all duration-200`;
  };

  // Controles para sensores reales
  if (isRealSensor) {
    return (
      <div className={containerClasses}>
        {hasError ? (
          // Botón de reinicio cuando hay error
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('reset', true);
            }}
            className={getButtonClass(sensorPanelStyles.buttons.success)}
            disabled={isProcessing}
            title="Reiniciar sensor con error"
          >
            {showConfirm === 'reset' ? (
              showLabels ? '¿Confirmar?' : '❓'
            ) : (
              showLabels ? '🔄 Reiniciar' : '🔄'
            )}
          </button>
        ) : sensor.status === 'inactive' ? (
          // Botón de inicio cuando está inactivo
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('start');
            }}
            className={getButtonClass(sensorPanelStyles.buttons.success)}
            disabled={isProcessing}
            title="Iniciar sensor"
          >
            {showLabels ? '▶️ Iniciar' : '▶️'}
          </button>
        ) : sensor.status === 'active' ? (
          // Controles cuando está activo
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction('stop', true);
              }}
              className={getButtonClass(sensorPanelStyles.buttons.danger)}
              disabled={isProcessing}
              title="Detener sensor"
            >
              {showConfirm === 'stop' ? (
                showLabels ? '¿Detener?' : '❓'
              ) : (
                showLabels ? '⏹️ Detener' : '⏹️'
              )}
            </button>
            
            {size !== 'small' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('reset', true);
                }}
                className={getButtonClass(sensorPanelStyles.buttons.warning)}
                disabled={isProcessing}
                title="Reiniciar sensor"
              >
                {showConfirm === 'reset' ? (
                  showLabels ? '¿Reiniciar?' : '❓'
                ) : (
                  showLabels ? '🔄 Reset' : '🔄'
                )}
              </button>
            )}
          </>
        ) : (
          // Estado desconocido - mostrar reset
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('reset', true);
            }}
            className={getButtonClass(sensorPanelStyles.buttons.secondary)}
            disabled={isProcessing}
            title="Reiniciar sensor"
          >
            {showLabels ? '🔄 Reset' : '🔄'}
          </button>
        )}

        {/* Botón de diagnóstico adicional para sensores reales */}
        {size === 'large' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Aquí podrías agregar lógica para diagnóstico
              console.log(`Diagnóstico solicitado para ${sensor.sensorId}`);
            }}
            className={getButtonClass(sensorPanelStyles.buttons.secondary)}
            disabled={isProcessing}
            title="Ejecutar diagnóstico"
          >
            {showLabels ? '🩺 Diagnóstico' : '🩺'}
          </button>
        )}
      </div>
    );
  }

  // Controles para sensores ficticios
  return (
    <div className={containerClasses}>
      {hasError ? (
        // Reiniciar sensor ficticio con error
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAction('reset');
          }}
          className={getButtonClass(sensorPanelStyles.buttons.success)}
          disabled={isProcessing}
          title="Reiniciar sensor ficticio"
        >
          {showLabels ? '🔄 Reiniciar' : '🔄'}
        </button>
      ) : (
        // Controles normales para sensores ficticios
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('update');
            }}
            className={getButtonClass(sensorPanelStyles.buttons.secondary)}
            disabled={isProcessing}
            title="Actualizar valor del sensor ficticio"
          >
            {showLabels ? '🎲 Actualizar' : '🎲'}
          </button>

          {size !== 'small' && (
            <>
              {/* Toggle estado activo/inactivo */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const action = sensor.status === 'active' ? 'stop' : 'start';
                  handleAction(action);
                }}
                className={getButtonClass(
                  sensor.status === 'active' 
                    ? sensorPanelStyles.buttons.warning 
                    : sensorPanelStyles.buttons.success
                )}
                disabled={isProcessing}
                title={`${sensor.status === 'active' ? 'Desactivar' : 'Activar'} sensor ficticio`}
              >
                {sensor.status === 'active' ? (
                  showLabels ? '⏸️ Pausar' : '⏸️'
                ) : (
                  showLabels ? '▶️ Activar' : '▶️'
                )}
              </button>

              {/* Simular error */}
              {size === 'large' && sensor.status === 'active' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Simular error en sensor ficticio
                    console.log(`Simulando error en ${sensor.sensorId}`);
                    // Esta lógica debería estar en el componente padre
                  }}
                  className={getButtonClass(sensorPanelStyles.buttons.danger)}
                  disabled={isProcessing}
                  title="Simular error en sensor ficticio"
                >
                  {showLabels ? '⚠️ Simular Error' : '⚠️'}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SensorControls;