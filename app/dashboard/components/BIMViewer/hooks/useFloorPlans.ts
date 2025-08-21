import { useEffect, useCallback } from 'react';
import { useFloorPlansState } from './useFloorPlansState';
import { FloorPlansService } from '../services/FloorPlansService';
import { FloorPlansProps, FloorPlan } from '../types/FloorPlansTypes';

export const useFloorPlans = (props: FloorPlansProps) => {
  const {
    world,
    fragments,
    models = [],
    onPlanChange,
    onError,
    config
  } = props;

  const state = useFloorPlansState();
  const {
    isGenerating,
    isActive,
    currentPlanId,
    availablePlans,
    error,
    setIsGenerating,
    setIsActive,
    setCurrentPlanId,
    setAvailablePlans,
    setError,
    clearError,
    resetState
  } = state;

  // Inicializar el servicio cuando cambien los componentes - CORREGIDO
  useEffect(() => {
    if (fragments && world) {
      try {
        console.log('Initializing FloorPlansService with:', { 
          fragments: !!fragments, 
          world: !!world,
          worldKeys: Object.keys(world)
        });
        
        // ORDEN CORREGIDO: fragments primero, world segundo
        FloorPlansService.initialize(fragments, world, config);
        console.log('FloorPlansService initialized successfully');
      } catch (error) {
        console.error('Error initializing FloorPlans service:', error);
        setError('Error al inicializar el servicio de planos');
      }
    }
  }, [fragments, world, config, setError]);

  // Generar planos automáticamente cuando se carguen modelos - MEJORADO
  useEffect(() => {
    if (config?.autoGenerateOnLoad && 
        models.length > 0 && 
        !isGenerating && 
        FloorPlansService.isServiceInitialized() &&
        availablePlans.length === 0) {
      
      console.log('Auto-generating floor plans for', models.length, 'models');
      generatePlansForModels();
    }
  }, [models, config?.autoGenerateOnLoad, isGenerating, availablePlans.length]);

  /**
   * Genera planos para todos los modelos cargados - MEJORADO
   */
  const generatePlansForModels = useCallback(async () => {
    if (!FloorPlansService.isServiceInitialized()) {
      const errorMsg = 'El servicio de planos no está inicializado';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }
    
    if (models.length === 0) {
      const errorMsg = 'No hay modelos cargados para generar planos';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setIsGenerating(true);
    clearError();

    try {
      console.log(`Generating plans for ${models.length} models...`);
      const allPlans: FloorPlan[] = [];
      
      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        if (model) {
          console.log(`Processing model ${i + 1}/${models.length}:`, model.id || model.name || 'unknown');
          
          try {
            const modelPlans = await FloorPlansService.generateFloorPlans(model);
            console.log(`Model ${i + 1} generated ${modelPlans.length} plans`);
            allPlans.push(...modelPlans);
          } catch (modelError) {
            console.warn(`Error generating plans for model ${i + 1}:`, modelError);
            // Continuar con el siguiente modelo
          }
        }
      }

      console.log(`Total plans generated: ${allPlans.length}`);
      setAvailablePlans(allPlans);
      
      if (allPlans.length === 0) {
        const errorMsg = 'No se pudieron generar planos para los modelos cargados';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      } else {
        console.log('✅ Plans generation completed successfully');
      }
      
    } catch (error) {
      const errorMessage = `Error al generar planos: ${error}`;
      console.error('Plans generation failed:', error);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [models, setIsGenerating, setError, setAvailablePlans, clearError, onError]);

  /**
   * Navega a un plano específico - MEJORADO
   */
  const navigateToPlan = useCallback(async (planId: string) => {
    if (!FloorPlansService.isServiceInitialized()) {
      const errorMsg = 'El servicio de planos no está inicializado';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    // Verificar que el plano existe
    const planExists = availablePlans.some(plan => plan.id === planId);
    if (!planExists) {
      const errorMsg = `Plan no encontrado: ${planId}`;
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    try {
      console.log(`Navigating to plan: ${planId}`);
      await FloorPlansService.navigateToPlan(planId, true);
      
      setCurrentPlanId(planId);
      setIsActive(true);
      clearError();
      
      if (onPlanChange) {
        onPlanChange(planId);
      }
      
      console.log('✅ Navigation completed successfully');
      
    } catch (error) {
      const errorMessage = `Error al navegar al plano: ${error}`;
      console.error('Navigation failed:', error);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [availablePlans, setCurrentPlanId, setIsActive, setError, clearError, onPlanChange, onError]);

  /**
   * Sale del modo de vista de plano - MEJORADO
   */
  const exitPlanView = useCallback(async () => {
    if (!FloorPlansService.isServiceInitialized()) {
      console.warn('FloorPlans service not initialized, cannot exit plan view');
      return;
    }

    try {
      console.log('Exiting plan view...');
      await FloorPlansService.exitPlanView();
      
      setCurrentPlanId(null);
      setIsActive(false);
      clearError();
      
      if (onPlanChange) {
        onPlanChange(null);
      }
      
      console.log('✅ Successfully exited plan view');
      
    } catch (error) {
      const errorMessage = `Error al salir de la vista de plano: ${error}`;
      console.error('Exit plan view failed:', error);
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [setCurrentPlanId, setIsActive, clearError, onPlanChange, onError]);

  /**
   * Regenera todos los planos - MEJORADO
   */
  const regeneratePlans = useCallback(async () => {
    console.log('Regenerating all plans...');
    setAvailablePlans([]);
    setCurrentPlanId(null);
    setIsActive(false);
    
    // Si hay un plan activo, salir de él primero
    if (currentPlanId) {
      try {
        await FloorPlansService.exitPlanView();
      } catch (error) {
        console.warn('Error exiting current plan:', error);
      }
    }
    
    // Limpiar planos existentes en el servicio
    FloorPlansService.clearPlans();
    
    // Generar nuevos planos
    await generatePlansForModels();
  }, [generatePlansForModels, setAvailablePlans, setCurrentPlanId, setIsActive, currentPlanId]);

  /**
   * Limpia todos los planos - MEJORADO
   */
  const clearAllPlans = useCallback(async () => {
    console.log('Clearing all plans...');
    
    // Si hay un plan activo, salir de él primero
    if (currentPlanId) {
      try {
        await FloorPlansService.exitPlanView();
      } catch (error) {
        console.warn('Error exiting current plan:', error);
      }
    }
    
    FloorPlansService.clearPlans();
    resetState();
    setAvailablePlans([]);
    
    console.log('✅ All plans cleared');
  }, [resetState, setAvailablePlans, currentPlanId]);

  /**
   * Obtiene información de un plano específico
   */
  const getPlanInfo = useCallback((planId: string) => {
    return FloorPlansService.getPlanInfo(planId);
  }, []);

  /**
   * Verifica si el servicio está listo
   */
  const isReady = useCallback(() => {
    return FloorPlansService.isServiceInitialized() && !!fragments && !!world;
  }, [fragments, world]);

  return {
    // Estado
    isGenerating,
    isActive,
    currentPlanId,
    availablePlans,
    error,
    
    // Acciones
    generatePlansForModels,
    navigateToPlan,
    exitPlanView,
    regeneratePlans,
    clearAllPlans,
    getPlanInfo,
    clearError,
    
    // Información
    hasPlans: availablePlans.length > 0,
    isInitialized: FloorPlansService.isServiceInitialized(),
    isReady: isReady()
  };
};