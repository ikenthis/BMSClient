// AITabs/IoTPredictiveTab.tsx - Versión con Chatbot integrado
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../services/aiAssistantService';
import './styles/IoTPredictiveTab.css';

interface IoTPredictiveTabProps {
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
  generateUniqueId: () => string;
}

const API_URL = process.env.API_COLLECTION || 'http://localhost:4000/api';

const IoTPredictiveTab: React.FC<IoTPredictiveTabProps> = ({
  isLoading,
  setIsLoading,
  error,
  setError,
  messages,
  setMessages,
  setActiveTab,
  generateUniqueId
}) => {
  const [customQuery, setCustomQuery] = useState('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'query' | 'dashboard' | 'chatbot'>('query');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático al último mensaje del chat
  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Verificar conexión al backend al montar
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/iot-predictive/test`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setConnectionStatus('connected');
        console.log('✅ Backend IoT conectado:', data);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('❌ Error conectando con backend IoT:', error);
      setConnectionStatus('disconnected');
    }
  };

  // Función unificada para procesar consultas y actualizar chat
  const processQuery = async (query: string, source: 'custom' | 'preset', endpoint?: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    // Agregar mensaje del usuario al chat inmediatamente
    setChatMessages(prev => [...prev, userMessage]);
    setMessages(prev => [...prev, userMessage]);

    setIsChatLoading(true);
    setError(null);

    try {
      let response;
      
      if (source === 'custom') {
        // Consulta dinámica personalizada
        response = await fetch(`${API_URL}/iot-predictive/consulta-dinamica`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ query })
        });
      } else {
        // Análisis predefinido
        response = await fetch(`${API_URL}/iot-predictive/${endpoint}`, {
          credentials: 'include'
        });
      }

      const data = await response.json();
      console.log('📊 Respuesta recibida:', data);

      if (data.status === 'success') {
        const analysisText = data.analisis || data.reporte || data.deteccion || formatAnalysisResult(data);
        
        // Mostrar respuesta en la sección actual si no es chatbot
        if (activeSection !== 'chatbot') {
          setLastResponse(analysisText);
        }

        // Crear mensaje de respuesta del asistente
        const assistantMessage: Message = {
          id: generateUniqueId(),
          role: 'assistant',
          content: analysisText,
          timestamp: new Date()
        };

        // Agregar al chat del componente Y al chat global
        setChatMessages(prev => [...prev, assistantMessage]);
        setMessages(prev => [...prev, assistantMessage]);

        // Limpiar input si es desde consulta personalizada
        if (source === 'custom') {
          if (activeSection === 'chatbot') {
            setChatInput('');
          } else {
            setCustomQuery('');
          }
        }

      } else {
        setError(data.message || 'Error al procesar la consulta IoT');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setError('Error de conexión con el sistema IoT. Verifique que el backend esté ejecutándose.');
    } finally {
      setIsChatLoading(false);
      setIsLoading(false);
    }
  };

  const processCustomQuery = async () => {
    if (!customQuery.trim()) return;
    setIsLoading(true);
    await processQuery(customQuery, 'custom');
  };

  const processChatMessage = async () => {
    if (!chatInput.trim()) return;
    await processQuery(chatInput, 'custom');
  };

  const runPresetAnalysis = async (analysisType: string) => {
    setIsLoading(true);

    const analysisConfig = {
      'environmental': {
        endpoint: 'reporte-ambiental?periodo=dia',
        query: 'Reporte ambiental de las últimas 24 horas'
      },
      'anomalies': {
        endpoint: 'detectar-anomalias?periodo=dia',
        query: 'Detección de anomalías en sensores IoT'
      },
      'efficiency': {
        endpoint: 'eficiencia-energetica',
        query: 'Análisis de eficiencia energética del edificio'
      },
      'maintenance': {
        endpoint: 'predicciones-mantenimiento',
        query: 'Predicciones de mantenimiento preventivo'
      },
      'comfort': {
        endpoint: 'confort-ocupantes',
        query: 'Análisis de confort de ocupantes'
      },
      'dashboard': {
        endpoint: 'dashboard-ejecutivo?periodo=semana',
        query: 'Dashboard ejecutivo del sistema IoT'
      }
    };

    const config = analysisConfig[analysisType as keyof typeof analysisConfig];
    if (!config) return;

    console.log(`🔄 Ejecutando análisis: ${analysisType}`);
    await processQuery(config.query, 'preset', config.endpoint);
  };

  const formatAnalysisResult = (data: any) => {
    if (data.estadisticas) {
      return `**Análisis del Sistema IoT**\n\n` +
             `- Sensores activos: ${data.estadisticas.sensoresActivos || 0}\n` +
             `- Lecturas recientes: ${data.estadisticas.lecturasRecientes || 0}\n` +
             `- Cobertura: ${data.estadisticas.cobertura || 'N/A'}\n\n` +
             `${data.analisis || 'Análisis completado correctamente.'}`;
    }
    
    if (data.resumen) {
      return `**Resumen del Análisis**\n\n${JSON.stringify(data.resumen, null, 2)}`;
    }
    
    return JSON.stringify(data, null, 2);
  };

  const formatMessageContent = (content: string) => {
    // Procesar markdown básico
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  const clearChat = () => {
    setChatMessages([]);
    setError(null);
  };

  return (
    <div className="iot-predictive-container iot-predictive-tab">
      <h3 className="iot-header">🌡️ Análisis Predictivo IoT</h3>
      <p className="iot-description">Sistema inteligente de análisis predictivo para sensores de facility management.</p>

      {/* Estado de conexión */}
      <div className={`iot-connection-status ${connectionStatus}`}>
        {connectionStatus === 'checking' && '🔄 Verificando conexión...'}
        {connectionStatus === 'connected' && '✅ Sistema IoT conectado'}
        {connectionStatus === 'disconnected' && '❌ Sistema IoT desconectado'}
        {connectionStatus === 'disconnected' && (
          <button onClick={checkBackendConnection} className="iot-retry-btn">
            🔄 Reconectar
          </button>
        )}
      </div>

      {error && (
        <div className="iot-error-message">
          <span className="iot-error-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="iot-error-dismiss">✕</button>
        </div>
      )}

      {/* Navegación de secciones */}
      <div className="iot-section-tabs">
        <button 
          className={`iot-section-tab ${activeSection === 'query' ? 'active' : ''}`}
          onClick={() => setActiveSection('query')}
        >
          💬 Consulta IA
        </button>
        <button 
          className={`iot-section-tab ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSection('dashboard')}
        >
          📊 Análisis Rápidos
        </button>
        <button 
          className={`iot-section-tab ${activeSection === 'chatbot' ? 'active' : ''}`}
          onClick={() => setActiveSection('chatbot')}
        >
          🤖 Chatbot IoT
        </button>
      </div>

      {/* Consulta IA */}
      {activeSection === 'query' && (
        <div className="iot-query-section">
          <h4>Consulta Inteligente con IA</h4>
          <p>Realiza consultas complejas sobre el sistema IoT:</p>
          
          <div className="iot-query-examples">
            <p><strong>Ejemplos:</strong></p>
            <ul>
              <li>"¿Qué sensores presentan anomalías?"</li>
              <li>"Analiza la eficiencia energética del edificio"</li>
              <li>"¿Cuáles son las tendencias de temperatura?"</li>
              <li>"Predice qué sensores necesitarán mantenimiento"</li>
            </ul>
          </div>
          
          <div className="iot-query-input-section">
            <textarea
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Escribe tu consulta aquí..."
              className="iot-query-textarea"
              rows={4}
              disabled={isLoading}
            />
            <button 
              onClick={processCustomQuery}
              className="iot-query-submit-button"
              disabled={isLoading || !customQuery.trim() || connectionStatus !== 'connected'}
            >
              {isLoading ? '🔄 Analizando...' : '🤖 Consultar con IA'}
            </button>
          </div>

          {/* Mostrar respuesta en el mismo tab */}
          {lastResponse && (
            <div className="iot-response-section">
              <h5>📊 Resultado del Análisis:</h5>
              <div className="iot-response-content">
                <pre>{lastResponse}</pre>
              </div>
              <button 
                onClick={() => setActiveSection('chatbot')}
                className="iot-view-in-chat-btn"
              >
                🤖 Ver en Chatbot IoT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Análisis Rápidos */}
      {activeSection === 'dashboard' && (
        <div className="iot-dashboard-section">
          <h4>⚡ Análisis Rápidos</h4>
          <div className="iot-analysis-grid">
            <button 
              onClick={() => runPresetAnalysis('environmental')}
              className="iot-analysis-card-btn"
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              <span className="iot-analysis-icon">🌡️</span>
              <span className="iot-analysis-title">Reporte Ambiental</span>
              <span className="iot-analysis-desc">Temperatura y humedad</span>
            </button>

            <button 
              onClick={() => runPresetAnalysis('anomalies')}
              className="iot-analysis-card-btn"
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              <span className="iot-analysis-icon">🚨</span>
              <span className="iot-analysis-title">Detectar Anomalías</span>
              <span className="iot-analysis-desc">Patrones anómalos</span>
            </button>

            <button 
              onClick={() => runPresetAnalysis('efficiency')}
              className="iot-analysis-card-btn"
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              <span className="iot-analysis-icon">⚡</span>
              <span className="iot-analysis-title">Eficiencia Energética</span>
              <span className="iot-analysis-desc">Optimización de consumo</span>
            </button>

            <button 
              onClick={() => runPresetAnalysis('maintenance')}
              className="iot-analysis-card-btn"
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              <span className="iot-analysis-icon">🔧</span>
              <span className="iot-analysis-title">Mantenimiento</span>
              <span className="iot-analysis-desc">Predicciones preventivas</span>
            </button>

            <button 
              onClick={() => runPresetAnalysis('comfort')}
              className="iot-analysis-card-btn"
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              <span className="iot-analysis-icon">😊</span>
              <span className="iot-analysis-title">Confort</span>
              <span className="iot-analysis-desc">Condiciones para ocupantes</span>
            </button>

            <button 
              onClick={() => runPresetAnalysis('dashboard')}
              className="iot-analysis-card-btn"
              disabled={isLoading || connectionStatus !== 'connected'}
            >
              <span className="iot-analysis-icon">📊</span>
              <span className="iot-analysis-title">Dashboard Ejecutivo</span>
              <span className="iot-analysis-desc">KPIs y métricas clave</span>
            </button>
          </div>

          {/* Mostrar última respuesta aquí también */}
          {lastResponse && (
            <div className="iot-response-section">
              <h5>📊 Último Análisis:</h5>
              <div className="iot-response-content">
                <pre>{lastResponse}</pre>
              </div>
              <button 
                onClick={() => setActiveSection('chatbot')}
                className="iot-view-in-chat-btn"
              >
                🤖 Ver en Chatbot IoT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chatbot IoT */}
      {activeSection === 'chatbot' && (
        <div className="iot-chatbot-section">
          <div className="iot-chatbot-header">
            <h4>🤖 Chatbot IoT Predictivo</h4>
            <button 
              onClick={clearChat}
              className="iot-clear-chat-btn"
              title="Limpiar conversación"
            >
              🗑️
            </button>
          </div>

          {/* Área de mensajes */}
          <div className="iot-chat-messages">
            {chatMessages.length === 0 ? (
              <div className="iot-chat-welcome">
                <div className="iot-welcome-icon">🤖</div>
                <h5>¡Hola! Soy tu asistente IoT predictivo</h5>
                <p>Puedo ayudarte con:</p>
                <ul>
                  <li>🌡️ Análisis de sensores de temperatura</li>
                  <li>🚨 Detección de anomalías</li>
                  <li>⚡ Optimización energética</li>
                  <li>🔧 Predicciones de mantenimiento</li>
                  <li>😊 Evaluación de confort</li>
                  <li>📊 Reportes y dashboards</li>
                </ul>
                <p><strong>¿En qué puedo ayudarte hoy?</strong></p>
              </div>
            ) : (
              <>
                {chatMessages.map((message) => (
                  <div key={message.id} className={`iot-chat-message ${message.role}`}>
                    <div className="iot-message-avatar">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="iot-message-content">
                      <div className="iot-message-text">
                        {message.role === 'assistant' ? (
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: formatMessageContent(message.content) 
                            }} 
                          />
                        ) : (
                          <div>{message.content}</div>
                        )}
                      </div>
                      <div className="iot-message-timestamp">
                        {message.timestamp.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatMessagesEndRef} />
              </>
            )}

            {/* Indicador de escritura */}
            {isChatLoading && (
              <div className="iot-chat-message assistant">
                <div className="iot-message-avatar">🤖</div>
                <div className="iot-message-content">
                  <div className="iot-typing-indicator">
                    <div className="iot-typing-dot"></div>
                    <div className="iot-typing-dot"></div>
                    <div className="iot-typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input del chat */}
          <div className="iot-chat-input-section">
            <div className="iot-chat-input-container">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pregúntame sobre los sensores IoT..."
                className="iot-chat-input"
                rows={2}
                disabled={isChatLoading || connectionStatus !== 'connected'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    processChatMessage();
                  }
                }}
              />
              <button 
                onClick={processChatMessage}
                className="iot-chat-send-button"
                disabled={isChatLoading || !chatInput.trim() || connectionStatus !== 'connected'}
              >
                {isChatLoading ? '🔄' : '📤'}
              </button>
            </div>
            <div className="iot-chat-hints">
              <span>💡 Tip: Presiona Enter para enviar, Shift+Enter para nueva línea</span>
            </div>
          </div>
        </div>
      )}

      {(isLoading) && (
        <div className="iot-loading-overlay">
          <div className="iot-loading-spinner">
            <div className="iot-spinner"></div>
            <p>Procesando con el agente predictivo IoT...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoTPredictiveTab;