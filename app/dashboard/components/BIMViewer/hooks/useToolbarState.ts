import { useState, useRef } from 'react';
import * as FRAGS from '@thatopen/fragments';
import { IfcSpecialty } from '../utils/LayerVisibilityUtils';
import { ToolbarState, NotificationState } from '../types/ViewerToolbarTypes';

export const useToolbarState = () => {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [modelCategories, setModelCategories] = useState<string[]>([]);
  const [categoriesVisibility, setCategoriesVisibility] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [layersVisibility, setLayersVisibility] = useState<Record<IfcSpecialty, boolean>>({
    ARCHITECTURE: true,
    STRUCTURE: true,
    MEP: true,
    SITE: true
  });
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);
  const [layerSearchTerm, setLayerSearchTerm] = useState('');
  const [hasRandomGeometries, setHasRandomGeometries] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Referencias
  const modelsRef = useRef<FRAGS.FragmentsModel[]>([]);
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null);
  const worldRef = useRef<any>(null);
  const operationInProgressRef = useRef<boolean>(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return {
    // Estado
    activePanel,
    modelCategories,
    categoriesVisibility,
    isLoading,
    searchTerm,
    layersVisibility,
    isLoadingLayers,
    layerSearchTerm,
    hasRandomGeometries,
    errorMessage,
    notification,
    
    // Referencias
    modelsRef,
    fragmentsRef,
    worldRef,
    operationInProgressRef,
    
    // Setters
    setActivePanel,
    setModelCategories,
    setCategoriesVisibility,
    setIsLoading,
    setSearchTerm,
    setLayersVisibility,
    setIsLoadingLayers,
    setLayerSearchTerm,
    setHasRandomGeometries,
    setErrorMessage,
    setNotification,
    
    // Helpers
    showNotification
  };
};
