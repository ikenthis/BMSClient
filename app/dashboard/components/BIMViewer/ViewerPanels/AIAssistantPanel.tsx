// AIAssistantPanel.tsx - Componente principal corregido
import React, { useState, useEffect } from 'react';
import { Message } from '../services/aiAssistantService';
import ChatTab from './AITabs/ChatTab';
import ActionTab from './AITabs/ActionTab';
import FacilitICPTab from './AITabs/FacilitICPTab';
import BIMIntelligenceTab from './AITabs/BIMIntelligenceTab';
import AnalysisTab from './AITabs/AnalysisTab';
import DiagnosticTab from './AITabs/DiagnosticTab';
import GuidSearchPanel from './AITabs/GuidSearchPanel';
import EnhancedPredictiveTab from './AITabs/EnhancedPredictiveTab';
import '../styles/EnhancedPredictiveTab.css';
import '../styles/AIAssistantPanel.css';
import '../styles/SpaceManagementTab.css';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement?: any;
  modelData?: any;
  elementsData?: any;
  onReloadModelData?: () => Promise<void>;
  aiAgent?: any;
}

// Tipo actualizado para incluir el nuevo tab
type TabType = 'chat' | 'faciliticp' | 'analysis' | 'diagnostic' | 'action' | 'bimintelligence' | 'enhanced-predictive';

// Contador global para generar IDs únicos
let messageIdCounter = 0;

