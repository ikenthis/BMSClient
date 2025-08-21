import React from 'react';
import { Gamepad2, BookOpen, Landmark } from 'lucide-react';

export const AddPanel: React.FC = () => {
  return (
    <div>
      <h4 className="panel-subtitle">Elementos básicos</h4>
      <div className="elements-grid">
        <div className="element-item">
          <Gamepad2 size={32} className="element-icon" />
          <span className="element-label">Dispositivo</span>
          <button className="add-element-button">Añadir</button>
        </div>
        <div className="element-item">
          <Landmark size={32} className="element-icon" />
          <span className="element-label">Actividad</span>
          <button className="add-element-button">Añadir</button>
        </div>
        <div className="element-item">
          <Landmark size={32} className="element-icon" />
          <span className="element-label">Escultura</span>
          <button className="add-element-button">Añadir</button>
        </div>
        <div className="element-item">
          <BookOpen size={32} className="element-icon" />
          <span className="element-label">Libro</span>
          <button className="add-element-button">Añadir</button>
        </div>
      </div>

      <h4 className="panel-subtitle">Propiedades del elemento</h4>
      <div className="element-properties-form">
        <div className="form-group">
          <label htmlFor="element-name">Nombre</label>
          <input type="text" id="element-name" placeholder="Nombre del elemento" />
        </div>
        <div className="form-group">
          <label htmlFor="element-position">Posición (x, y, z)</label>
          <div className="position-inputs">
            <input type="number" placeholder="X" step="0.1" />
            <input type="number" placeholder="Y" step="0.1" />
            <input type="number" placeholder="Z" step="0.1" />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="element-rotation">Rotación (grados)</label>
          <input type="number" id="element-rotation" placeholder="0" />
        </div>
        <div className="form-group">
          <label htmlFor="element-scale">Escala</label>
          <input type="number" id="element-scale" placeholder="1.0" step="0.1" />
        </div>
      </div>
    </div>
  );
};