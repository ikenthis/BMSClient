// AITabs/AnalysisTab.tsx
import React from 'react';
import aiAssistantService, { Message } from '../../services/aiAssistantService';

interface AnalysisTabProps {
  selectedElement?: any;
  modelData?: any;
  elementsData?: any;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setActiveTab: (tab: string) => void;
}

const AnalysisTab: React.FC<AnalysisTabProps> = ({
  modelData,
  isLoading,
  setIsLoading,
  setError,
  messages,
  setMessages,
  setActiveTab
}) => {
  // Manejar análisis espacial
  const handleSpaceAnalysis = async (type: 'efficiency' | 'optimization' | 'energy' | 'compliance') => {
    setIsLoading(true);
    
    try {
      // Usar el servicio para realizar el análisis
      const response = await aiAssistantService.analyzeSpace(type, modelData);
      
      // Crear mensajes para el historial
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Análisis de ${type === 'efficiency' ? 'eficiencia espacial' : 
                         type === 'optimization' ? 'optimización de distribución' : 
                         type === 'energy' ? 'consumo energético' : 
                         'cumplimiento normativo'}`,
        timestamp: new Date()
      };
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '-analysis',
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      setActiveTab('chat'); // Cambiar a la pestaña de chat para mostrar el resultado
    } catch (err) {
      console.error('Error al realizar análisis espacial:', err);
      setError('Error al realizar el análisis. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-space-analysis">
      <h3>Análisis de Espacios e Instalaciones</h3>
      <p>Claude analizará tu modelo para proporcionar insights valiosos sobre el uso de espacios, eficiencia energética y optimización de recursos.</p>
      
      <div className="analysis-options">
        <button
          className="analysis-button"
          onClick={() => handleSpaceAnalysis('efficiency')}
          disabled={isLoading}
        >
          <div className="button-icon">📊</div>
          <div className="button-text">
            <h4>Eficiencia Espacial</h4>
            <p>Analiza el uso actual de espacios y sugiere mejoras</p>
          </div>
        </button>
        
        <button
          className="analysis-button"
          onClick={() => handleSpaceAnalysis('optimization')}
          disabled={isLoading}
        >
          <div className="button-icon">🔄</div>
          <div className="button-text">
            <h4>Optimización de Distribución</h4>
            <p>Sugiere reorganizaciones para mejorar flujos y funcionalidad</p>
          </div>
        </button>
        
        <button
          className="analysis-button"
          onClick={() => handleSpaceAnalysis('energy')}
          disabled={isLoading}
        >
          <div className="button-icon">⚡</div>
          <div className="button-text">
            <h4>Análisis Energético</h4>
            <p>Evalúa el consumo de energía y propone mejoras</p>
          </div>
        </button>
        
        <button
          className="analysis-button"
          onClick={() => handleSpaceAnalysis('compliance')}
          disabled={isLoading}
        >
          <div className="button-icon">📋</div>
          <div className="button-text">
            <h4>Conformidad Normativa</h4>
            <p>Verifica el cumplimiento de normas y regulaciones</p>
          </div>
        </button>
      </div>
      
      {isLoading && (
        <div className="analysis-loading">
          <p>Analizando... Por favor espera.</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisTab;