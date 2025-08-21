import React from 'react';
import { Search, Info, CheckCircle, CircleOff } from 'lucide-react';
import { IfcSpecialty, IFC_CATEGORY_SPECIALTIES, SPECIALTY_DISPLAY_NAMES } from '../utils/LayerVisibilityUtils';

interface LayersPanelProps {
  layerSearchTerm: string;
  setLayerSearchTerm: (term: string) => void;
  layersVisibility: Record<IfcSpecialty, boolean>;
  isLoadingLayers: boolean;
  onToggleLayerVisibility: (specialty: IfcSpecialty) => void;
  onShowAllLayers: () => void;
  onHideAllLayers: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layerSearchTerm,
  setLayerSearchTerm,
  layersVisibility,
  isLoadingLayers,
  onToggleLayerVisibility,
  onShowAllLayers,
  onHideAllLayers
}) => {
  const filteredSpecialties = layerSearchTerm
    ? (Object.keys(SPECIALTY_DISPLAY_NAMES) as IfcSpecialty[]).filter(specialty => 
        specialty.toLowerCase().includes(layerSearchTerm.toLowerCase()) ||
        SPECIALTY_DISPLAY_NAMES[specialty].toLowerCase().includes(layerSearchTerm.toLowerCase())
      )
    : (Object.keys(SPECIALTY_DISPLAY_NAMES) as IfcSpecialty[]);

  return (
    <div className="layers-panel">
      <div className="panel-description">
        <p>Seleccione las especialidades que desea visualizar en el modelo.</p>
      </div>
      
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Buscar capas..." 
          value={layerSearchTerm}
          onChange={(e) => setLayerSearchTerm(e.target.value)}
          disabled={isLoadingLayers}
        />
        <Search size={16} className="search-icon" />
      </div>
      
      {isLoadingLayers && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Cargando capas...</span>
        </div>
      )}
      
      <div className="layer-list">
        {filteredSpecialties.map((specialty) => (
          <div className="layer-item" key={specialty}>
            <input 
              type="checkbox" 
              id={`layer-${specialty}`} 
              checked={layersVisibility[specialty]} 
              onChange={() => onToggleLayerVisibility(specialty)}
              disabled={isLoadingLayers}
            />
            <label 
              htmlFor={`layer-${specialty}`} 
              className={layersVisibility[specialty] ? 'active' : ''}
            >
              {SPECIALTY_DISPLAY_NAMES[specialty]}
            </label>
            <div 
              className="layer-badge" 
              title={`Categorías IFC: ${IFC_CATEGORY_SPECIALTIES[specialty].slice(0, 3).join(', ')}...`}
            >
              <Info size={14} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="layer-legend">
        <h4>Categorías IFC incluidas</h4>
        <div className="legend-categories">
          <div className="legend-category">
            <strong>Arquitectura:</strong>
            <span>IFCWALL, IFCDOOR, IFCWINDOW, IFCROOF, IFCSTAIR, IFCRAILING...</span>
          </div>
          <div className="legend-category">
            <strong>Estructura:</strong>
            <span>IFCBEAM, IFCCOLUMN, IFCFOOTING, IFCPLATE, IFCMEMBER...</span>
          </div>
          <div className="legend-category">
            <strong>MEP:</strong>
            <span>IFCFLOWFITTING, IFCFLOWSEGMENT, IFCFLOWTERMINAL...</span>
          </div>
          <div className="legend-category">
            <strong>Terreno:</strong>
            <span>IFCSITE, IFCBUILDINGELEMENTPROXY (parcial)...</span>
          </div>
        </div>
      </div>
      
      <div className="panel-actions">
        <button 
          className="panel-action-button"
          onClick={onShowAllLayers}
          disabled={isLoadingLayers || Object.values(layersVisibility).every(v => v === true)}
        >
          <CheckCircle size={14} />
          Mostrar Todo
        </button>
        <button 
          className="panel-action-button secondary"
          onClick={onHideAllLayers}
          disabled={isLoadingLayers || Object.values(layersVisibility).every(v => v === false)}
        >
          <CircleOff size={14} />
          Ocultar Todo
        </button>
      </div>
    </div>
  );
};