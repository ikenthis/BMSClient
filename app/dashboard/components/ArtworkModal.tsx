import React from 'react';
import { XIcon, AlertCircleIcon, ClockIcon, MapPinIcon } from 'lucide-react';
interface ArtworkModalProps {
  artwork: {
    id: string;
    name: string;
    image: string;
    artist: string;
    year: string;
    location: string;
    status: string;
    description: string;
    conservation: string;
  } | null;
  onClose: () => void;
}
const ArtworkModal: React.FC<ArtworkModalProps> = ({
  artwork,
  onClose
}) => {
  if (!artwork) return null;
  return <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-blue-900/30 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-start p-4 border-b border-blue-900/30">
          <h2 className="text-xl font-bold text-blue-400">{artwork.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-blue-900/20 rounded-lg text-blue-400">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
              <img src={artwork.image} alt={artwork.name} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-400">Artista</h3>
                <p className="text-blue-300">{artwork.artist}</p>
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Año</h3>
                <p className="text-blue-300">{artwork.year}</p>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300">{artwork.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircleIcon className="h-4 w-4 text-blue-400" />
                <span className="text-blue-300">{artwork.status}</span>
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-1">Descripción</h3>
                <p className="text-blue-300 text-sm">{artwork.description}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-4 w-4 text-blue-400" />
              <h3 className="text-blue-400">Estado de Conservación</h3>
            </div>
            <p className="text-sm text-blue-300">{artwork.conservation}</p>
          </div>
        </div>
        <div className="border-t border-blue-900/30 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-blue-300 rounded-lg text-sm">
            Cerrar
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
            Ver Historial
          </button>
        </div>
      </div>
    </div>;
};
export default ArtworkModal;