import * as FRAGS from '@thatopen/fragments';
import { IfcSpecialty } from '../utils/LayerVisibilityUtils';

// types/ViewerToolbarTypes.ts

export interface ViewerToolbarProps {
  // Props existentes
  onCenterModel: () => void;
  models: any[];
  fragments: any;
  onToggleIsolationPanel: () => void;
  isIsolationActive: boolean;
  onAddRandomGeometry: () => void;
  onRemoveRandomGeometry: () => void;
  onClearCollectionGeometries: () => void;
  hasCollectionGeometries: boolean;
  
  // Nuevas props para FloorPlans
  world: any; // Instancia de world de Three.js/ThatOpen
  components?: any; // Instancia de components de ThatOpen
  onToggleFloorPlansPanel?: () => void;
  isFloorPlansActive?: boolean;
}

export interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ToolbarState {
  activePanel: string | null;
  modelCategories: string[];
  categoriesVisibility: Record<string, boolean>;
  isLoading: boolean;
  searchTerm: string;
  layersVisibility: Record<IfcSpecialty, boolean>;
  isLoadingLayers: boolean;
  layerSearchTerm: string;
  hasRandomGeometries: boolean;
  errorMessage: string | null;
  notification: NotificationState | null;
  // NUEVO ESTADO PARA FLOORPLANS
  isFloorPlansActive: boolean;
}

// Nuevos tipos específicos para FloorPlans
export interface FloorPlanData {
  id: string;
  name: string;
  level: number;
  elements: any[];
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface FloorPlansState {
  isGenerating: boolean;
  isActive: boolean;
  currentPlanId: string | null;
  availablePlans: FloorPlanData[];
  error: string | null;
  hasPlans: boolean;
}