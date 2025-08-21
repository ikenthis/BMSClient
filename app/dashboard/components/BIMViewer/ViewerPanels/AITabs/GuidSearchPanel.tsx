// AITabs/GuidSearchPanel.tsx
import React, { useState } from 'react';
import aiAssistantService, { Message } from '../../services/aiAssistantService';

interface GuidSearchPanelProps {
  showGuidSearch: boolean;
  setShowGuidSearch: (show: boolean) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const GuidSearchPanel: React.FC<GuidSearchPanelProps> = ({
  showGuidSearch,
  setShowGuidSearch,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  setError
}) => {
  const [guidSearchValue, setGuidSearchValue] = useState('');

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

  // Función para manejar la búsqueda por GUID
  const handleGuidSearch = async () => {
    if (!guidSearchValue.trim()) {
      setError('Por favor, introduce un GUID válido');
      return;
    }
    
    // Crear un mensaje de usuario para mostrar la consulta
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `🔍 Consultar información del elemento con GUID: ${guidSearchValue}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setGuidSearchValue('');
    setShowGuidSearch(false);
    setIsLoading(true);
    
    try {
      // Llamar al servicio para obtener la información
      const response = await aiAssistantService.getElementInfoByGuid(guidSearchValue.trim());
      
      if (response.status === 'success' && response.data.elementInfo) {
        // Formatear la información
        const formattedInfo = formatElementInfo(response.data.elementInfo);
        
        // Crear mensaje de respuesta
        const assistantMessage: Message = {
          id: Date.now().toString() + '-element-info',
          role: 'assistant',
          content: formattedInfo,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Crear mensaje de error
        const errorMessage: Message = {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: `❌ No se pudo encontrar información para el elemento con GUID: ${guidSearchValue}`,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('Error al buscar información del elemento:', err);
      
      // Crear mensaje de error
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: `❌ Error al buscar información: ${err.message || 'Error desconocido'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botón para mostrar/ocultar búsqueda por GUID */}
      <div className="guid-search-toggle">
        <button 
          className="guid-search-button"
          onClick={() => setShowGuidSearch(!showGuidSearch)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          {showGuidSearch ? 'Ocultar búsqueda' : 'Buscar por GUID'}
        </button>
      </div>

      {/* Panel de búsqueda por GUID */}
      {showGuidSearch && (
        <div className="guid-search-panel">
          <input
            type="text"
            className="guid-search-input"
            placeholder="Introduce el GUID del elemento (ej: 3kTvqhk05D8OgUbP2kcyra)..."
            value={guidSearchValue}
            onChange={(e) => setGuidSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleGuidSearch();
              }
            }}
          />
          <button 
            className="guid-search-submit"
            onClick={handleGuidSearch}
            disabled={!guidSearchValue.trim() || isLoading}
          >
            {isLoading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      )}
    </>
  );
};

export default GuidSearchPanel;