// Función helper para generar IDs únicos
const generateUniqueId = (): string => {
  messageIdCounter++;
  return `msg-${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  selectedElement,
  modelData,
  elementsData,
  onReloadModelData,
  aiAgent
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [showGuidSearch, setShowGuidSearch] = useState(false);

  // Verificar si hay datos del modelo disponibles
  const hasModelData = elementsData && 
                     elementsData.totalElements && 
                     elementsData.totalElements > 0;

  // Al montar el componente, cargar conversación previa o iniciar una nueva
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg-001',
          role: 'assistant',
          content: 'Bienvenido a CrownGPT, tu asistente de IA para Facility Management. Como experto en gestión de instalaciones, puedo ayudarte con mantenimiento predictivo, optimización de espacios, análisis energético y más. ¿En qué puedo asistirte hoy?',
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Efecto separado para comprobar los datos del modelo y mostrar el diagnóstico
  useEffect(() => {
    if (isOpen && !hasModelData && activeTab === 'chat') {
      console.log("No hay datos del modelo, mostrando tab de diagnóstico");
      setActiveTab('diagnostic');
    }
  }, [isOpen, hasModelData, activeTab]);

  // Función para manejar la ejecución de acciones BIM
  const handleBimActionExecuted = (action: string, result: any) => {
    try {
      // Crear un mensaje simple y directo con la info que quieres ver
      let content = `# Análisis de Elementos\n\n`;
      content += `**Total de elementos: ${result.result.totalElements}**\n\n`;
      content += `## Distribución por tipo:\n\n`;
      
      // Extraer y ordenar los tipos (de mayor a menor cantidad)
      const sortedTypes = Object.entries(result.result.counts)
        .sort(([, a], [, b]) => Number(b) - Number(a));
      
      // Mostrar todos los tipos en una lista numerada
      sortedTypes.forEach(([type, count], index) => {
        const percentage = ((Number(count) / result.result.totalElements) * 100).toFixed(1);
        content += `${index+1}. **${type}**: ${count} (${percentage}%)\n`;
      });
      
      // Añadir el mensaje directamente con ID único
      setMessages(prev => [...prev, {
        id: generateUniqueId(),
        role: 'assistant',
        content: content,
        timestamp: new Date()
      }]);
      
      // Mostrar el chat
      setActiveTab('chat');
    } catch (error) {
      console.error('Error al procesar acción BIM:', error);
      setError('Error al procesar la acción BIM');
    }
  };

  // Función para limpiar errores cuando se cambia de tab
  const handleTabChange = (newTab: TabType) => {
    setError(null);
    setActiveTab(newTab);
  };

  // Props comunes para todos los tabs
  const commonTabProps = {
    selectedElement,
    modelData,
    elementsData,
    isLoading,
    setIsLoading,
    error,
    setError,
    messages,
    setMessages,
    setActiveTab: (tab: string) => handleTabChange(tab as TabType),
    hasModelData,
    onReloadModelData,
    generateUniqueId // Pasar la función a los tabs hijos
  };

  // No renderizar nada si el panel está cerrado
  if (!isOpen) return null;

  return (
    <div className="ai-assistant-panel">
      <div className="panel-header">
        <h2>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ marginRight: '8px' }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          CrownGPT - Asistente IA
        </h2>
        <button className="close-button" onClick={onClose} aria-label="Cerrar panel">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="panel-tabs" role="tablist">
        <button 
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => handleTabChange('chat')}
          role="tab"
          aria-selected={activeTab === 'chat'}
          aria-label="Tab de chat"
        >
          💬 Chat
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'enhanced-predictive' ? 'active' : ''}`}
          onClick={() => handleTabChange('enhanced-predictive')}
          role="tab"
          aria-selected={activeTab === 'enhanced-predictive'}
          aria-label="Tab de análisis predictivo"
        >
          <span className="tab-icon">🧠</span> Predictivo
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'action' ? 'active' : ''}`}
          onClick={() => handleTabChange('action')}
          role="tab"
          aria-selected={activeTab === 'action'}
          aria-label="Tab de acciones directas"
        >
          <span className="tab-icon">🤖</span> Acción Directa
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'faciliticp' ? 'active' : ''}`}
          onClick={() => handleTabChange('faciliticp')}
          role="tab"
          aria-selected={activeTab === 'faciliticp'}
          aria-label="Tab de FacilitICP"
        >
          <span className="tab-icon">🏭</span> FacilitICP
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'bimintelligence' ? 'active' : ''}`}
          onClick={() => handleTabChange('bimintelligence')}
          role="tab"
          aria-selected={activeTab === 'bimintelligence'}
          aria-label="Tab de BIM Intelligence"
        >
          <span className="tab-icon">🏢</span> BIM Intelligence
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => handleTabChange('analysis')}
          role="tab"
          aria-selected={activeTab === 'analysis'}
          aria-label="Tab de análisis"
        >
          📊 Análisis
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'diagnostic' ? 'active' : ''} ${!hasModelData ? 'warning' : ''}`}
          onClick={() => handleTabChange('diagnostic')}
          role="tab"
          aria-selected={activeTab === 'diagnostic'}
          aria-label="Tab de diagnóstico"
          title={!hasModelData ? 'No hay datos del modelo disponibles' : 'Diagnóstico del sistema'}
        >
          {!hasModelData && '⚠️ '}🔧 Diagnóstico
        </button>
      </div>

      {/* Panel de búsqueda por GUID */}
      <GuidSearchPanel 
        showGuidSearch={showGuidSearch}
        setShowGuidSearch={setShowGuidSearch}
        messages={messages}
        setMessages={setMessages}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        setError={setError}
        generateUniqueId={generateUniqueId}
      />
      
      <div className="panel-content" role="tabpanel">
        {/* Error global del panel */}
        {error && (
          <div className="panel-error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button 
              className="error-dismiss"
              onClick={() => setError(null)}
              aria-label="Cerrar error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Indicador de carga global */}
        {isLoading && (
          <div className="panel-loading-indicator">
            <div className="loading-spinner-small"></div>
            <span>Procesando...</span>
          </div>
        )}

        {/* Contenido de los tabs */}
        {activeTab === 'chat' && (
          <ChatTab {...commonTabProps} />
        )}
        
        {activeTab === 'enhanced-predictive' && (
          <EnhancedPredictiveTab {...commonTabProps} />
        )}
        
        {activeTab === 'action' && (
          <ActionTab {...commonTabProps} aiAgent={aiAgent} />
        )}
        
        {activeTab === 'faciliticp' && (
          <FacilitICPTab {...commonTabProps} />
        )}
        
        {activeTab === 'bimintelligence' && (
          <BIMIntelligenceTab 
            {...commonTabProps} 
            aiAgent={aiAgent}
            onActionExecuted={handleBimActionExecuted}
          />
        )}
        
        {activeTab === 'analysis' && (
          <AnalysisTab {...commonTabProps} />
        )}
        
        {activeTab === 'diagnostic' && (
          <DiagnosticTab {...commonTabProps} />
        )}
      </div>

      {/* Información del sistema en la parte inferior */}
      <div className="panel-footer">
        <div className="system-status">
          <span className={`status-indicator ${hasModelData ? 'online' : 'offline'}`}></span>
          <span className="status-text">
            {hasModelData ? 
              `${elementsData?.totalElements || 0} elementos cargados` : 
              'Sin datos del modelo'
            }
          </span>
        </div>
        
        {selectedElement && (
          <div className="selected-element-info">
            <span className="element-icon">🎯</span>
            <span className="element-name">
              {selectedElement.elementName || selectedElement.name || 'Elemento seleccionado'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistantPanel;