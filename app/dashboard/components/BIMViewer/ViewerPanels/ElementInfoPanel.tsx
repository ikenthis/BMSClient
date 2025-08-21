// ViewerPanels/ElementInfoPanel.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Wrench, FileText, Image, Film, Clock, Keyboard, Trash2, Upload, Info, Clipboard, Tag, Box, DollarSign, Truck, Calendar, Settings, Eye } from 'lucide-react';
import * as FRAGS from '@thatopen/fragments';
import axios from 'axios';
import '../styles/elementinfopanel.css';
import { API_URL_INFO } from '@/server';
import { v4 as uuidv4 } from 'uuid'; // Asegúrate de instalar uuid: npm install uuid @types/uuid

// Types for element information
interface ElementInfoPanelProps {
  selectedElement: { model: FRAGS.FragmentsModel; localId: number } | null;
  onClose: () => void;
  elementData?: any; // Additional data about the element if available
}

interface FileUpload {
  file: File;
  name: string;
  description: string;
  type?: string; // For documents
  preview?: string; // For images
}

interface MaintenanceRecord {
  action: string;
  description: string;
  performedBy: string;
  cost: number | null;
  notes: string;
  date?: Date;
}

// Crear instancia de axios para usar en todas las peticiones
const api = axios.create({
    baseURL: API_URL_INFO || 'http://localhost:4000/api/bim-element-info',
    headers: {
      'Content-Type': 'application/json'
    }
});

// Función adaptada para obtener el GUID del elemento seleccionado
const getElementGuid = async (model: FRAGS.FragmentsModel, localId: number): Promise<string> => {
    try {
      // Método 1: Obtener el elemento usando getItem y luego su GUID
      try {
        // Obtener el elemento directamente
        const item = await model.getItem(localId);
        
        if (item) {
          // Obtener el GUID usando el método getGuid directamente
          const guid = await item.getGuid();
          if (guid) {
            console.log(`GUID obtenido directamente: ${guid}`);
            return guid;
          }
        }
      } catch (itemError) {
        console.warn('Error al obtener el elemento o su GUID:', itemError);
      }
      
      // Método 2: Intentar con propiedades IFC
      try {
        const properties = await model.properties.get([localId]);
        
        if (properties && properties.length > 0) {
          const elementProps = properties[0];
          
          // Buscar propiedades que puedan contener identificadores
          if (elementProps.GlobalId) {
            console.log('GlobalId encontrado en propiedades:', elementProps.GlobalId);
            return elementProps.GlobalId;
          }
          
          if (elementProps.guid) {
            console.log('GUID encontrado en propiedades:', elementProps.guid);
            return elementProps.guid;
          }
        }
      } catch (propError) {
        console.warn('Error al obtener propiedades del elemento:', propError);
      }
      
      // Método 3: Intentar obtenerlo de los items del modelo
      try {
        // Obtener todos los elementos de la categoría
        const category = await model.getItemCategory(localId);
        if (category) {
          const items = await model.getItemsOfCategory(category);
          
          // Buscar el elemento con el localId específico
          for (const item of items) {
            const itemLocalId = await item.getLocalId();
            if (itemLocalId === localId) {
              // Obtener y retornar GUID
              const guid = await item.getGuid();
              if (guid) {
                console.log(`GUID encontrado a través de categoría: ${guid}`);
                return guid;
              }
            }
          }
        }
      } catch (categoryError) {
        console.warn('Error al buscar por categoría:', categoryError);
      }
      
      // Si todo falla, usar un identificador determinista basado en el modelo y localId
      console.warn(`No se pudo obtener GUID natural, generando determinista para ${model.id}-${localId}`);
      
      // Crear identificador determinista basado en modelId y localId
      const idString = `${model.id}-${localId}`;
      return createDeterministicUuid(idString);
      
    } catch (error) {
      console.error('Error general obteniendo GUID:', error);
      // Como último recurso, simplemente combinar modelId y localId
      return `${model.id}-${localId}`;
    }
  };

// Generar un identificador consistente basado en propiedades estables del elemento
const generateConsistentIdentifier = (
  model: FRAGS.FragmentsModel, 
  localId: number, 
  properties: any
): string => {
  const idComponents: any = {
    modelId: model.id,
    localId: localId,
  };
  
  // Añadir propiedades estables si están disponibles
  if (properties) {
    if (properties.name) idComponents.name = properties.name;
    if (properties.type) idComponents.type = properties.type;
    if (properties.objectType) idComponents.objectType = properties.objectType;
    if (properties.tag) idComponents.tag = properties.tag;
  }
  
  // Intentar obtener información de geometría (transformaciones, posición)
  try {
    // Esta parte depende de la API específica de fragments
    // Adaptar según la implementación real
    const geometry = model.getItemGeometry?.(localId);
    if (geometry) {
      if (geometry.boundingBox) {
        const center = geometry.boundingBox.getCenter();
        idComponents.center = {
          x: Math.round(center.x * 1000) / 1000, // Redondear para estabilidad
          y: Math.round(center.y * 1000) / 1000,
          z: Math.round(center.z * 1000) / 1000
        };
      }
    }
  } catch (error) {
    console.error('Error obteniendo geometría:', error);
  }
  
  // Convertir a string para generar hash
  const idString = JSON.stringify(idComponents);
  
  // Generar un UUID determinista basado en el hash de propiedades
  return createDeterministicUuid(idString);
};

// Crear un UUID determinista basado en una cadena de entrada
const createDeterministicUuid = (input: string): string => {
  // Crear un array de bytes desde la cadena de entrada
  const bytes = new Uint8Array(16);
  for (let i = 0; i < input.length; i++) {
    bytes[i % 16] ^= input.charCodeAt(i);
  }
  
  // Asegurar que sea un UUID válido (versión 4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC4122
  
  // Convertir a formato UUID
  return uuidv4({ random: bytes });
};

// Verificar si un elemento ya tiene un UUID registrado en la base de datos
const getStoredElementUuid = async (modelId: string, localId: number): Promise<string | null> => {
  try {
    const response = await api.get(`/api/bim-element-info/${modelId}/${localId}`);
    if (response.data.success && response.data.data?.elementUuid) {
      return response.data.data.elementUuid;
    }
    return null;
  } catch (error) {
    console.log('No se encontró UUID existente:', error);
    return null;
  }
};

