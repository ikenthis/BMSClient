import React, { useState, useEffect } from 'react';
import { Brush, Archive, BookOpen, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

const CollectionsPanelCompact = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allCollections = [
    {
      id: 1,
      icon: Brush,
      count: 284,
      name: 'Obras de Arte',
      inRestoration: 12,
      color: 'text-blue-400'
    },
    {
      id: 2,
      icon: Archive,
      count: 156,
      name: 'Esculturas',
      inRestoration: 8,
      color: 'text-purple-400'
    },
    {
      id: 3,
      icon: BookOpen,
      count: 1429,
      name: 'Manuscritos',
      inRestoration: 23,
      color: 'text-amber-400'
    },
    {
      id: 4,
      icon: BookOpen,
      count: 756,
      name: 'Libros Antiguos',
      inRestoration: 15,
      color: 'text-emerald-400'
    }
  ];

  // Calcular total en restauración
  const totalInRestoration = allCollections.reduce((sum, item) => sum + item.inRestoration, 0);

  // Mostrar 2 colecciones a la vez con rotación automática
  const visibleCollections = [
    ...allCollections.slice(currentIndex, currentIndex + 2),
    ...allCollections.slice(0, Math.max(0, currentIndex + 2 - allCollections.length))
  ].slice(0, 2);

  useEffect(() => {
    const rotationTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allCollections.length);
    }, 5000);
    return () => clearInterval(rotationTimer);
  }, [allCollections.length]);

  return (
    <div className="bg-gray-900/60 border border-blue-500/30 rounded-lg p-3 w-56 backdrop-blur-sm shadow-lg hover:bg-gray-900/70 transition-all fixed top-[440px] right-[-10px] z-50 h-[220px]">
      {/* Borde de acento superior */}
      <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent"></div>
      
      {/* Encabezado compacto */}
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-medium uppercase tracking-wider">
          COLECCIONES
        </h2>
        <div className="text-xs text-gray-300">
          {currentIndex + 1}/{allCollections.length}
        </div>
      </div>
      
      {/* Contenedor de colecciones con efecto cascada */}
      <div className="relative h-[120px] overflow-hidden">
        {visibleCollections.map((collection, idx) => (
          <div 
            key={collection.id}
            className={`absolute w-full bg-gray-800/50 p-2 rounded-md border-l-2 ${collection.color.replace('text', 'border')} transition-all duration-500 ${
              idx === 0 ? 'top-0 opacity-100' : 'top-16 opacity-90'
            }`}
          >
            <div className="flex items-center">
              <div className={`${collection.color.replace('text', 'bg')}/30 rounded-full p-1.5 mr-2`}>
                <collection.icon className={`h-4 w-4 ${collection.color}`} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{collection.count.toLocaleString()}</div>
                <div className="text-xs text-gray-300">{collection.name}</div>
              </div>
              {collection.inRestoration > 0 && (
                <div className="ml-auto text-xs text-amber-400 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {collection.inRestoration}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
  
      {/* Barra de progreso y controles */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="flex justify-between items-center text-[10px] text-gray-300 mb-1">
          <span>Total en restauración:</span>
          <span className="text-amber-400 flex items-center">
            <AlertTriangle className="h-2.5 w-2.5 mr-1" />
            {totalInRestoration}
          </span>
        </div>
        <div className="w-full bg-gray-700/60 rounded-full h-1">
          <div 
            className="bg-gradient-to-r from-blue-400 to-cyan-500 h-1 rounded-full" 
            style={{ width: `${((currentIndex + 1)/allCollections.length)*100}%` }}
          />
        </div>
        <div className="flex justify-center mt-1.5 space-x-4">
          <button 
            onClick={() => setCurrentIndex((prev) => (prev - 1 + allCollections.length) % allCollections.length)}
            className="text-gray-300 hover:text-cyan-400 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button 
            onClick={() => setCurrentIndex((prev) => (prev + 1) % allCollections.length)}
            className="text-gray-300 hover:text-cyan-400 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectionsPanelCompact;