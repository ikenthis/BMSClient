// typeDefs.ts - Tipos actualizados para virtual DOM y optimizaciones

import * as FRAGS from '@thatopen/fragments';
import * as THREE from 'three';

/**
 * Estados de carga para optimización
 */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export type DataLoadState = {
  state: LoadingState;
  progress?: number;
  error?: string;
};

/**
 * Propiedades básicas del espacio (carga inicial rápida)
 */
export interface BasicSpaceProperties {
  name: string;
  globalId?: string;
  localId: number;
  modelId: string;
  loadState: LoadingState;
}

/**
 * Propiedades completas del espacio (carga lazy)
 */
export interface SpaceProperties extends BasicSpaceProperties {
  longName?: string;
  description?: string;
  objectType?: string;
  area?: number;
  volume?: number;
  psets?: Record<string, any>;
  labelValues?: Record<string, string>;
  rawData?: IFCSpaceData;
  lastUpdated?: number; // timestamp para cache
}

/**
 * Dimensiones del espacio
 */
export interface SpaceDimensions {
  width: number;
  height: number;
  depth: number;
  area: number;
  volume: number;
  boundingBox?: THREE.Box3;
}

/**
 * Elemento de espacio optimizado
 */
export interface SpaceElement {
  modelId: string;
  model: FRAGS.FragmentsModel;
  localId: number;
  category: 'IFCSPACE';
  name: string;
  longName?: string;
  level: string;
  properties?: SpaceProperties | BasicSpaceProperties;
  dimensions?: SpaceDimensions;
  position?: THREE.Vector3;
  
  // Nuevos campos para optimización
  isVisible?: boolean;
  isSelected?: boolean;
  loadState?: LoadingState;
  lastAccessed?: number; // timestamp para LRU cache
  
  // Lazy loading flags
  hasFullProperties?: boolean;
  hasDimensions?: boolean;
  hasCollectionItems?: boolean;
}

/**
 * Configuración de virtualización
 */
export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  threshold: number;
}

/**
 * Configuración de paginación
 */
export interface PaginationConfig {
  initialLoadCount: number;
  loadMoreCount: number;
  maxItemsInMemory: number;
}

/**
 * Estado de la lista virtualizada
 */
export interface VirtualListState {
  startIndex: number;
  endIndex: number;
  visibleItems: SpaceElement[];
  totalCount: number;
  isLoadingMore: boolean;
}

/**
 * Props para el componente de item virtualizado
 */
export interface VirtualSpaceItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    spaces: SpaceElement[];
    selectedSpace: SpaceElement | null;
    onSelectSpace: (space: SpaceElement) => void;
    onShowSpaceInfo: (space: SpaceElement, event?: React.MouseEvent) => void;
    collectionItems: ArtCollectionItemFormData[];
    loadSpaceProperties: (space: SpaceElement) => Promise<SpaceProperties | null>;
    onLoadMore?: () => void;
    hasNextPage?: boolean;
  };
}

/**
 * Cache de propiedades de espacios
 */
export interface SpacePropertiesCache {
  data: Map<string, SpaceProperties>;
  lastCleanup: number;
  maxSize: number;
  ttl: number; // time to live en ms
}

/**
 * Configuración de búsqueda con debounce
 */
export interface SearchConfig {
  debounceMs: number;
  minSearchLength: number;
  maxResults: number;
  searchFields: (keyof SpaceElement)[];
}

/**
 * Resultado de búsqueda
 */
export interface SearchResult {
  items: SpaceElement[];
  totalCount: number;
  searchTerm: string;
  executionTime: number;
}

/**
 * Configuración de filtros
 */
export interface FilterConfig {
  byLevel?: string[];
  byArea?: { min: number; max: number };
  byVolume?: { min: number; max: number };
  hasCollections?: boolean;
  hasReservations?: boolean;
  searchTerm?: string;
}

/**
 * Props actualizadas del panel de colecciones
 */
export interface CollectionsPanelProps {
  models?: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsManager | null;
  world?: any;
  onElementSelected?: (element: SpaceElement) => void;
  onShowElementInfo?: (element: SpaceElement) => void;
  onClose?: () => void;
  
  // Nuevas props para optimización
  virtualizationConfig?: Partial<VirtualizationConfig>;
  paginationConfig?: Partial<PaginationConfig>;
  searchConfig?: Partial<SearchConfig>;
  enableLazyLoading?: boolean;
  enableVirtualization?: boolean;
  maxCacheSize?: number;
}

/**
 * Estado del panel de colecciones
 */
export interface CollectionsPanelState {
  // Estados de datos
  spaces: SpaceElement[];
  filteredSpaces: SpaceElement[];
  spacesByLevel: Record<string, SpaceElement[]>;
  levelsList: string[];
  
  // Estados de UI
  searchTerm: string;
  debouncedSearchTerm: string;
  isLoading: boolean;
  loadingProgress: number;
  
  // Estados de selección
  selectedSpace: SpaceElement | null;
  selectedLevel: string | null;
  expandedLevels: Set<string>;
  
  // Estados de virtualización
  virtualListState: VirtualListState;
  loadedItemsCount: number;
  
  // Estados de cache
  propertiesCache: SpacePropertiesCache;
  
  // Estados de UI adicionales
  isolationActive: boolean;
  showDebugInfo: boolean;
  detailsCollapsed: boolean;
  debugMessage: string;
}

/**
 * Datos IFC del espacio (sin cambios)
 */
export interface IFCSpaceData {
  [key: string]: any;
  properties?: Record<string, any>;
  psets?: Record<string, IFCPropertySet>;
}

/**
 * Set de propiedades IFC
 */
export interface IFCPropertySet {
  [propertyName: string]: any;
}

/**
 * Datos del formulario de colección de arte
 */
export interface ArtCollectionItemFormData {
  itemId?: string;
  name: string;
  type: string;
  description?: string;
  artist?: string;
  year?: number;
  value?: number;
  spaceGuid: string;
  spaceName?: string;
  spaceLongName?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  scale?: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    x: number;
    y: number;
    z: number;
  };
  material?: string;
  status?: 'active' | 'maintenance' | 'retired';
  acquisitionDate?: string;
  lastInspection?: string;
  notes?: string;
  
  // Nuevos campos para optimización
  loadState?: LoadingState;
  lastModified?: number;
}

/**
 * Configuración de geometrías de colección
 */
export interface CollectionGeometryConfig {
  defaultScale: THREE.Vector3;
  defaultColor: number;
  hoverColor: number;
  selectedColor: number;
  opacity: number;
  enableShadows: boolean;
  lodLevels?: number[];
}

/**
 * Datos del espacio para formularios
 */
export interface SpaceFormData {
  guid: string;
  id: number;
  name: string;
  longName?: string;
  modelId: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  dimensions?: SpaceDimensions;
  properties?: SpaceProperties;
}

/**
 * Configuración de rendimiento
 */
export interface PerformanceConfig {
  enableVirtualization: boolean;
  enableLazyLoading: boolean;
  enableCaching: boolean;
  enableDebouncing: boolean;
  batchSize: number;
  cacheMaxSize: number;
  cacheTTL: number;
  debounceDelay: number;
  renderThrottle: number;
}

/**
 * Métricas de rendimiento
 */
export interface PerformanceMetrics {
  initialLoadTime: number;
  searchTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  totalSpacesLoaded: number;
  visibleSpacesCount: number;
  lastUpdate: number;
}

/**
 * Hook de espacios optimizado
 */
export interface UseOptimizedSpacesResult {
  spaces: SpaceElement[];
  filteredSpaces: SpaceElement[];
  isLoading: boolean;
  loadingProgress: number;
  error: string | null;
  searchResults: SearchResult | null;
  
  // Funciones
  loadMore: () => Promise<void>;
  search: (term: string) => void;
  selectSpace: (space: SpaceElement) => Promise<void>;
  loadSpaceProperties: (space: SpaceElement) => Promise<SpaceProperties | null>;
  clearCache: () => void;
  
  // Métricas
  metrics: PerformanceMetrics;
}

/**
 * Contexto de optimización
 */
export interface OptimizationContext {
  config: PerformanceConfig;
  cache: SpacePropertiesCache;
  metrics: PerformanceMetrics;
  updateMetrics: (updates: Partial<PerformanceMetrics>) => void;
}

/**
 * Props para componentes optimizados
 */
export interface OptimizedComponentProps {
  enableOptimizations?: boolean;
  performanceConfig?: Partial<PerformanceConfig>;
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
}