// CollectionForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Image, Upload, Calendar, MapPin, RotateCw, Info } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import axios from 'axios';
import { API_COLLECTION } from '@/server';
import collectionGeometryHandler, { CollectionGeometryData } from '../utils/CollectionGeometryHandlers';

const API_URL = API_COLLECTION || 'http://localhost:4000';

// Crear una instancia de Axios con configuración
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Tipos
interface ArtCollectionItemFormData {
  itemId: string;
  name: string;
  description: string;
  type: string;
  author: string;
  creationDate: string;
  period: string;
  technique: string;
  materials: string[];
  dimensions: {
    height?: number;
    width?: number;
    depth?: number;
    diameter?: number;
    weight?: number;
    unit: string;
  };
  restaurationSchedule: {
    startDate: Date | null;
    endDate: Date | null;
    status: string;
  };
  spaceGuid: string;
  spaceId: number;
  spaceName: string;
  modelId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
  modelUrl: string;
  modelType: string;
  images: {
    url: string;
    type: string;
    description: string;
  }[];
  conservationState: {
    initialState: {
      rating: number;
      description: string;
      date: Date | null;
    };
  };
  assignedRestorers: {
    name: string;
    email: string;
    role: string;
  }[];
  notes: string;
  tags: string[];
}

interface CollectionFormProps {
  onSubmit: (data: ArtCollectionItemFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ArtCollectionItemFormData>;
  spaceData: {
    guid: string;
    id: number;
    name: string;
    longName?: string; // Añadido campo longName
    modelId: string;
    position?: {
      x: number;
      y: number;
      z: number;
    };
  };
  isEditMode?: boolean;
  onSelectPosition?: (enable: boolean) => void;
  onPositionSelected?: (position: {x: number, y: number, z: number}) => void;
}



// Opciones para los selectores
const artTypeOptions = [
  'Pintura', 'Escultura', 'Libro', 'Manuscrito', 'Fotografía', 
  'Textil', 'Cerámica', 'Joyería', 'Otro'
];

const unitOptions = ['cm', 'm', 'mm', 'kg', 'g'];
const statusOptions = ['Pendiente', 'En proceso', 'Completada', 'Cancelada'];
const modelTypeOptions = ['gltf', 'obj', 'fbx', 'custom'];
const imageTypeOptions = ['principal', 'antes', 'después', 'detalle', 'otro'];

// Función para generar un ID único
const generateUniqueId = () => {
  return `ART-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
};

const CollectionForm: React.FC<CollectionFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  spaceData,
  isEditMode = false,
  onSelectPosition,
  onPositionSelected
}) => {
  const spaceName = spaceData.longName || spaceData.name;
  // Estado para los datos del formulario
  const [formData, setFormData] = useState<ArtCollectionItemFormData>({
    itemId: initialData.itemId || generateUniqueId(),
    name: initialData.name || '',
    description: initialData.description || '',
    type: initialData.type || artTypeOptions[0],
    author: initialData.author || '',
    creationDate: initialData.creationDate || '',
    period: initialData.period || '',
    technique: initialData.technique || '',
    materials: initialData.materials || [],
    dimensions: {
      height: initialData.dimensions?.height ?? undefined, // No cambiar a null aquí
      width: initialData.dimensions?.width ?? undefined,
      depth: initialData.dimensions?.depth ?? undefined,
      diameter: initialData.dimensions?.diameter ?? undefined,
      weight: initialData.dimensions?.weight ?? undefined,
      unit: initialData.dimensions?.unit || 'cm'
    },
    restaurationSchedule: {
      startDate: initialData.restaurationSchedule?.startDate || null,
      endDate: initialData.restaurationSchedule?.endDate || null,
      status: initialData.restaurationSchedule?.status || 'Pendiente'
    },
    spaceGuid: spaceData.guid,
    spaceId: spaceData.id,
    spaceName: spaceName, // Usar el nombre determinado con preferencia por longName
    modelId: spaceData.modelId,
    position: initialData.position || {
      x: spaceData.position?.x || 0,
      y: spaceData.position?.y || 0,
      z: spaceData.position?.z || 0
    },
    rotation: initialData.rotation || {
      x: 0,
      y: 0,
      z: 0
    },
    scale: initialData.scale || {
      x: 1,
      y: 1,
      z: 1
    },
    modelUrl: initialData.modelUrl || '',
    modelType: initialData.modelType || 'gltf',
    images: initialData.images || [],
    conservationState: {
      initialState: {
        rating: initialData.conservationState?.initialState?.rating || 5,
        description: initialData.conservationState?.initialState?.description || '',
        date: initialData.conservationState?.initialState?.date || new Date()
      }
    },
    assignedRestorers: initialData.assignedRestorers || [],
    notes: initialData.notes || '',
    tags: initialData.tags || []
  });


  // Estado para gestionar errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estado para el material temporal que se está añadiendo
  const [newMaterial, setNewMaterial] = useState('');
  
  // Estado para la nueva imagen
  const [newImage, setNewImage] = useState({
    url: '',
    type: 'principal',
    description: ''
  });
  
  // Estado para la nueva etiqueta
  const [newTag, setNewTag] = useState('');
  
  // Estado para el nuevo restaurador
  const [newRestorer, setNewRestorer] = useState({
    name: '',
    email: '',
    role: ''
  });
  
  // Estado para el modo de selección de posición 3D
  const [isPositionSelectMode, setIsPositionSelectMode] = useState(false);
  
  // Estado para los tabs
  const [activeTab, setActiveTab] = useState('basic'); // 'basic', 'location', 'restoration', 'images', 'extra'
  
  // Estado para mostrar mensajes de éxito/error
  const [submitStatus, setSubmitStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'none';
  }>({
    message: '',
    type: 'none'
  });
  
  // Función para manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Manejar campos anidados
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent as keyof ArtCollectionItemFormData],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Limpiar error si existe
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Función para manejar cambios en los campos numéricos
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : parseFloat(value); 
    
    // Manejar campos anidados
    if (name.includes('.')) {
      const parts = name.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof ArtCollectionItemFormData],
            [child]: numValue
          }
        });
      } else if (parts.length === 3) {
        const [parent, middle, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof ArtCollectionItemFormData],
            [middle]: {
              ...(formData[parent as keyof ArtCollectionItemFormData] as any)[middle],
              [child]: numValue
            }
          }
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: numValue
      });
    }
  };
  
  // Función para añadir un material
  const handleAddMaterial = () => {
    if (!newMaterial.trim()) return;
    
    setFormData({
      ...formData,
      materials: [...formData.materials, newMaterial.trim()]
    });
    
    setNewMaterial('');
  };
  
  // Función para eliminar un material
  const handleRemoveMaterial = (index: number) => {
    setFormData({
      ...formData,
      materials: formData.materials.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir una imagen
  const handleAddImage = () => {
    if (!newImage.url.trim()) return;
    
    setFormData({
      ...formData,
      images: [...formData.images, { ...newImage }]
    });
    
    setNewImage({
      url: '',
      type: 'principal',
      description: ''
    });
  };
  
  // Función para eliminar una imagen
  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir una etiqueta
  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()]
    });
    
    setNewTag('');
  };
  
  // Función para eliminar una etiqueta
  const handleRemoveTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };
  
  // Función para añadir un restaurador
  const handleAddRestorer = () => {
    if (!newRestorer.name.trim() || !newRestorer.email.trim()) return;
    
    setFormData({
      ...formData,
      assignedRestorers: [...formData.assignedRestorers, { ...newRestorer }]
    });
    
    setNewRestorer({
      name: '',
      email: '',
      role: ''
    });
  };
  
  // Función para eliminar un restaurador
  const handleRemoveRestorer = (index: number) => {
    setFormData({
      ...formData,
      assignedRestorers: formData.assignedRestorers.filter((_, i) => i !== index)
    });
  };
  
  // Función para manejar cambios en las fechas
  const handleDateChange = (date: Date | null, fieldName: string) => {
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof ArtCollectionItemFormData],
            [child]: date
          }
        });
      } else if (parts.length === 3) {
        const [parent, middle, child] = parts;
        setFormData({
          ...formData,
          [parent]: {
            ...formData[parent as keyof ArtCollectionItemFormData],
            [middle]: {
              ...(formData[parent as keyof ArtCollectionItemFormData] as any)[middle],
              [child]: date
            }
          }
        });
      }
    }
  };
  
  // Función para validar el formulario
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validar campos requeridos
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }
    
    if (!formData.type) {
      newErrors.type = 'El tipo es obligatorio';
    }
    
    // Validar fechas
    if (formData.restaurationSchedule.startDate && formData.restaurationSchedule.endDate &&
        formData.restaurationSchedule.startDate > formData.restaurationSchedule.endDate) {
      newErrors['restaurationSchedule.endDate'] = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Función para manejar el envío del formulario
  // Función para manejar el envío del formulario
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    setSubmitStatus({
      message: 'Por favor, corrija los errores en el formulario',
      type: 'error'
    });
    return;
  }
  
  try {
    setSubmitStatus({
      message: isEditMode ? 'Actualizando elemento...' : 'Guardando elemento...',
      type: 'none'
    });
    
    // Asegurarse de que incluimos el longName del espacio en los datos a enviar
    const formDataToSubmit = {
      ...formData,
      spaceLongName: spaceData.longName // Añadir el longName del espacio si está disponible
    };
    
    let response;
    if (onSubmit) {
      response = await onSubmit(formDataToSubmit); // Usar formDataToSubmit en lugar de formData
    } else {
      if (isEditMode && formDataToSubmit.itemId) {
        response = await apiClient.put(`/api/art-collection/${formDataToSubmit.itemId}`, formDataToSubmit);
      } else {
        response = await apiClient.post('/api/art-collection', formDataToSubmit);
      }
    }
    
    // Manejo de geometrías 3D
    try {
      if (collectionGeometryHandler.isInitialized()) {
        const geometryData: CollectionGeometryData = {
          id: formDataToSubmit.itemId,
          spaceGuid: formDataToSubmit.spaceGuid,
          position: formDataToSubmit.position,
          name: formDataToSubmit.name,
          type: formDataToSubmit.type,
          scale: formDataToSubmit.scale
        };
        
        if (isEditMode) {
          collectionGeometryHandler.updateCollectionGeometry(geometryData);
        } else {
          collectionGeometryHandler.createCollectionGeometry(geometryData);
        }
      }
    } catch (geometryError) {
      console.error("Error al manejar geometría 3D:", geometryError);
    }
    
    // Mostrar mensaje de éxito personalizado con el nombre del espacio (preferencia por longName)
    setSubmitStatus({
      message: isEditMode 
        ? `Elemento de "${spaceName}" actualizado` 
        : `Elemento de "${spaceName}" creado`,
      type: 'success'
    });
    
    setTimeout(() => {
      setSubmitStatus({ message: '', type: 'none' });
      if (response && response.status === 200) {
        onCancel();
      }
    }, 3000);
  } catch (error) {
    console.error('Error:', error);
    
    // Personalizar mensaje de error con el nombre del espacio
    setSubmitStatus({
      message: `Error al guardar en "${spaceName}"`,
      type: 'error'
    });
  }
};
  
  // Añade un método para manejar la eliminación
  const handleDelete = async () => {
    if (!formData.itemId) return;
    
    try {
      setSubmitStatus({
        message: `Eliminando elemento de "${spaceName}"...`,
        type: 'none'
      });
      
      // Eliminar del backend
      const response = await apiClient.delete(`/api/art-collection/${formData.itemId}`);
      
      // Eliminar geometría 3D - Asegúrate de que esto se ejecute
      if (collectionGeometryHandler.isInitialized()) {
        const removed = collectionGeometryHandler.removeCollectionGeometry(formData.itemId);
        console.log(`Geometría 3D eliminada: ${removed ? 'Sí' : 'No'}`);
      }
      
      setSubmitStatus({
        message: `Elemento de "${spaceName}" eliminado`,
        type: 'success'
      });
      
      setTimeout(() => {
        onCancel();
      }, 2000);
    } catch (error) {
      setSubmitStatus({
        message: `Error al eliminar de "${spaceName}"`,
        type: 'error'
      });
    }
  };

  const checkSpaceElements = async (spaceGuid: string) => {
    try {
      const response = await apiClient.get(`/api/art-collection/space/${spaceGuid}`);
      if (response.data && response.data.status === 'success') {
        return {
          hasElements: response.data.data.items.length > 0,
          count: response.data.data.items.length,
          items: response.data.data.items
        };
      }
      return { hasElements: false, count: 0, items: [] };
    } catch (error) {
      console.error('Error al verificar elementos del espacio:', error);
      return { hasElements: false, count: 0, items: [] };
    }
  };
  
  useEffect(() => {
    if (spaceData && spaceData.guid) {
      const checkElements = async () => {
        const { hasElements, count, items } = await checkSpaceElements(spaceData.guid);
        if (hasElements) {
          console.log(`El espacio ${spaceName} tiene ${count} elementos de colección`);
          // Opcionalmente podrías mostrar esta información en el UI
        }
      };
      
      checkElements();
    }
  }, [spaceData, spaceName]);
  
  // Función para activar modo de selección de posición
  const activatePositionSelectMode = () => {
    setIsPositionSelectMode(true);
    if (onSelectPosition) {
      onSelectPosition(true);
    }
  };
  
  // Función para actualizar la posición cuando el usuario hace click en el modelo
  const updatePositionFromModel = (x: number, y: number, z: number) => {
    setFormData({
      ...formData,
      position: { x, y, z }
    });
    setIsPositionSelectMode(false);
    if (onSelectPosition) {
      onSelectPosition(false);
    }
  };
  
  // useEffect para manejar la recepción de la posición seleccionada
  useEffect(() => {
    if (onPositionSelected && isPositionSelectMode) {
      const handlePositionUpdate = (position: {x: number, y: number, z: number}) => {
        updatePositionFromModel(position.x, position.y, position.z);
      };
      
      // Aquí podríamos registrar un evento global o callback
      return () => {
        // Limpiar el evento o callback
      };
    }
  }, [isPositionSelectMode, onPositionSelected]);
  
  return (
    <div className="collection-form-container p-4 bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
      <h2 className="text-xl font-semibold text-gray-800">
        {isEditMode 
          ? `Editar Elemento de Colección en "${spaceName}"` 
          : `Registrar Nuevo Elemento de Colección en "${spaceName}"`}
      </h2>
        <button 
          onClick={onCancel} 
          className="text-gray-500 hover:text-gray-700"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Estado de envío */}
      {submitStatus.type !== 'none' && (
        <div className={`mb-4 p-3 rounded ${
          submitStatus.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {submitStatus.message}
        </div>
      )}
      
