// src/components/ViewerPanels/SensorsPanel/SensorPanelStyles.ts

export const sensorPanelStyles = {
  // Contenedor principal
  container: "fixed inset-0 bg-gray-900 bg-opacity-95 backdrop-blur-sm text-white shadow-2xl flex flex-col z-[9999]", // Aumentar z-index
  
  // Header fijo
  header: {
    main: "flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900",
    title: "text-2xl font-bold",
    info: "flex items-center space-x-4",
    systemInfo: "flex items-center space-x-2 text-sm",
    controls: "flex items-center space-x-2",
    closeButton: "text-gray-400 hover:text-white text-3xl leading-none px-2"
  },

  // Mensajes de estado
  messages: {
    container: "flex-shrink-0 px-4 pt-4",
    error: "bg-red-900 bg-opacity-50 border border-red-700 text-red-200 p-3 rounded mb-2",
    success: "bg-green-900 bg-opacity-50 border border-green-700 text-green-200 p-3 rounded",
    loading: "bg-blue-900 bg-opacity-50 border border-blue-700 text-blue-200 p-3 rounded flex items-center"
  },

  // Estados de texto
  text: {
    systemActive: "text-green-400",
    systemInactive: "text-red-400",
    wsConnected: "text-green-400",
    wsDisconnected: "text-yellow-400",
    activeCount: "text-blue-400",
    label: "text-gray-400",
    errorText: "text-red-400",
    successText: "text-green-400"
  },

  // Botones
  buttons: {
    primary: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm",
    success: "bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm",
    purple: "bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm",
    small: "px-2 py-1 text-xs",
    disabled: "opacity-75 cursor-not-allowed"
  },

  // Panel de errores
  errorPanel: {
    container: "mx-4 mt-4 bg-red-900 bg-opacity-30 border border-red-800 rounded p-3",
    header: "flex justify-between items-center mb-2",
    title: "font-semibold",
    controls: "flex space-x-2",
    list: "mt-3 max-h-48 overflow-y-auto",
    item: "bg-gray-800 bg-opacity-60 rounded p-2 flex justify-between items-center",
    itemContent: "flex items-center space-x-2",
    itemDetails: "font-medium text-sm",
    itemId: "text-xs text-gray-400",
    itemError: "text-xs text-red-300",
    emptyState: "text-gray-400 text-sm py-2 text-center"
  },

  // Toggle switch
  toggle: {
    container: "flex items-center space-x-2 mt-2",
    label: "text-sm",
    switch: "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
    switchEnabled: "bg-green-600",
    switchDisabled: "bg-gray-600",
    indicator: "inline-block h-4 w-4 transform rounded-full bg-white transition",
    indicatorEnabled: "translate-x-6",
    indicatorDisabled: "translate-x-1"
  },

  // Contenido principal
  content: {
    main: "flex-1 overflow-hidden",
    split: "flex h-full",
    dashboard: "h-full overflow-y-auto px-4 py-4 space-y-6 custom-scrollbar"
  },

  // Panel izquierdo
  leftPanel: {
    container: "w-1/3 flex flex-col border-r border-gray-700",
    header: "flex-shrink-0 bg-gray-800 p-4 border-b border-gray-700",
    title: "text-lg font-semibold mb-2",
    controls: "flex justify-between items-center mb-4",
    list: "flex-1 overflow-y-auto p-4 custom-scrollbar",
    grid: "space-y-2"
  },

  // Panel derecho
  rightPanel: {
    container: "flex-1 flex flex-col",
    content: "h-full overflow-y-auto custom-scrollbar",
    padding: "p-4 space-y-4"
  },

  // Formulario de creación
  form: {
    container: "mb-4 p-3 bg-gray-700 rounded",
    title: "text-sm font-medium mb-2",
    input: "w-full px-3 py-2 bg-gray-600 rounded text-sm mb-2",
    controls: "flex space-x-2"
  },

  // Estadísticas
  stats: {
    grid: "grid grid-cols-2 gap-2 text-sm",
    item: "bg-gray-700 p-2 rounded"
  },

  // Items de sensores
  sensorItem: {
    base: "p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-700",
    selected: "bg-blue-900 bg-opacity-50 border border-blue-500",
    error: "bg-red-900 bg-opacity-30 border border-red-800",
    normal: "bg-gray-750",
    content: "flex items-start justify-between",
    info: "flex items-start space-x-3 flex-1",
    icon: "mt-1",
    details: "flex-1 min-w-0",
    name: "font-medium text-sm truncate",
    location: "text-xs text-gray-400 truncate",
    reading: "text-xs mt-1",
    actions: "flex flex-col items-end space-y-2"
  },

  // Paneles informativos
  infoPanel: {
    base: "bg-gray-800 rounded-lg p-4",
    header: "flex items-center justify-between mb-4",
    title: "flex items-center space-x-3",
    name: "text-xl font-semibold",
    id: "text-sm text-gray-400",
    wsStatus: "mb-3 bg-blue-900 bg-opacity-30 border border-blue-800 rounded p-2 text-xs text-blue-300"
  },

  // Grid de lecturas
  readingsGrid: {
    container: "grid grid-cols-2 md:grid-cols-4 gap-4",
    card: "bg-gray-700 p-3 rounded",
    label: "text-xs text-gray-400 mb-1",
    value: "text-2xl font-bold",
    valueLarge: "text-lg font-medium",
    valueSmall: "text-sm"
  },

  // Estados especiales
  states: {
    loading: "text-center text-gray-400 py-8",
    loadingSpinner: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2",
    loadingText: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2",
    inactive: "bg-gray-700 p-6 rounded text-center text-gray-400",
    empty: "h-full flex items-center justify-center",
    emptyContent: "text-center",
    emptyIcon: "text-gray-500 mb-4 text-6xl",
    emptyTitle: "text-xl text-gray-400 mb-2",
    emptyDescription: "text-sm text-gray-500"
  },

  // Gráficos
  chart: {
    container: "bg-gray-800 rounded-lg p-4",
    title: "text-lg font-semibold mb-3",
    content: "h-64",
    fullHeight: "h-80"
  },

  // Dashboard específico
  dashboard: {
    header: "flex justify-between items-center mb-4",
    title: "text-xl font-semibold",
    timestamp: "text-sm text-gray-400",
    grid: "grid grid-cols-2 md:grid-cols-4 gap-6 mb-6",
    card: "bg-gray-700 rounded-lg p-4 text-center",
    cardIcon: "text-3xl mb-2",
    cardTitle: "font-medium text-sm mb-1",
    cardLocation: "text-xs text-gray-400 mb-2",
    cardValue: "text-lg font-bold text-white",
    cardUnit: "text-sm text-gray-400 ml-1",
    cardTimestamp: "text-xs text-gray-500 mt-1",
    chartsGrid: "grid grid-cols-1 lg:grid-cols-2 gap-6",
    chartCard: "bg-gray-700 rounded-lg p-4"
  },

  // Lista detallada
  detailedList: {
    container: "bg-gray-800 rounded-lg p-6",
    item: "bg-gray-700 rounded-lg p-4 flex items-center justify-between",
    itemInfo: "flex items-center space-x-4",
    itemIcon: "w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center",
    itemDetails: "font-medium",
    itemLocation: "text-sm text-gray-400",
    itemReading: "text-xs text-gray-500",
    itemActions: "flex items-center space-x-3"
  },

  // Badges de estado
  badges: {
    base: "px-2 py-1 text-xs rounded-full font-medium",
    active: "bg-green-900 text-green-300",
    inactive: "bg-gray-700 text-gray-300", 
    error: "bg-red-900 text-red-300",
    maintenance: "bg-yellow-900 text-yellow-300",
    processing: "opacity-75"
  },

  // Indicadores de calidad
  quality: {
    good: "text-green-400",
    warning: "text-yellow-400",
    critical: "text-red-400",
    default: "text-gray-400",
    criticalBg: "bg-red-700 text-white px-2 py-1 rounded font-bold",
    warningBg: "bg-yellow-600 text-white px-2 py-1 rounded font-bold"
  },

  // Umbrales
  thresholds: {
    container: "mt-4 p-3 bg-gray-700 rounded",
    title: "text-xs text-gray-400 mb-2",
    grid: "grid grid-cols-2 gap-2 text-sm"
  },

  // Información adicional
  additionalInfo: {
    container: "bg-gray-800 rounded-lg p-4",
    title: "text-lg font-semibold mb-3",
    grid: "grid grid-cols-2 gap-4 text-sm",
    separator: "col-span-2 pt-2 border-t border-gray-700"
  },

  // Visualizaciones especiales
  visualizations: {
    gaugeContainer: "relative h-32 w-32 mx-auto",
    gaugeCenter: "absolute inset-0 flex items-center justify-center",
    gaugeValue: "text-xl font-bold text-white",
    gaugeUnit: "text-xs text-gray-400",
    
    thermometerContainer: "flex items-center justify-center h-32",
    thermometerTube: "relative w-6 h-28 bg-gray-700 rounded-full overflow-hidden",
    thermometerBulb: "absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full -mb-1",
    thermometerLabel: "ml-3 text-center",
    
    circularContainer: "relative h-24 w-24 mx-auto",
    circularCenter: "absolute inset-0 flex items-center justify-center",
    circularValue: "text-sm font-bold text-white",
    circularUnit: "text-xs text-gray-400"
  }
};

// Colores específicos por tipo de sensor
export const sensorColors = {
  temperature: {
    primary: '#EF4444',
    primaryAlpha: 'rgba(239, 68, 68, 0.8)',
    secondary: 'rgba(239, 68, 68, 0.1)',
    icon: '🌡️'
  },
  humidity: {
    primary: '#3B82F6',
    primaryAlpha: 'rgba(59, 130, 246, 0.8)',
    secondary: 'rgba(59, 130, 246, 0.1)',
    icon: '💧'
  },
  co2: {
    primary: '#A855F7',
    primaryAlpha: 'rgba(168, 85, 247, 0.8)',
    secondary: 'rgba(168, 85, 247, 0.1)',
    icon: '🫁'
  },
  occupancy: {
    primary: '#10B981',
    primaryAlpha: 'rgba(16, 185, 129, 0.8)',
    secondary: 'rgba(16, 185, 129, 0.1)',
    icon: '👥'
  },
  light: {
    primary: '#F59E0B',
    primaryAlpha: 'rgba(245, 158, 11, 0.8)',
    secondary: 'rgba(245, 158, 11, 0.1)',
    icon: '💡'
  },
  default: {
    primary: '#6B7280',
    primaryAlpha: 'rgba(107, 114, 128, 0.8)',
    secondary: 'rgba(107, 114, 128, 0.1)',
    icon: '📊'
  }
};

