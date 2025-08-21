// Barrel file para exportar todos los componentes y hooks

// Componente principal
export { default as BIMViewerPage } from './BIMViewerPage';

// Componentes secundarios
export { default as ViewerToolbar } from './ViewerToolbar';
export { default as PropertyPanel } from './ViewerPanels/PropertyPanel';
export { default as LoadingOverlay } from './Overlay/LoadingOverlay';
export { default as ErrorOverlay } from './Overlay/ErrorOverlay';

// Hooks
export { useContainerSize } from './hooks/useContainerSize';
export { useSceneInitialization } from './hooks/useSceneInitialization';
export { useModelLoader } from './hooks/useModelLoader';
export { useElementSelection } from './hooks/useElementSelection';

// Utilidades
export * from './utils/typeDefs';
export * from './utils/highlightUtils';