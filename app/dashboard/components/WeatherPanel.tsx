import React, { useState, useEffect } from 'react';
import { Droplet, Wind, Sun, Cloud, CloudRain, CloudSun } from 'lucide-react';

const WeatherPanel = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gray-900/30 border border-blue-500/20 rounded-lg p-3 w-56 h-[260px]	relative flex flex-col ml-auto">
      {/* Borde de acento superior */}
      <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      {/* Encabezado con estilo cybernético */}
      <div className="mb-3 relative">
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-medium uppercase tracking-wider">
          CLIMA ACTUAL
        </h2>
        <p className="text-xs text-gray-400">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
          {currentTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* Temperatura actual con indicador visual */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl font-bold text-white">22°</div>
        <div className="text-xs text-gray-400">Sensación 21°</div>
      </div>

      <div className="grid grid-cols-4 gap-1 mb-3">
        {[
          { day: 'Lun', icon: CloudSun, temp: 19, color: 'text-blue-300' },
          { day: 'Mar', icon: CloudRain, temp: 16, color: 'text-blue-400' },
          { day: 'Mié', icon: Cloud, temp: 18, color: 'text-gray-300' },
          { day: 'Jue', icon: Sun, temp: 21, color: 'text-amber-300' }
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="text-xs text-gray-400">{item.day}</div>
            <item.icon className={`h-4 w-4 my-1 ${item.color}`} />
            <div className="text-xs text-white">{item.temp}°</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400">
            <Droplet className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
            <span>Humedad</span>
          </div>
          <span className="text-white">42%</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400">
            <Wind className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            <span>Viento</span>
          </div>
          <span className="text-white">12 km/h</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center text-gray-400">
            <Sun className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
            <span>Índice UV</span>
          </div>
          <span className="text-white">Moderado</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherPanel;