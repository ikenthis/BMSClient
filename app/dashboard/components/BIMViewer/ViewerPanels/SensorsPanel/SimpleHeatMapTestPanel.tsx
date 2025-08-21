// SimpleHeatMapTestPanel.tsx - Panel simplificado para probar raycast de colores en espacios
import React, { useState } from 'react';
import { 
  Thermometer, 
  Palette,
  RefreshCw, 
  Trash2,
  X
} from 'lucide-react';
import * as THREE from 'three';
import * as FRAGS from '@thatopen/fragments';

interface SimpleHeatMapTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  models?: FRAGS.FragmentsModel[];
  fragments?: FRAGS.FragmentsModels;
  world?: any;
  position?: 'left' | 'right';
}

const SimpleHeatMapTestPanel: React.FC<SimpleHeatMapTestPanelProps> = ({
  isOpen,
  onClose,
  models,
  fragments,
  world,
  position = 'right'
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
  };

  // 🎯 FUNCIÓN PRINCIPAL: Aplicar colores aleatorios a espacios usando raycast
  const applyRandomColorsToSpaces = async () => {
    console.log('🌈 === INICIANDO PRUEBA SIMPLE DE RAYCAST EN ESPACIOS ===');
    
    if (!models || models.length === 0) {
      showNotification('❌ No hay modelos cargados', 'error');
      return;
    }

    if (!fragments) {
      showNotification('❌ FragmentsManager no disponible', 'error');
      return;
    }

    setIsApplying(true);

    try {
      let totalSpacesFound = 0;
      let spacesColored = 0;

      // Definir los 3 colores que queremos probar
      const colors = [
        { name: 'ROJO', color: new THREE.Color(1.0, 0.2, 0.2), temp: '🔥 30°C' },
        { name: 'NARANJA', color: new THREE.Color(1.0, 0.6, 0.0), temp: '🟡 25°C' },
        { name: 'AZUL', color: new THREE.Color(0.2, 0.4, 1.0), temp: '❄️ 15°C' }
      ];

      console.log('🎨 Colores definidos:', colors.map(c => c.name).join(', '));

      // Procesar cada modelo
      for (const model of models) {
        try {
          console.log(`🏗️ Procesando modelo: ${model.id}`);
          
          // Verificar si el modelo tiene espacios
          const categories = await model.getCategories();
          if (!categories.includes('IFCSPACE')) {
            console.log(`⚠️ Modelo ${model.id} no contiene espacios IFCSPACE`);
            continue;
          }

          // Obtener todos los espacios del modelo
          const spaceItems = await model.getItemsOfCategory('IFCSPACE');
          console.log(`🏠 Encontrados ${spaceItems.length} espacios en modelo ${model.id}`);
          totalSpacesFound += spaceItems.length;

          // Aplicar color aleatorio a cada espacio
          for (let i = 0; i < spaceItems.length; i++) {
            const spaceItem = spaceItems[i];
            
            try {
              const localId = await spaceItem.getLocalId();
              if (localId === null) continue;

              // Seleccionar color aleatorio (rotar entre los 3)
              const colorIndex = i % 3;
              const selectedColor = colors[colorIndex];

              console.log(`🎨 Aplicando color ${selectedColor.name} a espacio ${localId}`);

              // 🔥 APLICAR RAYCAST/HIGHLIGHT AL ESPACIO
              await model.highlight([localId], {
                color: selectedColor.color,
                opacity: 0.8, // 80% de opacidad para que se vea bien
                renderedFaces: FRAGS.RenderedFaces.TWO,
                transparent: true
              });

              spacesColored++;

            } catch (spaceError) {
              console.warn(`❌ Error procesando espacio individual:`, spaceError);
            }
          }

        } catch (modelError) {
          console.warn(`❌ Error procesando modelo ${model.id}:`, modelError);
        }
      }

      // Forzar actualización de la visualización
      console.log('🔄 Actualizando visualización...');
      await fragments.update(true);

      // Mostrar resultado
      const successMessage = `✅ Colores aplicados: ${spacesColored}/${totalSpacesFound} espacios`;
      console.log(successMessage);
      showNotification(successMessage, 'success');

      // Mostrar distribución después de 1 segundo
      setTimeout(() => {
        const distribution = `🔴${Math.ceil(spacesColored/3)} rojos | 🟠${Math.ceil(spacesColored/3)} naranjas | 🔵${Math.floor(spacesColored/3)} azules`;
        showNotification(distribution, 'info');
      }, 1500);

    } catch (error) {
      console.error('❌ Error aplicando colores:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // 🧹 FUNCIÓN: Limpiar todos los colores
  const clearAllColors = async () => {
    console.log('🧹 === LIMPIANDO COLORES DE ESPACIOS ===');
    
    if (!models || models.length === 0 || !fragments) {
      showNotification('❌ No hay modelos para limpiar', 'error');
      return;
    }

    setIsApplying(true);

    try {
      for (const model of models) {
        try {
          // Resetear highlighting de espacios
          const spaceItems = await model.getItemsOfCategory('IFCSPACE');
          const localIds = (await Promise.all(
            spaceItems.map(item => item.getLocalId())
          )).filter(id => id !== null) as number[];

          if (localIds.length > 0) {
            console.log(`🧹 Limpiando ${localIds.length} espacios en modelo ${model.id}`);
            
            // Restablecer a color normal/transparente
            await model.highlight(localIds, {
              color: new THREE.Color(0.8, 0.8, 0.8),
              opacity: 0.1,
              renderedFaces: FRAGS.RenderedFaces.TWO,
              transparent: true
            });
          }
        } catch (error) {
          console.warn(`❌ Error limpiando modelo ${model.id}:`, error);
        }
      }

      await fragments.update(true);
      
      console.log('✅ Colores limpiados');
      showNotification('🧹 Colores limpiados de todos los espacios', 'info');

    } catch (error) {
      console.error('❌ Error limpiando colores:', error);
      showNotification(`❌ Error limpiando: ${error.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed top-4 ${position}-4 z-50 w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-600 rounded-lg shadow-2xl`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Palette className="text-blue-400" size={20} />
          <h3 className="text-white font-medium">Prueba HeatMap</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Notificación */}
      {notification.visible && (
        <div className={`mx-4 mt-4 p-3 rounded-md text-sm ${
          notification.type === 'success' ? 'bg-green-900/50 border border-green-600 text-green-200' :
          notification.type === 'error' ? 'bg-red-900/50 border border-red-600 text-red-200' :
          'bg-blue-900/50 border border-blue-600 text-blue-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Contenido principal */}
      <div className="p-4">
        <div className="text-gray-300 text-sm mb-4">
          Esta es una prueba simple para verificar si el raycast funciona en los espacios.
        </div>

        {/* Estado del sistema */}
        <div className="bg-gray-800/50 rounded p-3 mb-4">
          <div className="text-xs text-gray-400 space-y-1">
            <div>📊 Modelos cargados: {models?.length || 0}</div>
            <div>🌍 World: {world ? '✅' : '❌'}</div>
            <div>🧩 Fragments: {fragments ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* Controles principales */}
        <div className="space-y-3">
          {/* Botón principal de prueba */}
          <button
            onClick={applyRandomColorsToSpaces}
            disabled={isApplying || !models || models.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-600 via-orange-500 to-blue-600 hover:from-red-500 hover:via-orange-400 hover:to-blue-500 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 text-white py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 transform hover:scale-105 disabled:scale-100"
          >
            {isApplying ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Aplicando colores...</span>
              </>
            ) : (
              <>
                <Thermometer size={16} />
                <span>🌈 Aplicar Colores Aleatorios</span>
              </>
            )}
          </button>

          {/* Botón de limpiar */}
          <button
            onClick={clearAllColors}
            disabled={isApplying || !models || models.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white py-2 px-3 rounded text-sm transition-colors"
          >
            <Trash2 size={14} />
            <span>🧹 Limpiar Colores</span>
          </button>
        </div>

        {/* Información de la prueba */}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded text-xs text-blue-200">
          <div className="font-medium mb-1">💡 Qué hace esta prueba:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Busca todos los espacios IFCSPACE</li>
            <li>Aplica raycast de colores: 🔴 Rojo, 🟠 Naranja, 🔵 Azul</li>
            <li>Usa model.highlight() para cambiar colores</li>
            <li>Actualiza la visualización con fragments.update()</li>
          </ul>
        </div>

        {/* Leyenda de colores */}
        <div className="mt-3 p-3 bg-gray-800/30 rounded">
          <div className="text-xs text-gray-300 font-medium mb-2">🎨 Leyenda de colores:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-red-300">Caliente</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-orange-300">Medio</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-blue-300">Frío</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleHeatMapTestPanel;