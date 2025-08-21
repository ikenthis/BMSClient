"use client";

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  RadialBarChart, RadialBar
} from 'recharts';
import {
  Calendar, TrendingUp, AlertTriangle, DollarSign, Wrench, Eye,
  Filter, Download, RefreshCw, Settings, BarChart3, PieChartIcon,
  Activity, Users, FileText, Image, Video, Clock
} from 'lucide-react';
import axios from 'axios';

// Configuración de la API similar a FacilityPanel
const API_URL_INFO = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Crear instancia de axios similar a FacilityPanel
const api = axios.create({
  baseURL: API_URL_INFO,
  headers: {
    'Content-Type': 'application/json'
  }
});

const BIMAnalyticsDashboard = () => {
  const [data, setData] = useState({
    elements: [],
    loading: true,
    error: null
  });
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: '30',
    status: 'all'
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Colores para los gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  useEffect(() => {
    // Log de configuración inicial similar a FacilityPanel
    console.log('Dashboard BIM inicializando...');
    console.log('API_URL_INFO configurado:', API_URL_INFO);
    console.log('Filtros aplicados:', filters);
    
    fetchElementsData();
  }, [filters]);

  // Función para probar conectividad de la API (similar a FacilityPanel)
  const testApiConnection = async () => {
    try {
      console.log('Probando conexión a la API...');
      const response = await api.get('/api/bim-element-info', {
        params: { page: 1, limit: 1 }
      });
      
      console.log('Test de API exitoso:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Test de API falló:', error);
      return { success: false, error: error.message };
    }
  };

  // Datos de ejemplo para desarrollo/pruebas (mismo patrón que FacilityPanel)
  const mockData = [
    {
      elementUuid: "uuid-1",
      modelId: "Model_001",
      localId: 1001,
      elementName: "Sistema HVAC - Unidad 1",
      elementType: "HVAC Unit",
      category: "Climatización",
      description: "Unidad de climatización principal",
      location: "Planta 1 - Zona Norte",
      installationDate: new Date("2022-03-15"),
      lastMaintenanceDate: new Date("2024-10-15"),
      nextMaintenanceDate: new Date("2025-01-15"),
      maintenanceFrequency: "quarterly",
      manufacturer: "Carrier",
      model: "30HXC080",
      cost: 15000,
      documents: [{ _id: "doc1", name: "Manual.pdf", url: "#" }],
      images: [{ _id: "img1", name: "Install.jpg", url: "#" }],
      videos: [],
      history: [
        { _id: "hist1", action: "maintenance", description: "Mantenimiento preventivo", date: new Date("2024-10-15") }
      ],
      createdAt: new Date("2022-03-10"),
      updatedAt: new Date("2024-10-15")
    },
    {
      elementUuid: "uuid-2",
      modelId: "Model_001",
      localId: 1002,
      elementName: "Luminaria LED Panel 001",
      elementType: "Light Fixture",
      category: "Iluminación",
      description: "Panel LED empotrable",
      location: "Planta 1 - Oficina A",
      installationDate: new Date("2023-01-20"),
      lastMaintenanceDate: new Date("2024-11-01"),
      nextMaintenanceDate: new Date("2025-11-01"),
      maintenanceFrequency: "annual",
      manufacturer: "Philips",
      model: "CoreLine LED",
      cost: 150,
      documents: [],
      images: [{ _id: "img2", name: "LED_Panel.jpg", url: "#" }],
      videos: [],
      history: [],
      createdAt: new Date("2023-01-15"),
      updatedAt: new Date("2024-11-01")
    },
    {
      elementUuid: "uuid-3",
      modelId: "Model_001",
      localId: 1003,
      elementName: "Sensor de Temperatura ST-001",
      elementType: "Temperature Sensor",
      category: "Sensores",
      description: "Sensor IoT de temperatura ambiente",
      location: "Planta 1 - Sala de servidores",
      installationDate: new Date("2023-06-10"),
      lastMaintenanceDate: new Date("2024-09-10"),
      nextMaintenanceDate: new Date("2024-12-10"),
      maintenanceFrequency: "quarterly",
      manufacturer: "Honeywell",
      model: "T6 Pro",
      cost: 85,
      documents: [
        { _id: "doc3", name: "Datasheet.pdf", url: "#" },
        { _id: "doc4", name: "Installation_Guide.pdf", url: "#" }
      ],
      images: [],
      videos: [{ _id: "vid1", name: "Installation_Video.mp4", url: "#" }],
      history: [
        { _id: "hist3", action: "installation", description: "Instalación inicial", date: new Date("2023-06-10") },
        { _id: "hist4", action: "maintenance", description: "Calibración de sensor", date: new Date("2024-09-10") }
      ],
      createdAt: new Date("2023-06-05"),
      updatedAt: new Date("2024-09-10")
    },
    {
      elementUuid: "uuid-4",
      modelId: "Model_002",
      localId: 2001,
      elementName: "Bomba de Agua Principal",
      elementType: "Water Pump",
      category: "Fontanería",
      description: "Bomba centrífuga para suministro de agua",
      location: "Sótano - Cuarto de máquinas",
      installationDate: new Date("2021-11-30"),
      lastMaintenanceDate: new Date("2024-08-15"),
      nextMaintenanceDate: new Date("2024-12-15"),
      maintenanceFrequency: "quarterly",
      manufacturer: "Grundfos",
      model: "CR 32-4",
      cost: 2500,
      documents: [{ _id: "doc5", name: "Pump_Manual.pdf", url: "#" }],
      images: [
        { _id: "img4", name: "Pump_Front.jpg", url: "#" },
        { _id: "img5", name: "Pump_Side.jpg", url: "#" }
      ],
      videos: [],
      history: [
        { _id: "hist5", action: "maintenance", description: "Cambio de sellos", date: new Date("2024-08-15") },
        { _id: "hist6", action: "repair", description: "Reparación de motor", date: new Date("2024-03-20") }
      ],
      createdAt: new Date("2021-11-25"),
      updatedAt: new Date("2024-08-15")
    },
    {
      elementUuid: "uuid-5",
      modelId: "Model_002",
      localId: 2002,
      elementName: "Extintor CO2 - E001",
      elementType: "Fire Extinguisher",
      category: "Seguridad",
      description: "Extintor de CO2 5kg",
      location: "Planta 2 - Pasillo principal",
      installationDate: new Date("2022-07-15"),
      lastMaintenanceDate: new Date("2024-07-15"),
      nextMaintenanceDate: new Date("2025-07-15"),
      maintenanceFrequency: "annual",
      manufacturer: "Amerex",
      model: "322",
      cost: 75,
      documents: [{ _id: "doc6", name: "Safety_Certificate.pdf", url: "#" }],
      images: [],
      videos: [],
      history: [
        { _id: "hist7", action: "inspection", description: "Inspección anual", date: new Date("2024-07-15") }
      ],
      createdAt: new Date("2022-07-10"),
      updatedAt: new Date("2024-07-15")
    }
  ];

  const fetchElementsData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      // Construir parámetros de consulta igual que en FacilityPanel
      const params = new URLSearchParams({
        page: '1',
        limit: '1000',
        sortBy: 'updatedAt',
        sortDir: 'desc'
      });

      if (filters.category !== 'all') {
        params.append('category', filters.category);
      }

      console.log('Fetching data from API_URL_INFO:', API_URL_INFO);
      console.log('Endpoint completo:', `/api/bim-element-info?${params}`);
      
      try {
        // Usar la instancia de axios similar a FacilityPanel
        const response = await api.get(`/api/bim-element-info?${params}`);
        
        console.log('API Response status:', response.status);
        console.log('API Response data:', response.data);

        if (response.data && response.data.success) {
          console.log('Datos encontrados:', response.data.data);
          
          setData({
            elements: response.data.data || [],
            loading: false,
            error: null
          });
          return;
        } else {
          throw new Error(response.data.message || 'Error al cargar datos de la API');
        }
      } catch (apiError) {
        console.warn('API no disponible, usando datos de ejemplo:', apiError.message);
        
        // Usar datos de ejemplo si la API no está disponible (igual que antes)
        let filteredData = mockData;
        
        // Aplicar filtros a los datos de ejemplo
        if (filters.category !== 'all') {
          filteredData = mockData.filter(element => element.category === filters.category);
        }
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setData({
          elements: filteredData,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error general fetching data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: `Error de conexión: ${error.message}`
      }));
    }
  };

  // Función para calcular el estado de mantenimiento
  const calculateMaintenanceStatus = (element) => {
    if (!element.nextMaintenanceDate) return 'no-programado';
    
    const today = new Date();
    const nextMaintenance = new Date(element.nextMaintenanceDate);
    const daysUntil = Math.ceil((nextMaintenance - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return 'vencido';
    if (daysUntil <= 7) return 'próximo';
    if (daysUntil <= 30) return 'planificado';
    return 'programado';
  };

  // Análisis de datos
  const analytics = React.useMemo(() => {
    if (!data.elements.length) return {};

    const elements = data.elements;

    // Distribución por categoría
    const categoryDistribution = elements.reduce((acc, element) => {
      const category = element.category || 'Sin categoría';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Distribución por tipo
    const typeDistribution = elements.reduce((acc, element) => {
      const type = element.elementType || 'Sin tipo';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Estado de mantenimiento
    const maintenanceStatus = elements.reduce((acc, element) => {
      const status = calculateMaintenanceStatus(element);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Distribución por fabricante
    const manufacturerDistribution = elements.reduce((acc, element) => {
      const manufacturer = element.manufacturer || 'Sin especificar';
      acc[manufacturer] = (acc[manufacturer] || 0) + 1;
      return acc;
    }, {});

    // Análisis de costos
    const costAnalysis = elements
      .filter(el => el.cost && el.cost > 0)
      .reduce((acc, element) => {
        const category = element.category || 'Sin categoría';
        if (!acc[category]) {
          acc[category] = { totalCost: 0, count: 0, avgCost: 0 };
        }
        acc[category].totalCost += element.cost;
        acc[category].count += 1;
        acc[category].avgCost = acc[category].totalCost / acc[category].count;
        return acc;
      }, {});

    // Elementos por año de instalación
    const installationYears = elements
      .filter(el => el.installationDate)
      .reduce((acc, element) => {
        const year = new Date(element.installationDate).getFullYear();
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {});

    // Análisis de documentación
    const documentationAnalysis = elements.reduce((acc, element) => {
      acc.totalDocuments += (element.documents?.length || 0);
      acc.totalImages += (element.images?.length || 0);
      acc.totalVideos += (element.videos?.length || 0);
      acc.totalHistory += (element.history?.length || 0);
      
      if (element.documents?.length > 0) acc.elementsWithDocs++;
      if (element.images?.length > 0) acc.elementsWithImages++;
      if (element.videos?.length > 0) acc.elementsWithVideos++;
      if (element.history?.length > 0) acc.elementsWithHistory++;
      
      return acc;
    }, {
      totalDocuments: 0,
      totalImages: 0,
      totalVideos: 0,
      totalHistory: 0,
      elementsWithDocs: 0,
      elementsWithImages: 0,
      elementsWithVideos: 0,
      elementsWithHistory: 0
    });

    // Elementos creados por mes (últimos 12 meses)
    const monthlyCreation = elements.reduce((acc, element) => {
      const date = new Date(element.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

    return {
      categoryDistribution,
      typeDistribution,
      maintenanceStatus,
      manufacturerDistribution,
      costAnalysis,
      installationYears,
      documentationAnalysis,
      monthlyCreation,
      totalElements: elements.length,
      totalCost: elements.reduce((sum, el) => sum + (el.cost || 0), 0)
    };
  }, [data.elements]);

  // Preparar datos para gráficos
  const chartData = React.useMemo(() => {
    if (!analytics.categoryDistribution) return {};

    return {
      categoryChart: Object.entries(analytics.categoryDistribution).map(([name, value]) => ({
        name,
        value,
        percentage: ((value / analytics.totalElements) * 100).toFixed(1)
      })),
      
      typeChart: Object.entries(analytics.typeDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({ name, value })),
      
      maintenanceChart: Object.entries(analytics.maintenanceStatus).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        percentage: ((value / analytics.totalElements) * 100).toFixed(1)
      })),
      
      costChart: Object.entries(analytics.costAnalysis).map(([category, data]) => ({
        category,
        totalCost: data.totalCost,
        avgCost: Math.round(data.avgCost),
        count: data.count
      })),
      
      installationChart: Object.entries(analytics.installationYears)
        .sort(([a], [b]) => a - b)
        .map(([year, count]) => ({ year, count })),
      
      monthlyChart: Object.entries(analytics.monthlyCreation)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, count]) => ({ month, count }))
    };
  }, [analytics]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando información del sistema BIM...</p>
          <p className="text-sm text-gray-500 mt-2">Conectando a: {API_URL_INFO}</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error de conexión</h3>
          <p className="text-red-600 mb-4">{data.error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Verifica que el servidor backend esté ejecutándose en: {API_URL_INFO}
          </p>
          <div className="space-y-2">
            <button
              onClick={fetchElementsData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reintentar conexión
            </button>
            <button
              onClick={async () => {
                const result = await testApiConnection();
                alert(result.success ? '✅ API funcional' : `❌ ${result.error}`);
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Probar conectividad
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard de Análisis BIM</h1>
              <p className="text-gray-600">Análisis completo de elementos del modelo</p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  API: {API_URL_INFO}
                </span>
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {analytics.totalElements} elementos
                </span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  const result = await testApiConnection();
                  if (result.success) {
                    alert('✅ Conexión API exitosa');
                  } else {
                    alert(`❌ Error de API: ${result.error}`);
                  }
                }}
                className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                title="Probar conexión a la API"
              >
                <Settings className="h-4 w-4 mr-1" />
                Test API
              </button>
              <button
                onClick={fetchElementsData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </button>
              <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navegación de pestañas */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Resumen General', icon: BarChart3 },
              { id: 'categories', name: 'Por Categorías', icon: PieChartIcon },
              { id: 'maintenance', name: 'Mantenimiento', icon: Wrench },
              { id: 'costs', name: 'Análisis de Costos', icon: DollarSign },
              { id: 'documentation', name: 'Documentación', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="all">Todas las categorías</option>
              {Object.keys(analytics.categoryDistribution || {}).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="365">Último año</option>
              <option value="all">Todos los registros</option>
            </select>
          </div>
        </div>

        {/* Contenido por pestaña */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Estadísticas generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total de Elementos"
                value={analytics.totalElements?.toLocaleString() || '0'}
                subtitle="Elementos registrados"
                icon={Activity}
                color="blue"
              />
              <StatCard
                title="Categorías"
                value={Object.keys(analytics.categoryDistribution || {}).length}
                subtitle="Tipos diferentes"
                icon={PieChart}
                color="green"
              />
              <StatCard
                title="Valor Total"
                value={`€${(analytics.totalCost || 0).toLocaleString()}`}
                subtitle="Activos registrados"
                icon={DollarSign}
                color="amber"
              />
              <StatCard
                title="Documentos"
                value={analytics.documentationAnalysis?.totalDocuments || 0}
                subtitle="Archivos adjuntos"
                icon={FileText}
                color="purple"
              />
            </div>

            {/* Gráficos principales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Distribución por categoría */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Distribución por Categoría</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.categoryChart}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {chartData.categoryChart?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Elementos creados por mes */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Elementos Creados por Mes</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#93C5FD" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tipos de elementos */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Tipos de Elementos (Top 10)</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.typeChart} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Distribución por fabricante */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Distribución por Fabricante</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={Object.entries(analytics.manufacturerDistribution || {})
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([name, value]) => ({ name, value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#F59E0B" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Estado de mantenimiento */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Estado del Mantenimiento</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.maintenanceChart}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {chartData.maintenanceChart?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Instalaciones por año */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Instalaciones por Año</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.installationChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Análisis de costos por categoría */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Costos por Categoría</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.costChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'totalCost' ? `€${value.toLocaleString()}` : value,
                      name === 'totalCost' ? 'Costo Total' : 'Costo Promedio'
                    ]} />
                    <Bar dataKey="totalCost" fill="#EF4444" name="Costo Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Costo promedio por categoría */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Costo Promedio por Categoría</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.costChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`€${value.toLocaleString()}`, 'Costo Promedio']} />
                    <Bar dataKey="avgCost" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className="space-y-6">
            {/* Estadísticas de documentación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Documentos"
                value={analytics.documentationAnalysis?.totalDocuments || 0}
                subtitle={`${analytics.documentationAnalysis?.elementsWithDocs || 0} elementos`}
                icon={FileText}
                color="blue"
              />
              <StatCard
                title="Total Imágenes"
                value={analytics.documentationAnalysis?.totalImages || 0}
                subtitle={`${analytics.documentationAnalysis?.elementsWithImages || 0} elementos`}
                icon={Image}
                color="green"
              />
              <StatCard
                title="Total Videos"
                value={analytics.documentationAnalysis?.totalVideos || 0}
                subtitle={`${analytics.documentationAnalysis?.elementsWithVideos || 0} elementos`}
                icon={Video}
                color="purple"
              />
              <StatCard
                title="Registros de Historial"
                value={analytics.documentationAnalysis?.totalHistory || 0}
                subtitle={`${analytics.documentationAnalysis?.elementsWithHistory || 0} elementos`}
                icon={Clock}
                color="amber"
              />
            </div>

            {/* Gráfico de distribución de documentación */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Distribución de Documentación</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={[
                  { 
                    type: 'Documentos', 
                    total: analytics.documentationAnalysis?.totalDocuments || 0,
                    elementos: analytics.documentationAnalysis?.elementsWithDocs || 0
                  },
                  { 
                    type: 'Imágenes', 
                    total: analytics.documentationAnalysis?.totalImages || 0,
                    elementos: analytics.documentationAnalysis?.elementsWithImages || 0
                  },
                  { 
                    type: 'Videos', 
                    total: analytics.documentationAnalysis?.totalVideos || 0,
                    elementos: analytics.documentationAnalysis?.elementsWithVideos || 0
                  },
                  { 
                    type: 'Historiales', 
                    total: analytics.documentationAnalysis?.totalHistory || 0,
                    elementos: analytics.documentationAnalysis?.elementsWithHistory || 0
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3B82F6" name="Total de archivos" />
                  <Bar dataKey="elementos" fill="#10B981" name="Elementos con contenido" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BIMAnalyticsDashboard;