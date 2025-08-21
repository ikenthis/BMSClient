import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBCF from '@thatopen/components-front';

export interface FloorPlan {
  id: string;
  name: string;
  level?: number;
  elevation?: number;
}

export interface FloorPlansState {
  isGenerating: boolean;
  isActive: boolean;
  currentPlanId: string | null;
  availablePlans: FloorPlan[];
  error: string | null;
}

export interface FloorPlansConfig {
  autoGenerateOnLoad?: boolean;
  enableHighlighting?: boolean;
  enableCulling?: boolean;
  blackAndWhiteMode?: boolean;
  outlineEnabled?: boolean;
}

export interface StyleConfiguration {
  thickMaterial: {
    fill: THREE.MeshBasicMaterial;
    line: THREE.LineBasicMaterial;
    outline: THREE.MeshBasicMaterial;
  };
  thinMaterial: {
    line: THREE.LineBasicMaterial;
    outline?: THREE.MeshBasicMaterial;
  };
  backgroundColors: {
    planView: THREE.Color;
    default: THREE.Color | null;
  };
}

export interface FloorPlansProps {
  world?: any;
  fragments?: any;
  models?: any[];
  highlighter?: any;
  classifier?: any;
  cullers?: any;
  onPlanChange?: (planId: string | null) => void;
  onError?: (error: string) => void;
  config?: FloorPlansConfig;
}