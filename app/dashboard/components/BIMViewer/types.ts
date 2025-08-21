// types.ts - Definición de tipos para el visualizador BIM
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { RefObject } from 'react';

// Modelos e información
export interface ModelInfo {
  _id: string;
  name: string;
  description?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  firebasePath?: string;
  uploadDate?: string | number;
  lastModified?: string | number;
  categories?: string[];
  owner?: string;
  projectId?: string;
  metadata?: Record<string, any>;
  storageType: 'local' | 'firebase' | string;
  elementCount?: number;
  lastElementUpdate?: Date;
}

// Elemento seleccionado
export interface SelectedModelItem {
  model: FRAGS.FragmentsModel;
  localId: number;
}

// Elemento hover
export interface HoveredModelItem {
  model: FRAGS.FragmentsModel;
  localId: number;
  data?: any;
}

// Tipo para elementos de construcción
export interface BuildingElement {
  _id: string;
  modelId: string;
  expressId: number;
  guid?: string;
  name?: string;
  type?: string;
  category?: string;
  properties?: Record<string, any>;
  propertySets?: {
    name: string;
    properties: Record<string, any>;
  }[];
  geometry?: {
    boundingBox?: {
      min: { x: number, y: number, z: number };
      max: { x: number, y: number, z: number };
    };
    center?: { x: number, y: number, z: number };
    size?: { x: number, y: number, z: number };
    volume?: number;
  };
  visible?: boolean;
  created?: string | number;
  modified?: string | number;
}

// Tipos para respuestas de la API
export interface ApiResponse<T> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

export interface ModelsApiResponse {
  models: ModelInfo[];
  total?: number;
}

export interface ModelApiResponse {
  model: ModelInfo;
}

export interface ElementsApiResponse {
  elements: BuildingElement[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Material de resaltado
export interface HighlightMaterial {
  color: THREE.Color;
  renderedFaces: number;
  opacity: number;
  transparent: boolean;
}

// Estado del visualizador
export interface ViewerState {
  containerRef: RefObject<HTMLDivElement>;
  components: OBC.Components | null;
  world: OBC.World | null;
  fragments: FRAGS.FragmentsModels | null;
  models: FRAGS.FragmentsModel[];
  selectedItem: FRAGS.ItemData | null;
  selectedModelItem: SelectedModelItem | null;
  hoveredItem: HoveredModelItem | null;
  isLoading: boolean;
  error: string | null;
  status: string;
  hider: OBC.Hider | null;
  setStatus: (status: string) => void;
  centerModel: () => void;
  setHoveredItem: (item: HoveredModelItem | null) => void;
  // Raycasting
  enableRaycasting?: boolean;
  setEnableRaycasting?: (enabled: boolean) => void;
  // Funciones para modelos
  addModels: (urls: string[]) => Promise<FRAGS.FragmentsModel[]>;
  removeModel: (modelId: string) => Promise<boolean>;
  exportModelData: (modelId: string) => Promise<{ name: string, buffer: ArrayBuffer } | null>;
  getModelIds: () => string[];
  // Función de debug
  checkModelState?: () => { 
    reactModels: number; 
    refMapModels: number; 
    fragmentsModels: number; 
  };
}

// Props para useViewerState
export interface UseViewerStateProps {
  modelUrls: string[];
  onModelLoaded?: (models: FRAGS.FragmentsModel[]) => void;
  onItemSelected?: (itemData: FRAGS.ItemData | null) => void;
  onItemHovered?: (item: HoveredModelItem | null) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  defaultRaycastingEnabled?: boolean;
}

// Props para useFragmentsRaycaster
export interface UseFragmentsRaycasterProps {
  model: FRAGS.FragmentsModel | null;
  camera: THREE.Camera | null;
  domElement: HTMLElement | null;
  enabled: boolean;
  highlightMaterial?: HighlightMaterial;
  onHover?: (data: any | null) => void;
}

// Props para useModelExtractor
export interface UseModelExtractorProps {
  onProgress?: (percent: number, message: string) => void;
  onComplete?: (elementCount: number) => void;
  onError?: (error: Error) => void;
}

// Props para ProcessModelData
export interface ProcessModelDataProps {
  model: FRAGS.FragmentsModel;
  modelId: string;
  onComplete?: (count: number) => void;
}

// Funciones del visualizador
export interface ViewerFunctions {
  setStatus: (status: string) => void;
  centerModel: () => void;
  makeWallsOpaque: () => void;
  loadModels: (urls: string[]) => Promise<void>;
  highlightElements: (expressIds: number[], color?: THREE.Color) => Promise<void>;
  hideElements: (expressIds: number[]) => Promise<void>;
  showElements: (expressIds: number[]) => Promise<void>;
  filterByCategory: (category: string, visible: boolean) => Promise<void>;
  filterByProperty: (propertyName: string, propertyValue: any, visible: boolean) => Promise<void>;
}

// Props del componente ViewerContainer
export interface ViewerContainerProps {
  modelUrls?: string[];
  onModelLoaded?: (models: FRAGS.FragmentsModel[]) => void;
  onItemSelected?: (itemData: FRAGS.ItemData | null) => void;
}

// Props del componente ViewerScene
export interface ViewerSceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  error: string | null;
  status: string;
}

// Props del componente ViewerToolbar
export interface ViewerToolbarProps {
  onCenterModel: () => void;
  onToggleFunctionsPanel: () => void;
  showFunctionsPanel: boolean;
  modelCount?: number;
  raycastingEnabled?: boolean;
  onToggleRaycasting?: () => void;
}

export interface ModelVisibilityInfo {
  id: string;
  visible: boolean;
  name?: string;
}

export interface ModelVisibilityChangeEvent {
  modelId: string;
  visible: boolean;
}

// Props del componente DataPanel
export interface DataPanelProps {
  showDataPanel: boolean;
  activeDataFunction: string | null;
  dataPanelContent: any;
  selectedItem: FRAGS.ItemData | null;
  onClose: () => void;
}

// Props del componente FunctionsPanel
export interface FunctionsPanelProps {
  showFunctionsPanel: boolean;
  activeDataFunction: string | null;
  toggleFunctionsPanel: () => void;
  toggleDataFunction: (functionName: string) => void;
  getModelsInfo: () => any;
  modelCount: number;
  raycastingEnabled?: boolean;
  onToggleRaycasting?: () => void;
}

// Props del componente HoverInfoPanel
export interface HoverInfoPanelProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showName?: boolean;
  showType?: boolean;
  showLevel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Estado del hook useBIMData
export interface BIMDataState {
  isLoading: boolean;
  error: string | null;
  models: ModelInfo[];
  selectedModel: ModelInfo | null;
  categories: string[];
  elements: any[];
}

// Props del hook useBIMData
export interface UseBIMDataProps {
  autoLoad?: boolean;
  modelId?: string;
  firebaseFolderPath?: string;
}

// Funciones del hook useBIMData
export interface BIMDataFunctions {
  loadModels: () => Promise<void>;
  selectModel: (model: ModelInfo) => Promise<void>;
  loadModelData: (modelId: string) => Promise<void>;
  filterElementsByCategory: (category: string) => Promise<void>;
  filterElementsByProperty: (propertyName: string, propertyValue: any) => Promise<void>;
  updateElement: (expressId: number, data: any) => Promise<void>;
}

// Opciones de filtrado de elementos
export interface FilterOptions {
  categories?: string[];
  types?: string[];
  properties?: Record<string, any>;
  expressIds?: number[];
}

// Definición de material
export interface MaterialDefinition extends FRAGS.MaterialDefinition {
  color: THREE.Color;
  opacity: number;
  transparent: boolean;
  renderedFaces?: FRAGS.RenderedFaces;
}

// Tipo para el contexto del BIM Viewer
export interface BIMViewerContextType {
  containerRef: React.RefObject<HTMLDivElement>;
  viewerState: ReturnType<typeof useViewerState>;
  loadModels: (urls: string[]) => Promise<any[]>;
  addModels: (urls: string[]) => Promise<any[]>;
  removeModel: (modelId: string) => Promise<boolean>;
  exportModelData: (modelId: string) => Promise<Blob | null>;
  // Nuevas propiedades
  processingStatus: {
    isProcessing: boolean;
    message: string;
    progress: number;
    modelId: string;
  };
  processedModels: string[];
  isExtracting: boolean;
}

export interface PSet {
  Name: { value: string };
  HasProperties?: { Name: { value: string }; NominalValue: { value: any } }[];
}

export interface ExtendedFragmentsModel extends FRAGS.FragmentsModel {
  
  id: string;
}

export interface PropertySet {
  name: string;
  properties: Record<string, any>;
}

export interface ElementPropertyData {
  expressId: number;
  modelId: string;
  type: string;
  name: string;
  propertysets: PropertySet[];
}

// Interfaz para el hook useFragmentsRaycaster
export interface UseFragmentsRaycasterResult {
  castRay: (x: number, y: number) => { model: FRAGS.FragmentsModel, expressId: number, data?: any } | null;
  hoveredItem: { model: FRAGS.FragmentsModel, expressId: number } | null;
  selectedItem: { model: FRAGS.FragmentsModel, expressId: number } | null;
}

// Props para el hook useFragmentsRaycaster
export interface UseFragmentsRaycasterProps {
  models: FRAGS.FragmentsModel[];
  camera: THREE.Camera | null;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect?: (result: { model: FRAGS.FragmentsModel, expressId: number, data?: any } | null) => void;
  onHover?: (result: { model: FRAGS.FragmentsModel, expressId: number, data?: any } | null) => void;
  enabled?: boolean;
  highlightMaterial?: THREE.Material;
}