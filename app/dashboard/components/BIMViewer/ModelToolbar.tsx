// src/components/ModelToolbar.tsx - Con botón de prueba HeatMap

import React, { useState, useEffect } from 'react';
import * as FRAGS from '@thatopen/fragments';
import * as OBC from '@thatopen/components';
import { 
  Home, 
  Layers, 
  Database, 
  Palette, 
  FileText, 
  Filter, 
  Info,
  Calendar,
  Bot,
  Activity,
  BarChart3,
  Thermometer,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  TestTube,
} from 'lucide-react';

interface ModelToolbarProps {
  onCenterModel: () => void;
  models: FRAGS.FragmentsModel[];
  fragments: FRAGS.FragmentsModels | null;
  onSectionClick: (section: string, isDoubleClick?: boolean) => void;
  selectedItem: { model: FRAGS.FragmentsModel; localId: number } | null;
  onPropertyPanelToggle: (show: boolean) => void;
  onInventoryClick: () => void;
  onSpacesPanelToggle: () => void;
  onArtworksClick: () => void;
  onAIAssistantToggle: () => void;
  onSensorsPanelToggle: () => void;
  world: OBC.World | null;
  onHeatmapPanelToggle: () => void;
  // ⭐ NUEVA PROP PARA PRUEBA
  onHeatMapTestToggle: () => void; // Nueva función para la prueba
  hasHeatmapData?: boolean;
  isHeatmapActive?: boolean;
  onIoTPredictiveToggle: () => void;
  onIoTReportsToggle: () => void;
}

