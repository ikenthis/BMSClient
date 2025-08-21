import React from 'react';
import { Plus, Layers, Eye, Move3d, Focus, Cuboid, Building2  } from 'lucide-react';

interface ToolbarButtonsProps {
  activePanel: string | null;
  onTogglePanel: (panelId: string) => void;
  onCenterModel: () => void;
  onToggleIsolation: () => void;
  isIsolationActive: boolean;
  // NUEVAS PROPS PARA FLOORPLANS
  onToggleFloorPlans?: () => void;
  isFloorPlansActive?: boolean;
}

export const ToolbarButtons: React.FC<ToolbarButtonsProps> = ({
  activePanel,
  onTogglePanel,
  onCenterModel,
  onToggleIsolation,
  isIsolationActive,
  onToggleFloorPlans,
  isFloorPlansActive = false
}) => {
  return (
    <div className="toolbar-buttons">
      <button 
        className={`toolbar-button ${activePanel === 'add' ? 'active' : ''}`}
        onClick={() => onTogglePanel('add')} 
        aria-label="Añadir elementos"
      >
        <Plus size={20} />
        <span className="tooltip">Añadir</span>
      </button>
      
      <button 
        className={`toolbar-button ${activePanel === 'layers' ? 'active' : ''}`}
        onClick={() => onTogglePanel('layers')} 
        aria-label="Capas y filtros"
      >
        <Layers size={20} />
        <span className="tooltip">Capas</span>
      </button>
      
      <button 
        className={`toolbar-button ${activePanel === 'visibility' ? 'active' : ''}`}
        onClick={() => onTogglePanel('visibility')} 
        aria-label="Visibilidad"
      >
        <Eye size={20} />
        <span className="tooltip">Visibilidad</span>
      </button>

      {/* NUEVO BOTÓN PARA FLOORPLANS */}
      <button 
        className={`toolbar-button ${activePanel === 'floorplans' ? 'active' : ''} ${isFloorPlansActive ? 'floorplans-active' : ''}`}
        onClick={() => onTogglePanel('floorplans')} 
        aria-label="Planos de Planta 2D"
      >
        <Building2  size={20} />
        <span className="tooltip">FloorPlans 2D</span>
      </button>
      
      <button 
        className="toolbar-button"
        onClick={onCenterModel}
        aria-label="Centrar modelo"
      >
        <Move3d size={20} />
        <span className="tooltip">Centrar modelo</span>
      </button>
      
      <button 
        className={`toolbar-button ${isIsolationActive ? 'active' : ''}`}
        onClick={onToggleIsolation}
        aria-label="Aislar elementos"
      >
        <Focus size={20} />
        <span className="tooltip">Aislar</span>
      </button>
      
      <button 
        className={`toolbar-button ${activePanel === 'geometry' ? 'active' : ''}`}
        onClick={() => onTogglePanel('geometry')}
        aria-label="Geometrías 3D"
      >
        <Cuboid size={20} />
        <span className="tooltip">Geometrías 3D</span>
      </button>
    </div>
  );
};