const ElementInfoPanel: React.FC<ElementInfoPanelProps> = ({
    selectedElement,
    onClose,
    elementData = null
  }) => {
    // States for form data and UI
    const [activeTab, setActiveTab] = useState('general');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // Success message for file uploads
    const [pdfPreview, setPdfPreview] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // States for element data
    const [elementInfo, setElementInfo] = useState<any>(null);
    const [elementUuid, setElementUuid] = useState<string | null>(null);
    const [formData, setFormData] = useState({
      // General information
      elementName: '',
      elementType: '',
      category: '',
      description: '',
      location: '',
      
      // Technical information
      manufacturer: '',
      model: '',
      serialNumber: '',
      specifications: {} as Record<string, string>,
      
      // Maintenance information
      installationDate: '',
      warrantyExpiration: '',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      maintenanceFrequency: '',
      maintenanceInstructions: '',
      
      // Cost information
      cost: '',
      purchaseDate: '',
      supplier: '',
      supplierContact: '',
      
      // Custom attributes
      customAttributes: {} as Record<string, string>,
    });
    
    // States for file uploads
    const [documentUploads, setDocumentUploads] = useState<FileUpload[]>([]);
    const [imageUploads, setImageUploads] = useState<FileUpload[]>([]);
    const [videoUploads, setVideoUploads] = useState<FileUpload[]>([]);
    
    // State for maintenance record
    const [newMaintenanceRecord, setNewMaintenanceRecord] = useState<MaintenanceRecord>({
      action: 'maintenance',
      description: '',
      performedBy: '',
      cost: null,
      notes: ''
    });
    
    // States for dynamic fields
    const [newSpecKey, setNewSpecKey] = useState('');
    const [newSpecValue, setNewSpecValue] = useState('');
    const [newCustomKey, setNewCustomKey] = useState('');
    const [newCustomValue, setNewCustomValue] = useState('');
    
    // Refs for file inputs
    const documentFileInputRef = useRef<HTMLInputElement>(null);
    const imageFileInputRef = useRef<HTMLInputElement>(null);
    const videoFileInputRef = useRef<HTMLInputElement>(null);
    
    // Effect to load element data when component mounts or selected element changes
    useEffect(() => {
      if (selectedElement) {
        loadElementInfo();
      }
    }, [selectedElement]);

    useEffect(() => {
        if (elementInfo) {
          console.log('Documentos recibidos:', elementInfo.documents);
          console.log('Imágenes recibidas:', elementInfo.images);
        }
      }, [elementInfo]);
    
    // Function to load element info from API
    const loadElementInfo = async () => {
        if (!selectedElement) return;
        
        setIsLoading(true);
        console.log('Cargando información del elemento...', selectedElement);
        
        try {
          const modelId = selectedElement.model.id;
          const localId = selectedElement.localId;
          
          // Paso 1: Intentar obtener el GUID del elemento
          let uuid = await getElementGuid(selectedElement.model, localId);
          
          if (!uuid) {
            console.warn('No se pudo obtener GUID del elemento, generando uno aleatorio');
            uuid = uuidv4(); // Generar UUID aleatorio como último recurso
          }
          
          console.log(`Elemento ${modelId}/${localId} tiene GUID: ${uuid}`);
          setElementUuid(uuid);
          
          // Paso 2: Buscar si existe información para este elemento por UUID
          try {
            console.log('Buscando elemento por UUID...');
            // Properly encode the UUID to avoid issues with special characters
            const encodedUuid = encodeURIComponent(uuid);
            const response = await api.get(`/api/bim-element-info/uuid/${encodedUuid}`);
            
            if (response.data.success) {
              console.log('Información encontrada por UUID:', response.data.data);
              setElementInfo(response.data.data);
              updateFormFromApiData(response.data.data);
              
              // Si el modelId/localId ha cambiado, actualizar la relación en la BD
              if (response.data.data.modelId !== modelId || response.data.data.localId !== localId) {
                console.log('Actualizando modelId/localId para mantener relación...');
                await api.post('/api/bim-element-info', {
                  elementUuid: uuid,
                  modelId,
                  localId
                });
              }
              
              setIsLoading(false);
              return;
            }
          } catch (uuidError) {
              console.log('No se encontró elemento por UUID, intentando por modelId/localId...');
          }
          
        
        // Paso 3: Si no hay datos por UUID, intentar por modelId/localId
        try {
          const response = await api.get(`/api/bim-element-info/${modelId}/${localId}`);
          
          if (response.data.success) {
            console.log('Información encontrada por modelId/localId:', response.data.data);
            
            // Si encontramos datos pero no tienen UUID, actualizar con el UUID generado
            if (!response.data.data.elementUuid) {
              console.log('Actualizando elemento existente con nuevo UUID');
              
              const updateResponse = await api.post('/api/bim-element-info', {
                ...response.data.data,
                elementUuid: uuid
              });
              
              if (updateResponse.data.success) {
                setElementInfo(updateResponse.data.data);
                updateFormFromApiData(updateResponse.data.data);
              } else {
                throw new Error('No se pudo actualizar el elemento con UUID');
              }
            } else {
              // Si ya tiene UUID, usar ese en lugar del generado
              console.log('Elemento ya tiene UUID:', response.data.data.elementUuid);
              setElementUuid(response.data.data.elementUuid);
              setElementInfo(response.data.data);
              updateFormFromApiData(response.data.data);
            }
            
            setIsLoading(false);
            return;
          }
        } catch (modelIdError) {
          console.log('No se encontró elemento por modelId/localId, iniciando nuevo formulario');
        }
        
        // Paso 4: Si no hay datos existentes, inicializar formulario vacío
        populateInitialFormData();
      } catch (error: any) {
        console.error('Error al cargar información del elemento:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
        setErrorMessage(`Error al cargar información: ${errorMsg}`);
        populateInitialFormData();
      } finally {
        setIsLoading(false);
      }
    };
    
    // Pre-populate form data with available element data
    const populateInitialFormData = async () => {
  setElementInfo(null);
  
  let name = '';
  let type = '';
  let category = '';
  
  if (elementData) {
    name = elementData.name || `Elemento ${selectedElement?.localId}`;
    type = elementData.type || '';
    category = elementData.category || '';
  } else if (selectedElement) {
    name = `Elemento ${selectedElement.localId}`;
    
    // Intentar obtener la categoría del elemento de forma segura
    try {
      // Método 1: Intentar obtener propiedades del elemento
      if (selectedElement.model.properties) {
        const properties = await selectedElement.model.properties.get([selectedElement.localId]);
        if (properties && properties.length > 0) {
          const elementProps = properties[0];
          
          // Buscar diferentes propiedades que puedan contener la categoría
          if (elementProps.type) {
            category = elementProps.type.replace('IFC', '');
          } else if (elementProps.objectType) {
            category = elementProps.objectType.replace('IFC', '');
          } else if (elementProps.category) {
            category = elementProps.category;
          }
          
          // También intentar obtener el nombre del elemento si está disponible
          if (elementProps.name) {
            name = elementProps.name;
          } else if (elementProps.Name) {
            name = elementProps.Name;
          }
          
          // Intentar obtener el tipo si está disponible
          if (elementProps.type && !type) {
            type = elementProps.type;
          } else if (elementProps.objectType && !type) {
            type = elementProps.objectType;
          }
        }
      }
    } catch (error) {
      console.warn('No se pudieron obtener las propiedades del elemento:', error);
      
      // Si falla, simplemente usar valores por defecto
      console.log('Usando valores por defecto para el elemento');
    }
  }
  
  // Set initial form data
  setFormData(prevData => ({
    ...prevData,
    elementName: name,
    elementType: type,
    category: category,
  }));
};

// También agrega esta función auxiliar para obtener información del elemento de forma más robusta
const getElementBasicInfo = async (model: FRAGS.FragmentsModel, localId: number) => {
  const info = {
    name: `Elemento ${localId}`,
    type: '',
    category: ''
  };
  
  try {
    // Intentar obtener propiedades si están disponibles
    if (model.properties) {
      const properties = await model.properties.get([localId]);
      if (properties && properties.length > 0) {
        const props = properties[0];
        
        // Nombre del elemento
        if (props.name) info.name = props.name;
        else if (props.Name) info.name = props.Name;
        else if (props.tag) info.name = props.tag;
        else if (props.Tag) info.name = props.Tag;
        
        // Tipo del elemento
        if (props.type) info.type = props.type;
        else if (props.objectType) info.type = props.objectType;
        else if (props.Type) info.type = props.Type;
        
        // Categoría del elemento
        if (props.category) {
          info.category = props.category;
        } else if (props.type) {
          info.category = props.type.replace(/^IFC/i, '');
        } else if (props.objectType) {
          info.category = props.objectType.replace(/^IFC/i, '');
        }
      }
    }
  } catch (error) {
    console.warn('Error obteniendo información básica del elemento:', error);
    // Usar valores por defecto si hay error
  }
  
  return info;
};
    
    // Update form data from API data
    const updateFormFromApiData = (data: any) => {
      // Basic info
      const newFormData = {
        elementName: data.elementName || '',
        elementType: data.elementType || '',
        category: data.category || '',
        description: data.description || '',
        location: data.location || '',
        
        // Technical information
        manufacturer: data.manufacturer || '',
        model: data.model || '',
        serialNumber: data.serialNumber || '',
        specifications: data.specifications || {},
        
        // Maintenance information
        installationDate: data.installationDate ? new Date(data.installationDate).toISOString().split('T')[0] : '',
        warrantyExpiration: data.warrantyExpiration ? new Date(data.warrantyExpiration).toISOString().split('T')[0] : '',
        lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate).toISOString().split('T')[0] : '',
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate).toISOString().split('T')[0] : '',
        maintenanceFrequency: data.maintenanceFrequency || '',
        maintenanceInstructions: data.maintenanceInstructions || '',
        
        // Cost information
        cost: data.cost ? data.cost.toString() : '',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate).toISOString().split('T')[0] : '',
        supplier: data.supplier || '',
        supplierContact: data.supplierContact || '',
        
        // Custom attributes
        customAttributes: data.customAttributes || {},
      };
      
      setFormData(newFormData);
    };
    // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Handle date input changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Handle specification changes
  const handleSpecificationChange = (key: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      specifications: {
        ...prevData.specifications,
        [key]: value
      }
    }));
  };
  
  // Handle custom attribute changes
  const handleCustomAttributeChange = (key: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      customAttributes: {
        ...prevData.customAttributes,
        [key]: value
      }
    }));
  };
  
  // Add new specification
  const handleAddSpecification = () => {
    if (!newSpecKey.trim()) return;
    
    handleSpecificationChange(newSpecKey.trim(), newSpecValue);
    setNewSpecKey('');
    setNewSpecValue('');
  };
  
  // Delete specification
  const handleDeleteSpecification = (key: string) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    
    setFormData(prevData => ({
      ...prevData,
      specifications: newSpecs
    }));
  };
  
  // Add new custom attribute
  const handleAddCustomAttribute = () => {
    if (!newCustomKey.trim()) return;
    
    handleCustomAttributeChange(newCustomKey.trim(), newCustomValue);
    setNewCustomKey('');
    setNewCustomValue('');
  };
  
  // Delete custom attribute
  const handleDeleteCustomAttribute = (key: string) => {
    const newAttrs = { ...formData.customAttributes };
    delete newAttrs[key];
    
    setFormData(prevData => ({
      ...prevData,
      customAttributes: newAttrs
    }));
  };
  
  // Handle document file selection
  const handleDocumentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setDocumentUploads(prev => [
      ...prev,
      {
        file,
        name: file.name,
        description: '',
        type: getDocumentTypeFromFile(file)
      }
    ]);
    
    // Reset file input
    if (e.target.value) e.target.value = '';
  };
  
  // Handle image file selection
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setImageUploads(prev => [
      ...prev,
      {
        file,
        name: file.name,
        description: '',
        preview: previewUrl
      }
    ]);
    
    // Reset file input
    if (e.target.value) e.target.value = '';
  };
  
  // Handle video file selection
  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setVideoUploads(prev => [
      ...prev,
      {
        file,
        name: file.name,
        description: ''
      }
    ]);
    
    // Reset file input
    if (e.target.value) e.target.value = '';
  };
  
  // Update document upload data
  const handleDocumentUploadChange = (index: number, field: 'name' | 'description' | 'type', value: string) => {
    setDocumentUploads(prev => {
      const newUploads = [...prev];
      newUploads[index] = { ...newUploads[index], [field]: value };
      return newUploads;
    });
  };
  
  // Update image upload data
  const handleImageUploadChange = (index: number, field: 'name' | 'description', value: string) => {
    setImageUploads(prev => {
      const newUploads = [...prev];
      newUploads[index] = { ...newUploads[index], [field]: value };
      return newUploads;
    });
  };
  
  // Update video upload data
  const handleVideoUploadChange = (index: number, field: 'name' | 'description', value: string) => {
    setVideoUploads(prev => {
      const newUploads = [...prev];
      newUploads[index] = { ...newUploads[index], [field]: value };
      return newUploads;
    });
  };
  
  // Remove document upload
  const handleRemoveDocumentUpload = (index: number) => {
    setDocumentUploads(prev => {
      const newUploads = [...prev];
      newUploads.splice(index, 1);
      return newUploads;
    });
  };
  
  // Remove image upload
  const handleRemoveImageUpload = (index: number) => {
    const upload = imageUploads[index];
    
    // Revoke preview URL to avoid memory leaks
    if (upload.preview) {
      URL.revokeObjectURL(upload.preview);
    }
    
    setImageUploads(prev => {
      const newUploads = [...prev];
      newUploads.splice(index, 1);
      return newUploads;
    });
  };
  
  // Remove video upload
  const handleRemoveVideoUpload = (index: number) => {
    setVideoUploads(prev => {
      const newUploads = [...prev];
      newUploads.splice(index, 1);
      return newUploads;
    });
  };
  
  // Handle maintenance record input changes
  const handleMaintenanceRecordChange = (field: keyof MaintenanceRecord, value: string) => {
    setNewMaintenanceRecord(prev => ({
      ...prev,
      [field]: field === 'cost' ? (value ? parseFloat(value) : null) : value
    }));
  };
  
  // Reset maintenance form
  const resetMaintenanceForm = () => {
    setNewMaintenanceRecord({
      action: 'maintenance',
      description: '',
      performedBy: '',
      cost: null,
      notes: ''
    });
  };
  
  // Helper function to determine document type from file
  const getDocumentTypeFromFile = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'txt':
        return 'text';
      case 'dwg':
      case 'dxf':
        return 'cad';
      default:
        return 'file';
    }
  };

  // Función uploadFile corregida
const uploadFile = async (fileUpload: FileUpload, mediaType: 'documents' | 'images' | 'videos') => {
    if (!selectedElement || !elementUuid) return false;
  
    try {
      // Crear FormData para la subida
      const formData = new FormData();
      formData.append('file', fileUpload.file);
      formData.append('name', fileUpload.name);
      formData.append('description', fileUpload.description || '');
      
      if (mediaType === 'documents' && fileUpload.type) {
        formData.append('type', fileUpload.type);
      }
  
      // IMPORTANTE: Usar la ruta correcta - la URL debe construirse diferente
      // En lugar de /api/bim-element-info/uuid/[uuid]/documents
      // Usar /api/bim-element-info/[modelId]/[localId]/documents
  
      const modelId = selectedElement.model.id;
      const localId = selectedElement.localId;
      
      // Usar la URL que funciona (enfoque legacy con modelId/localId)
      const url = `http://localhost:4000/api/bim-element-info/${modelId}/${localId}/${mediaType}`;
      
      console.log(`Subiendo ${mediaType} a URL: ${url}`);
      
      // Crear una instancia independiente de axios
      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000
      });
  
      console.log(`Respuesta completa de subida de ${mediaType}:`, response);
  
      if (response.data && response.data.success) {
        console.log(`${mediaType} subido correctamente:`, response.data);
        
        // Mostrar mensaje de éxito
        setSuccessMessage(`${fileUpload.name} cargado con éxito`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Recargar datos
        await loadElementInfo();
        
        return true;
      } else {
        throw new Error(response.data?.message || 'Error en la respuesta del servidor');
      }
    } catch (error: any) {
      console.error(`Error en la subida de ${mediaType}:`, error);
      
      // Manejo de errores
      if (error.response) {
        console.log('Error de respuesta:', error.response.status, error.response.data);
        setErrorMessage(`Error (${error.response.status}): ${error.response.data?.message || 'Error en el servidor'}`);
      } else if (error.request) {
        console.log('No se recibió respuesta:', error.request);
        setErrorMessage('No se recibió respuesta del servidor. Verifique su conexión.');
      } else {
        console.log('Error al configurar la petición:', error.message);
        setErrorMessage(`Error: ${error.message}`);
      }
      
      setTimeout(() => setErrorMessage(''), 5000);
      return false;
    }
  };


  const handleFileUploads = async () => {
    if (!elementUuid) return false;
  
    console.log('Procesando archivos adjuntos con UUID:', elementUuid);
    
    // Agrupar los archivos por tipo
    const uploads = {
      documents: [...documentUploads],
      images: [...imageUploads],
      videos: [...videoUploads]
    };
    
    // Verificar si hay archivos para subir
    const totalFiles = uploads.documents.length + uploads.images.length + uploads.videos.length;
    if (totalFiles === 0) return true;
  
    setIsSaving(true);
    
    try {
      // Contador de éxitos
      let successCount = 0;
      
      // Procesar documentos
      for (const upload of uploads.documents) {
        const success = await uploadFile(upload, 'documents');
        if (success) successCount++;
      }
      
      // Procesar imágenes
      for (const upload of uploads.images) {
        const success = await uploadFile(upload, 'images');
        if (success) successCount++;
      }
      
      // Procesar videos
      for (const upload of uploads.videos) {
        const success = await uploadFile(upload, 'videos');
        if (success) successCount++;
      }
      
      // Mostrar resumen de resultados
      if (successCount > 0) {
        setSuccessMessage(`${successCount} de ${totalFiles} archivos subidos correctamente`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Limpiar las listas de uploads después de procesar
        setDocumentUploads([]);
        setImageUploads([]);
        setVideoUploads([]);
        
        // Recargar información para mostrar los nuevos archivos
        await loadElementInfo();
        
        return true;
      } else {
        setErrorMessage('Ningún archivo pudo ser subido. Verifique los errores e intente nuevamente.');
        return false;
      }
    } catch (error: any) {
      console.error('Error general en la carga de archivos:', error);
      setErrorMessage(`Error: ${error.message || 'Error desconocido'}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };
  
  // Versión mejorada de saveElementInfo en ElementInfoPanel.tsx
const saveElementInfo = async () => {
    if (!selectedElement || !elementUuid) return;
    
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage('');
    
    try {
      const modelId = selectedElement.model.id;
      const localId = selectedElement.localId;
      
      // Preparar datos para la API con el UUID
      const elementInfoData = {
        modelId,
        localId,
        elementUuid,
        ...formData,
        // Convertir valores a tipos adecuados
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        installationDate: formData.installationDate ? new Date(formData.installationDate).toISOString() : undefined,
        warrantyExpiration: formData.warrantyExpiration ? new Date(formData.warrantyExpiration).toISOString() : undefined,
        lastMaintenanceDate: formData.lastMaintenanceDate ? new Date(formData.lastMaintenanceDate).toISOString() : undefined,
        nextMaintenanceDate: formData.nextMaintenanceDate ? new Date(formData.nextMaintenanceDate).toISOString() : undefined,
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : undefined
      };
      
      console.log('Guardando información del elemento con UUID:', elementUuid);
      
      // Paso 1: Guardar información básica
      const response = await api.post('/api/bim-element-info', elementInfoData);
      
      // Verificar respuesta
      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al guardar información básica');
      }
      
      // Paso 2: Procesar archivos solo si hay alguno para subir
      const hasFiles = documentUploads.length > 0 || imageUploads.length > 0 || videoUploads.length > 0;
      
      if (hasFiles) {
        const filesSuccess = await handleFileUploads();
        if (!filesSuccess) {
          console.warn('Hubo problemas al subir algunos archivos');
        }
      }
      
      // Paso 3: Procesar registro de mantenimiento si hay uno nuevo
      if (newMaintenanceRecord.description) {
        try {
          await addMaintenanceRecord();
        } catch (maintError) {
          console.warn('Error al añadir registro de mantenimiento:', maintError);
        }
      }
      
      // Paso 4: Recargar toda la información para mostrar datos actualizados
      await loadElementInfo();
      
      setSaveSuccess(true);
      
      // Limpiar mensaje de éxito después de un tiempo
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error guardando información:', error);
      
      // Manejo detallado del error
      let errorMsg = 'Error desconocido';
      
      if (error.response) {
        errorMsg = error.response.data?.message || `Error ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMsg = 'No se recibió respuesta del servidor';
      } else {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Add maintenance record
  const addMaintenanceRecord = async () => {
    if (!elementUuid || !newMaintenanceRecord.description) return;
    console.log(`Añadiendo registro de mantenimiento para elemento con UUID: ${elementUuid}`);
    
    // Usar la ruta basada en UUID
    const encodedUuid = encodeURIComponent(elementUuid);
    const url = `/api/bim-element-info/uuid/${encodedUuid}/maintenance`;
    
    const response = await api.post(url, newMaintenanceRecord);
    
    const result = response.data;
    
    if (!result.success) {
      throw new Error(result.message || 'Error añadiendo registro de mantenimiento');
    }
    
    // Reset maintenance form
    resetMaintenanceForm();
  };
  
  // Delete media (document, image, video)
  const handleDeleteMedia = async (mediaType: 'documents' | 'images' | 'videos', mediaId: string, mediaUrl: string) => {
    if (!selectedElement || !elementInfo || !elementUuid) return;
    
    if (!confirm(`¿Estás seguro de eliminar este archivo?`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Usar la ruta basada en UUID
      const encodedUuid = encodeURIComponent(elementUuid);
      const url = `/api/bim-element-info/uuid/${encodedUuid}/media`;
      
      console.log(`Eliminando ${mediaType} con ID ${mediaId} para elemento UUID: ${elementUuid}`);
      
      const response = await api.delete(url, {
        data: {
          mediaType,
          mediaId,
          mediaUrl
        }
      });
      
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Error eliminando medio');
      }
      
      // Reload element info to get updated data
      await loadElementInfo();
    } catch (error: any) {
      console.error('Error eliminando medio:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Error desconocido';
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
 // Render the panel - Versión Completa Actualizada
return (
  <div className="element-info-panel" onClick={onClose}>
    <div 
      className="element-info-panel-modal" 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Panel header */}
      <div className="panel-header">
        <div className="panel-title">
          <Info size={20} />
          <h3>Información del Elemento</h3>
        </div>
        {onClose && (
          <button 
            className="panel-close-button"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <span>Cargando información...</span>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="error-message">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success message */}
      {successMessage && successMessage.includes('Firebase') && (
        <div className="error-message">
          <span>{successMessage}</span>
          <span> (El archivo se subió pero hubo un problema registrándolo)</span>
        </div>
      )}

      {/* Save success/error message */}
      {saveSuccess !== null && (
        <div className={`save-message ${saveSuccess ? 'success' : 'error'}`}>
          <span>{saveSuccess ? 'Información guardada correctamente' : 'Error al guardar la información'}</span>
        </div>
      )}
      
      {/* Element identifier */}
      <div className="element-identifier">
        <div className="element-id">
          <span className="label">ID:</span>
          <span className="value">{selectedElement?.localId}</span>
        </div>
        <div className="element-model">
          <span className="label">Modelo:</span>
          <span className="value">{selectedElement?.model.id}</span>
        </div>
        {elementUuid && (
          <div className="element-uuid">
            <span className="label">UUID:</span>
            <span className="value">{elementUuid}</span>
          </div>
        )}
      </div>

      {/* Panel content */}
      <div className="panel-content">
        {/* Tabs navigation */}
        <div className="info-tabs">
          <button 
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Info size={16} />
            <span>General</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'technical' ? 'active' : ''}`}
            onClick={() => setActiveTab('technical')}
          >
            <Settings size={16} />
            <span>Técnico</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            <Wrench size={16} />
            <span>Mantenimiento</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={16} />
            <span>Documentos</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <Image size={16} />
            <span>Multimedia</span>
          </button>
        </div>
        
        {/* Tab content */}
        <div className="tab-content">
          {/* General information tab */}
          {activeTab === 'general' && (
            <div className="tab-pane">
              <h4>Información General</h4>
              
              {/* Grid de dos columnas para formularios más organizados */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="elementName">Nombre:</label>
                  <input 
                    type="text" 
                    id="elementName" 
                    name="elementName" 
                    value={formData.elementName} 
                    onChange={handleInputChange}
                    placeholder="Nombre del elemento"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="elementType">Tipo:</label>
                  <input 
                    type="text" 
                    id="elementType" 
                    name="elementType" 
                    value={formData.elementType} 
                    onChange={handleInputChange}
                    placeholder="Tipo de elemento"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Categoría:</label>
                  <input 
                    type="text" 
                    id="category" 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange}
                    placeholder="Categoría"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="location">Ubicación:</label>
                  <input 
                    type="text" 
                    id="location" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleInputChange}
                    placeholder="Ubicación dentro del edificio"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Descripción:</label>
                <textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange}
                  placeholder="Descripción del elemento"
                  rows={3}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cost">Costo (USD):</label>
                  <input 
                    type="number" 
                    id="cost" 
                    name="cost" 
                    value={formData.cost} 
                    onChange={handleInputChange}
                    placeholder="Costo del elemento"
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="purchaseDate">Fecha de compra:</label>
                  <input 
                    type="date" 
                    id="purchaseDate" 
                    name="purchaseDate" 
                    value={formData.purchaseDate} 
                    onChange={handleDateChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="supplier">Proveedor:</label>
                  <input 
                    type="text" 
                    id="supplier" 
                    name="supplier" 
                    value={formData.supplier} 
                    onChange={handleInputChange}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="supplierContact">Contacto del proveedor:</label>
                  <input 
                    type="text" 
                    id="supplierContact" 
                    name="supplierContact" 
                    value={formData.supplierContact} 
                    onChange={handleInputChange}
                    placeholder="Información de contacto"
                  />
                </div>
              </div>
              
              {/* Custom attributes section */}
              <div className="custom-attributes-section">
                <h4>Atributos personalizados</h4>
                
                {Object.entries(formData.customAttributes).length > 0 ? (
                  <div className="attributes-list">
                    {Object.entries(formData.customAttributes).map(([key, value]) => (
                      <div className="attribute-item" key={key}>
                        <div className="attribute-content">
                          <div className="attribute-name">{key}:</div>
                          <input 
                            type="text" 
                            value={value as string} 
                            onChange={(e) => handleCustomAttributeChange(key, e.target.value)}
                            className="attribute-value-input"
                          />
                        </div>
                        <button 
                          className="delete-attribute-button"
                          onClick={() => handleDeleteCustomAttribute(key)}
                          title="Eliminar atributo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-attributes-message">
                    <p>No hay atributos personalizados añadidos.</p>
                  </div>
                )}
                
                {/* Add new custom attribute */}
                <div className="add-attribute-form">
                  <div className="attribute-inputs">
                    <input 
                      type="text" 
                      value={newCustomKey} 
                      onChange={(e) => setNewCustomKey(e.target.value)}
                      placeholder="Nombre del atributo"
                      className="attribute-key-input"
                    />
                    <input 
                      type="text" 
                      value={newCustomValue} 
                      onChange={(e) => setNewCustomValue(e.target.value)}
                      placeholder="Valor"
                      className="attribute-value-input"
                    />
                  </div>
                  <button 
                    className="add-attribute-button"
                    onClick={handleAddCustomAttribute}
                    disabled={!newCustomKey.trim()}
                    title="Añadir atributo"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Technical information tab */}
          {activeTab === 'technical' && (
            <div className="tab-pane">
              <h4>Información Técnica</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="manufacturer">Fabricante:</label>
                  <input 
                    type="text" 
                    id="manufacturer" 
                    name="manufacturer" 
                    value={formData.manufacturer} 
                    onChange={handleInputChange}
                    placeholder="Nombre del fabricante"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="model">Modelo:</label>
                  <input 
                    type="text" 
                    id="model" 
                    name="model" 
                    value={formData.model} 
                    onChange={handleInputChange}
                    placeholder="Modelo o referencia"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="serialNumber">Número de serie:</label>
                <input 
                  type="text" 
                  id="serialNumber" 
                  name="serialNumber" 
                  value={formData.serialNumber} 
                  onChange={handleInputChange}
                  placeholder="Número de serie"
                />
              </div>
              
              {/* Specifications section */}
              <div className="specifications-section">
                <h4>Especificaciones técnicas</h4>
                
                {Object.entries(formData.specifications).length > 0 ? (
                  <div className="specifications-list">
                    {Object.entries(formData.specifications).map(([key, value]) => (
                      <div className="specification-item" key={key}>
                        <div className="specification-content">
                          <div className="specification-name">{key}:</div>
                          <input 
                            type="text" 
                            value={value as string} 
                            onChange={(e) => handleSpecificationChange(key, e.target.value)}
                            className="specification-value-input"
                          />
                        </div>
                        <button 
                          className="delete-spec-button"
                          onClick={() => handleDeleteSpecification(key)}
                          title="Eliminar especificación"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-specs-message">
                    <p>No hay especificaciones técnicas añadidas.</p>
                  </div>
                )}
                
                {/* Add new specification */}
                <div className="add-spec-form">
                  <div className="spec-inputs">
                    <input 
                      type="text" 
                      value={newSpecKey} 
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      placeholder="Nombre de la especificación"
                      className="spec-key-input"
                    />
                    <input 
                      type="text" 
                      value={newSpecValue} 
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      placeholder="Valor"
                      className="specification-value-input"
                    />
                  </div>
                  <button 
                    className="add-spec-button"
                    onClick={handleAddSpecification}
                    disabled={!newSpecKey.trim()}
                    title="Añadir especificación"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Maintenance tab */}
          {activeTab === 'maintenance' && (
            <div className="tab-pane">
              <h4>Información de Mantenimiento</h4>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="installationDate">Fecha de instalación:</label>
                  <input 
                    type="date" 
                    id="installationDate" 
                    name="installationDate" 
                    value={formData.installationDate} 
                    onChange={handleDateChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="warrantyExpiration">Vencimiento de garantía:</label>
                  <input 
                    type="date" 
                    id="warrantyExpiration" 
                    name="warrantyExpiration" 
                    value={formData.warrantyExpiration} 
                    onChange={handleDateChange}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lastMaintenanceDate">Último mantenimiento:</label>
                  <input 
                    type="date" 
                    id="lastMaintenanceDate" 
                    name="lastMaintenanceDate" 
                    value={formData.lastMaintenanceDate} 
                    onChange={handleDateChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="nextMaintenanceDate">Próximo mantenimiento:</label>
                  <input 
                    type="date" 
                    id="nextMaintenanceDate" 
                    name="nextMaintenanceDate" 
                    value={formData.nextMaintenanceDate} 
                    onChange={handleDateChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="maintenanceFrequency">Frecuencia de mantenimiento:</label>
                <select 
                  id="maintenanceFrequency" 
                  name="maintenanceFrequency" 
                  value={formData.maintenanceFrequency} 
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar frecuencia</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="biannual">Semestral</option>
                  <option value="annual">Anual</option>
                  <option value="biennial">Bienal</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="maintenanceInstructions">Instrucciones de mantenimiento:</label>
                <textarea 
                  id="maintenanceInstructions" 
                  name="maintenanceInstructions" 
                  value={formData.maintenanceInstructions} 
                  onChange={handleInputChange}
                  placeholder="Instrucciones específicas de mantenimiento"
                  rows={4}
                />
              </div>
              
              {/* Maintenance records section */}
              <div className="maintenance-records-section">
                <h4>Registros de mantenimiento</h4>
                
                {elementInfo && elementInfo.history && elementInfo.history.length > 0 ? (
                  <div className="maintenance-records-list">
                    {elementInfo.history.map((record: any, index: number) => (
                      <div className="maintenance-record-item" key={index}>
                        <div className="record-header">
                          <div className="record-type">{record.action}</div>
                          <div className="record-date">
                            {new Date(record.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="record-description">{record.description}</div>
                        <div className="record-details">
                          <span className="record-by">Realizado por: {record.performedBy}</span>
                          {record.cost !== null && (
                            <span className="record-cost">Costo: ${record.cost.toFixed(2)}</span>
                          )}
                        </div>
                        {record.notes && (
                          <div className="record-notes">{record.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-records-message">
                    <p>No hay registros de mantenimiento añadidos.</p>
                  </div>
                )}

                {/* Add new maintenance record */}
                <div className="add-maintenance-record">
                  <h5>Añadir nuevo registro</h5>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="maintenanceAction">Tipo:</label>
                      <select 
                        id="maintenanceAction" 
                        value={newMaintenanceRecord.action} 
                        onChange={(e) => handleMaintenanceRecordChange('action', e.target.value)}
                      >
                        <option value="maintenance">Mantenimiento</option>
                        <option value="repair">Reparación</option>
                        <option value="inspection">Inspección</option>
                        <option value="replacement">Reemplazo</option>
                        <option value="upgrade">Actualización</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="maintenanceDate">Fecha:</label>
                      <input 
                        type="date" 
                        id="maintenanceDate" 
                        value={newMaintenanceRecord.date ? new Date(newMaintenanceRecord.date).toISOString().split('T')[0] : ''} 
                        onChange={(e) => handleMaintenanceRecordChange('date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="maintenanceDescription">Descripción:</label>
                    <input 
                      type="text" 
                      id="maintenanceDescription" 
                      value={newMaintenanceRecord.description} 
                      onChange={(e) => handleMaintenanceRecordChange('description', e.target.value)}
                      placeholder="Descripción breve"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="maintenancePerformedBy">Realizado por:</label>
                      <input 
                        type="text" 
                        id="maintenancePerformedBy" 
                        value={newMaintenanceRecord.performedBy} 
                        onChange={(e) => handleMaintenanceRecordChange('performedBy', e.target.value)}
                        placeholder="Nombre del técnico/empresa"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="maintenanceCost">Costo (USD):</label>
                      <input 
                        type="number" 
                        id="maintenanceCost" 
                        value={newMaintenanceRecord.cost === null ? '' : newMaintenanceRecord.cost.toString()} 
                        onChange={(e) => handleMaintenanceRecordChange('cost', e.target.value)}
                        placeholder="Costo de la acción"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="maintenanceNotes">Notas adicionales:</label>
                    <textarea 
                      id="maintenanceNotes" 
                      value={newMaintenanceRecord.notes} 
                      onChange={(e) => handleMaintenanceRecordChange('notes', e.target.value)}
                      placeholder="Observaciones, materiales utilizados, etc."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Documents tab */}
          {activeTab === 'documents' && (
            <div className="tab-pane">
              <h4>Documentos</h4>
              
              {/* Existing documents */}
              {elementInfo && elementInfo.documents && elementInfo.documents.length > 0 ? (
                <div className="documents-list">
                  {elementInfo.documents.map((doc: any, index: number) => (
                    <div className="document-item" key={index}>
                      <div className="document-icon">
                        <FileText size={24} />
                      </div>
                      <div className="document-info">
                        <div className="document-name">{doc.name || 'Documento sin nombre'}</div>
                        {doc.description && (
                          <div className="document-description">{doc.description}</div>
                        )}
                        <div className="document-actions">
                          {doc.url && (doc.type === 'pdf' || (doc.url && doc.url.toLowerCase && doc.url.toLowerCase().endsWith('.pdf'))) ? (
                            <>
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="document-link"
                              >
                                <Eye size={14} />
                                <span>Ver documento</span>
                              </a>
                              <button 
                                className="preview-document-button"
                                onClick={() => setPdfPreview(doc.url)}
                                title="Previsualizar PDF"
                              >
                                <Eye size={14} />
                                <span>Previsualizar</span>
                              </button>
                            </>
                          ) : (
                            <a 
                              href={doc.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="document-link"
                            >
                              <Eye size={14} />
                              <span>Ver documento</span>
                            </a>
                          )}
                          <button 
                            className="delete-document-button"
                            onClick={() => handleDeleteMedia('documents', doc._id, doc.url)}
                            title="Eliminar documento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-documents-message">
                  <p>No hay documentos adjuntos.</p>
                </div>
              )}

              {/* PDF Preview */}
              {pdfPreview && (
                <div className="pdf-preview-overlay">
                  <div className="pdf-preview-container">
                    <div className="pdf-preview-header">
                      <h4>Vista previa del documento</h4>
                      <button 
                        className="close-preview-button"
                        onClick={() => setPdfPreview(null)}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="pdf-preview-content">
                      <iframe 
                        src={`${pdfPreview}#toolbar=0&navpanes=0`} 
                        width="100%" 
                        height="500px"
                        title="Vista previa PDF"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Upload new document */}
              <div className="document-upload-section">
                <h5>Subir nuevo documento</h5>
                
                <button 
                  className="upload-button"
                  onClick={() => documentFileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Seleccionar archivo</span>
                </button>
                <input 
                  type="file" 
                  ref={documentFileInputRef}
                  onChange={handleDocumentFileSelect}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.dwg,.dxf"
                />
                
                {/* Document uploads list */}
                {documentUploads.length > 0 && (
                  <div className="document-uploads-list">
                    {documentUploads.map((upload, index) => (
                      <div className="document-upload-item" key={index}>
                        <div className="document-upload-info">
                          <input 
                            type="text" 
                            value={upload.name} 
                            onChange={(e) => handleDocumentUploadChange(index, 'name', e.target.value)}
                            placeholder="Nombre del documento"
                          />
                          <input 
                            type="text" 
                            value={upload.description} 
                            onChange={(e) => handleDocumentUploadChange(index, 'description', e.target.value)}
                            placeholder="Descripción (opcional)"
                          />
                          <select 
                            value={upload.type} 
                            onChange={(e) => handleDocumentUploadChange(index, 'type', e.target.value)}
                          >
                            <option value="file">Archivo general</option>
                            <option value="pdf">PDF</option>
                            <option value="document">Documento de texto</option>
                            <option value="spreadsheet">Hoja de cálculo</option>
                            <option value="cad">Plano CAD</option>
                            <option value="text">Texto plano</option>
                            <option value="manual">Manual</option>
                            <option value="specification">Especificación técnica</option>
                            <option value="warranty">Garantía</option>
                            <option value="certificate">Certificado</option>
                          </select>
                        </div>
                        <button 
                          className="remove-upload-button"
                          onClick={() => handleRemoveDocumentUpload(index)}
                          title="Quitar de la lista de subida"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Media tab (images and videos) */}
          {activeTab === 'media' && (
            <div className="tab-pane">
              <h4>Imágenes y Videos</h4>
              
              {/* Images section */}
              <div className="images-section">
                <h5>Imágenes</h5>
                
                {/* Existing images */}
                {elementInfo && elementInfo.images && elementInfo.images.length > 0 ? (
                  <div className="images-grid">
                    {elementInfo.images.map((img: any, index: number) => (
                      <div className="image-item" key={index}>
                        <div className="image-preview" onClick={() => setImagePreview(img.url)}>
                          <img src={img.url} alt={img.name} />
                        </div>
                        <div className="image-info">
                          <div className="image-name">{img.name}</div>
                          {img.description && (
                            <div className="image-description">{img.description}</div>
                          )}
                          <div className="image-actions">
                            <button 
                              className="view-image-button"
                              onClick={() => setImagePreview(img.url)}
                              title="Ver imagen"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              className="delete-image-button"
                              onClick={() => handleDeleteMedia('images', img._id, img.url)}
                              title="Eliminar imagen"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-images-message">
                    <p>No hay imágenes adjuntas.</p>
                  </div>
                )}

                {/* Image preview overlay */}
                {imagePreview && (
                  <div className="image-preview-overlay" onClick={() => setImagePreview(null)}>
                    <div className="image-preview-container" onClick={e => e.stopPropagation()}>
                      <div className="image-preview-header">
                        <button 
                          className="close-preview-button"
                          onClick={() => setImagePreview(null)}
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="image-preview-content">
                        <img src={imagePreview} alt="Vista previa" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upload new image */}
                <div className="image-upload-section">
                  <button 
                    className="upload-button"
                    onClick={() => imageFileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    <span>Seleccionar imagen</span>
                  </button>
                  <input 
                    type="file" 
                    ref={imageFileInputRef}
                    onChange={handleImageFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*"
                  />
                  
                  {/* Image uploads list */}
                  {imageUploads.length > 0 && (
                    <div className="image-uploads-list">
                      {imageUploads.map((upload, index) => (
                        <div className="image-upload-item" key={index}>
                          <div className="image-upload-preview">
                            {upload.preview && (
                              <img src={upload.preview} alt={upload.name} />
                            )}
                          </div>
                          <div className="image-upload-info">
                            <input 
                              type="text" 
                              value={upload.name} 
                              onChange={(e) => handleImageUploadChange(index, 'name', e.target.value)}
                              placeholder="Nombre de la imagen"
                            />
                            <input 
                              type="text" 
                              value={upload.description} 
                              onChange={(e) => handleImageUploadChange(index, 'description', e.target.value)}
                              placeholder="Descripción (opcional)"
                            />
                          </div>
                          <button 
                            className="remove-upload-button"
                            onClick={() => handleRemoveImageUpload(index)}
                            title="Quitar de la lista de subida"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Videos section */}
                <div className="videos-section">
                  <h5>Videos</h5>
                  
                  {/* Existing videos */}
                  {elementInfo && elementInfo.videos && elementInfo.videos.length > 0 ? (
                    <div className="videos-list">
                      {elementInfo.videos.map((video: any, index: number) => (
                        <div className="video-item" key={index}>
                          <div className="video-icon">
                            <Film size={24} />
                          </div>
                          <div className="video-info">
                            <div className="video-name">{video.name}</div>
                            {video.description && (
                              <div className="video-description">{video.description}</div>
                            )}
                            <div className="video-actions">
                              <a 
                                href={video.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="video-link"
                              >
                                <Eye size={14} />
                                <span>Ver video</span>
                              </a>
                              <button 
                                className="delete-video-button"
                                onClick={() => handleDeleteMedia('videos', video._id, video.url)}
                                title="Eliminar video"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-videos-message">
                      <p>No hay videos adjuntos.</p>
                    </div>
                  )}
                  
                  {/* Upload new video */}
                  <div className="video-upload-section">
                    <button 
                      className="upload-button"
                      onClick={() => videoFileInputRef.current?.click()}
                    >
                      <Upload size={16} />
                      <span>Seleccionar video</span>
                    </button>
                    <input 
                      type="file" 
                      ref={videoFileInputRef}
                      onChange={handleVideoFileSelect}
                      style={{ display: 'none' }}
                      accept="video/*"
                    />
                    
                    {/* Video uploads list */}
                    {videoUploads.length > 0 && (
                      <div className="video-uploads-list">
                        {videoUploads.map((upload, index) => (
                          <div className="video-upload-item" key={index}>
                            <div className="video-upload-info">
                              <input 
                                type="text" 
                                value={upload.name} 
                                onChange={(e) => handleVideoUploadChange(index, 'name', e.target.value)}
                                placeholder="Nombre del video"
                              />
                              <input 
                                type="text" 
                                value={upload.description} 
                                onChange={(e) => handleVideoUploadChange(index, 'description', e.target.value)}
                                placeholder="Descripción (opcional)"
                              />
                            </div>
                            <button 
                              className="remove-upload-button"
                              onClick={() => handleRemoveVideoUpload(index)}
                              title="Quitar de la lista de subida"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="panel-actions">
        <button 
          className="save-button"
          onClick={saveElementInfo}
          disabled={isSaving || !elementUuid}
        >
          {isSaving ? (
            <div className="button-spinner"></div>
          ) : (
            <>
              <Save size={16} />
              <span>Guardar información</span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>
);

};

export default ElementInfoPanel;