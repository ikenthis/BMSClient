import React, { useState, useEffect } from 'react';
import { Thermometer, Droplet, Wind, Gauge, Zap } from 'lucide-react';

const EnvironmentMonitorPanel = () => {
  // Estado general calculado (ejemplo: 85% óptimo)
  const overallStatus = 85;

  return (
    <div className="bg-gray-900/30 border border-blue-500/20 rounded-lg p-3 w-56 backdrop-blur-sm shadow-lg hover:bg-gray-900/40 transition-all group h-[220px]">
      {/* Borde de acento superior */}
      <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
      
      {/* Encabezado compacto */}
      <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-medium uppercase tracking-wider mb-2">
        MONITOREO DE AMBIENTE
      </h2>

      {/* Sensores con espaciado reducido */}
      <div className="space-y-2 text-xs">
        {/* Temperatura */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <Thermometer className="h-3.5 w-3.5 mr-1.5 text-red-400" />
            <span>Temperatura</span>
          </div>
          <span className="text-white">21.5°C</span>
        </div>
             
        {/* Humedad */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <Droplet className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
            <span>Humedad</span>
          </div>
          <span className="text-white">42.65%</span>
        </div>
             
        {/* Flujo de Aire */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <Wind className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
            <span>Flujo de Aire</span>
          </div>
          <span className="text-white">0.5 m/s</span>
        </div>
             
        {/* Presión */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <Gauge className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
            <span>Presión</span>
          </div>
          <span className="text-white">1013 hPa</span>
        </div>
             
        {/* Consumo Energía */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-400">
            <Zap className="h-3.5 w-3.5 mr-1.5 text-yellow-400" />
            <span>Consumo Energía</span>
          </div>
          <span className="text-white">45.11 kW</span>
        </div>
      </div>

      {/* Barra de estado */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Estado general:</span>
          <span className={
            overallStatus >= 80 ? 'text-green-400' :
            overallStatus >= 50 ? 'text-amber-400' : 'text-red-400'
          }>
            {overallStatus >= 80 ? 'Óptimo' : 
             overallStatus >= 50 ? 'Normal' : 'Crítico'}
          </span>
        </div>
        <div className="w-full bg-gray-700/40 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full ${
              overallStatus >= 80 ? 'bg-green-500' :
              overallStatus >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${overallStatus}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default EnvironmentMonitorPanel;