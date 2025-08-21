import React from 'react';
import { CuboidIcon, Trash2 } from 'lucide-react';

interface GeometryPanelProps {
  hasRandomGeometries: boolean;
  isLoading: boolean;
  onCreateRandomGeometry: () => void;
  onRemoveRandomGeometries: () => void;
  onClearCollectionGeometries?: () => void;
}

export const GeometryPanel: React.FC<GeometryPanelProps> = ({
  hasRandomGeometries,
  isLoading,
  onCreateRandomGeometry,
  onRemoveRandomGeometries,
  onClearCollectionGeometries
}) => {
  return (
    <div className="geometry-panel">
      <div className="panel-description">
        <p>Cree y administre geometrías 3D aleatorias en la escena.</p>
      </div>
      
      <div className="geometry-controls">
        <div className="geometry-action">
          <button 
            className="panel-action-button primary-button"
            onClick={onCreateRandomGeometry}
            disabled={isLoading}
          >
            <CuboidIcon size={18} />
            <span>Crear Geometrías Aleatorias</span>
          </button>
          <p className="action-description">
            Genera formas 3D aleatorias como cubos, esferas, conos y cilindros con colores aleatorios.
          </p>
        </div>
        
        <div className="geometry-action">
          <button 
            className="panel-action-button secondary-button"
            onClick={onRemoveRandomGeometries}
            disabled={isLoading || !hasRandomGeometries}
          >
            <Trash2 size={18} />
            <span>Eliminar Geometrías</span>
          </button>
          <p className="action-description">
            Elimina todas las geometrías aleatorias de la escena.
          </p>
        </div>

        {onClearCollectionGeometries && (
          <div className="geometry-action">
            <button 
              className="panel-action-button warning-button"
              onClick={onClearCollectionGeometries}
            >
              <Trash2 size={18} color="#ff6b6b" />
              <span>Limpiar Geometrías de Colección</span>
            </button>
            <p className="action-description">
              Elimina todas las geometrías de colección que pueden haber quedado huérfanas.
            </p>
          </div>
        )}
      </div>
      
      <div className="geometry-info">
        <h4>Estado actual</h4>
        <p>
          {hasRandomGeometries 
            ? "✅ Hay geometrías aleatorias en la escena."
            : "❌ No hay geometrías aleatorias en la escena."}
        </p>
        
        <h4>Tipos disponibles</h4>
        <div className="geometry-types">
          <div className="geometry-type">
            <div className="geometry-icon">📦</div>
            <span>Cubo</span>
          </div>
          <div className="geometry-type">
            <div className="geometry-icon">🔮</div>
            <span>Esfera</span>
          </div>
          <div className="geometry-type">
            <div className="geometry-icon">🔺</div>
            <span>Cono</span>
          </div>
          <div className="geometry-type">
            <div className="geometry-icon">🧪</div>
            <span>Cilindro</span>
          </div>
          <div className="geometry-type">
            <div className="geometry-icon">🍩</div>
            <span>Toro</span>
          </div>
          <div className="geometry-type">
            <div className="geometry-icon">💎</div>
            <span>Tetraedro</span>
          </div>
        </div>
      </div>
    </div>
  );
};