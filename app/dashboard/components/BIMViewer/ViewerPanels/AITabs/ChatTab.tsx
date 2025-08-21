// AITabs/ChatTab.tsx
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import aiAssistantService, { Message } from '../../services/aiAssistantService';

interface ChatTabProps {
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
  hasModelData: boolean;
}

const ChatTab: React.FC<ChatTabProps> = ({
  selectedElement,
  modelData,
  elementsData,
  isLoading,
  setIsLoading,
  error,
  setError,
  messages,
  setMessages,
  setActiveTab,
  hasModelData
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll al fondo cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Función para formatear la información del elemento
  const formatElementInfo = (elementInfo: any): string => {
    if (!elementInfo) return 'No se encontró información para este elemento.';
    
    let formatted = `# Información del Elemento\n\n`;
    formatted += `**GUID:** ${elementInfo.elementUuid}\n`;
    formatted += `**Nombre:** ${elementInfo.elementName || 'Sin nombre'}\n`;
    formatted += `**Tipo:** ${elementInfo.elementType || 'No especificado'}\n`;
    formatted += `**Categoría:** ${elementInfo.category || 'No categorizado'}\n`;
    
    if (elementInfo.location) {
      formatted += `**Ubicación:** ${elementInfo.location}\n`;
    }
    
    // Fechas importantes
    if (elementInfo.installationDate || elementInfo.nextMaintenanceDate) {
      formatted += `\n## Fechas Importantes\n\n`;
      
      if (elementInfo.installationDate) {
        const installDate = new Date(elementInfo.installationDate);
        formatted += `**Instalación:** ${installDate.toLocaleDateString()}\n`;
      }
      
      if (elementInfo.nextMaintenanceDate) {
        const nextMaintDate = new Date(elementInfo.nextMaintenanceDate);
        const today = new Date();
        const daysDiff = Math.ceil((nextMaintDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        formatted += `**Próximo mantenimiento:** ${nextMaintDate.toLocaleDateString()}`;
        
        if (daysDiff < 0) {
          formatted += ` (⚠️ vencido hace ${Math.abs(daysDiff)} días)\n`;
        } else if (daysDiff <= 30) {
          formatted += ` (⏰ en ${daysDiff} días)\n`;
        } else {
          formatted += `\n`;
        }
      }
    }
    
    // Propiedades
    if (elementInfo.properties && Object.keys(elementInfo.properties).length > 0) {
      formatted += `\n## Propiedades\n\n`;
      
      for (const [key, value] of Object.entries(elementInfo.properties)) {
        formatted += `**${key}:** ${value}\n`;
      }
    }
    
    // Historial
    if (elementInfo.history && elementInfo.history.length > 0) {
      formatted += `\n## Historial de Mantenimiento\n\n`;
      
      // Ordenar por fecha (más reciente primero)
      const sortedHistory = [...elementInfo.history].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      sortedHistory.slice(0, 5).forEach((record, index) => {
        const recordDate = new Date(record.date);
        formatted += `### ${recordDate.toLocaleDateString()} - ${record.action.toUpperCase()}\n`;
        formatted += `${record.description || 'Sin descripción'}\n`;
        
        if (record.technician) {
          formatted += `👨‍🔧 Técnico: ${record.technician}\n`;
        }
        
        if (index < Math.min(sortedHistory.length - 1, 4)) {
          formatted += `\n`;
        }
      });
      
      if (sortedHistory.length > 5) {
        formatted += `\n*...y ${sortedHistory.length - 5} registros más*\n`;
      }
    }
    
    return formatted;
  };

  // Manejar el envío de mensajes
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Verificar si es una consulta de GUID
    const guidPattern = /(?:buscar|consultar|información|info|elemento)?\s*(?:con\s+)?(?:guid|id)\s*[:\s]?\s*([a-fA-F0-9-]{8,})/i;
    const directGuidPattern = /^[a-fA-F0-9-]{20,}$/i; // GUID directo
    const guidMatch = inputValue.match(guidPattern) || (inputValue.match(directGuidPattern) ? [inputValue, inputValue] : null);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Si es una consulta de GUID, manejarla específicamente
      if (guidMatch && guidMatch[1] && guidMatch[1].length >= 8) {
        const guid = guidMatch[1];
        console.log(`Detectada consulta de GUID: ${guid}`);
        
        // Usar la función específica
        const response = await aiAssistantService.getElementInfoByGuid(guid);
        
        if (response.status === 'success' && response.data.elementInfo) {
          // Formatear la información
          const formattedInfo = formatElementInfo(response.data.elementInfo);
          
          const assistantMessage: Message = {
            id: Date.now().toString() + '-element-info',
            role: 'assistant',
            content: formattedInfo,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          const errorMessage: Message = {
            id: Date.now().toString() + '-error',
            role: 'assistant',
            content: `❌ No se encontró información para el elemento con GUID: ${guid}`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Procesar normalmente para otras consultas
        const context = {
          selectedElement,
          modelInfo: modelData,
          elementsData: elementsData
        };
        
        console.log("Enviando contexto a AI:", context);
        
        // Usar el servicio para enviar la solicitud
        const response = await aiAssistantService.sendMessage(
          userMessage.content,
          context,
          messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        );
        
        const assistantMessage: Message = {
          id: Date.now().toString() + '-response',
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Error al comunicarse con el asistente IA:', err);
      setError('Error al comunicarse con el asistente. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar tecla Enter para enviar mensajes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Sugerencias según el modelo y elementos seleccionados
  const suggestedQueries = [
    "¿Cuál es el ciclo de mantenimiento recomendado para este tipo de elemento?",
    "Sugiere mejoras de eficiencia energética para este edificio",
    "¿Qué normativas debo considerar para este tipo de instalación?",
    "Genera un plan de mantenimiento anual para este modelo",
    "Compara costos entre mantenimiento preventivo y correctivo"
  ];

  return (
    <>
      {/* Mostrar advertencia si no hay datos del modelo */}
      {!hasModelData && (
        <div className="model-data-warning">
          <p>⚠️ <strong>El asistente no puede acceder a los datos del modelo.</strong> Algunas preguntas sobre elementos no funcionarán correctamente.</p>
          <button 
            className="warning-action"
            onClick={() => setActiveTab('diagnostic')}
          >
            Ver diagnóstico
          </button>
        </div>
      )}
      
      <div className="messages-container">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-content">
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {messages.length > 0 && messages.length < 3 && (
        <div className="suggested-queries">
          <p>Sugerencias:</p>
          <div className="query-buttons">
            {suggestedQueries.slice(0, 3).map((query, index) => (
              <button
                key={index}
                className="query-button"
                onClick={() => {
                  setInputValue(query);
                }}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="input-container">
        <textarea
          className="message-input"
          placeholder="Escribe tu consulta sobre facility management..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={Math.min(4, Math.max(1, inputValue.split('\n').length))}
        />
        <button
          className="send-button"
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      
      <div className="powered-by">
        <span>Asistente potenciado por Claude de Anthropic</span>
      </div>
    </>
  );
};

export default ChatTab;