const ModelToolbar: React.FC<ModelToolbarProps> = ({
  onCenterModel,
  models,
  fragments,
  onSectionClick,
  selectedItem,
  onPropertyPanelToggle,
  onInventoryClick,
  onSpacesPanelToggle,
  onArtworksClick,
  onAIAssistantToggle,
  onSensorsPanelToggle,
  onHeatmapPanelToggle,
  onHeatMapTestToggle, // ⭐ NUEVA PROP
  world,
  hasHeatmapData = false,
  isHeatmapActive = false,
  onIoTPredictiveToggle,
  onIoTReportsToggle,
}) => {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoCollapse, setAutoCollapse] = useState(true);

  // Auto-colapsar después de inactividad
  useEffect(() => {
    if (!autoCollapse || !isExpanded) return;

    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 30000);

    return () => clearTimeout(timer);
  }, [isExpanded, autoCollapse]);

  const handleSectionClick = (section: string) => {
    onSectionClick(section, false);
    if (autoCollapse) {
      setTimeout(() => setIsExpanded(false), 500);
    }
  };

  const handleSectionDoubleClick = (section: string) => {
    onSectionClick(section, true);
  };

  // ⭐ GRUPOS DE BOTONES ACTUALIZADOS
  const buttonGroups = [
    {
      id: 'navigation',
      buttons: [
        { id: 'Home', icon: Home, label: 'Home', action: onCenterModel, always: true }
      ]
    },
    {
      id: 'models',
      buttons: [
        { id: 'Models', icon: Layers, label: 'Models', action: () => handleSectionClick('Models') },
        { id: 'Psets', icon: FileText, label: 'Props', action: () => onPropertyPanelToggle(true), requiresSelection: true },
        { id: 'AddInf', icon: Info, label: 'Info', action: () => handleSectionClick('AddInf'), requiresSelection: true }
      ]
    },
    {
      id: 'panels',
      buttons: [
        { id: 'Inventory', icon: Database, label: 'Inv', action: onInventoryClick, requiresModels: true },
        { id: 'Spaces', icon: Home, label: 'Spaces', action: onSpacesPanelToggle, requiresModels: true },
        { id: 'ArtWorks', icon: Palette, label: 'Art', action: onArtworksClick, requiresModels: true },
        { id: 'AddAct', icon: Calendar, label: 'Act', action: () => handleSectionClick('AddAct'), requiresModels: true }
      ]
    },
    {
      id: 'advanced',
      buttons: [
        { id: 'AIAssistant', icon: Bot, label: 'AI', action: onAIAssistantToggle, requiresModels: true },
        { id: 'IoTPredictive', icon: BarChart3, label: 'Pred', action: onIoTPredictiveToggle, requiresModels: true },
        { id: 'IoTReports', icon: FileText, label: 'Rep', action: onIoTReportsToggle, requiresModels: true },
        { id: 'Sensors', icon: Activity, label: 'IoT', action: onSensorsPanelToggle },
        { id: 'Heatmap', icon: isHeatmapActive ? Thermometer : BarChart3, label: 'Heat', action: onHeatmapPanelToggle, special: 'heatmap' },
        // ⭐ NUEVO BOTÓN DE PRUEBA
        { 
          id: 'HeatMapTest', 
          icon: TestTube, 
          label: 'Test', 
          action: onHeatMapTestToggle, 
          requiresModels: true,
          special: 'test'
        }
      ]
    }
  ];

  // Función para determinar si un botón debe estar habilitado
  const isButtonEnabled = (button: any) => {
    if (button.requiresSelection && !selectedItem) return false;
    if (button.requiresModels && models.length === 0) return false;
    if (button.special === 'heatmap' && !hasHeatmapData) return false;
    return true;
  };

  // ⭐ FUNCIÓN ACTUALIZADA PARA ESTILOS CON BOTÓN DE PRUEBA
  const getCompactButtonStyle = (button: any) => {
    const baseStyle = "flex flex-col items-center justify-center p-1.5 rounded-md transition-all duration-200 min-w-[32px] min-h-[32px] group relative";
    const isEnabled = isButtonEnabled(button);
    
    if (!isEnabled) {
      return `${baseStyle} bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-40`;
    }
    
    // ⭐ ESTILO ESPECIAL PARA BOTÓN DE PRUEBA
    if (button.special === 'test') {
      return `${baseStyle} bg-gradient-to-br from-green-500 to-teal-500 text-white shadow-lg hover:from-green-400 hover:to-teal-400 hover:shadow-xl`;
    }
    
    // Estilos especiales existentes
    if (button.special === 'heatmap' && isHeatmapActive) {
      return `${baseStyle} bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg`;
    }
    
    if (button.always) {
      return `${baseStyle} bg-blue-600 hover:bg-blue-500 text-white shadow-md hover:shadow-lg`;
    }
    
    return `${baseStyle} bg-gray-600/80 hover:bg-gray-500 text-gray-200 hover:text-white cursor-pointer hover:shadow-md`;
  };

  // ⭐ FUNCIÓN ACTUALIZADA PARA TOOLTIPS CON BOTÓN DE PRUEBA
  const getTooltipText = (button: any) => {
    if (!isButtonEnabled(button)) {
      if (button.requiresSelection) return "Selecciona un elemento primero";
      if (button.requiresModels) return "Carga un modelo primero";
      if (button.special === 'heatmap') return "No hay datos de sensores";
    }
    
    switch (button.id) {
      case 'Home': return "Centrar vista";
      case 'Models': return "Gestión de modelos";
      case 'Psets': return "Ver propiedades";
      case 'AddInf': return "Añadir información";
      case 'Inventory': return "Inventario";
      case 'Spaces': return "Espacios";
      case 'ArtWorks': return "Obras de arte";
      case 'AddAct': return "Actividades";
      case 'AIAssistant': return "Asistente IA";
      case 'IoTPredictive': return "Análisis Predictivo IoT";
      case 'IoTReports': return "Reportes IoT";
      case 'Sensors': return "Sensores IoT";
      case 'Heatmap': return isHeatmapActive ? "Cerrar mapa de calor" : "Abrir mapa de calor";
      case 'HeatMapTest': return "🧪 Prueba de HeatMap - Colores aleatorios"; // ⭐ NUEVO TOOLTIP
      default: return button.label;
    }
  };

  // Función para manejar clicks con verificación de habilitación
  const handleButtonClick = (button: any) => {
    if (!isButtonEnabled(button)) {
      console.log(`Button ${button.id} is disabled`);
      return;
    }
    button.action();
  };

  // Renderizar botón compacto
  const renderCompactButton = (button: any, showLabel = false) => (
    <button
      key={button.id}
      onClick={() => handleButtonClick(button)}
      onDoubleClick={() => button.id !== 'Home' && handleSectionDoubleClick(button.id)}
      className={getCompactButtonStyle(button)}
      title={getTooltipText(button)}
    >
      <button.icon size={14} />
      {showLabel && (
        <span className="text-xs mt-0.5 leading-none">{button.label}</span>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {getTooltipText(button)}
      </div>
    </button>
  );

  // Estado minimizado (solo botón de toggle)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="Mostrar toolbar"
        >
          <Menu size={16} className="text-gray-200" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/3 z-40">
      <div className="relative">
        {/* Toolbar expandido */}
        <div 
          className={`bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-xl shadow-2xl transition-all duration-300 ${
            isExpanded ? 'p-3' : 'p-2'
          }`}
          onMouseEnter={() => autoCollapse && setIsExpanded(true)}
          onMouseLeave={() => autoCollapse && setTimeout(() => setIsExpanded(false), 20000)}
        >
          {/* Vista colapsada - Solo botones esenciales */}
          {!isExpanded && (
            <div className="flex items-center space-x-1">
              {/* Botón Home siempre visible */}
              {renderCompactButton(buttonGroups[0].buttons[0])}
              
              {/* Separador */}
              <div className="w-px h-6 bg-gray-600 mx-1"></div>
              
              {/* Botones más usados */}
              {renderCompactButton(buttonGroups[1].buttons[0])} {/* Models */}
              {renderCompactButton(buttonGroups[2].buttons[1])} {/* Spaces */}
              {renderCompactButton(buttonGroups[3].buttons[1])} {/* Sensors */}
              
              {/* ⭐ BOTÓN DE PRUEBA SIEMPRE VISIBLE */}
              {models.length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-600 mx-1"></div>
                  {renderCompactButton(buttonGroups[3].buttons[3])} {/* HeatMapTest */}
                </>
              )}
              
              {/* Indicador de heatmap si está activo */}
              {isHeatmapActive && (
                <>
                  <div className="w-px h-6 bg-gray-600 mx-1"></div>
                  {renderCompactButton(buttonGroups[3].buttons[2])} {/* Heatmap */}
                </>
              )}
              
              {/* Botón de expansión */}
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center justify-center p-1.5 rounded-md bg-gray-600 hover:bg-gray-500 text-gray-200 transition-all duration-200 ml-1"
                title="Expandir toolbar"
              >
                <ChevronUp size={12} />
              </button>
            </div>
          )}

          {/* Vista expandida - Todos los botones */}
          {isExpanded && (
            <div className="space-y-3">
              {/* Header con controles */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">BIM Toolbar</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setAutoCollapse(!autoCollapse)}
                    className={`p-1 rounded text-xs ${autoCollapse ? 'text-green-400' : 'text-gray-400'}`}
                    title={autoCollapse ? "Auto-colapso activado" : "Auto-colapso desactivado"}
                  >
                    ●
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Colapsar"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                    title="Minimizar"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Grupos de botones */}
              <div className="flex flex-wrap gap-2">
                {buttonGroups.map((group, groupIndex) => (
                  <React.Fragment key={group.id}>
                    {groupIndex > 0 && <div className="w-px h-8 bg-gray-600 mx-1"></div>}
                    <div className="flex flex-wrap gap-1">
                      {group.buttons.map(button => renderCompactButton(button, true))}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* ⭐ INFORMACIÓN ADICIONAL PARA PRUEBA */}
              {models.length > 0 && (
                <div className="pt-2 border-t border-gray-600">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Prueba HeatMap:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">🧪</span>
                      <span className="text-gray-300">Disponible</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de estado */}
              {hasHeatmapData && (
                <div className="pt-2 border-t border-gray-600">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Sensores:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-red-400">🌡️</span>
                      <span className="text-blue-400">👥</span>
                      {isHeatmapActive && (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                          <span className="text-purple-400 font-medium">Activo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Indicadores de estado del modelo */}
              <div className="pt-1 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Modelos: {models.length}</span>
                  {selectedItem && (
                    <span className="text-green-400">● Elemento seleccionado</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelToolbar;