// useIfcSpaceVisibility.ts - Hook para gestionar visibilidad de IFCSPACE
"use client";

import { useEffect, useRef, useCallback } from 'react';
import * as FRAGS from '@thatopen/fragments';

interface UseIfcSpaceVisibilityOptions {
  fragments: FRAGS.FragmentsModels | null;
  models: FRAGS.FragmentsModel[];
  isHeatMapActive: boolean;
  autoHideOnInit?: boolean; // Por defecto true
}

interface IfcSpaceElement {
  modelId: string;
  model: FRAGS.FragmentsModel;
  localIds: number[];
}

/**
 * Hook personalizado para gestionar la visibilidad de elementos IFCSPACE
 * Se ocultan automáticamente al cargar y solo se muestran durante el HeatMap
 */
export const useIfcSpaceVisibility = ({
  fragments,
  models,
  isHeatMapActive,
  autoHideOnInit = true
}: UseIfcSpaceVisibilityOptions) => {
  
  // Mapa de elementos IFCSPACE por modelo
  const ifcSpaceElementsRef = useRef<Map<string, IfcSpaceElement>>(new Map());
  const isInitializedRef = useRef<boolean>(false);
  const lastHeatMapStateRef = useRef<boolean>(false);

  /**
   * 🔍 Mapear todos los elementos IFCSPACE en los modelos cargados
   */
  const mapIfcSpaceElements = useCallback(async (): Promise<void> => {
    if (!fragments || models.length === 0) return;

    console.log('🗺️ === MAPEANDO ELEMENTOS IFCSPACE ===');
    ifcSpaceElementsRef.current.clear();
    let totalIfcSpaces = 0;

    for (const model of models) {
      try {
        const categories = await model.getCategories();
        
        if (!categories.includes('IFCSPACE')) {
          console.log(`ℹ️ Modelo ${model.id} no contiene IFCSPACE`);
          continue;
        }

        const spaceItems = await model.getItemsOfCategory('IFCSPACE');
        console.log(`🏠 Encontrados ${spaceItems.length} espacios IFCSPACE en modelo ${model.id}`);

        const spaceLocalIds = (await Promise.all(
          spaceItems.map(async (item) => {
            try {
              return await item.getLocalId();
            } catch (error) {
              console.warn('⚠️ Error obteniendo LocalID de espacio:', error);
              return null;
            }
          })
        )).filter(id => id !== null) as number[];

        if (spaceLocalIds.length > 0) {
          ifcSpaceElementsRef.current.set(model.id, {
            modelId: model.id,
            model,
            localIds: spaceLocalIds
          });
          totalIfcSpaces += spaceLocalIds.length;
          console.log(`✅ Modelo ${model.id}: ${spaceLocalIds.length} espacios IFCSPACE mapeados`);
        }

      } catch (error) {
        console.error(`❌ Error mapeando IFCSPACE en modelo ${model.id}:`, error);
      }
    }

    console.log(`✅ Total espacios IFCSPACE mapeados: ${totalIfcSpaces} en ${ifcSpaceElementsRef.current.size} modelos`);
  }, [fragments, models]);

  /**
   * 🫥 Ocultar todos los elementos IFCSPACE
   */
  const hideIfcSpaces = useCallback(async (): Promise<void> => {
    if (!fragments || ifcSpaceElementsRef.current.size === 0) return;

    console.log('🫥 === OCULTANDO ELEMENTOS IFCSPACE ===');

    for (const [modelId, spaceElement] of ifcSpaceElementsRef.current.entries()) {
      try {
        await spaceElement.model.setVisible(spaceElement.localIds, false);
        console.log(`🫥 Ocultados ${spaceElement.localIds.length} espacios IFCSPACE en modelo ${modelId}`);
      } catch (error) {
        console.error(`❌ Error ocultando IFCSPACE en modelo ${modelId}:`, error);
      }
    }

    // Forzar actualización de la visualización
    await fragments.update(true);
    console.log('✅ Todos los espacios IFCSPACE están ocultos');
  }, [fragments]);

  /**
   * 👁️ Mostrar todos los elementos IFCSPACE
   */
  const showIfcSpaces = useCallback(async (): Promise<void> => {
    if (!fragments || ifcSpaceElementsRef.current.size === 0) return;

    console.log('👁️ === MOSTRANDO ELEMENTOS IFCSPACE ===');

    for (const [modelId, spaceElement] of ifcSpaceElementsRef.current.entries()) {
      try {
        await spaceElement.model.setVisible(spaceElement.localIds, true);
        console.log(`👁️ Mostrados ${spaceElement.localIds.length} espacios IFCSPACE en modelo ${modelId}`);
      } catch (error) {
        console.error(`❌ Error mostrando IFCSPACE en modelo ${modelId}:`, error);
      }
    }

    // Forzar actualización de la visualización
    await fragments.update(true);
    console.log('✅ Todos los espacios IFCSPACE están visibles');
  }, [fragments]);

  /**
   * 🔄 Alternar visibilidad de IFCSPACE
   */
  const toggleIfcSpaceVisibility = useCallback(async (show: boolean): Promise<void> => {
    if (show) {
      await showIfcSpaces();
    } else {
      await hideIfcSpaces();
    }
  }, [showIfcSpaces, hideIfcSpaces]);

  /**
   * 🔍 Verificar estado actual de visibilidad
   */
  const checkIfcSpaceVisibility = useCallback(async (): Promise<boolean | null> => {
    if (!fragments || ifcSpaceElementsRef.current.size === 0) return null;

    // Verificar el primer elemento de IFCSPACE encontrado como muestra
    for (const [modelId, spaceElement] of ifcSpaceElementsRef.current.entries()) {
      try {
        if (spaceElement.localIds.length > 0) {
          const isVisible = await spaceElement.model.isVisible(spaceElement.localIds[0]);
          console.log(`🔍 IFCSPACE en modelo ${modelId}: ${isVisible ? 'VISIBLE' : 'OCULTO'}`);
          return isVisible;
        }
      } catch (error) {
        console.error(`❌ Error verificando visibilidad IFCSPACE en modelo ${modelId}:`, error);
      }
    }

    return null;
  }, [fragments]);

  /**
   * 📊 Obtener estadísticas de IFCSPACE
   */
  const getIfcSpaceStats = useCallback(() => {
    const stats = {
      modelsWithIfcSpace: ifcSpaceElementsRef.current.size,
      totalIfcSpaceElements: 0,
      modelBreakdown: {} as Record<string, number>
    };

    ifcSpaceElementsRef.current.forEach((spaceElement, modelId) => {
      stats.totalIfcSpaceElements += spaceElement.localIds.length;
      stats.modelBreakdown[modelId] = spaceElement.localIds.length;
    });

    return stats;
  }, []);

  // 🔄 Effect: Mapear elementos cuando cambien los modelos
  useEffect(() => {
    if (models.length > 0) {
      console.log('🔄 Modelos cambiaron, remapeando IFCSPACE...');
      mapIfcSpaceElements();
    }
  }, [models, mapIfcSpaceElements]);

  // 🫥 Effect: Ocultar automáticamente al inicializar
  useEffect(() => {
    if (autoHideOnInit && !isInitializedRef.current && ifcSpaceElementsRef.current.size > 0) {
      console.log('🚀 Ocultación automática inicial de IFCSPACE...');
      hideIfcSpaces().then(() => {
        isInitializedRef.current = true;
        console.log('✅ Ocultación inicial completada');
      });
    }
  }, [autoHideOnInit, hideIfcSpaces]);

  // 🌡️ Effect: Gestionar visibilidad según estado del HeatMap
  useEffect(() => {
    // Solo actuar si el estado del HeatMap cambió y ya estamos inicializados
    if (lastHeatMapStateRef.current !== isHeatMapActive && isInitializedRef.current) {
      console.log(`🌡️ HeatMap cambió: ${lastHeatMapStateRef.current} → ${isHeatMapActive}`);
      
      if (isHeatMapActive) {
        console.log('🔥 HeatMap activado - Mostrando IFCSPACE');
        showIfcSpaces();
      } else {
        console.log('❄️ HeatMap desactivado - Ocultando IFCSPACE');
        hideIfcSpaces();
      }
    }
    
    lastHeatMapStateRef.current = isHeatMapActive;
  }, [isHeatMapActive, showIfcSpaces, hideIfcSpaces]);

  // 🔧 Funciones de debug globales (solo en desarrollo)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).ifcSpaceVisibility = {
        hide: hideIfcSpaces,
        show: showIfcSpaces,
        toggle: toggleIfcSpaceVisibility,
        check: checkIfcSpaceVisibility,
        stats: getIfcSpaceStats,
        remap: mapIfcSpaceElements
      };
      
      console.log('🔧 Funciones debug IFCSPACE expuestas:', {
        'ifcSpaceVisibility.hide()': 'Ocultar IFCSPACE',
        'ifcSpaceVisibility.show()': 'Mostrar IFCSPACE', 
        'ifcSpaceVisibility.toggle(true/false)': 'Alternar visibilidad',
        'ifcSpaceVisibility.check()': 'Verificar estado actual',
        'ifcSpaceVisibility.stats()': 'Obtener estadísticas',
        'ifcSpaceVisibility.remap()': 'Remapear elementos'
      });
    }
  }, [hideIfcSpaces, showIfcSpaces, toggleIfcSpaceVisibility, checkIfcSpaceVisibility, getIfcSpaceStats, mapIfcSpaceElements]);

  return {
    // Funciones principales
    hideIfcSpaces,
    showIfcSpaces,
    toggleIfcSpaceVisibility,
    
    // Funciones de utilidad
    checkIfcSpaceVisibility,
    getIfcSpaceStats,
    mapIfcSpaceElements,
    
    // Estado
    isInitialized: isInitializedRef.current,
    ifcSpaceElementsCount: ifcSpaceElementsRef.current.size
  };
};