      {/* Tabs de navegación */}
      <div className="flex border-b mb-4 overflow-x-auto">
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'basic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          onClick={() => setActiveTab('basic')}
        >
          Información Básica
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'location' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          onClick={() => setActiveTab('location')}
        >
          Ubicación
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'restoration' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          onClick={() => setActiveTab('restoration')}
        >
          Restauración
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'images' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          onClick={() => setActiveTab('images')}
        >
          Imágenes
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'extra' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
          onClick={() => setActiveTab('extra')}
        >
          Adicional
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Tab: Información Básica */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ID del elemento - De solo lectura */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID de Registro
                </label>
                <input
                  type="text"
                  name="itemId"
                  value={formData.itemId}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">ID único generado automáticamente</p>
              </div>
              
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  required
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>
            </div>
            
            {/* Tipo de obra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de obra <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.type ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                required
              >
                {artTypeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
            </div>
            
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Autor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Autor
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Fecha de creación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de creación
                </label>
                <input
                  type="text"
                  name="creationDate"
                  value={formData.creationDate}
                  onChange={handleChange}
                  placeholder="Ej: Siglo XVII, 1950, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período
                </label>
                <input
                  type="text"
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                  placeholder="Ej: Renacimiento, Barroco..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Técnica */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnica
                </label>
                <input
                  type="text"
                  name="technique"
                  value={formData.technique}
                  onChange={handleChange}
                  placeholder="Ej: Óleo, acuarela..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Materiales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Materiales
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="Añadir material..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMaterial())}
                />
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Añadir
                </button>
              </div>
              
              {/* Lista de materiales */}
              {formData.materials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.materials.map((material, index) => (
                    <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                      <span>{material}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(index)}
                        className="ml-2 text-blue-500 hover:text-blue-800 focus:outline-none"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Dimensiones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dimensiones
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alto</label>
                  <input
                  type="number"
                  name="dimensions.height"
                  value={formData.dimensions.height === undefined ? '' : formData.dimensions.height}
                  onChange={handleNumberChange}
                  placeholder="Alto"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ancho</label>
                  <input
                  type="number"
                  name="dimensions.width"
                  value={formData.dimensions.width === undefined ? '' : formData.dimensions.width}
                  onChange={handleNumberChange}
                  placeholder="Ancho"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Profundidad</label>
                  <input
                  type="number"
                  name="dimensions.depth"
                  value={formData.dimensions.depth === undefined ? '' : formData.dimensions.depth}
                  onChange={handleNumberChange}
                  placeholder="Profundidad"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Peso</label>
                  <input
                  type="number"
                  name="dimensions.weight"
                  value={formData.dimensions.weight === undefined ? '' : formData.dimensions.weight}
                  onChange={handleNumberChange}
                  placeholder="Peso"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                  <select
                    name="dimensions.unit"
                    value={formData.dimensions.unit}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {unitOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab: Ubicación */}
        {activeTab === 'location' && (
          <div className="space-y-4">
            {/* Información del espacio */}
            <div className="bg-blue-50 p-3 rounded-md mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Información del espacio seleccionado</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Espacio:</span> {spaceName}
                </div>
                <div>
                  <span className="text-gray-500">GUID:</span> {spaceData.guid}
                </div>
                <div>
                  <span className="text-gray-500">ID:</span> {spaceData.id}
                </div>
                <div>
                <span className="text-gray-500">Modelo:</span> {spaceData.modelId}
                </div>
              </div>
            </div>
            
            {/* Posición */}
            <div className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Posición en el espacio
                </label>
                <button
                  type="button"
                  onClick={activatePositionSelectMode}
                  className={`flex items-center px-3 py-2 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isPositionSelectMode 
                      ? 'bg-yellow-500 text-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <MapPin size={16} className="mr-1" />
                  {isPositionSelectMode ? 'Seleccionando...' : 'Seleccionar en 3D'}
                </button>
              </div>
              
              {isPositionSelectMode && (
                <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-3 rounded mb-3">
                  Haga clic en cualquier punto del espacio para establecer la posición del elemento.
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Posición X</label>
                  <input
                  type="number"
                  name="position.x"
                  value={formData.position.x === undefined ? '' : formData.position.x}
                  onChange={handleNumberChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Posición Y</label>
                  <input
                    type="number"
                    name="position.y"
                    value={formData.position.y}
                    onChange={handleNumberChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Posición Z</label>
                  <input
                    type="number"
                    name="position.z"
                    value={formData.position.z}
                    onChange={handleNumberChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Rotación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rotación (grados)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rotación X</label>
                  <input
                    type="number"
                    name="rotation.x"
                    value={formData.rotation.x}
                    onChange={handleNumberChange}
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rotación Y</label>
                  <input
                    type="number"
                    name="rotation.y"
                    value={formData.rotation.y}
                    onChange={handleNumberChange}
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rotación Z</label>
                  <input
                    type="number"
                    name="rotation.z"
                    value={formData.rotation.z}
                    onChange={handleNumberChange}
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Escala */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escala
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Escala X</label>
                  <input
                    type="number"
                    name="scale.x"
                    value={formData.scale.x}
                    onChange={handleNumberChange}
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Escala Y</label>
                  <input
                    type="number"
                    name="scale.y"
                    value={formData.scale.y}
                    onChange={handleNumberChange}
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Escala Z</label>
                  <input
                    type="number"
                    name="scale.z"
                    value={formData.scale.z}
                    onChange={handleNumberChange}
                    step="0.1"
                    min="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Modelo 3D */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modelo 3D
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <input
                    type="text"
                    name="modelUrl"
                    value={formData.modelUrl}
                    onChange={handleChange}
                    placeholder="URL del modelo 3D"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <select
                    name="modelType"
                    value={formData.modelType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {modelTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Ingrese la URL del modelo 3D o seleccione "custom" para usar un modelo personalizado.
              </p>
            </div>
          </div>
        )}
        
        {/* Tab: Restauración */}
        {activeTab === 'restoration' && (
          <div className="space-y-4">
            {/* Calendario de restauración */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calendario de Restauración
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de inicio</label>
                  <DatePicker
                    selected={formData.restaurationSchedule.startDate}
                    onChange={(date) => handleDateChange(date, 'restaurationSchedule.startDate')}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholderText="Seleccionar fecha"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de finalización</label>
                  <DatePicker
                    selected={formData.restaurationSchedule.endDate}
                    onChange={(date) => handleDateChange(date, 'restaurationSchedule.endDate')}
                    dateFormat="dd/MM/yyyy"
                    className={`w-full px-3 py-2 border ${errors['restaurationSchedule.endDate'] ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholderText="Seleccionar fecha"
                    minDate={formData.restaurationSchedule.startDate}
                  />
                  {errors['restaurationSchedule.endDate'] && (
                    <p className="mt-1 text-xs text-red-500">{errors['restaurationSchedule.endDate']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select
                    name="restaurationSchedule.status"
                    value={formData.restaurationSchedule.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Estado de conservación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Estado de conservación inicial
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha de evaluación</label>
                  <DatePicker
                    selected={formData.conservationState.initialState.date}
                    onChange={(date) => handleDateChange(date, 'conservationState.initialState.date')}
                    dateFormat="dd/MM/yyyy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholderText="Seleccionar fecha"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Puntuación (1-10)</label>
                  <input
                    type="number"
                    name="conservationState.initialState.rating"
                    value={formData.conservationState.initialState.rating}
                    onChange={handleNumberChange}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs text-gray-500 mb-1">Descripción del estado</label>
                  <textarea
                    name="conservationState.initialState.description"
                    value={formData.conservationState.initialState.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Restauradores asignados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restauradores asignados
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div>
                  <input
                    type="text"
                    value={newRestorer.name}
                    onChange={(e) => setNewRestorer({...newRestorer, name: e.target.value})}
                    placeholder="Nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={newRestorer.email}
                    onChange={(e) => setNewRestorer({...newRestorer, email: e.target.value})}
                    placeholder="Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newRestorer.role}
                      onChange={(e) => setNewRestorer({...newRestorer, role: e.target.value})}
                      placeholder="Rol"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddRestorer}
                      disabled={!newRestorer.name || !newRestorer.email}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Lista de restauradores */}
              {formData.assignedRestorers.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th scope="col" className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.assignedRestorers.map((restorer, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {restorer.name}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {restorer.email}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                            {restorer.role || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRestorer(index)}
                              className="text-red-500 hover:text-red-800 focus:outline-none"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tab: Imágenes */}
        {activeTab === 'images' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Imágenes del elemento
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={newImage.url}
                    onChange={(e) => setNewImage({...newImage, url: e.target.value})}
                    placeholder="URL de la imagen"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={newImage.type}
                    onChange={(e) => setNewImage({...newImage, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {imageTypeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={newImage.description}
                    onChange={(e) => setNewImage({...newImage, description: e.target.value})}
                    placeholder="Descripción de la imagen"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    disabled={!newImage.url}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Image size={16} className="inline mr-1" />
                    Añadir imagen
                  </button>
                </div>
              </div>
              
              {/* Lista de imágenes */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="border rounded-md overflow-hidden">
                      <div className="relative h-40 bg-gray-100">
                        <img 
                          src={image.url} 
                          alt={image.description || `Imagen ${index + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error+cargando+imagen';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 focus:outline-none"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="p-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">{image.type}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{image.description || 'Sin descripción'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Tab: Adicional */}
        {activeTab === 'extra' && (
          <div className="space-y-4">
            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas adicionales
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales sobre el elemento..."
              />
            </div>
            
            {/* Etiquetas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etiquetas
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Añadir etiqueta..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Añadir
                </button>
              </div>
              
              {/* Lista de etiquetas */}
              {formData.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <div key={index} className="flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded-md">
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(index)}
                        className="ml-2 text-gray-500 hover:text-gray-800 focus:outline-none"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Save size={18} className="inline mr-1" />
            {isEditMode ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CollectionForm;