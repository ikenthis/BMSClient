import React from 'react';
import { Search, CheckCircle, CircleOff } from 'lucide-react';
import { CategoryService } from '../services/CategoryService';

interface VisibilityPanelProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  modelCategories: string[];
  categoriesVisibility: Record<string, boolean>;
  isLoading: boolean;
  errorMessage: string | null;
  models: any[];
  onToggleCategoryVisibility: (category: string) => void;
  onShowAllCategories: () => void;
  onHideAllCategories: () => void;
}

export const VisibilityPanel: React.FC<VisibilityPanelProps> = ({
  searchTerm,
  setSearchTerm,
  modelCategories,
  categoriesVisibility,
  isLoading,
  errorMessage,
  models,
  onToggleCategoryVisibility,
  onShowAllCategories,
  onHideAllCategories
}) => {
  const filteredCategories = searchTerm
    ? modelCategories.filter(category => 
        category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        CategoryService.getCategoryDisplayName(category).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : modelCategories;

  return (
    <div className="visibility-panel">
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Buscar categorías..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading}
        />
        <Search size={16} className="search-icon" />
      </div>
      
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}
      
      <div className="visibility-options">
        {isLoading && filteredCategories.length === 0 && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Cargando categorías...</span>
          </div>
        )}
        
        {!isLoading && filteredCategories.length === 0 && (
          <div className="empty-message">
            {models.length === 0 
              ? "No hay modelos cargados. Cargue un modelo para ver categorías."
              : modelCategories.length === 0
                ? "No se encontraron categorías en los modelos cargados."
                : "No se encontraron categorías con ese término de búsqueda."}
          </div>
        )}
        
        {filteredCategories.map((category) => (
          <div key={category} className="visibility-option">
            <input 
              type="checkbox" 
              id={`vis-${category}`} 
              checked={categoriesVisibility[category] ?? true}
              onChange={() => onToggleCategoryVisibility(category)}
              disabled={isLoading}
            />
            <label htmlFor={`vis-${category}`} title={category}>
              {CategoryService.getCategoryDisplayName(category)}
            </label>
          </div>
        ))}
      </div>
      
      <div className="panel-actions">
        <button 
          className="panel-action-button"
          onClick={onShowAllCategories}
          disabled={isLoading || modelCategories.length === 0}
        >
          <CheckCircle size={14} />
          Mostrar Todo
        </button>
        <button 
          className="panel-action-button secondary"
          onClick={onHideAllCategories}
          disabled={isLoading || modelCategories.length === 0}
        >
          <CircleOff size={14} />
          Ocultar Todo
        </button>
      </div>
    </div>
  );
};