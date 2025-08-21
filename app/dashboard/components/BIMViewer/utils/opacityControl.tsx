"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';

// Material opaco para elementos no seleccionados
const OPAQUE_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0xffffff), // blanco
  opacity: 0.3,
  transparent: true,
  renderedFaces: FRAGS.RenderedFaces.TWO
};

// Props para el componente OpacityController
interface OpacityControllerProps {
  models: FRAGS.FragmentsModel[];
  fragments: FRAGS.FragmentsModels | null;
  onApplyOpacity?: () => void;
  onResetOpacity?: () => void;
  className?: string;
}

const OpacityController: React.FC<OpacityControllerProps> = ({
  models,
  fragments,
  onApplyOpacity,
  onResetOpacity,
  className = ""
}) => {
  const [isOpacityApplied, setIsOpacityApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Función para aplicar opacidad a todos los elementos
  const applyOpacityToAll = async () => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Aplicar opacidad a todos los elementos
      for (const model of models) {
        try {
          // Obtener todos los elementos usando getAll en lugar de getAllItems
          // Este enfoque es más compatible con diferentes versiones de la API
          const allItems = await model.getAll();
          
          if (allItems && allItems.length > 0) {
            const localIds = [];
            
            // Extraer los IDs locales de todos los elementos
            for (const item of allItems) {
              try {
                const localId = await item.getLocalId();
                if (localId !== null && localId !== undefined) {
                  localIds.push(localId);
                }
              } catch (e) {
                // Ignorar errores al obtener ID local
              }
            }
            
            if (localIds.length > 0) {
              // Aplicar material opaco a todos los elementos
              await model.applyMaterial(localIds, OPAQUE_MATERIAL, true);
            }
          }
        } catch (error) {
          console.error(`Error al aplicar opacidad al modelo ${model.id}:`, error);
          
          // Intento alternativo si el primer método falla
          try {
            // Intentar obtener elementos por categoría general
            const allIfcElements = await model.getItemsOfType("IFCELEMENT");
            
            if (allIfcElements && allIfcElements.length > 0) {
              const localIds = [];
              
              for (const item of allIfcElements) {
                const localId = await item.getLocalId();
                if (localId !== null) {
                  localIds.push(localId);
                }
              }
              
              if (localIds.length > 0) {
                await model.applyMaterial(localIds, OPAQUE_MATERIAL, true);
              }
            }
          } catch (secondError) {
            console.error(`Error en método alternativo para modelo ${model.id}:`, secondError);
          }
        }
      }
      
      // Actualizar visualización
      await fragments.update(true);
      
      setIsOpacityApplied(true);
      if (onApplyOpacity) onApplyOpacity();
    } catch (error) {
      console.error("Error al aplicar opacidad:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para restaurar la apariencia normal de los elementos
  const resetOpacity = async () => {
    if (!fragments || models.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Restaurar materiales originales
      for (const model of models) {
        try {
          // Similar al método de aplicar opacidad, usamos getAll
          const allItems = await model.getAll();
          
          if (allItems && allItems.length > 0) {
            const localIds = [];
            
            for (const item of allItems) {
              try {
                const localId = await item.getLocalId();
                if (localId !== null && localId !== undefined) {
                  localIds.push(localId);
                }
              } catch (e) {
                // Ignorar errores al obtener ID local
              }
            }
            
            if (localIds.length > 0) {
              // Restaurar materiales originales
              await model.resetMaterials(localIds, true);
            }
          }
        } catch (error) {
          console.error(`Error al restaurar materiales del modelo ${model.id}:`, error);
          
          // Intento alternativo si el primer método falla
          try {
            const allIfcElements = await model.getItemsOfType("IFCELEMENT");
            
            if (allIfcElements && allIfcElements.length > 0) {
              const localIds = [];
              
              for (const item of allIfcElements) {
                const localId = await item.getLocalId();
                if (localId !== null) {
                  localIds.push(localId);
                }
              }
              
              if (localIds.length > 0) {
                await model.resetMaterials(localIds, true);
              }
            }
          } catch (secondError) {
            console.error(`Error en método alternativo para restaurar modelo ${model.id}:`, secondError);
          }
        }
      }
      
      // Actualizar visualización
      await fragments.update(true);
      
      setIsOpacityApplied(false);
      if (onResetOpacity) onResetOpacity();
    } catch (error) {
      console.error("Error al restaurar materiales:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`opacity-controller ${className}`}>
      <button 
        className={`opacity-button ${isOpacityApplied ? 'active' : ''}`}
        onClick={isOpacityApplied ? resetOpacity : applyOpacityToAll}
        disabled={isLoading}
      >
        {isOpacityApplied ? (
          <>
            <RefreshCw size={14} />
            <span>Restaurar Visualización</span>
          </>
        ) : (
          <>
            <Eye size={14} />
            <span>Aplicar Opacidad</span>
          </>
        )}
      </button>
      
      {isLoading && (
        <div className="opacity-loading-indicator">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default OpacityController;