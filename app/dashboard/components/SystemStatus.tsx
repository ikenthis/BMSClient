import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

const SystemStatusPanel = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const systems = [
    { id: 1, name: 'Climatización', value: 8.2, max: 10, color: 'text-blue-500' },
    { id: 2, name: 'Iluminación', value: 7.5, max: 10, color: 'text-amber-500' },
    { id: 3, name: 'Seguridad', value: 9.1, max: 10, color: 'text-green-500' },
    { id: 4, name: 'Red eléctrica', value: 6.8, max: 10, color: 'text-purple-500' }
  ];

  return (
    <div className="bg-gray-900/60 border border-blue-500/30 rounded-lg p-3 w-56 backdrop-blur-sm shadow-lg hover:bg-gray-900/70 transition-all fixed top-[205px] right-[-10px] z-50">
  {/* Borde de acento superior */}
  <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent"></div>
  
  {/* Encabezado con estilo de gradiente */}
  <div className="flex justify-between items-center mb-1">
    <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-medium uppercase tracking-wider">
      ESTADO DEL SISTEMA
    </h2>
    <Activity className="h-4 w-4 text-blue-400" />
  </div>
  
  {/* Fecha y hora actual */}
  <p className="text-xs text-gray-300 mb-3">
    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
    {currentTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
  </p>

  {/* Indicadores del sistema - 2 columnas */}
  <div className="grid grid-cols-2 gap-2">
    {systems.map(system => (
      <div key={system.id} className="flex flex-col items-center p-1">
        <div className="relative w-10 h-10 mb-1">
          <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
            <circle 
              cx="18" 
              cy="18" 
              r="14" 
              fill="none" 
              className="stroke-current text-gray-700/70" 
              strokeWidth="2" 
            />
            <circle 
              cx="18" 
              cy="18" 
              r="14" 
              fill="none" 
              className={`stroke-current ${system.color}`}
              strokeWidth="2" 
              strokeDasharray="100" 
              strokeDashoffset={100 - (system.value / system.max * 100)}
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[10px] font-medium ${system.color}`}>
              {system.value.toFixed(1)}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-gray-300 text-center truncate w-full">
          {system.name}
        </span>
      </div>
    ))}
  </div>

  {/* Pie de página con escala */}
  <div className="mt-2 flex justify-between text-[10px] text-gray-300 pt-2 border-t border-blue-500/30">
    <span>0</span>
    <span>Escala</span>
    <span>10</span>
  </div>
</div>
  );
};

export default SystemStatusPanel;