// Funciones de utilidad para estilos
export const getStatusColor = (status: string, hasError?: boolean) => {
  if (hasError) return sensorPanelStyles.text.errorText;
  
  switch (status?.toLowerCase()) {
    case 'active': return sensorPanelStyles.text.successText;
    case 'inactive': return sensorPanelStyles.text.label;
    case 'error': return sensorPanelStyles.text.errorText;
    case 'maintenance': return 'text-yellow-400';
    case 'calibrating': return 'text-blue-400';
    default: return 'text-gray-500';
  }
};

export const getStatusBadge = (status: string, hasError?: boolean) => {
  const baseClasses = sensorPanelStyles.badges.base;
  
  if (hasError) return `${baseClasses} ${sensorPanelStyles.badges.error}`;
  
  switch (status?.toLowerCase()) {
    case 'active': 
      return `${baseClasses} ${sensorPanelStyles.badges.active}`;
    case 'inactive': 
      return `${baseClasses} ${sensorPanelStyles.badges.inactive}`;
    case 'error': 
      return `${baseClasses} ${sensorPanelStyles.badges.error}`;
    case 'maintenance': 
      return `${baseClasses} ${sensorPanelStyles.badges.maintenance}`;
    default: 
      return `${baseClasses} ${sensorPanelStyles.badges.inactive}`;
  }
};

export const getQualityColor = (quality?: string, value?: number, thresholds?: any) => {
  if (!quality && !value) return sensorPanelStyles.quality.default;
  
  if (thresholds && value !== undefined) {
    if (thresholds.critical?.min !== undefined && value < thresholds.critical.min) 
      return sensorPanelStyles.quality.criticalBg;
    if (thresholds.critical?.max !== undefined && value > thresholds.critical.max) 
      return sensorPanelStyles.quality.criticalBg;
    if (thresholds.warning?.min !== undefined && value < thresholds.warning.min) 
      return sensorPanelStyles.quality.warningBg;
    if (thresholds.warning?.max !== undefined && value > thresholds.warning.max) 
      return sensorPanelStyles.quality.warningBg;
  }

  switch (quality?.toLowerCase()) {
    case 'good': return sensorPanelStyles.quality.good;
    case 'warning': return sensorPanelStyles.quality.warning;
    case 'critical': return sensorPanelStyles.quality.critical;
    default: return sensorPanelStyles.quality.default;
  }
};

export const getSensorItemClass = (sensor: any, selectedSensor: any, hasError: boolean) => {
  const base = sensorPanelStyles.sensorItem.base;
  
  if (selectedSensor?.sensorId === sensor.sensorId) {
    return `${base} ${sensorPanelStyles.sensorItem.selected}`;
  }
  
  if (hasError) {
    return `${base} ${sensorPanelStyles.sensorItem.error}`;
  }
  
  return `${base} ${sensorPanelStyles.sensorItem.normal}`;
};

export const getSensorColor = (type: string) => {
  return sensorColors[type as keyof typeof sensorColors] || sensorColors.default;
};

export const getSensorIcon = (type: string) => {
  return getSensorColor(type).icon;
};

// CSS personalizado para scrollbar
export const customScrollbarCSS = `
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #4B5563 #1F2937;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1F2937;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }
  
  .bg-gray-750 {
    background-color: #374151;
  }
`;