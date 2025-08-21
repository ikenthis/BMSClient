// HeatMapHoverSystem.tsx - Sistema completo de hover para HeatMap
import React from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { useHeatMapHover } from './hooks/useHeatMapHover';
import HeatMapHoverPanel from './HeatMapHover';

interface HeatMapHoverSystemProps {
  world: OBC.World | null;
  fragments: FRAGS.FragmentsModels | null;
  isHeatMapActive: boolean;
  useTestData?: boolean;
  className?: string;
  // Props opcionales para configuración
  panelClassName?: string;
  enableDebugLog?: boolean;
}

const HeatMapHoverSystem: React.FC<HeatMapHoverSystemProps> = ({
  world,
  fragments,
  isHeatMapActive,
  useTestData = false,
  className = '',
  panelClassName = '',
  enableDebugLog = false
}) => {
  
  // Hook principal que maneja toda la lógica
  const hoverState = useHeatMapHover({
    world,
    fragments,
    isHeatMapActive,
    useTestData
  });

  // Log de debug si está habilitado
  React.useEffect(() => {
    if (enableDebugLog) {
      console.log('🐛 HeatMapHoverSystem Debug:', {
        isHeatMapActive,
        isHovering: hoverState.isHovering,
        hoveredSpace: hoverState.hoveredSpace?.spaceName,
        hasData: !!hoverState.spaceData,
        isLoading: hoverState.isLoadingData,
        error: hoverState.error,
        spacesCount: hoverState.spacesCount,
        useTestData
      });
    }
  }, [
    enableDebugLog,
    isHeatMapActive,
    hoverState.isHovering,
    hoverState.hoveredSpace,
    hoverState.spaceData,
    hoverState.isLoadingData,
    hoverState.error,
    hoverState.spacesCount,
    useTestData
  ]);

  // Renderizar el panel flotante solo si está activo el HeatMap
  if (!isHeatMapActive) {
    return null;
  }

  return (
    <div className={`heatmap-hover-system ${className}`}>
      {/* Panel flotante con datos de sensores */}
      <HeatMapHoverPanel
        isVisible={hoverState.isHovering}
        position={hoverState.mousePosition}
        spaceData={hoverState.spaceData}
        isLoading={hoverState.isLoadingData}
        className={panelClassName}
      />
      
      {/* Indicador de estado en desarrollo (solo si enableDebugLog) */}
      {enableDebugLog && process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 z-50 bg-black/80 text-white p-2 rounded text-xs font-mono">
          <div>🖱️ HeatMap Hover System</div>
          <div>Active: {isHeatMapActive ? '✅' : '❌'}</div>
          <div>Hovering: {hoverState.isHovering ? '✅' : '❌'}</div>
          <div>Test Data: {useTestData ? '🧪' : '🌐'}</div>
          <div>Spaces: {hoverState.spacesCount}</div>
          <div>Cache: {hoverState.cacheStats.size} items</div>
          {hoverState.error && <div className="text-red-400">❌ {hoverState.error}</div>}
          {hoverState.hoveredSpace && (
            <div className="text-green-400">
              📍 {hoverState.hoveredSpace.spaceName}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeatMapHoverSystem;