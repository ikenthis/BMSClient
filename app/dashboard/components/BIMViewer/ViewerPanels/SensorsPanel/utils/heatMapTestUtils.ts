// heatMapTestUtils.ts - Utilidades para probar y simular datos del mapa de calor
import { HeatMapData } from '../utils/HeatMapVisualization';
import { sensorSpaceIntegration } from '../services/sensorSpaceIntegrationService';
import { SpaceElement } from '../../../utils/typeDefs';

export interface SimulatedSensorData {
  sensorId: string;
  sensorType: 'temperature' | 'humidity' | 'occupancy';
  value: number;
  quality: 'good' | 'warning' | 'critical' | 'error';
  spaceGuid: string;
  spaceName: string;
}

class HeatMapTestUtils {
  
  /**
   * Función para testing rápido - aplica datos simulados inmediatamente
   */
  static async quickTest(spaces: SpaceElement[], heatMapVisualization: any, heatMapHook?: any): Promise<void> {
    console.log('🚀 === QUICK TEST HEATMAP ===');
    
    try {
      // 1. Verificar prerequisitos
      if (spaces.length === 0) {
        throw new Error('No hay espacios disponibles para testing');
      }
      
      console.log(`✓ ${spaces.length} espacios disponibles`);
      console.log('📋 Espacios encontrados:');
      spaces.forEach((space, index) => {
        console.log(`  ${index + 1}. ${space.name} (GUID: ${space.properties?.globalId || 'N/A'})`);
      });
      
      // 2. Generar y aplicar datos simulados
      console.log('🎲 Generando datos simulados...');
      await this.applySimulatedData(spaces, heatMapVisualization);
      
      // 3. Si hay hook disponible, verificar estado y activar si es necesario
      if (heatMapHook) {
        console.log('🔍 Estado del hook:');
        console.log(`  - Inicializado: ${heatMapHook.isInitialized}`);
        console.log(`  - Activo: ${heatMapHook.isActive}`);
        console.log(`  - Tiene datos: ${heatMapHook.hasData}`);
        console.log(`  - Cantidad de datos: ${heatMapHook.dataCount}`);
        console.log(`  - Error: ${heatMapHook.error || 'Ninguno'}`);
        
        if (!heatMapHook.isActive) {
          console.log('🔥 Activando heatmap...');
          await heatMapHook.activate();
          
          // Verificar estado después de activar
          console.log('📊 Estado después de activar:');
          console.log(`  - Activo: ${heatMapHook.isActive}`);
          console.log(`  - Tiene datos: ${heatMapHook.hasData}`);
          console.log(`  - Cantidad de datos: ${heatMapHook.dataCount}`);
        } else {
          console.log('✅ Heatmap ya está activo');
        }
      }
      
      // 4. Verificar que el sistema de visualización tenga datos
      if (heatMapVisualization.hasData) {
        console.log(`📈 Visualización tiene ${heatMapVisualization.dataCount} elementos`);
        const currentData = heatMapVisualization.getCurrentData();
        currentData.forEach((data, index) => {
          console.log(`  ${index + 1}. ${data.spaceName}: ${data.temperature.toFixed(1)}°C (${data.quality})`);
        });
      } else {
        console.warn('⚠️ La visualización no tiene datos');
      }
      
      // 5. Generar reporte
      const report = this.generateDebugReport(spaces, heatMapHook);
      console.log('\n' + report);
      
      console.log('✅ Quick test completado exitosamente');
      
      // 6. Mostrar instrucciones actualizadas
      console.log('\n🎯 === INSTRUCCIONES ===');
      console.log('Para verificar el resultado:');
      console.log('1. Los espacios IFCSPACE deberían estar coloreados según estado:');
      console.log('   🟢 VERDE = Clima óptimo (funcionamiento normal)');
      console.log('   🟡 AMARILLO = Anomalía detectada (requiere atención)');
      console.log('   🔴 ROJO = Falla del sistema (requiere intervención inmediata)');
      console.log('2. Usa el panel de control para ajustar la configuración');
      console.log('3. Revisa la consola del navegador para más detalles');
      
    } catch (error) {
      console.error('❌ Error en quick test:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }
  
  /**
   * Genera datos simulados de sensores para testing
   */
  static generateSimulatedSensorData(spaces: SpaceElement[], sensorCount: number = 3): SimulatedSensorData[] {
    const simulatedData: SimulatedSensorData[] = [];
    
    if (spaces.length === 0) {
      console.warn('No hay espacios disponibles para simular sensores');
      return simulatedData;
    }
    
    // Tomar una muestra de espacios para simular sensores
    const selectedSpaces = spaces.slice(0, Math.min(spaces.length, Math.ceil(spaces.length * 0.6)));
    
    selectedSpaces.forEach((space, index) => {
      const spaceGuid = space.properties?.globalId || `space_${index}`;
      const spaceName = space.name || `Espacio ${index + 1}`;
      
      // Generar sensor de temperatura para cada espacio
      simulatedData.push({
        sensorId: `temp_sensor_${index + 1}`,
        sensorType: 'temperature',
        value: this.generateRandomTemperature(),
        quality: this.generateRandomQuality(),
        spaceGuid,
        spaceName
      });
      
      // Algunos espacios tendrán sensores adicionales
      if (Math.random() > 0.5) {
        simulatedData.push({
          sensorId: `humidity_sensor_${index + 1}`,
          sensorType: 'humidity',
          value: this.generateRandomHumidity(),
          quality: this.generateRandomQuality(),
          spaceGuid,
          spaceName
        });
      }
      
      if (Math.random() > 0.7) {
        simulatedData.push({
          sensorId: `occupancy_sensor_${index + 1}`,
          sensorType: 'occupancy',
          value: this.generateRandomOccupancy(),
          quality: this.generateRandomQuality(),
          spaceGuid,
          spaceName
        });
      }
    });
    
    return simulatedData;
  }
  
  /**
   * Convierte datos simulados a formato HeatMapData
   */
  static convertToHeatMapData(simulatedData: SimulatedSensorData[]): HeatMapData[] {
    const heatMapData: HeatMapData[] = [];
    
    // Agrupar datos por espacio
    const dataBySpace = new Map<string, SimulatedSensorData[]>();
    
    simulatedData.forEach(data => {
      if (!dataBySpace.has(data.spaceGuid)) {
        dataBySpace.set(data.spaceGuid, []);
      }
      dataBySpace.get(data.spaceGuid)!.push(data);
    });
    
    // Crear HeatMapData para cada espacio
    dataBySpace.forEach((spaceData, spaceGuid) => {
      const temperatureData = spaceData.find(d => d.sensorType === 'temperature');
      const humidityData = spaceData.find(d => d.sensorType === 'humidity');
      const occupancyData = spaceData.find(d => d.sensorType === 'occupancy');
      
      if (temperatureData) {
        heatMapData.push({
          spaceGuid,
          spaceName: temperatureData.spaceName,
          temperature: temperatureData.value,
          humidity: humidityData?.value,
          occupancy: occupancyData?.value,
          timestamp: new Date().toISOString(),
          quality: this.determineOverallQuality(spaceData.map(d => d.quality))
        });
      }
    });
    
    return heatMapData;
  }
  
  /**
   * Aplica datos simulados al sistema de heatmap
   */
  static async applySimulatedData(spaces: SpaceElement[], heatMapVisualization: any): Promise<void> {
    console.log('🧪 Aplicando datos simulados al mapa de calor...');
    
    try {
      // Generar datos simulados
      const simulatedSensorData = this.generateSimulatedSensorData(spaces);
      console.log(`Generados ${simulatedSensorData.length} sensores simulados`);
      
      // Convertir a formato HeatMapData
      const heatMapData = this.convertToHeatMapData(simulatedSensorData);
      console.log(`Creados ${heatMapData.length} datos de mapa de calor`);
      
      // Aplicar datos al sistema de visualización
      heatMapVisualization.updateHeatMapData(heatMapData);
      
      console.log('✅ Datos simulados aplicados correctamente');
      console.log('🎨 Esquema de colores aplicado:');
      console.log('  🟢 Verde: Clima óptimo (good)');
      console.log('  🟡 Amarillo: Anomalía (warning/critical)');
      console.log('  🔴 Rojo: Falla del sistema (error)');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error aplicando datos simulados:', error);
      throw error;
    }
  }
  
  /**
   * Crea sensores simulados en el sistema de integración
   */
  static createSimulatedSensors(spaces: SpaceElement[]): void {
    console.log('🔧 Creando sensores simulados en el sistema...');
    
    const simulatedData = this.generateSimulatedSensorData(spaces);
    
    // Simular mapeo de sensores (esto normalmente vendría de la API)
    simulatedData.forEach(data => {
      const colorIndicator = this.getColorIndicatorByQuality(data.quality);
      console.log(`📍 Sensor simulado: ${data.sensorId} -> ${data.spaceName} (${data.value}${this.getUnitBySensorType(data.sensorType)}) ${colorIndicator}`);
    });
  }
  
  /**
   * Simula actualizaciones de sensores en tiempo real
   */
  static startSimulatedUpdates(spaces: SpaceElement[], heatMapVisualization: any, intervalMs: number = 10000): number {
    console.log('🔄 Iniciando actualizaciones simuladas de sensores...');
    
    return window.setInterval(() => {
      const simulatedData = this.generateSimulatedSensorData(spaces, 2); // Menos sensores para actualizaciones
      const heatMapData = this.convertToHeatMapData(simulatedData);
      
      if (heatMapData.length > 0) {
        heatMapVisualization.updateHeatMapData(heatMapData);
        console.log(`🔄 Actualización simulada: ${heatMapData.length} espacios actualizados`);
        
        // Mostrar estado de cada espacio actualizado
        heatMapData.forEach(data => {
          const colorIndicator = this.getColorIndicatorByQuality(data.quality);
          console.log(`  ${colorIndicator} ${data.spaceName}: ${data.temperature.toFixed(1)}°C`);
        });
      }
    }, intervalMs);
  }
  
  /**
   * Detiene las actualizaciones simuladas
   */
  static stopSimulatedUpdates(intervalId: number): void {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('⏹️ Actualizaciones simuladas detenidas');
    }
  }
  
  /**
   * Limpia todos los datos simulados
   */
  static clearSimulatedData(heatMapVisualization: any): void {
    console.log('🧹 Limpiando datos simulados...');
    
    try {
      // Desactivar el heatmap si está activo
      if (heatMapVisualization.isActiveMap) {
        heatMapVisualization.deactivateHeatMap();
      }
      
      console.log('✅ Datos simulados limpiados');
      
    } catch (error) {
      console.error('❌ Error limpiando datos simulados:', error);
    }
  }
  
  /**
   * Verifica la integridad del sistema de heatmap
   */
  static performSystemCheck(spaces: SpaceElement[], heatMapHook?: any): boolean {
    console.log('🔍 === VERIFICACIÓN DEL SISTEMA ===');
    
    const checks = [
      {
        name: 'Espacios disponibles',
        test: () => spaces.length > 0,
        result: spaces.length > 0,
        message: `${spaces.length} espacios encontrados`
      },
      {
        name: 'Espacios con GUID',
        test: () => spaces.some(s => s.properties?.globalId),
        result: spaces.some(s => s.properties?.globalId),
        message: `${spaces.filter(s => s.properties?.globalId).length} espacios con GUID válido`
      }
    ];
    
    if (heatMapHook) {
      checks.push(
        {
          name: 'HeatMap inicializado',
          test: () => heatMapHook.isInitialized,
          result: heatMapHook.isInitialized,
          message: heatMapHook.isInitialized ? 'Sistema inicializado' : 'Sistema no inicializado'
        },
        {
          name: 'Sin errores',
          test: () => !heatMapHook.error,
          result: !heatMapHook.error,
          message: heatMapHook.error || 'Sin errores detectados'
        }
      );
    }
    
    let allPassed = true;
    
    checks.forEach(check => {
      const status = check.result ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.message}`);
      if (!check.result) allPassed = false;
    });
    
    console.log(`\n${allPassed ? '✅' : '❌'} Verificación ${allPassed ? 'EXITOSA' : 'FALLIDA'}`);
    
    return allPassed;
  }
  
  /**
   * Genera temperatura aleatoria realista
   */
  private static generateRandomTemperature(): number {
    // Rango de 16°C a 30°C con distribución normal hacia 20-24°C
    const base = 22; // Temperatura base
    const variance = 4; // Varianza
    const random = (Math.random() + Math.random() + Math.random()) / 3; // Aproximación a distribución normal
    return Math.round((base + (random - 0.5) * variance * 2) * 10) / 10;
  }
  
  /**
   * Genera humedad aleatoria realista
   */
  private static generateRandomHumidity(): number {
    // Rango de 30% a 70% con tendencia hacia 45-55%
    const base = 50;
    const variance = 15;
    const random = Math.random();
    return Math.round(base + (random - 0.5) * variance * 2);
  }
  
  /**
   * Genera ocupación aleatoria
   */
  private static generateRandomOccupancy(): number {
    // Entre 0 y 10 personas
    return Math.floor(Math.random() * 11);
  }
  
  /**
   * Genera calidad aleatoria con pesos realistas
   * Mapeo actualizado:
   * - good = Verde (clima óptimo)
   * - warning/critical = Amarillo (anomalía)
   * - error = Rojo (falla del sistema)
   */
  private static generateRandomQuality(): 'good' | 'warning' | 'critical' | 'error' {
    const random = Math.random();
    if (random < 0.7) return 'good';      // 70% clima óptimo (Verde)
    if (random < 0.9) return 'warning';   // 20% anomalía leve (Amarillo)
    if (random < 0.98) return 'critical'; // 8% anomalía crítica (Amarillo)
    return 'error';                       // 2% falla del sistema (Rojo)
  }
  
  /**
   * Determina la calidad general de un conjunto de lecturas
   * Prioriza: error > critical/warning > good
   */
  private static determineOverallQuality(qualities: string[]): 'good' | 'warning' | 'critical' | 'error' {
    if (qualities.includes('error')) return 'error';        // Rojo: Falla del sistema
    if (qualities.includes('critical')) return 'critical';  // Amarillo: Anomalía crítica
    if (qualities.includes('warning')) return 'warning';    // Amarillo: Anomalía
    return 'good';                                          // Verde: Clima óptimo
  }
  
  /**
   * Obtiene indicador de color basado en la calidad
   */
  private static getColorIndicatorByQuality(quality: string): string {
    switch (quality) {
      case 'good': return '🟢'; // Verde: Clima óptimo
      case 'warning': 
      case 'critical': return '🟡'; // Amarillo: Anomalía
      case 'error': return '🔴'; // Rojo: Falla del sistema
      default: return '⚪'; // Blanco: Estado desconocido
    }
  }
  
  /**
   * Obtiene la unidad de medida según el tipo de sensor
   */
  private static getUnitBySensorType(sensorType: string): string {
    switch (sensorType) {
      case 'temperature': return '°C';
      case 'humidity': return '%';
      case 'occupancy': return ' personas';
      default: return '';
    }
  }
  
  /**
   * Crea un reporte de debugging del sistema
   */
  static generateDebugReport(spaces: SpaceElement[], heatMapHook?: any): string {
    const report = [
      '=== REPORTE DE DEBUG DEL HEATMAP ===',
      `Fecha: ${new Date().toLocaleString()}`,
      '',
      '--- ESQUEMA DE COLORES ---',
      '🟢 Verde: Clima óptimo (good)',
      '🟡 Amarillo: Anomalía (warning/critical)',
      '🔴 Rojo: Falla del sistema (error)',
      '',
      '--- ESPACIOS ---',
      `Total de espacios: ${spaces.length}`,
      `Espacios con GUID: ${spaces.filter(s => s.properties?.globalId).length}`,
      '',
      '--- SISTEMA ---'
    ];
    
    if (heatMapHook) {
      report.push(
        `Estado inicializado: ${heatMapHook.isInitialized}`,
        `Estado activo: ${heatMapHook.isActive}`,
        `Tiene datos: ${heatMapHook.hasData}`,
        `Cantidad de datos: ${heatMapHook.dataCount}`,
        `Sensores mapeados: ${heatMapHook.mappings?.length || 0}`,
        `Error: ${heatMapHook.error || 'Ninguno'}`,
        ''
      );
    }
    
    report.push(
      '--- ESPACIOS DETALLE ---',
      ...spaces.slice(0, 5).map((space, index) => 
        `${index + 1}. ${space.name} (GUID: ${space.properties?.globalId || 'N/A'})`
      )
    );
    
    if (spaces.length > 5) {
      report.push(`... y ${spaces.length - 5} espacios más`);
    }
    
    return report.join('\n');
  }
}

// Función helper global para debugging desde la consola del navegador
declare global {
  interface Window {
    heatMapTest: typeof HeatMapTestUtils;
  }
}

// Exponer utilities globalmente para debugging
if (typeof window !== 'undefined') {
  window.heatMapTest = HeatMapTestUtils;
}

export default HeatMapTestUtils;