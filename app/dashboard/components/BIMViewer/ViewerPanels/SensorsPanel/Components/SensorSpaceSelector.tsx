// src/components/SensorSpaceSelector.tsx

import React, { useState, useEffect } from 'react';
import { sensorSpaceIntegration } from '../services/sensorSpaceIntegrationService';
import { SpaceElement } from '../../../utils/typeDefs';
import { Sensor } from '../../../services/sensorApiService';

interface SensorSpaceSelectorProps {
  sensor: Sensor;
  onSpaceSelected: (spaceGuid: string) => void;
  onCancel: () => void;
}

const SensorSpaceSelector: React.FC<SensorSpaceSelectorProps> = ({
  sensor,
  onSpaceSelected,
  onCancel
}) => {
  const [availableSpaces, setAvailableSpaces] = useState<SpaceElement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<SpaceElement | null>(null);

  useEffect(() => {
    const spaces = sensorSpaceIntegration.getAvailableSpaces();
    setAvailableSpaces(spaces);
    
    // Auto-sugerir espacio por nombre
    if (sensor.location?.spaceName) {
      const suggested = spaces.find(s => 
        s.name.toLowerCase().includes(sensor.location?.spaceName?.toLowerCase() || '') ||
        (s.properties?.longName || '').toLowerCase().includes(sensor.location?.spaceName?.toLowerCase() || '')
      );
      if (suggested) setSelectedSpace(suggested);
    }
  }, [sensor]);

  const filteredSpaces = availableSpaces.filter(space =>
    space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (space.properties?.longName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedSpace?.properties?.globalId) {
      onSpaceSelected(selectedSpace.properties.globalId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg p-6 max-w-md w-full max-h-96">
        <h3 className="text-lg font-bold mb-4">
          Asociar Sensor al Espacio 3D
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">
            Sensor: <span className="text-blue-400">{sensor.name}</span>
          </p>
          <p className="text-sm text-gray-400">
            Tipo: <span className="text-green-400">{sensor.type}</span>
          </p>
        </div>

        <input
          type="text"
          placeholder="Buscar espacio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-gray-800 border border-gray-700 rounded mb-4"
        />

        <div className="max-h-48 overflow-y-auto mb-4">
          {filteredSpaces.map(space => (
            <div
              key={space.properties?.globalId || `${space.modelId}-${space.localId}`}
              className={`p-3 rounded cursor-pointer border-2 transition-colors ${
                selectedSpace?.properties?.globalId === space.properties?.globalId
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
              onClick={() => setSelectedSpace(space)}
            >
              <div className="font-medium">{space.name}</div>
              {space.properties?.longName && space.properties.longName !== space.name && (
                <div className="text-sm text-gray-400">{space.properties.longName}</div>
              )}
              {space.dimensions && (
                <div className="text-xs text-gray-500">
                  {space.dimensions.area.toFixed(1)} m²
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSpace}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SensorSpaceSelector;