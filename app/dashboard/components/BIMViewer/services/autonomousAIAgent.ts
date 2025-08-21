// autonomousAIAgent.ts - Nuevo servicio de agente autónomo

import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';
import aiAssistantService from './aiAssistantService';
import spaceScheduleService from './spaceScheduleService';


class AutonomousAIAgent {
  private world: any;
  private fragments: any;
  private models: any[];
  private lastAction: string | null = null;
  private actionHistory: string[] = [];
  private executionContext: any = {};
  private isInitialized: boolean = false;

  // Mapa de capacidades del agente
  private capabilities = {
    // Navegación y selección
    selectElement: this.selectElement.bind(this),
    selectElementsByType: this.selectElementsByType.bind(this),
    selectElementsByProperty: this.selectElementsByProperty.bind(this),
    zoomToElement: this.zoomToElement.bind(this),
    resetView: this.resetView.bind(this),
    
    // Análisis de datos
    countElements: this.countElements.bind(this),
    analyzeElement: this.analyzeElement.bind(this),
    findSpaces: this.findSpaces.bind(this),
    generateReport: this.generateReport.bind(this),
    
    // Visualización y transformación
    highlightElements: this.highlightElements.bind(this),
    isolateCategory: this.isolateCategory.bind(this),
    createGeometry: this.createGeometry.bind(this),
    createDiagram: this.createDiagram.bind(this)

    
  };

  constructor() {}

  initialize(world: any, fragments: any, models: any[]) {
    this.world = world;
    this.fragments = fragments;
    this.models = models;
    this.isInitialized = true;
    console.log("AutonomousAIAgent inicializado con el mundo 3D");
    return this;
  }

  // Método principal para interpretar y ejecutar acciones
  async executeAction(actionRequest: string, context: any = {}): Promise<any> {
  if (!this.isInitialized) {
    return { success: false, message: "Agente no inicializado. Llame a initialize() primero." };
  }

  try {
    // Guardar contexto para que el agente pueda acceder a él
    this.executionContext = {
      ...this.executionContext,
      ...context
    };

    // NUEVO: Interceptar directamente solicitudes específicas
    const actionRequest_lower = actionRequest.toLowerCase();
    let interpretedAction;

    // Si es una solicitud de análisis de elementos, procesarla directamente
    if (actionRequest_lower.includes('analiza') && 
        (actionRequest_lower.includes('distribución') || actionRequest_lower.includes('distribucion')) && 
        actionRequest_lower.includes('elemento')) {
      console.log('Interceptando solicitud de análisis de elementos y evitando llamada a API');
      interpretedAction = {
        action: 'countElements',
        parameters: {}
      };
    } else {
      // Para otros casos, usar el interpretador normal
      interpretedAction = await this.interpretAction(actionRequest);
    }
    
    if (interpretedAction.action && this.capabilities[interpretedAction.action]) {
      // Registrar la acción para auditoría
      this.lastAction = interpretedAction.action;
      this.actionHistory.push(`${new Date().toISOString()}: ${interpretedAction.action}`);
      
      // Ejecutar la acción con los parámetros interpretados
      console.log(`Ejecutando acción: ${interpretedAction.action}`, interpretedAction.parameters);
      const result = await this.capabilities[interpretedAction.action](interpretedAction.parameters);
      
      return {
        success: true,
        action: interpretedAction.action,
        result,
        message: `Acción '${interpretedAction.action}' ejecutada correctamente`
      };
    } else {
      return {
        success: false,
        message: `No se pudo interpretar o no se encontró la acción solicitada: ${actionRequest}`
      };
    }
  } catch (error) {
    console.error("Error al ejecutar acción:", error);
    return {
      success: false,
      message: `Error al ejecutar la acción: ${error.message || 'Error desconocido'}`
    };
  }
}

