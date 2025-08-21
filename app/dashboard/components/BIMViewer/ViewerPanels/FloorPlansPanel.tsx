// FloorPlansPanel.tsx - Versión con estilos separados y scroll mejorado
import React from 'react';
import { 
  Map, 
  Layers, 
  Eye, 
  RotateCcw, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { FloorPlan } from '../types/FloorPlansTypes';

// Estilos separados
const styles = {
  panel: {
    padding: '16px',
    maxHeight: '80vh', // Altura máxima del panel
    overflowY: 'auto' as const,
    backgroundColor: '#ffffff'
  },
  
  description: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px'
  },
  
  debugInfo: {
    fontSize: '11px',
    color: '#666',
    marginBottom: '12px',
    padding: '6px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  
  generateSection: {
    marginBottom: '16px'
  },
  
  generateButton: (isGenerating: boolean) => ({
    backgroundColor: isGenerating ? '#9ca3af' : '#4ade80',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 16px',
    cursor: isGenerating ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    width: '100%'
  }),
  
  generateHelperText: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
    textAlign: 'center' as const
  },
  
  loadingContainer: {
    textAlign: 'center' as const,
    padding: '20px'
  },
  
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  
  loadingText: {
    fontSize: '14px',
    fontWeight: '500'
  },
  
  loadingSubtext: {
    fontSize: '12px',
    color: '#666'
  },
  
  managementSection: {
    marginBottom: '16px'
  },
  
  managementHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  
  managementHeaderText: {
    fontSize: '14px',
    fontWeight: '500'
  },
  
  managementHeaderSubtext: {
    fontSize: '12px',
    color: '#666'
  },
  
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  
  regenerateButton: (isGenerating: boolean) => ({
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: isGenerating ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px'
  }),
  
  clearButton: (isGenerating: boolean) => ({
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: isGenerating ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px'
  }),
  
  errorContainer: {
    marginBottom: '16px'
  },
  
  errorContent: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  errorText: {
    fontSize: '14px',
    color: '#dc2626',
    flex: 1
  },
  
  errorCloseButton: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  
  plansSection: {
    marginTop: '16px'
  },
  
  plansHeader: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  plansContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px', // Reducido para más compacto
    maxHeight: '320px', // Altura fija para el scroll
    overflowY: 'auto' as const,
    padding: '4px', // Padding interno para el scroll
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fafafa'
  },
  
  planCard: (isCurrentPlan: boolean) => ({
    border: isCurrentPlan ? '2px solid #4ade80' : '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px', // Reducido para más compacto
    backgroundColor: isCurrentPlan ? '#f0fdf4' : '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    boxShadow: isCurrentPlan ? '0 2px 4px rgba(74, 222, 128, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer'
  }),
  
  planCardContent: {
    flex: 1
  },
  
  planTitle: (isCurrentPlan: boolean) => ({
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 6px 0', // Reducido margin
    color: isCurrentPlan ? '#166534' : '#1f2937'
  }),
  
  planDetails: (isCurrentPlan: boolean) => ({
    display: 'flex',
    gap: '12px', // Reducido gap
    fontSize: '11px', // Reducido font size
    color: isCurrentPlan ? '#166534' : '#6b7280'
  }),
  
  planActions: {
    marginLeft: '12px' // Reducido margin
  },
  
  exitButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px', // Reducido padding
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px', // Reducido font size
    fontWeight: '500',
    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.2)'
  },
  
  viewButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px', // Reducido padding
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px', // Reducido font size
    fontWeight: '500',
    boxShadow: '0 1px 3px rgba(59, 130, 246, 0.2)'
  },
  
  activeViewSection: {
    marginTop: '16px', // Reducido margin
    padding: '12px', // Reducido padding
    backgroundColor: '#f0fdf4',
    border: '1px solid #4ade80',
    borderRadius: '8px'
  },
  
  activeViewHeader: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '10px', // Reducido margin
    color: '#166534',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  
  activeViewContent: {
    marginBottom: '10px' // Reducido margin
  },
  
  activeViewInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px' // Reducido margin
  },
  
  activeViewText: {
    fontSize: '14px',
    color: '#166534'
  },
  
  backTo3DButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px'
  },
  
  instructionsBox: {
    fontSize: '12px',
    color: '#166534',
    backgroundColor: '#dcfce7',
    padding: '8px',
    borderRadius: '4px',
    marginTop: '8px'
  },
  
  infoSection: {
    marginTop: '16px', // Reducido margin
    padding: '10px', // Reducido padding
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  
  infoHeader: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '6px', // Reducido margin
    color: '#374151'
  },
  
  infoText: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px', // Reducido margin
    lineHeight: '1.4'
  },
  
  infoDetails: {
    fontSize: '11px',
    color: '#6b7280'
  },
  
  infoDetailItem: {
    marginBottom: '3px' // Reducido margin
  }
};

interface FloorPlansPanelProps {
  isGenerating: boolean;
  isActive: boolean;
  currentPlanId: string | null;
  availablePlans: FloorPlan[];
  error: string | null;
  hasPlans: boolean;
  onGeneratePlans: () => void;
  onNavigateToPlan: (planId: string) => void;
  onExitPlanView: () => void;
  onRegeneratePlans: () => void;
  onClearPlans: () => void;
  onClearError: () => void;
}

export const FloorPlansPanel: React.FC<FloorPlansPanelProps> = ({
  isGenerating,
  isActive,
  currentPlanId,
  availablePlans,
  error,
  hasPlans,
  onGeneratePlans,
  onNavigateToPlan,
  onExitPlanView,
  onRegeneratePlans,
  onClearPlans,
  onClearError
}) => {
  
  // Debugging del estado del panel
  const debugInfo = React.useMemo(() => {
    return {
      isGenerating: !!isGenerating,
      isActive: !!isActive,
      currentPlanId: currentPlanId || 'none',
      availablePlansCount: Array.isArray(availablePlans) ? availablePlans.length : 0,
      error: error || 'none',
      hasPlans: !!hasPlans,
      shouldShowPlans: !!hasPlans && !isGenerating && Array.isArray(availablePlans) && availablePlans.length > 0
    };
  }, [isGenerating, isActive, currentPlanId, availablePlans, error, hasPlans]);

  React.useEffect(() => {
    console.log('📊 FloorPlansPanel - Estado actualizado:', debugInfo);
  }, [debugInfo.availablePlansCount, debugInfo.isGenerating, debugInfo.hasPlans]);

  // Handlers con useCallback para performance
  const handleGeneratePlans = React.useCallback(() => {
    console.log('🚀 FloorPlansPanel: Generate button clicked');
    if (typeof onGeneratePlans === 'function') {
      onGeneratePlans();
    } else {
      console.error('❌ onGeneratePlans is not a function');
    }
  }, [onGeneratePlans]);

  const handleNavigateToPlan = React.useCallback((planId: string) => {
    console.log('🧭 Navegando a plano:', planId);
    if (typeof onNavigateToPlan === 'function') {
      onNavigateToPlan(planId);
    } else {
      console.error('❌ onNavigateToPlan is not a function');
    }
  }, [onNavigateToPlan]);

  const handleExitPlanView = React.useCallback(() => {
    console.log('🚪 Saliendo de vista de plano');
    if (typeof onExitPlanView === 'function') {
      onExitPlanView();
    } else {
      console.error('❌ onExitPlanView is not a function');
    }
  }, [onExitPlanView]);

  const handleRegeneratePlans = React.useCallback(() => {
    console.log('🔄 Regenerando planos');
    if (typeof onRegeneratePlans === 'function') {
      onRegeneratePlans();
    } else {
      console.error('❌ onRegeneratePlans is not a function');
    }
  }, [onRegeneratePlans]);

  const handleClearPlans = React.useCallback(() => {
    console.log('🗑️ Limpiando planos');
    if (typeof onClearPlans === 'function') {
      onClearPlans();
    } else {
      console.error('❌ onClearPlans is not a function');
    }
  }, [onClearPlans]);

  const handleClearError = React.useCallback(() => {
    console.log('❌ Limpiando error');
    if (typeof onClearError === 'function') {
      onClearError();
    } else {
      console.error('❌ onClearError is not a function');
    }
  }, [onClearError]);

  // Determinar estados de forma segura
  const safeAvailablePlans = Array.isArray(availablePlans) ? availablePlans : [];
  const actuallyHasPlans = safeAvailablePlans.length > 0;
  const shouldShowGenerateButton = !actuallyHasPlans && !isGenerating;
  const shouldShowPlansSection = actuallyHasPlans && !isGenerating;

  return (
    <div className="floorplans-panel" style={styles.panel}>
      <div className="panel-description">
        <p style={styles.description}>
          Genere y navegue por las vistas 2D de los planos de planta del modelo.
        </p>
      </div>

      {/* Debug info visible */}
      <div style={styles.debugInfo}>
        Debug: {debugInfo.availablePlansCount} planos | 
        Generando: {debugInfo.isGenerating ? 'Sí' : 'No'} | 
        Activo: {debugInfo.isActive ? 'Sí' : 'No'} | 
        Error: {debugInfo.error !== 'none' ? 'Sí' : 'No'} | 
        Mostrar lista: {debugInfo.shouldShowPlans ? 'Sí' : 'No'}
      </div>

      {/* Botón generar */}
      {shouldShowGenerateButton && (
        <div style={styles.generateSection}>
          <button 
            onClick={handleGeneratePlans}
            disabled={isGenerating}
            style={styles.generateButton(isGenerating)}
          >
            <Map size={18} />
            <span>Generar Planos de Planta</span>
          </button>
          <p style={styles.generateHelperText}>
            Analiza el modelo y genera automáticamente todas las vistas 2D disponibles.
          </p>
        </div>
      )}

      {/* Estado de carga */}
      {isGenerating && (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingContent}>
            <Loader2 size={20} style={{ 
              animation: 'spin 1s linear infinite'
            }} />
            <span style={styles.loadingText}>
              Generando planos de planta...
            </span>
          </div>
          <p style={styles.loadingSubtext}>
            Esto puede tomar unos momentos dependiendo del tamaño del modelo.
          </p>
        </div>
      )}

      {/* Gestión de planos */}
      {actuallyHasPlans && (
        <div style={styles.managementSection}>
          <div style={styles.managementHeader}>
            <CheckCircle size={16} color="#4ade80" />
            <span style={styles.managementHeaderText}>
              {safeAvailablePlans.length} plano(s) disponible(s)
            </span>
            {isActive && currentPlanId && (
              <span style={styles.managementHeaderSubtext}>
                • Vista activa: {safeAvailablePlans.find(p => p.id === currentPlanId)?.name}
              </span>
            )}
          </div>
          
          <div style={styles.buttonGroup}>
            <button 
              onClick={handleRegeneratePlans}
              disabled={isGenerating}
              style={styles.regenerateButton(isGenerating)}
            >
              <RotateCcw size={14} />
              Regenerar
            </button>
            
            <button 
              onClick={handleClearPlans}
              disabled={isGenerating}
              style={styles.clearButton(isGenerating)}
            >
              <Trash2 size={14} />
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div style={styles.errorContainer}>
          <div style={styles.errorContent}>
            <AlertCircle size={16} color="#dc2626" />
            <span style={styles.errorText}>
              {error}
            </span>
            <button 
              onClick={handleClearError}
              style={styles.errorCloseButton}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* LISTA DE PLANOS DISPONIBLES CON SCROLL MEJORADO */}
      {shouldShowPlansSection && (
        <div style={styles.plansSection}>
          <h4 style={styles.plansHeader}>
            📋 Planos Disponibles ({safeAvailablePlans.length})
          </h4>
          
          {/* Contenedor con scroll personalizado */}
          <div style={styles.plansContainer}>
            {safeAvailablePlans.map((plan, index) => {
              const isCurrentPlan = currentPlanId === plan.id;
              
              return (
                <div 
                  key={plan.id || `plan-${index}`}
                  style={styles.planCard(isCurrentPlan)}
                  onClick={() => !isCurrentPlan && handleNavigateToPlan(plan.id)}
                >
                  <div style={styles.planCardContent}>
                    <h5 style={styles.planTitle(isCurrentPlan)}>
                      {plan.name || `Plano ${index + 1}`}
                    </h5>
                    
                    <div style={styles.planDetails(isCurrentPlan)}>
                      {plan.level !== undefined && (
                        <span>📏 Nivel: {plan.level}m</span>
                      )}
                      {plan.cutHeight !== undefined && (
                        <span>✂️ Corte: {plan.cutHeight}m</span>
                      )}
                      {plan.elevation !== undefined && !isNaN(plan.elevation) && (
                        <span>📐 Elevación: {(plan.elevation / 1000).toFixed(2)}m</span>
                      )}
                      <span>🗓️ {new Date(plan.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  
                  <div style={styles.planActions}>
                    {isCurrentPlan ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExitPlanView();
                        }}
                        style={styles.exitButton}
                      >
                        <Eye size={14} />
                        Salir
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToPlan(plan.id);
                        }}
                        style={styles.viewButton}
                      >
                        <Layers size={14} />
                        Ver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Indicador de scroll si hay muchos planos */}
          {safeAvailablePlans.length > 4 && (
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#6b7280',
              marginTop: '8px',
              padding: '4px'
            }}>
              📜 Desliza para ver más planos ({safeAvailablePlans.length} total)
            </div>
          )}
        </div>
      )}

      {/* Vista activa info - VERSIÓN COMPACTA */}
      {isActive && currentPlanId && (
        <div style={styles.activeViewSection}>
          <h4 style={styles.activeViewHeader}>
            ✅ Vista de Plano Activa
          </h4>
          
          <div style={styles.activeViewContent}>
            <div style={styles.activeViewInfo}>
              <CheckCircle size={16} color="#4ade80" />
              <span style={styles.activeViewText}>
                {safeAvailablePlans.find(p => p.id === currentPlanId)?.name || currentPlanId}
              </span>
            </div>
            
            <button 
              onClick={handleExitPlanView}
              style={styles.backTo3DButton}
            >
              <RotateCcw size={14} />
              Volver a Vista 3D
            </button>
          </div>
          
          <div style={styles.instructionsBox}>
            📝 <strong>Vista activa:</strong> Vista 2D ortográfica, fondo blanco, navegación desde arriba.
          </div>
        </div>
      )}

      {/* Info técnica - VERSIÓN COMPACTA */}
      <div style={styles.infoSection}>
        <h4 style={styles.infoHeader}>
          ℹ️ Información
        </h4>
        <div>
          <p style={styles.infoText}>
            Planos 2D con vista superior optimizada y fondo blanco.
          </p>
          
          <div style={styles.infoDetails}>
            <div style={styles.infoDetailItem}>
              🎯 <strong>Vista:</strong> Ortográfica desde arriba
            </div>
            <div style={styles.infoDetailItem}>
              🔍 <strong>Auto-detección:</strong> Niveles por elevación
            </div>
            <div style={styles.infoDetailItem}>
              🎨 <strong>Estilo:</strong> Fondo blanco técnico
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};