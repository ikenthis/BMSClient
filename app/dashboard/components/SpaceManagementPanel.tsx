import React, { useState, useEffect } from 'react';
import { Layout, Lock, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const SpaceManagementPanel = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Todos los espacios (pueden ser 10, 15, etc.)
  const allSpaces = [
    { id: 1, name: 'Sala Exposición 1', status: 'Disponible' },
    { id: 2, name: 'Laboratorio', status: 'Restringido' },
    { id: 3, name: 'Auditorio', status: 'En Mantenimiento' },
    { id: 4, name: 'Sala Exposición 2', status: 'Disponible' },
    { id: 5, name: 'Biblioteca', status: 'En Restauración' },
    { id: 6, name: 'Sala Juntas A', status: 'Disponible' },
    { id: 7, name: 'Cafetería', status: 'Restringido' },
    { id: 8, name: 'Terraza', status: 'Disponible' },
    { id: 9, name: 'Sala Server', status: 'En Mantenimiento' },
    { id: 10, name: 'Estacionamiento', status: 'Disponible' }
  ];

  // Mostramos solo 5 espacios a la vez (rotando)
  const visibleSpaces = [
    ...allSpaces.slice(currentIndex, currentIndex + 5),
    ...allSpaces.slice(0, Math.max(0, currentIndex + 5 - allSpaces.length))
  ].slice(0, 5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Rotación automática cada 3 segundos
    const rotationTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allSpaces.length);
    }, 3000);

    return () => {
      clearInterval(timer);
      clearInterval(rotationTimer);
    };
  }, [allSpaces.length]);

  const getStatusIcon = (status: 'Disponible' | 'Restringido' | 'En Mantenimiento' | 'En Restauración' | string) => {
    switch (status) {
      case 'Restringido': return <Lock className="h-3 w-3 text-amber-400" />;
      case 'En Mantenimiento': return <AlertCircle className="h-3 w-3 text-red-400" />;
      case 'En Restauración': return <Clock className="h-3 w-3 text-purple-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: 'Disponible' | 'Restringido' | 'En Mantenimiento' | 'En Restauración' | string) => {
    switch (status) {
      case 'Disponible': return 'bg-green-500/20 text-green-400';
      case 'Restringido': return 'bg-amber-500/20 text-amber-400';
      case 'En Mantenimiento': return 'bg-red-500/20 text-red-400';
      case 'En Restauración': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900/30 border border-blue-500/20 rounded-lg p-3 w-56 backdrop-blur-sm shadow-lg hover:bg-gray-900/40 transition-all">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-medium uppercase tracking-wider">
          Espacios
        </h2>
      </div>

      {/* Contenedor de espacios con animación */}
      <div className="relative h-[120px] overflow-hidden">
        {visibleSpaces.map((space, idx) => (
          <div
            key={space.id}
            className={`absolute w-full flex justify-between items-center p-1.5 rounded hover:bg-gray-800/40 transition-all duration-500 ${
              idx === 0 ? 'top-0 opacity-100' :
              idx === 1 ? 'top-6 opacity-90' :
              idx === 2 ? 'top-12 opacity-80' :
              idx === 3 ? 'top-18 opacity-70' :
              'top-24 opacity-60'
            }`}
            style={{ zIndex: 5 - idx }}
          >
            <div className="flex items-center">
              {getStatusIcon(space.status)}
              <span className="text-xs text-white ml-1.5 truncate">
                {space.name}
              </span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(space.status)}`}>
              {space.status}
            </span>
          </div>
        ))}
      </div>

      {/* Controles de navegación (opcional) */}
      <div className="flex justify-center mt-2 space-x-4">
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + allSpaces.length) % allSpaces.length)}
          className="text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <span className="text-xs text-gray-400">
          {currentIndex + 1}/{allSpaces.length}
        </span>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % allSpaces.length)}
          className="text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default SpaceManagementPanel;