//ElementVisibilityManager.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import * as FRAGS from '@thatopen/fragments';
import { ExtendedFragmentsModel} from '../types'

interface ElementVisibilityManagerProps {
  models: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsModels | null;
  onVisibilityChange?: (category: string, isVisible: boolean) => void;
}

// Lista de categorías IFC estándar
const IFC_CATEGORIES = [
  "IFCWALL", "IFCSLAB", "IFCBEAM", "IFCCOLUMN", "IFCDOOR", "IFCWINDOW", 
  "IFCROOF", "IFCSTAIR", "IFCRAILING", "IFCFURNISHINGELEMENT", "IFCCURTAINWALL",
  "IFCPLATE", "IFCMEMBER", "IFCBUILDINGELEMENTPROXY", "IFCFLOWFITTING", 
  "IFCFLOWSEGMENT", "IFCFLOWTERMINAL", "IFCBUILDING", "IFCSPACE", "IFCSITE",
  "IFCPROJECT", "IFCBUILDINGSTOREY", "IFCFOOTING", "IFCPILE", "IFCCOVERING", "IFCSensor"
];

// Conversión de nombres técnicos a nombres legibles
const CATEGORY_DISPLAY_NAMES: { [key: string]: string } = {
  "IFCWALL": "Muros",
  "IFCSLAB": "Suelos/Losas",
  "IFCBEAM": "Vigas",
  "IFCCOLUMN": "Columnas/Pilares",
  "IFCDOOR": "Puertas",
  "IFCWINDOW": "Ventanas",
  "IFCROOF": "Techos",
  "IFCSTAIR": "Escaleras",
  "IFCRAILING": "Barandillas",
  "IFCFURNISHINGELEMENT": "Mobiliario",
  "IFCCURTAINWALL": "Muros Cortina",
  "IFCPLATE": "Placas",
  "IFCMEMBER": "Elementos Estructurales",
  "IFCBUILDINGELEMENTPROXY": "Elementos Genéricos",
  "IFCFLOWFITTING": "Conexiones MEP",
  "IFCFLOWSEGMENT": "Conductos/Tuberías",
  "IFCFLOWTERMINAL": "Terminales MEP",
  "IFCBUILDING": "Edificio",
  "IFCSPACE": "Espacios",
  "IFCSITE": "Terreno",
  "IFCPROJECT": "Proyecto",
  "IFCBUILDINGSTOREY": "Plantas",
  "IFCFOOTING": "Cimentaciones",
  "IFCPILE": "Pilotes",
  "IFCCOVERING": "Revestimientos"
};

const ElementVisibilityManager: React.FC<ElementVisibilityManagerProps> = ({ 
  models = [],
  fragments = null,
  onVisibilityChange 
}) => {
  const [modelCategories, setModelCategories] = useState<string[]>([]);
  const [categoriesVisibility, setCategoriesVisibility] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener todas las categorías existentes en los modelos cargados
  const loadModelCategories = useCallback(async () => {
    if (!models || !Array.isArray(models) || models.length === 0) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const allCategories = new Set<string>();
      
      // Recopilar categorías de todos los modelos
      for (const model of models) {
        if (!model) continue;
        
        try {
          const categories = await model.getCategories();
          if (Array.isArray(categories)) {
            categories.forEach(category => {
              if (category) allCategories.add(category);
            });
          }
        } catch (error) {
          console.warn(`Error al obtener categorías del modelo ${model.id || 'desconocido'}:`, error);
        }
      }
      
      // Ordenar alfabéticamente
      const sortedCategories = Array.from(allCategories).sort();
      setModelCategories(sortedCategories);
      
      // Inicializar el estado de visibilidad (todas visibles por defecto)
      const initialVisibility: Record<string, boolean> = {};
      sortedCategories.forEach(category => {
        initialVisibility[category] = true;
      });
      
      setCategoriesVisibility(initialVisibility);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    } finally {
      setIsLoading(false);
    }
  }, [models]);

  // Cargar categorías cuando cambian los modelos
  useEffect(() => {
    if (models && Array.isArray(models) && models.length > 0) {
      loadModelCategories();
    } else {
      setModelCategories([]);
      setCategoriesVisibility({});
    }
  }, [models, loadModelCategories]);

  // Función para alternar la visibilidad de una categoría
  const toggleCategoryVisibility = async (category: string) => {
    if (!fragments || !category) return;
    
    setIsLoading(true);
    
    try {
      const newVisibility = !categoriesVisibility[category];
      
      // Actualizar todos los modelos
      for (const model of models) {
        try {
          // Obtener elementos de esta categoría
          const items = await model.getItemsOfCategory(category);
          
          // Obtener IDs locales
          const localIds = (await Promise.all(
            items.map(item => item.getLocalId())
          )).filter(id => id !== null) as number[];
          
          if (localIds.length > 0) {
            // Establecer visibilidad
            await model.setVisible(localIds, newVisibility);
          }
        } catch (error) {
          console.warn(`Error al actualizar visibilidad para ${category} en modelo ${model.id}:`, error);
        }
      }
      
      // Actualizar el estado de los fragmentos para refrescar la vista
      await fragments.update(true);
      
      // Actualizar estado local
      setCategoriesVisibility(prev => ({
        ...prev,
        [category]: newVisibility
      }));
      
      // Notificar al componente padre si es necesario
      if (onVisibilityChange) {
        onVisibilityChange(category, newVisibility);
      }
    } catch (error) {
      console.error(`Error al cambiar visibilidad de ${category}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar todas las categorías
  const showAllCategories = async () => {
    if (!fragments || modelCategories.length === 0) return;
    
    setIsLoading(true);
    
    try {
      for (const category of modelCategories) {
        for (const model of models) {
          try {
            const items = await model.getItemsOfCategory(category);
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.setVisible(localIds, true);
            }
          } catch (error) {
            console.warn(`Error al mostrar ${category} en modelo ${model.id}:`, error);
          }
        }
      }
      
      // Actualizar estado
      const updatedVisibility: Record<string, boolean> = {};
      modelCategories.forEach(category => {
        updatedVisibility[category] = true;
      });
      
      setCategoriesVisibility(updatedVisibility);
      await fragments.update(true);
    } catch (error) {
      console.error("Error al mostrar todas las categorías:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Ocultar todas las categorías
  const hideAllCategories = async () => {
    if (!fragments || modelCategories.length === 0) return;
    
    setIsLoading(true);
    
    try {
      for (const category of modelCategories) {
        for (const model of models) {
          try {
            const items = await model.getItemsOfCategory(category);
            const localIds = (await Promise.all(
              items.map(item => item.getLocalId())
            )).filter(id => id !== null) as number[];
            
            if (localIds.length > 0) {
              await model.setVisible(localIds, false);
            }
          } catch (error) {
            console.warn(`Error al ocultar ${category} en modelo ${model.id}:`, error);
          }
        }
      }
      
      // Actualizar estado
      const updatedVisibility: Record<string, boolean> = {};
      modelCategories.forEach(category => {
        updatedVisibility[category] = false;
      });
      
      setCategoriesVisibility(updatedVisibility);
      await fragments.update(true);
    } catch (error) {
      console.error("Error al ocultar todas las categorías:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtener el nombre legible de una categoría
  const getCategoryDisplayName = (category: string): string => {
    return CATEGORY_DISPLAY_NAMES[category] || category;
  };

  // Filtrar categorías por término de búsqueda
  const filteredCategories = searchTerm
    ? modelCategories.filter(category => 
        category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryDisplayName(category).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : modelCategories;

  return (
    <div className="element-visibility-manager">
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Procesando...</span>
        </div>
      )}
      
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Buscar categorías..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="search-icon"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      
      <div className="visibility-options">
        {filteredCategories.map((category) => (
          <div key={category} className="visibility-option">
            <input 
              type="checkbox" 
              id={`vis-${category}`} 
              checked={categoriesVisibility[category] ?? true}
              onChange={() => toggleCategoryVisibility(category)}
              disabled={isLoading}
            />
            <label htmlFor={`vis-${category}`}>
              {getCategoryDisplayName(category)}
              <span className="category-code">{category}</span>
            </label>
          </div>
        ))}
        
        {filteredCategories.length === 0 && !isLoading && (
          <div className="no-categories">
            {modelCategories.length === 0 
              ? "No hay categorías disponibles. Cargue un modelo primero." 
              : "No se encontraron categorías con ese término de búsqueda."}
          </div>
        )}
      </div>
      
      <div className="panel-actions">
        <button 
          className="panel-action-button"
          onClick={showAllCategories}
          disabled={isLoading || modelCategories.length === 0}
        >
          Mostrar Todo
        </button>
        <button 
          className="panel-action-button secondary"
          onClick={hideAllCategories}
          disabled={isLoading || modelCategories.length === 0}
        >
          Ocultar Todo
        </button>
      </div>
    </div>
  );
};

export default ElementVisibilityManager;