// SensorSpaceAssociationPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Link, Unlink, Search, MapPin, Thermometer, Users, Save, Trash2 } from 'lucide-react';
import { fetchAllSensors, Sensor } from '../../services/sensorApiService';

interface SpaceData {
  guid: string;
  name: string;
  longName?: string;
  localId: number;
  modelId: string;
  dimensions?: {
    area: number;
    volume: number;
  };
}

interface SensorAssociation {
  id: string;
  sensorId: string;
  spaceGuid: string;
  spaceName: string;
  sensorName: string;
  sensorType: string;
  associatedAt: string;
  isActive: boolean;
}

interface SensorSpaceAssociationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: SpaceData[];
  onAssociationChange: (associations: SensorAssociation[]) => void;
}

const SensorSpaceAssociationPanel: React.FC<SensorSpaceAssociationPanelProps> = ({
  isOpen,
  onClose,
  spaces,
  onAssociationChange
}) => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [associations, setAssociations] = useState<SensorAssociation[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<SpaceData | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [searchSpaces, setSearchSpaces] = useState('');
  const [searchSensors, setSearchSensors] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cargar sensores al abrir el panel
  useEffect(() => {
    if (isOpen) {
      loadSensors();
      loadAssociations();
    }
  }, [isOpen]);

  const loadSensors = async () => {
    try {
      const sensorsData = await fetchAllSensors();
      setSensors(sensorsData);
    } catch (error) {
      showMessage('error', 'Error al cargar sensores');
    }
  };

  const loadAssociations = () => {
    // Cargar asociaciones desde localStorage o API
    const stored = localStorage.getItem('sensor-space-associations');
    if (stored) {
      const loadedAssociations = JSON.parse(stored);
      setAssociations(loadedAssociations);
      onAssociationChange(loadedAssociations);
    }
  };

  const saveAssociations = (newAssociations: SensorAssociation[]) => {
    localStorage.setItem('sensor-space-associations', JSON.stringify(newAssociations));
    setAssociations(newAssociations);
    onAssociationChange(newAssociations);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const createAssociation = () => {
    if (!selectedSpace || !selectedSensor) {
      showMessage('error', 'Selecciona un espacio y un sensor');
      return;
    }

    // Verificar si ya existe la asociación
    const existingAssociation = associations.find(
      a => a.sensorId === selectedSensor.sensorId && a.spaceGuid === selectedSpace.guid
    );

    if (existingAssociation) {
      showMessage('error', 'Esta asociación ya existe');
      return;
    }

    const newAssociation: SensorAssociation = {
      id: `${selectedSensor.sensorId}-${selectedSpace.guid}-${Date.now()}`,
      sensorId: selectedSensor.sensorId,
      spaceGuid: selectedSpace.guid,
      spaceName: selectedSpace.name,
      sensorName: selectedSensor.name,
      sensorType: selectedSensor.type,
      associatedAt: new Date().toISOString(),
      isActive: true
    };

    const updatedAssociations = [...associations, newAssociation];
    saveAssociations(updatedAssociations);
    showMessage('success', 'Asociación creada correctamente');
    
    // Limpiar selección
    setSelectedSpace(null);
    setSelectedSensor(null);
  };

  const removeAssociation = (associationId: string) => {
    const updatedAssociations = associations.filter(a => a.id !== associationId);
    saveAssociations(updatedAssociations);
    showMessage('success', 'Asociación eliminada');
  };

  const getFilteredSpaces = () => {
    if (!searchSpaces) return spaces;
    return spaces.filter(space => 
      space.name.toLowerCase().includes(searchSpaces.toLowerCase()) ||
      space.longName?.toLowerCase().includes(searchSpaces.toLowerCase()) ||
      space.guid.toLowerCase().includes(searchSpaces.toLowerCase())
    );
  };

  const getFilteredSensors = () => {
    if (!searchSensors) return sensors;
    return sensors.filter(sensor =>
      sensor.name.toLowerCase().includes(searchSensors.toLowerCase()) ||
      sensor.sensorId.toLowerCase().includes(searchSensors.toLowerCase()) ||
      sensor.type.toLowerCase().includes(searchSensors.toLowerCase())
    );
  };

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermometer size={16} />;
      case 'occupancy': return <Users size={16} />;
      default: return <MapPin size={16} />;
    }
  };

  const getAssociationsForSpace = (spaceGuid: string) => {
    return associations.filter(a => a.spaceGuid === spaceGuid);
  };

  const getAssociationsForSensor = (sensorId: string) => {
    return associations.filter(a => a.sensorId === sensorId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Link className="text-blue-400" size={20} />
            <h2 className="text-xl font-semibold text-white">Asociar Sensores con Espacios</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mx-4 mt-2 p-2 rounded text-sm ${
            message.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Spaces */}
          <div className="w-1/3 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white mb-2">Espacios ({spaces.length})</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar espacios..."
                  value={searchSpaces}
                  onChange={(e) => setSearchSpaces(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {getFilteredSpaces().map(space => {
                const spaceAssociations = getAssociationsForSpace(space.guid);
                const isSelected = selectedSpace?.guid === space.guid;
                
                return (
                  <div
                    key={space.guid}
                    onClick={() => setSelectedSpace(space)}
                    className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="font-medium">{space.name}</div>
                    {space.longName && space.longName !== space.name && (
                      <div className="text-sm opacity-75">{space.longName}</div>
                    )}
                    <div className="text-xs mt-1 flex items-center justify-between">
                      <span>ID: {space.localId}</span>
                      {spaceAssociations.length > 0 && (
                        <span className="bg-green-600 px-2 py-1 rounded text-xs">
                          {spaceAssociations.length} sensor(es)
                        </span>
                      )}
                    </div>
                    {space.dimensions && (
                      <div className="text-xs mt-1">
                        Área: {space.dimensions.area.toFixed(1)} m²
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Panel - Sensors */}
          <div className="w-1/3 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white mb-2">Sensores ({sensors.length})</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar sensores..."
                  value={searchSensors}
                  onChange={(e) => setSearchSensors(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded border border-gray-600 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {getFilteredSensors().map(sensor => {
                const sensorAssociations = getAssociationsForSensor(sensor.sensorId);
                const isSelected = selectedSensor?.sensorId === sensor.sensorId;
                
                return (
                  <div
                    key={sensor.sensorId}
                    onClick={() => setSelectedSensor(sensor)}
                    className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {getSensorIcon(sensor.type)}
                      <div className="font-medium">{sensor.name}</div>
                    </div>
                    <div className="text-sm mt-1">
                      <div>ID: {sensor.sensorId}</div>
                      <div>Tipo: {sensor.type}</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                        sensor.status === 'active' ? 'bg-green-700' : 'bg-red-700'
                      }`}>
                        {sensor.status}
                      </div>
                      {sensorAssociations.length > 0 && (
                        <div className="text-xs mt-1 text-blue-400">
                          Asociado a {sensorAssociations.length} espacio(s)
                        </div>
                      )}
                    </div>
                    {sensor.lastReading && (
                      <div className="text-xs mt-1">
                        Última lectura: {sensor.lastReading.value} {sensor.config?.unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel - Associations */}
          <div className="w-1/3 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Asociaciones ({associations.length})</h3>
                <button
                  onClick={createAssociation}
                  disabled={!selectedSpace || !selectedSensor}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  <Save size={16} />
                  <span>Crear</span>
                </button>
              </div>
              
              {selectedSpace && selectedSensor && (
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-sm text-gray-300">Nueva asociación:</div>
                  <div className="text-white font-medium">{selectedSpace.name}</div>
                  <div className="text-gray-400">↕</div>
                  <div className="text-white font-medium">{selectedSensor.name}</div>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {associations.map(association => (
                <div key={association.id} className="bg-gray-800 p-3 mb-2 rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{association.spaceName}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        <div className="flex items-center space-x-1">
                          {getSensorIcon(association.sensorType)}
                          <span>{association.sensorName}</span>
                        </div>
                        <div className="mt-1">
                          Tipo: {association.sensorType}
                        </div>
                        <div className="text-xs mt-1">
                          Creada: {new Date(association.associatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAssociation(association.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {associations.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <Link size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay asociaciones creadas</p>
                  <p className="text-sm mt-2">
                    Selecciona un espacio y un sensor para crear una asociación
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-850">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div>
              Total asociaciones: {associations.length} | 
              Espacios con sensores: {new Set(associations.map(a => a.spaceGuid)).size} |
              Sensores asociados: {new Set(associations.map(a => a.sensorId)).size}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SensorSpaceAssociationPanel;