  // Usa el servicio de IA para interpretar la acción solicitada en lenguaje natural
  // Mejora de la función interpretAction en autonomousAIAgent.ts

private async interpretAction(actionRequest: string): Promise<{action: string, parameters: any}> {
  try {
    // Si la solicitud es muy básica, intentar manejarlo directamente primero
    const actionRequest_lower = actionRequest.toLowerCase();
    
    // ---- AÑADIR ESTE BLOQUE AL INICIO ----
    // Interpretación directa para análisis de distribución
    if (
      actionRequest_lower.includes('analiza') && 
      actionRequest_lower.includes('distribución') && 
      actionRequest_lower.includes('elemento')
    ) {
      console.log('Interpretación directa: analizar distribución de elementos');
      return {
        action: 'countElements',
        parameters: {}
      };
    }
    // ---- FIN DEL BLOQUE AÑADIDO ----
    
    // Patrones comunes de conteo
    if (actionRequest_lower.match(/cu[aá]nt[oa]s?\s/) || 
        actionRequest_lower.match(/contar\s/) || 
        actionRequest_lower.match(/numero\sde\s/) ||
        actionRequest_lower.match(/total\sde\s/)) {
      
      // Detectar el tipo de elemento a contar
      const elementType = this.detectElementType(actionRequest);
      if (elementType) {
        console.log(`Interpretación rápida: contar elementos de tipo ${elementType}`);
        return {
          action: 'countElements',
          parameters: { type: elementType }
        };
      } else {
        console.log('Interpretación rápida: contar todos los elementos');
        return {
          action: 'countElements',
          parameters: {}
        };
      }
    }
    
    // ELIMINAR POR COMPLETO ESTE BLOQUE QUE CAUSA EL ERROR 404 - DESDE 'try' HASTA 'catch'
    /* 
    try {
      console.log("Interpretación rápida fallida, utilizando servicio de IA...");
      
      // Aquí se utiliza el servicio de IA para interpretar la acción
      const response = await fetch('/api/ai-assistant/execute-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionRequest
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error en la respuesta de la API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success' && data.data.action) {
        console.log("Interpretación exitosa mediante IA:", data.data);
        return {
          action: data.data.action,
          parameters: data.data.parameters || {}
        };
      } else {
        throw new Error('Respuesta inválida del servicio de IA');
      }
    } catch (apiError) {
      console.warn("Error en la llamada a la API de interpretación:", apiError);
      console.log("Utilizando sistema de detección de patrones avanzado como fallback...");
    }
    */
    
    // Fallback: implementación más robusta de detección de patrones
    console.log("Utilizando sistema avanzado de detección de patrones...");
    
    // Resto del código...
    
    // Analizar para diferentes intenciones
    if (actionRequest_lower.includes('puerta') || 
        actionRequest_lower.includes('puertas')) {
      if (actionRequest_lower.match(/cu[aá]nt[oa]s|numero|contar|total/)) {
        return {
          action: 'countElements',
          parameters: { type: 'IFCDOOR' }
        };
      } else if (actionRequest_lower.match(/selecciona|muestra|elige|encuentra/)) {
        return {
          action: 'selectElementsByType',
          parameters: { type: 'IFCDOOR' }
        };
      } else if (actionRequest_lower.match(/destaca|resalta|highlight/)) {
        return {
          action: 'highlightElements',
          parameters: { type: 'IFCDOOR' }
        };
      } else {
        // Acción por defecto: mostrar puertas
        return {
          action: 'selectElementsByType',
          parameters: { type: 'IFCDOOR' }
        };
      }
    }
    
    if (actionRequest_lower.includes('ventana') || 
        actionRequest_lower.includes('ventanas')) {
      if (actionRequest_lower.match(/cu[aá]nt[oa]s|numero|contar|total/)) {
        return {
          action: 'countElements',
          parameters: { type: 'IFCWINDOW' }
        };
      } else {
        return {
          action: 'selectElementsByType',
          parameters: { type: 'IFCWINDOW' }
        };
      }
    }
    
    if (actionRequest_lower.includes('muro') || 
        actionRequest_lower.includes('muros') ||
        actionRequest_lower.includes('pared') ||
        actionRequest_lower.includes('paredes')) {
      if (actionRequest_lower.match(/cu[aá]nt[oa]s|numero|contar|total/)) {
        return {
          action: 'countElements',
          parameters: { type: 'IFCWALL' }
        };
      } else {
        return {
          action: 'selectElementsByType',
          parameters: { type: 'IFCWALL' }
        };
      }
    }
    
    if (actionRequest_lower.includes('espacio') || 
        actionRequest_lower.includes('espacios') ||
        actionRequest_lower.includes('habitacion') ||
        actionRequest_lower.includes('habitaciones') ||
        actionRequest_lower.includes('sala') ||
        actionRequest_lower.includes('salas')) {
      if (actionRequest_lower.match(/cu[aá]nt[oa]s|numero|contar|total/)) {
        return {
          action: 'countElements',
          parameters: { type: 'IFCSPACE' }
        };
      } else if (actionRequest_lower.match(/busca|encuentra|localiza/)) {
        return {
          action: 'findSpaces',
          parameters: {}
        };
      } else {
        return {
          action: 'selectElementsByType',
          parameters: { type: 'IFCSPACE' }
        };
      }
    }
    
    if (actionRequest_lower.includes('elementos') ||
        actionRequest_lower.includes('componentes') ||
        actionRequest_lower.match(/cu[aá]nt[oa]s elementos/)) {
      return {
        action: 'countElements',
        parameters: {}
      };
    }
    
    if (actionRequest_lower.includes('diagrama') ||
        actionRequest_lower.includes('gráfico') ||
        actionRequest_lower.includes('visualiza')) {
      return {
        action: 'createDiagram',
        parameters: { 
          type: 'distribution',
          title: 'Distribución de elementos' 
        }
      };
    }
    
    if (actionRequest_lower.includes('informe') ||
        actionRequest_lower.includes('reporte') ||
        actionRequest_lower.includes('análisis general')) {
      return {
        action: 'generateReport',
        parameters: { type: 'general' }
      };
    }
    
    if (actionRequest_lower.includes('vista') && 
        (actionRequest_lower.includes('reset') || 
         actionRequest_lower.includes('inicial') || 
         actionRequest_lower.includes('original'))) {
      return {
        action: 'resetView',
        parameters: {}
      };
    }
    
    // Si llegamos aquí, no pudimos interpretar la acción
    throw new Error(`No se pudo interpretar la acción solicitada: ${actionRequest}`);
  } catch (error) {
    console.error("Error en interpretAction:", error);
    throw error;
  }
}

// Mejora del método detectElementType para ser más robusto
private detectElementType(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Mapeo ampliado de términos comunes a tipos IFC
  const termMappings = [
    { terms: ['puerta', 'puertas', 'entrada', 'entradas', 'acceso', 'accesos'], type: 'IFCDOOR' },
    { terms: ['ventana', 'ventanas', 'vidrio', 'vidrios', 'cristal', 'cristales'], type: 'IFCWINDOW' },
    { terms: ['muro', 'muros', 'pared', 'paredes', 'tabique', 'tabiques'], type: 'IFCWALL' },
    { terms: ['espacio', 'espacios', 'habitación', 'habitaciones', 'sala', 'salas', 'cuarto', 'cuartos', 'ambiente', 'ambientes'], type: 'IFCSPACE' },
    { terms: ['columna', 'columnas', 'pilar', 'pilares', 'soporte', 'soportes'], type: 'IFCCOLUMN' },
    { terms: ['viga', 'vigas', 'jácena', 'jacenas'], type: 'IFCBEAM' },
    { terms: ['escalera', 'escaleras', 'grada', 'gradas'], type: 'IFCSTAIR' },
    { terms: ['techo', 'techos', 'cielo raso', 'cielos rasos'], type: 'IFCCEILING' },
    { terms: ['suelo', 'suelos', 'piso', 'pisos', 'pavimento', 'pavimentos'], type: 'IFCFLOOR' },
    { terms: ['cubierta', 'cubiertas', 'tejado', 'tejados'], type: 'IFCROOF' },
    { terms: ['mobiliario', 'mueble', 'muebles'], type: 'IFCFURNISHINGELEMENT' },
    { terms: ['equipamiento', 'equipo', 'equipos'], type: 'IFCBUILDINGELEMENTPROXY' }
  ];

  // Verifica si alguno de los términos aparece en el texto
  for (const mapping of termMappings) {
    for (const term of mapping.terms) {
      if (lowerText.includes(term)) {
        return mapping.type;
      }
    }
  }

  // También verificar si el tipo IFC está directamente en el texto
  const directTypes = [
    'IFCDOOR', 'IFCWINDOW', 'IFCWALL', 'IFCSPACE', 'IFCCOLUMN', 
    'IFCBEAM', 'IFCSTAIR', 'IFCCEILING', 'IFCFLOOR', 'IFCROOF',
    'IFCFURNISHINGELEMENT', 'IFCBUILDINGELEMENTPROXY'
  ];
  
  for (const type of directTypes) {
    if (lowerText.includes(type.toLowerCase())) {
      return type;
    }
  }

  return null;
}
  // Utilidad para extraer posibles IDs de elementos
  private detectElementId(text: string): number | null {
    // Buscar patrones comunes de IDs, como "elemento 123" o "id: 456"
    const idPattern = /(?:elemento|id|número|item)\s*[:# ]?\s*(\d+)/i;
    const match = text.match(idPattern);
    
    return match ? parseInt(match[1]) : null;
  }

  // Implementación de acciones del agente
  private async selectElement(params: any): Promise<any> {
    if (!params.id) {
      throw new Error("Se requiere un ID para seleccionar elemento");
    }

    try {
      // Buscar el elemento en todos los modelos
      for (const model of this.models) {
        try {
          // Obtener datos del elemento
          const elementData = await model.getItemsData([params.id], {
            includeProperties: true
          });
          
          if (elementData && elementData.length > 0) {
            // Si se encuentra, notificar la selección usando eventos nativos
            const selectEvent = new CustomEvent('element-selected', {
              detail: {
                model: model,
                localId: params.id,
                data: elementData[0]
              }
            });
            
            // Disparar evento para que otros componentes respondan
            document.dispatchEvent(selectEvent);
            
            // Forzar actualización visual
            this.fragments.update(true);
            
            return {
              success: true,
              elementData: elementData[0],
              message: `Elemento ${params.id} seleccionado`
            };
          }
        } catch (error) {
          console.warn(`Error al buscar elemento ${params.id} en modelo ${model.id}:`, error);
        }
      }
      
      throw new Error(`No se encontró el elemento con ID ${params.id}`);
    } catch (error) {
      console.error("Error al seleccionar elemento:", error);
      throw error;
    }
  }

  private async selectElementsByType(params: any): Promise<any> {
    if (!params.type) {
      throw new Error("Se requiere un tipo para seleccionar elementos");
    }

    try {
      const selectedElements = [];
      
      for (const model of this.models) {
        try {
          // Obtener todos los elementos de este tipo
          const items = await model.getItemsOfCategory(params.type);
          
          if (items && items.length > 0) {
            // Limitar a 20 para selección visual (evitar sobrecarga)
            const displayLimit = Math.min(items.length, 20);
            
            // Obtener IDs locales
            for (let i = 0; i < items.length; i++) {
              const localId = await items[i].getLocalId();
              
              if (localId !== null) {
                // Para los primeros 20, destacarlos visualmente
                if (i < displayLimit) {
                  await this.highlightElement(model, localId);
                }
                
                // Obtener datos para todos
                const data = await model.getItemsData([localId], {
                  includeProperties: true,
                  includeGeometry: false
                });
                
                if (data && data.length > 0) {
                  selectedElements.push({
                    model: model.id,
                    localId,
                    type: params.type,
                    data: data[0]
                  });
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Error al buscar elementos de tipo ${params.type} en modelo ${model.id}:`, error);
        }
      }
      
      if (selectedElements.length === 0) {
        throw new Error(`No se encontraron elementos de tipo ${params.type}`);
      }
      
      // Actualizar visualización
      this.fragments.update(true);
      
      return {
        success: true,
        count: selectedElements.length,
        elements: selectedElements.slice(0, 10), // Limitar datos devueltos
        message: `Se encontraron ${selectedElements.length} elementos de tipo ${params.type}`
      };
    } catch (error) {
      console.error("Error al seleccionar elementos por tipo:", error);
      throw error;
    }
  }

  private async selectElementsByProperty(params: any): Promise<any> {
    if (!params.property || params.value === undefined) {
      throw new Error("Se requieren propiedad y valor para buscar elementos");
    }

    try {
      const selectedElements = [];
      
      for (const model of this.models) {
        try {
          // Para cada tipo de elemento en el modelo
          const categories = await model.getCategories();
          
          for (const category of categories) {
            const items = await model.getItemsOfCategory(category);
            
            for (const item of items) {
              const localId = await item.getLocalId();
              
              if (localId !== null) {
                // Obtener datos de propiedades
                const data = await model.getItemsData([localId], {
                  includeProperties: true,
                  includeGeometry: false
                });
                
                if (data && data.length > 0) {
                  // Verificar propiedad
                  let matches = false;
                  
                  // Buscar en propiedades directas
                  if (data[0][params.property] !== undefined) {
                    const propValue = data[0][params.property].value || data[0][params.property];
                    matches = String(propValue).toLowerCase().includes(String(params.value).toLowerCase());
                  }
                  
                  // Buscar en conjuntos de propiedades (psets)
                  if (!matches && data[0].psets) {
                    for (const psetName in data[0].psets) {
                      if (data[0].psets[psetName][params.property] !== undefined) {
                        const propValue = data[0].psets[psetName][params.property].value || 
                                         data[0].psets[psetName][params.property];
                        
                        matches = String(propValue).toLowerCase().includes(String(params.value).toLowerCase());
                        
                        if (matches) break;
                      }
                    }
                  }
                  
                  if (matches) {
                    selectedElements.push({
                      model: model.id,
                      localId,
                      type: category,
                      data: data[0]
                    });
                    
                    // Limitar a 20 para selección visual (evitar sobrecarga)
                    if (selectedElements.length <= 20) {
                      await this.highlightElement(model, localId);
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Error al buscar elementos por propiedad en modelo ${model.id}:`, error);
        }
      }
      
      if (selectedElements.length === 0) {
        throw new Error(`No se encontraron elementos con la propiedad ${params.property}=${params.value}`);
      }
      
      // Actualizar visualización
      this.fragments.update(true);
      
      return {
        success: true,
        count: selectedElements.length,
        elements: selectedElements.slice(0, 10), // Limitar datos devueltos
        message: `Se encontraron ${selectedElements.length} elementos con la propiedad ${params.property}=${params.value}`
      };
    } catch (error) {
      console.error("Error al seleccionar elementos por propiedad:", error);
      throw error;
    }
  }

  private async zoomToElement(params: any): Promise<any> {
    if (!params.id) {
      throw new Error("Se requiere un ID para hacer zoom al elemento");
    }

    try {
      for (const model of this.models) {
        try {
          // Verificar si el elemento existe en este modelo
          const elementData = await model.getItemsData([params.id], {
            includeProperties: false
          });
          
          if (elementData && elementData.length > 0) {
            // Obtener el bounding box del elemento
            const boxes = await model.getBoxes([params.id]);
            
            if (boxes && boxes.length > 0) {
              const box = boxes[0];
              
              // Calcular centro del bounding box
              const center = new THREE.Vector3(
                (box.min.x + box.max.x) / 2,
                (box.min.y + box.max.y) / 2,
                (box.min.z + box.max.z) / 2
              );
              
              // Calcular tamaño del bounding box
              const size = new THREE.Vector3(
                box.max.x - box.min.x,
                box.max.y - box.min.y,
                box.max.z - box.min.z
              );
              
              // Calcular distancia de la cámara (el 200% del tamaño máximo)
              const maxDim = Math.max(size.x, size.y, size.z);
              const distance = maxDim * 2;
              
              // Mover cámara
              if (this.world && this.world.camera) {
                this.world.camera.controls.fitToSphere(center, distance);
                
                // Destacar elemento
                await this.highlightElement(model, params.id);
                
                // Forzar actualización
                this.fragments.update(true);
                
                return {
                  success: true,
                  message: `Zoom aplicado al elemento ${params.id}`
                };
              } else {
                throw new Error("Cámara no disponible");
              }
            } else {
              throw new Error(`No se pudo obtener bounding box para el elemento ${params.id}`);
            }
          }
        } catch (error) {
          console.warn(`Error al hacer zoom al elemento ${params.id} en modelo ${model.id}:`, error);
        }
      }
      
      throw new Error(`No se encontró el elemento con ID ${params.id}`);
    } catch (error) {
      console.error("Error al hacer zoom al elemento:", error);
      throw error;
    }
  }

  private async resetView(): Promise<any> {
    try {
      if (this.world && this.world.camera) {
        // Reset camera to default view
        this.world.camera.controls.reset();
        
        // Limpiar selecciones si las hay
        for (const model of this.models) {
          model.unHighlightAll();
        }
        
        // Restablecer opacidad
        for (const model of this.models) {
          model.setOpacity(1.0);
        }
        
        // Forzar actualización
        this.fragments.update(true);
        
        return {
          success: true,
          message: "Vista restablecida"
        };
      } else {
        throw new Error("Cámara no disponible");
      }
    } catch (error) {
      console.error("Error al restablecer vista:", error);
      throw error;
    }
  }

  private async countElements(params: any = {}): Promise<any> {
    try {
      const counts: Record<string, number> = {};
      let totalElements = 0;
      
      for (const model of this.models) {
        try {
          // Obtener todas las categorías
          const categories = await model.getCategories();
          
          for (const category of categories) {
            // Si se especificó un tipo y no coincide, pasar al siguiente
            if (params.type && params.type !== category) {
              continue;
            }
            
            // Contar elementos de esta categoría
            const items = await model.getItemsOfCategory(category);
            
            if (items && items.length > 0) {
              counts[category] = (counts[category] || 0) + items.length;
              totalElements += items.length;
            }
          }
        } catch (error) {
          console.warn(`Error al contar elementos en modelo ${model.id}:`, error);
        }
      }
      
      if (Object.keys(counts).length === 0) {
        if (params.type) {
          throw new Error(`No se encontraron elementos de tipo ${params.type}`);
        } else {
          throw new Error("No se encontraron elementos en los modelos");
        }
      }
      
      return {
        success: true,
        counts,
        totalElements,
        message: params.type
          ? `Se encontraron ${counts[params.type] || 0} elementos de tipo ${params.type}`
          : `Se encontraron ${totalElements} elementos en total`
      };
    } catch (error) {
      console.error("Error al contar elementos:", error);
      throw error;
    }
  }

  private async analyzeElement(params: any): Promise<any> {
    if (!params.id) {
      throw new Error("Se requiere un ID para analizar elemento");
    }

    try {
      for (const model of this.models) {
        try {
          // Obtener datos completos del elemento
          const elementData = await model.getItemsData([params.id], {
            includeProperties: true,
            includeMaterials: true
          });
          
          if (elementData && elementData.length > 0) {
            const data = elementData[0];
            
            // Obtener tipo del elemento
            const category = data.type || data._category?.value;
            
            // Estructurar análisis según el tipo
            let analysis = {
              id: params.id,
              model: model.id,
              type: category,
              properties: {},
              dimensions: {},
              materials: [],
              relationships: [],
              recommendations: []
            };
            
            // Extraer propiedades principales
            if (data.Name) analysis.properties['name'] = data.Name.value || data.Name;
            if (data.Description) analysis.properties['description'] = data.Description.value || data.Description;
            if (data.GlobalId) analysis.properties['globalId'] = data.GlobalId.value || data.GlobalId;
            
            // Extraer conjuntos de propiedades (Psets)
            if (data.psets) {
              for (const psetName in data.psets) {
                for (const propName in data.psets[psetName]) {
                  const propValue = data.psets[psetName][propName].value || data.psets[psetName][propName];
                  analysis.properties[`${psetName}.${propName}`] = propValue;
                }
              }
            }
            
            // Obtener dimensiones
            try {
              const boxes = await model.getBoxes([params.id]);
              if (boxes && boxes.length > 0) {
                const box = boxes[0];
                
                analysis.dimensions = {
                  width: box.max.x - box.min.x,
                  height: box.max.y - box.min.y,
                  depth: box.max.z - box.min.z,
                  volume: (box.max.x - box.min.x) * (box.max.y - box.min.y) * (box.max.z - box.min.z),
                  center: {
                    x: (box.min.x + box.max.x) / 2,
                    y: (box.min.y + box.max.y) / 2,
                    z: (box.min.z + box.max.z) / 2
                  }
                };
              }
            } catch (error) {
              console.warn(`No se pudieron obtener dimensiones para elemento ${params.id}:`, error);
            }
            
            // Generar recomendaciones según el tipo
            switch (category) {
              case 'IFCDOOR':
                analysis.recommendations.push("Verificar sellos y burletes cada 6 meses");
                analysis.recommendations.push("Lubricar bisagras y mecanismos cada 3 meses");
                break;
              case 'IFCWINDOW':
                analysis.recommendations.push("Limpiar rieles y marcos cada 3 meses");
                analysis.recommendations.push("Verificar sellos y juntas anualmente");
                break;
              case 'IFCWALL':
                analysis.recommendations.push("Inspeccionar por posibles grietas y humedad anualmente");
                analysis.recommendations.push("Renovar pintura/acabados cada 5-7 años");
                break;
              case 'IFCSPACE':
                analysis.recommendations.push("Verificar sistemas de ventilación trimestralmente");
                analysis.recommendations.push("Evaluar eficiencia de uso del espacio anualmente");
                break;
              default:
                analysis.recommendations.push("Programar inspección visual anual");
                analysis.recommendations.push("Incluir en programa de mantenimiento preventivo");
            }
            
            // Destacar el elemento seleccionado
            await this.highlightElement(model, params.id);
            
            // Actualizar visualización
            this.fragments.update(true);
            
            return {
              success: true,
              analysis,
              message: `Análisis completado para elemento ${params.id} de tipo ${category}`
            };
          }
        } catch (error) {
          console.warn(`Error al analizar elemento ${params.id} en modelo ${model.id}:`, error);
        }
      }
      
      throw new Error(`No se encontró el elemento con ID ${params.id}`);
    } catch (error) {
      console.error("Error al analizar elemento:", error);
      throw error;
    }
  }

  private async findSpaces(params: any = {}): Promise<any> {
    try {
      const spaces = [];
      
      for (const model of this.models) {
        try {
          // Buscar todos los elementos IFCSPACE
          const spaceItems = await model.getItemsOfCategory('IFCSPACE');
          
          if (!spaceItems || spaceItems.length === 0) {
            continue;
          }
          
          // Procesar cada espacio
          for (const item of spaceItems) {
            const localId = await item.getLocalId();
            
            if (localId !== null) {
              // Obtener datos de propiedades
              const data = await model.getItemsData([localId], {
                includeProperties: true
              });
              
              if (data && data.length > 0) {
                const spaceData = data[0];
                
                // Crear objeto de espacio con propiedades principales
                const space = {
                  id: localId,
                  model: model.id,
                  name: (spaceData.Name?.value || spaceData.Name || `Space ${localId}`),
                  longName: (spaceData.LongName?.value || spaceData.LongName || ''),
                  properties: {}
                };
                
                // Extraer propiedades adicionales
                if (spaceData.psets) {
                  for (const psetName in spaceData.psets) {
                    // Buscar propiedades comunes de espacios
                    const pset = spaceData.psets[psetName];
                    
                    // Propiedades típicas de espacios
                    const commonProps = ['Area', 'Height', 'Volume', 'NetArea', 'GrossArea',
                                        'NetVolume', 'GrossVolume', 'Function', 'Category'];
                    
                    for (const propName of commonProps) {
                      if (pset[propName] !== undefined) {
                        const propValue = pset[propName].value || pset[propName];
                        space.properties[propName] = propValue;
                      }
                    }
                  }
                }
                
                // Aplicar filtros si existen
                let includeSpace = true;
                
                if (params.name && space.name) {
                  includeSpace = space.name.toLowerCase().includes(params.name.toLowerCase());
                }
                
                if (includeSpace && params.function && space.properties.Function) {
                  includeSpace = space.properties.Function.toLowerCase().includes(params.function.toLowerCase());
                }
                
                if (includeSpace) {
                  spaces.push(space);
                  
                  // Limitar el número de espacios que se destacan visualmente
                  if (spaces.length <= 10) {
                    await this.highlightElement(model, localId);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Error al buscar espacios en modelo ${model.id}:`, error);
        }
      }
      
      if (spaces.length === 0) {
        throw new Error("No se encontraron espacios que coincidan con los criterios");
      }
      
      // Actualizar visualización
      this.fragments.update(true);
      
      return {
        success: true,
        count: spaces.length,
        spaces: spaces.slice(0, 20), // Limitar datos devueltos
        message: `Se encontraron ${spaces.length} espacios`
      };
    } catch (error) {
      console.error("Error al buscar espacios:", error);
      throw error;
    }
  }

  private async generateReport(params: any = {}): Promise<any> {
    try {
      // Obtener conteo de elementos por tipo
      const countResult = await this.countElements();
      
      if (!countResult.success) {
        throw new Error("No se pudieron contar los elementos del modelo");
      }
      
      const report = {
        title: params.title || "Informe de Análisis de Modelo BIM",
        date: new Date().toISOString(),
        summary: {
          totalElements: countResult.totalElements,
          elementTypes: Object.keys(countResult.counts).length,
          models: this.models.length
        },
        elementCounts: countResult.counts,
        topElementTypes: Object.entries(countResult.counts)
          .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
          .slice(0, 10)
          .map(([type, count]) => ({
           type,
           count: Number(count),
           percentage: ((Number(count) / countResult.totalElements) * 100).toFixed(2) + '%'
         })),
       spaces: []
     };
     
     // Añadir información sobre espacios si existen
     try {
       const spacesResult = await this.findSpaces();
       if (spacesResult.success) {
         report.summary.totalSpaces = spacesResult.count;
         
         // Añadir espacios con área
         const spacesWithArea = spacesResult.spaces
           .filter(space => space.properties.Area || space.properties.NetArea)
           .map(space => ({
             id: space.id,
             name: space.name,
             area: space.properties.Area || space.properties.NetArea || 0,
             function: space.properties.Function || space.longName || 'Sin función específica'
           }))
           .sort((a, b) => b.area - a.area);
         
         report.spaces = spacesWithArea;
       }
     } catch (error) {
       console.warn("No se pudo incluir información de espacios en el informe:", error);
     }
     
     // Si se solicita un tipo específico de informe
     if (params.type) {
       switch (params.type.toLowerCase()) {
         case 'maintenance':
           report.title = "Informe de Mantenimiento Predictivo";
           // Añadir recomendaciones de mantenimiento por tipo
           report.maintenanceRecommendations = this.generateMaintenanceRecommendations(report.topElementTypes);
           break;
           
         case 'energy':
           report.title = "Análisis Energético de Edificio";
           // Añadir evaluación energética
           report.energyAnalysis = this.generateEnergyAnalysis(report.spaces);
           break;
           
         case 'compliance':
           report.title = "Verificación de Cumplimiento Normativo";
           // Añadir verificaciones normativas
           report.complianceChecks = this.generateComplianceChecks(countResult.counts);
           break;
       }
     }
     
     // Generar un diagrama que represente los datos del informe
     await this.createDiagram({
       type: 'distribution',
       data: report.topElementTypes.slice(0, 5),
       title: 'Distribución de Elementos por Tipo'
     });
     
     return {
       success: true,
       report,
       message: `Informe '${report.title}' generado correctamente`
     };
   } catch (error) {
     console.error("Error al generar informe:", error);
     throw error;
   }
 }

 private generateMaintenanceRecommendations(elementTypes: any[]): any[] {
   const recommendations = [];
   
   for (const element of elementTypes) {
     const type = element.type;
     const count = element.count;
     
     let recommendation = {
       type,
       count,
       frequency: '',
       actions: [],
       estimatedCost: 0
     };
     
     switch (type) {
       case 'IFCDOOR':
         recommendation.frequency = 'Trimestral';
         recommendation.actions = [
           'Verificar sellado y burletes',
           'Lubricar bisagras y mecanismos',
           'Comprobar funcionamiento de cierres'
         ];
         recommendation.estimatedCost = count * 25; // Costo por puerta
         break;
         
       case 'IFCWINDOW':
         recommendation.frequency = 'Semestral';
         recommendation.actions = [
           'Limpiar rieles y mecanismos',
           'Verificar sellos y juntas',
           'Comprobar cristales y marcos'
         ];
         recommendation.estimatedCost = count * 30; // Costo por ventana
         break;
         
       case 'IFCWALL':
         recommendation.frequency = 'Anual';
         recommendation.actions = [
           'Inspeccionar por grietas o humedades',
           'Verificar acabados y pintura',
           'Comprobar aislamiento térmico'
         ];
         recommendation.estimatedCost = count * 15; // Costo por muro
         break;
         
       case 'IFCSPACE':
         recommendation.frequency = 'Trimestral';
         recommendation.actions = [
           'Verificar sistemas de ventilación',
           'Comprobar iluminación y controles',
           'Inspeccionar acabados y superficies'
         ];
         recommendation.estimatedCost = count * 40; // Costo por espacio
         break;
         
       default:
         recommendation.frequency = 'Anual';
         recommendation.actions = [
           'Inspección visual general',
           'Verificar estado operativo',
           'Documentar condiciones actuales'
         ];
         recommendation.estimatedCost = count * 10; // Costo por elemento
     }
     
     recommendations.push(recommendation);
   }
   
   return recommendations;
 }

 private generateEnergyAnalysis(spaces: any[]): any {
   const totalArea = spaces.reduce((sum, space) => sum + Number(space.area), 0);
   
   // Estimaciones simplificadas de consumo energético
   const estimatedEnergyUse = {
     lighting: totalArea * 5.5, // kWh/m²/año para iluminación
     hvac: totalArea * 12.8,    // kWh/m²/año para climatización
     equipment: totalArea * 8.3, // kWh/m²/año para equipamiento
     total: 0
   };
   
   estimatedEnergyUse.total = estimatedEnergyUse.lighting + 
                             estimatedEnergyUse.hvac + 
                             estimatedEnergyUse.equipment;
   
   // Potencial de ahorro
   const savingsPotential = {
     lighting: {
       potential: Math.round(estimatedEnergyUse.lighting * 0.3), // 30% de ahorro potencial
       strategies: [
         'Actualización a iluminación LED',
         'Sensores de ocupación y luz natural',
         'Zonificación y control adaptativo'
       ]
     },
     hvac: {
       potential: Math.round(estimatedEnergyUse.hvac * 0.25), // 25% de ahorro potencial
       strategies: [
         'Mejora de aislamiento térmico',
         'Sistemas de recuperación de calor',
         'Optimización de horarios de operación'
       ]
     },
     equipment: {
       potential: Math.round(estimatedEnergyUse.equipment * 0.15), // 15% de ahorro potencial
       strategies: [
         'Equipos de alta eficiencia energética',
         'Gestión inteligente de energía',
         'Programas de apagado automático'
       ]
     }
   };
   
   const totalSavingsPotential = savingsPotential.lighting.potential + 
                               savingsPotential.hvac.potential + 
                               savingsPotential.equipment.potential;
   
   return {
     buildingArea: totalArea.toFixed(2),
     estimatedEnergyUse,
     savingsPotential,
     totalSavingsPotential,
     recommendations: [
       'Implementar sistema de gestión energética del edificio (BMS)',
       'Evaluar instalación de fuentes de energía renovable',
       'Desarrollar programa de concienciación de usuarios',
       'Establecer objetivos de reducción de consumo anual'
     ]
   };
 }

 private generateComplianceChecks(elementCounts: Record<string, number>): any[] {
   const complianceChecks = [];
   
   // Verificación de puertas
   if (elementCounts['IFCDOOR']) {
     complianceChecks.push({
       category: 'Accesibilidad',
       element: 'IFCDOOR',
       description: 'Verificación de dimensiones mínimas de puertas para accesibilidad',
       status: 'Requiere verificación manual',
       recommendation: 'Comprobar que todas las puertas cumplan con ancho mínimo de 85cm'
     });
   }
   
   // Verificación de espacios
   if (elementCounts['IFCSPACE']) {
     complianceChecks.push({
       category: 'Ocupación',
       element: 'IFCSPACE',
       description: 'Verificación de densidad de ocupación por espacio',
       status: 'Requiere verificación manual',
       recommendation: 'Verificar que la ocupación no exceda 1 persona por cada 2m² en áreas de trabajo'
     });
   }
   
   // Verificación de rutas de evacuación
   complianceChecks.push({
     category: 'Seguridad contra incendios',
     element: 'IFCSPACE',
     description: 'Verificación de rutas de evacuación y distancias de recorrido',
     status: 'Requiere análisis específico',
     recommendation: 'Comprobar que las distancias de recorrido a salidas no excedan 35m en espacios sin rociadores'
   });
   
   // Verificación de ventilación
   complianceChecks.push({
     category: 'Calidad de aire',
     element: 'IFCSPACE',
     description: 'Verificación de tasas de ventilación por espacio',
     status: 'Requiere verificación manual',
     recommendation: 'Comprobar que la ventilación cumpla con 8.4L/s por persona en espacios ocupados'
   });
   
   return complianceChecks;
 }

 private async highlightElements(params: any): Promise<any> {
   if (!params.type && !params.ids) {
     throw new Error("Se requiere un tipo o lista de IDs para destacar elementos");
   }

   try {
     const highlightedElements = [];
     
     // Caso 1: Destacar por tipo
     if (params.type) {
       for (const model of this.models) {
         try {
           // Obtener todos los elementos de este tipo
           const items = await model.getItemsOfCategory(params.type);
           
           if (items && items.length > 0) {
             // Limitar a 50 para evitar sobrecarga visual
             const displayLimit = Math.min(items.length, 50);
             
             for (let i = 0; i < displayLimit; i++) {
               const localId = await items[i].getLocalId();
               
               if (localId !== null) {
                 // Destacar el elemento
                 await this.highlightElement(model, localId, params.color || 0xffff00);
                 
                 highlightedElements.push({
                   model: model.id,
                   localId,
                   type: params.type
                 });
               }
             }
           }
         } catch (error) {
           console.warn(`Error al destacar elementos de tipo ${params.type} en modelo ${model.id}:`, error);
         }
       }
     }
     
     // Caso 2: Destacar por IDs específicos
     if (params.ids && Array.isArray(params.ids)) {
       for (const id of params.ids) {
         for (const model of this.models) {
           try {
             // Verificar si el elemento existe en este modelo
             const elementData = await model.getItemsData([id], {
               includeProperties: false
             });
             
             if (elementData && elementData.length > 0) {
               // Destacar el elemento
               await this.highlightElement(model, id, params.color || 0xffff00);
               
               highlightedElements.push({
                 model: model.id,
                 localId: id,
                 type: elementData[0].type || elementData[0]._category?.value
               });
               
               break; // Pasar al siguiente ID
             }
           } catch (error) {
             console.warn(`Error al destacar elemento ${id} en modelo ${model.id}:`, error);
           }
         }
       }
     }
     
     if (highlightedElements.length === 0) {
       throw new Error("No se encontraron elementos para destacar");
     }
     
     // Actualizar visualización
     this.fragments.update(true);
     
     return {
       success: true,
       count: highlightedElements.length,
       elements: highlightedElements,
       message: `Se destacaron ${highlightedElements.length} elementos`
     };
   } catch (error) {
     console.error("Error al destacar elementos:", error);
     throw error;
   }
 }

 private async isolateCategory(params: any): Promise<any> {
   if (!params.category) {
     throw new Error("Se requiere una categoría para aislar elementos");
   }

   try {
     let elementsIsolated = 0;
     
     for (const model of this.models) {
       try {
         // Verificar si esta categoría existe en el modelo
         const categories = await model.getCategories();
         
         if (!categories.includes(params.category)) {
           continue;
         }
         
         // Obtener todos los elementos de esta categoría
         const items = await model.getItemsOfCategory(params.category);
         
         if (items && items.length > 0) {
           elementsIsolated += items.length;
           
           // Hacer transparentes todos los elementos del modelo
           await model.setOpacity(0.1);
           
           // Restaurar opacidad solo para los elementos de esta categoría
           for (const item of items) {
             const localId = await item.getLocalId();
             
             if (localId !== null) {
               // Crear un material específico para estos elementos
               const material = {
                 transparent: false,
                 opacity: 1.0,
                 color: params.color || 0xffffff
               };
               
               // Aplicar material al elemento
               await model.setMaterial([localId], material);
             }
           }
         }
       } catch (error) {
         console.warn(`Error al aislar categoría ${params.category} en modelo ${model.id}:`, error);
       }
     }
     
     if (elementsIsolated === 0) {
       throw new Error(`No se encontraron elementos de categoría ${params.category}`);
     }
     
     // Actualizar visualización
     this.fragments.update(true);
     
     return {
       success: true,
       count: elementsIsolated,
       message: `Se aislaron ${elementsIsolated} elementos de categoría ${params.category}`
     };
   } catch (error) {
     console.error("Error al aislar categoría:", error);
     throw error;
   }
 }

 private async createGeometry(params: any = {}): Promise<any> {
   if (!this.world || !this.world.scene) {
     throw new Error("Scene no disponible para crear geometría");
   }

   try {
     // Obtener la escena de Three.js
     const scene = this.world.scene.three;
     
     // Crear un grupo para contener las geometrías
     const group = new THREE.Group();
     group.name = params.name || "ai_generated_geometry";
     
     // Verificar si ya existe un grupo con este nombre y eliminarlo
     const existingGroup = scene.getObjectByName(group.name);
     if (existingGroup) {
       scene.remove(existingGroup);
     }
     
     // Determinar qué tipo de geometría crear
     const geometryType = params.geometry || 'box';
     const count = params.count || 1;
     
     for (let i = 0; i < count; i++) {
       let geometry;
       
       // Crear la geometría según el tipo solicitado
       switch (geometryType) {
         case 'box':
           geometry = new THREE.BoxGeometry(
             params.width || 1.0,
             params.height || 1.0,
             params.depth || 1.0
           );
           break;
         case 'sphere':
           geometry = new THREE.SphereGeometry(
             params.radius || 0.5,
             params.segments || 16,
             params.segments || 16
           );
           break;
         case 'cylinder':
           geometry = new THREE.CylinderGeometry(
             params.radiusTop || 0.5,
             params.radiusBottom || 0.5,
             params.height || 1.0,
             params.segments || 16
           );
           break;
         case 'plane':
           geometry = new THREE.PlaneGeometry(
             params.width || 1.0,
             params.height || 1.0
           );
           break;
         default:
           geometry = new THREE.BoxGeometry(1, 1, 1);
       }
       
       // Crear material para la geometría
       const material = new THREE.MeshStandardMaterial({
         color: params.color || 0x3498db,
         transparent: params.transparent || false,
         opacity: params.opacity !== undefined ? params.opacity : 1.0,
         metalness: params.metalness || 0.2,
         roughness: params.roughness || 0.7
       });
       
       // Crear mesh con la geometría y material
       const mesh = new THREE.Mesh(geometry, material);
       
       // Posición y rotación
       if (params.position) {
         mesh.position.set(
           params.position.x || 0,
           params.position.y || 0,
           params.position.z || 0
         );
       } else if (count > 1) {
         // Si hay múltiples geometrías, distribuirlas en espacio
         mesh.position.set(
           (Math.random() - 0.5) * 10,
           (Math.random() - 0.5) * 10,
           (Math.random() - 0.5) * 10
         );
       }
       
       if (params.rotation) {
         mesh.rotation.set(
           params.rotation.x || 0,
           params.rotation.y || 0,
           params.rotation.z || 0
         );
       } else if (count > 1) {
         // Rotación aleatoria para múltiples geometrías
         mesh.rotation.set(
           Math.random() * Math.PI * 2,
           Math.random() * Math.PI * 2,
           Math.random() * Math.PI * 2
         );
       }
       
       // Añadir al grupo
       group.add(mesh);
     }
     
     // Añadir luces si no existen
     const lightsGroup = scene.getObjectByName("ai_geometry_lights");
     if (!lightsGroup && params.addLights !== false) {
       const lights = new THREE.Group();
       lights.name = "ai_geometry_lights";
       
       // Luz ambiental
       const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
       lights.add(ambientLight);
       
       // Luz direccional
       const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
       directionalLight.position.set(10, 10, 10);
       lights.add(directionalLight);
       
       scene.add(lights);
     }
     
     // Añadir grupo a la escena
     scene.add(group);
     
     // Forzar actualización
     this.fragments.update(true);
     
     return {
       success: true,
       geometryType,
       count,
       message: `Se crearon ${count} geometrías de tipo ${geometryType}`
     };
   } catch (error) {
     console.error("Error al crear geometría:", error);
     throw error;
   }
 }

 private async createDiagram(params: any = {}): Promise<any> {
   if (!this.world || !this.world.scene) {
     throw new Error("Scene no disponible para crear diagrama");
   }

   try {
     // Verificar el tipo de diagrama
     const diagramType = params.type || 'distribution';
     
     // Verificar que haya datos
     if (!params.data || !Array.isArray(params.data) || params.data.length === 0) {
       throw new Error("Se requieren datos para crear el diagrama");
     }
     
     // Crear grupo para el diagrama
     const scene = this.world.scene.three;
     const group = new THREE.Group();
     group.name = params.name || "ai_generated_diagram";
     
     // Eliminar diagrama existente si lo hay
     const existingGroup = scene.getObjectByName(group.name);
     if (existingGroup) {
       scene.remove(existingGroup);
     }
     
     // Crear diagrama según el tipo
     switch (diagramType) {
       case 'distribution':
       case 'bar':
         await this.createBarChart(group, params.data, params);
         break;
       case 'pie':
         await this.createPieChart(group, params.data, params);
         break;
       default:
         throw new Error(`Tipo de diagrama no soportado: ${diagramType}`);
     }
     
     // Añadir grupo a la escena
     scene.add(group);
     
     // Forzar actualización
     this.fragments.update(true);
     
     return {
       success: true,
       diagramType,
       message: `Se creó diagrama de tipo ${diagramType}`
     };
   } catch (error) {
     console.error("Error al crear diagrama:", error);
     throw error;
   }
 }

 private async createBarChart(group: THREE.Group, data: any[], options: any = {}): Promise<void> {
   // Configuración
   const barWidth = options.barWidth || 0.5;
   const barDepth = options.barDepth || 0.5;
   const spacing = options.spacing || 0.2;
   const maxHeight = options.maxHeight || 5;
   const colors = options.colors || [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6];
   
   // Determinar valor máximo para escala
   let maxValue = 0;
   for (const item of data) {
     const value = typeof item.value !== 'undefined' ? item.value : 
                  typeof item.count !== 'undefined' ? item.count : 0;
     maxValue = Math.max(maxValue, value);
   }
   
   // Si no hay valores positivos, usar 1 como valor máximo
   if (maxValue <= 0) maxValue = 1;
   
   // Crear barras
   for (let i = 0; i < data.length; i++) {
     const item = data[i];
     const value = typeof item.value !== 'undefined' ? item.value : 
                  typeof item.count !== 'undefined' ? item.count : 0;
     const name = item.name || item.type || item.label || `Item ${i+1}`;
     
     // Calcular altura de la barra
     const barHeight = (value / maxValue) * maxHeight;
     
     // Crear geometría de la barra
     const geometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
     
     // Crear material con color
     const colorIndex = i % colors.length;
     const material = new THREE.MeshStandardMaterial({
       color: colors[colorIndex],
       metalness: 0.2,
       roughness: 0.7
     });
     
     // Crear mesh
     const bar = new THREE.Mesh(geometry, material);
     
     // Posicionar barra (centrada en Y, distribuida en X)
     const xPos = i * (barWidth + spacing) - (data.length * (barWidth + spacing)) / 2 + barWidth/2;
     bar.position.set(xPos, barHeight / 2, 0);
     
     // Añadir barra al grupo
     group.add(bar);
   }
   
   // Crear base para el diagrama
   const baseWidth = data.length * (barWidth + spacing);
   const baseGeometry = new THREE.BoxGeometry(baseWidth, 0.1, barDepth);
   const baseMaterial = new THREE.MeshStandardMaterial({
     color: 0xcccccc,
     metalness: 0.3,
     roughness: 0.8
   });
   const base = new THREE.Mesh(baseGeometry, baseMaterial);
   base.position.set(0, -0.05, 0);
   group.add(base);
   
   // Posicionar el grupo completo
   group.position.set(0, 0, 5); // Colocar frente a la cámara
 }

 private async createPieChart(group: THREE.Group, data: any[], options: any = {}): Promise<void> {
   // Configuración
   const radius = options.radius || 2;
   const thickness = options.thickness || 0.5;
   const segments = options.segments || 32;
   const colors = options.colors || [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6];
   
   // Calcular valor total
   let total = 0;
   for (const item of data) {
     const value = typeof item.value !== 'undefined' ? item.value : 
                  typeof item.count !== 'undefined' ? item.count : 0;
     total += value;
   }
   
   // Si total es 0, no podemos crear el gráfico
   if (total <= 0) {
     throw new Error("La suma de los valores debe ser mayor que cero");
   }
   
   // Variables para seguir el ángulo
   let startAngle = 0;
   
   // Crear cada sector
   for (let i = 0; i < data.length; i++) {
     const item = data[i];
     const value = typeof item.value !== 'undefined' ? item.value : 
                  typeof item.count !== 'undefined' ? item.count : 0;
     const name = item.name || item.type || item.label || `Item ${i+1}`;
     
     // Calcular el ángulo para este valor
     const angle = (value / total) * (Math.PI * 2);
     
     // Crear geometría para el sector
     const geometry = new THREE.CylinderGeometry(
       radius,         // Radio superior
       radius,         // Radio inferior
       thickness,      // Altura
       segments,       // Segmentos (resolución)
       1,              // Segmentos de altura
       false,          // Abierto en los extremos
       startAngle,     // Ángulo inicial
       angle           // Tamaño del ángulo
     );
     
     // Rotar para que quede plano en el plano XZ
     geometry.rotateX(Math.PI / 2);
     
     // Crear material con color
     const colorIndex = i % colors.length;
     const material = new THREE.MeshStandardMaterial({
       color: colors[colorIndex],
       metalness: 0.2,
       roughness: 0.7
     });
     
     // Crear mesh
     const sector = new THREE.Mesh(geometry, material);
     
     // Añadir al grupo
     group.add(sector);
     
     // Actualizar ángulo inicial para el siguiente sector
     startAngle += angle;
   }
   
   // Posicionar el grupo completo
   group.position.set(0, 0, 5); // Colocar frente a la cámara
 }

 // Método auxiliar para destacar un elemento
 private async highlightElement(model: any, localId: number, color: number = 0xffff00): Promise<void> {
   try {
     // Crear material para destacar
     const material = {
       color: color,      // Amarillo brillante
       opacity: 1.0,      // Totalmente opaco
       metalness: 0.3,    // Ligeramente metálico
       roughness: 0.4     // Superficie moderadamente lisa
     };
     
     // Aplicar material de destacado al elemento
     await model.highlight([localId], material);
   } catch (error) {
     console.warn(`Error al destacar elemento ${localId}:`, error);
   }
 }
}

export default AutonomousAIAgent;