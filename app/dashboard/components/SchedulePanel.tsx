import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronUp, ChevronDown } from 'lucide-react';

const SchedulePanelCompact = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentIndex, setCurrentIndex] = useState(0);

  const allEvents = [
    {
      id: 1,
      title: 'Expo. Arte Renacentista',
      time: '10:00 - 18:00',
      location: 'Sala Principal',
      status: 'active'
    },
    {
      id: 2,
      title: 'Restauración Manuscritos',
      time: '09:00 - 14:00',
      location: 'Laboratorio 2',
      status: 'active'
    },
    {
      id: 3,
      title: 'Visita Guiada',
      time: '12:30 - 13:30',
      location: 'Todas Salas',
      status: 'upcoming'
    },
    {
      id: 4,
      title: 'Conferencia Arte Gótico',
      time: '16:00 - 17:30',
      location: 'Auditorio',
      status: 'upcoming'
    },
    {
      id: 5,
      title: 'Taller Infantil',
      time: '11:00 - 12:30',
      location: 'Sala Educativa',
      status: 'active'
    }
  ];

  // Mostramos solo 3 eventos a la vez
  const visibleEvents = [
    ...allEvents.slice(currentIndex, currentIndex + 3),
    ...allEvents.slice(0, Math.max(0, currentIndex + 3 - allEvents.length))
  ].slice(0, 3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const rotationTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allEvents.length);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(rotationTimer);
    };
  }, [allEvents.length]);

  return (
    <div className="bg-gray-900/60 border border-blue-500/30 rounded-lg p-3 w-56 backdrop-blur-sm shadow-lg hover:bg-gray-900/70 transition-all fixed top-[-15px] right-[-10px] z-50">
      {/* Encabezado minimalista */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-medium uppercase tracking-wider">
          ACTIVIDADES
        </h2>
        <Calendar className="h-4 w-4 text-blue-400" />
      </div>
  
      {/* Contenedor de eventos con efecto cascada */}
      <div className="relative h-[130px] overflow-hidden"> {/* Aumenté la altura para acomodar el espacio extra */}
        {visibleEvents.map((event, idx) => (
          <div 
            key={event.id}
            className={`absolute w-full border-l-2 ${
              event.status === 'active' ? 'border-green-500' : 'border-blue-500'
            } bg-gray-800/50 p-2 rounded-r-md transition-all duration-500 ${
              idx === 0 ? 'top-0 opacity-100' : 
              idx === 1 ? 'top-11 opacity-90' : // Aumenté de top-9 a top-11
              'top-[5.5rem] opacity-80' // Aumenté de top-[4.5rem] a top-[5.5rem]
            } hover:bg-gray-700/60`} // Aumenté opacidad hover
            style={{ zIndex: 3 - idx }}
          >
            <div className="text-xs font-medium text-white truncate">
              {event.title}
            </div>
            <div className="flex items-center mt-1 text-[10px] text-gray-300"> {/* Cambié text-gray-400 a 300 */}
              <Clock className="h-3 w-3 mr-1" />
              <span>{event.time}</span>
              <MapPin className="h-3 w-3 ml-2 mr-1" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        ))}
      </div>
  
      {/* Controles compactos */}
      <div className="flex justify-between items-center mt-2 px-2">
        <button 
          onClick={() => setCurrentIndex((prev) => (prev - 1 + allEvents.length) % allEvents.length)}
          className="text-gray-300 hover:text-cyan-400 transition-colors" // Cambié text-gray-400 a 300
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] text-gray-300"> {/* Cambié text-gray-400 a 300 */}
          {currentIndex + 1}/{allEvents.length}
        </span>
        <button 
          onClick={() => setCurrentIndex((prev) => (prev + 1) % allEvents.length)}
          className="text-gray-300 hover:text-cyan-400 transition-colors" // Cambié text-gray-400 a 300
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default SchedulePanelCompact;