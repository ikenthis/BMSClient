// src/components/ViewerPanels/SensorsPanel/index.ts
// Archivo de índice para exportar todos los componentes

export { default as SensorsPanelMain } from './SensorsPanelMain';
export { default as RealSensorsComponent } from './RealSensorsComponent';
export { default as MockSensorsComponent } from './MockSensorComponent';
export { default as SensorDetailPanel } from './SensorDetailPanel';
export { default as DashboardView } from './DashboardView';

// Estructura de archivos recomendada:
/*
src/components/ViewerPanels/SensorsPanel/
├── index.ts                          // Exportaciones principales
├── SensorsPanelMain.tsx             // Componente principal (coordinador)
├── RealSensorsComponent.tsx         // Temperatura + Ocupación (WebSocket real)
├── MockSensorsComponent.tsx         // CO2 + Humedad + Iluminación (ficticios)
├── SensorDetailPanel.tsx           // Panel de detalles del sensor seleccionado
├── DashboardView.tsx               // Vista dashboard con gráficos
├── components/
│   ├── SensorCard.tsx              // Tarjeta individual de sensor
│   ├── SensorControls.tsx          // Controles (start/stop/reset)
│   └── SensorStatus.tsx            // Indicadores de estado
├── hooks/
│   ├── useRealSensors.ts           // Hook para sensores reales
│   ├── useMockSensors.ts           // Hook para sensores ficticios
│   └── useWebSocket.ts             // Hook para WebSocket
├── utils/
│   ├── sensorUtils.ts              // Utilidades compartidas
│   └── mockSensorData.ts           // Ya lo tienes creado
├── SensorPanelStyles.ts            // Ya lo tienes creado
└── SensorVisualizations.tsx        // Ya lo tienes creado
*/