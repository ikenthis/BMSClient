import { useState, useRef } from 'react';
import { FloorPlansState, FloorPlan } from '../types/FloorPlansTypes';
import * as THREE from 'three';

export const useFloorPlansState = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [availablePlans, setAvailablePlans] = useState<FloorPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Referencias para componentes
  const plansComponentRef = useRef<any>(null);
  const edgesComponentRef = useRef<any>(null);
  const originalBackgroundRef = useRef<THREE.Color | null>(null);
  const originalGlossRef = useRef<number>(0.1);

  const clearError = () => setError(null);
  
  const resetState = () => {
    setIsActive(false);
    setCurrentPlanId(null);
    setError(null);
  };

  const addPlan = (plan: FloorPlan) => {
    setAvailablePlans(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) return prev;
      return [...prev, plan];
    });
  };

  const removePlan = (planId: string) => {
    setAvailablePlans(prev => prev.filter(p => p.id !== planId));
    if (currentPlanId === planId) {
      setCurrentPlanId(null);
    }
  };

  const clearPlans = () => {
    setAvailablePlans([]);
    setCurrentPlanId(null);
  };

  return {
    // Estado
    isGenerating,
    isActive,
    currentPlanId,
    availablePlans,
    error,
    
    // Referencias
    plansComponentRef,
    edgesComponentRef,
    originalBackgroundRef,
    originalGlossRef,
    
    // Setters
    setIsGenerating,
    setIsActive,
    setCurrentPlanId,
    setAvailablePlans,
    setError,
    
    // Métodos
    clearError,
    resetState,
    addPlan,
    removePlan,
    clearPlans
  };
};