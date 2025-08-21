"use client";
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Activity, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Building,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart as RechartsPieChart,
  Pie,
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const SpaceUsageDashboard = () => {
  // Estados para datos del dashboard
  const [dashboardData, setDashboardData] = useState({
    schedules: [],
    loading: true,
    error: null
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedSpace, setSelectedSpace] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Colores para gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  // Configuración de API (igual que en tu SpaceSchedule.tsx)
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Mapeo de códigos de espacios a nombres reales (del archivo Excel)
  const spaceNameMap = {
    "P0-036": {
      "realName": "CAFETERÍA",
      "spaceGuid": "3ymMM_tF99Oecjknlha$FV",
      "spaceId": 121759
    },
    "P2-001": {
      "realName": "TALLER DE PINTURA MURAL",
      "spaceGuid": "3K8kDYGPP7qgkYTLfoC4uK",
      "spaceId": 62334
    },
    "P2-009": {
      "realName": "TALLER DE MONUMENTO DE ARQUEOLOGÍA",
      "spaceGuid": "3K8kDYGPP7qgkYTLfoC4eG",
      "spaceId": 52675
    },
    "P2-018": {
      "realName": "CUBIERTA TRANSITABLE",
      "spaceGuid": "0jgpoVZcL6WOjTJfe5rC8_",
      "spaceId": 429325
    },
    "P3-001": {
      "realName": "PASILLO",
      "spaceGuid": "189YEfBFDExeOH1d8G53aU",
      "spaceId": 512523
    },
    "S1-004": {
      "realName": "TALLER TEJIDOS",
      "spaceGuid": "25FZ_QtF97Vx2gBOEeNyYw",
      "spaceId": 156167
    },
    "S1-014": {
      "realName": "TALLER ARQUEOLOGÍA",
      "spaceGuid": "25FZ_QtF97Vx2gBOEeNyZ9",
      "spaceId": 186474
    },
    "S1-017": {
      "realName": "TALLER FOTOGRAFÍA",
      "spaceGuid": "25FZ_QtF97Vx2gBOEeNyZF",
      "spaceId": 201070
    },
    "S1-018": {
      "realName": "CARPINTERÍA",
      "spaceGuid": "25FZ_QtF97Vx2gBOEeNyZ1",
      "spaceId": 213477
    }
  };

  // Función para obtener el nombre real del espacio
  const getRealSpaceName = (spaceName) => {
    if (!spaceName) return 'Espacio no especificado';
    
    // Limpiar el código del espacio
    const cleanSpaceName = spaceName.toString().trim();
    
    // Buscar en el mapeo el nombre real
    const mappedSpace = spaceNameMap[cleanSpaceName];
    if (mappedSpace && mappedSpace.realName) {
      return mappedSpace.realName;
    }
    
    // Si no se encuentra en el mapeo, devolver el nombre original limpio
    return cleanSpaceName.replace(/\r\n/g, '').trim();
  };

  // Función para cargar datos del dashboard
  const loadDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));
      
      console.log('Cargando datos del dashboard desde:', `${API_URL}/api/space-schedule`);
      
      // Usar la misma configuración que tu SpaceSchedule.tsx
      const response = await fetch(`${API_URL}/api/space-schedule`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Datos recibidos del servidor:', data);
      
      if (data.status === 'success') {
        // Procesar las fechas de los datos reales
        const processedSchedules = (data.data.schedules || []).map(schedule => ({
          ...schedule,
          startDate: new Date(schedule.startDate),
          endDate: new Date(schedule.endDate),
          approvalDate: schedule.approvalDate ? new Date(schedule.approvalDate) : null
        }));
        
        setDashboardData({
          schedules: processedSchedules,
          loading: false,
          error: null
        });
        
        console.log(`✅ Dashboard cargado con ${processedSchedules.length} actividades`);
      } else {
        throw new Error(data.message || 'Error al cargar datos');
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      
      // Solo usar datos de ejemplo si falla la conexión real
      console.log('🔄 Usando datos de ejemplo debido al error de conexión');
      const exampleData = generateExampleData();
      setDashboardData({
        schedules: exampleData,
        loading: false,
        error: error.message
      });
      
      setLastUpdated(new Date());
    }
  };

  // Función para generar datos de ejemplo (solo como fallback)
  const generateExampleData = () => {
    // Usar los mismos tipos de actividad que tienes en tu sistema
    const activityTypes = [
      'Formación', 'Mantenimiento', 'Exposición', 'Taller', 'Conferencia', 
      'Investigación', 'Restauración', 'Visita Guiada', 'Digitalización', 
      'Catalogación', 'Documentación', 'Almacenamiento', 'Reunión', 
      'Evento Cultural', 'Consulta de Investigadores'
    ];
    
    const spaces = [
      'Sala de Exposiciones Principal',
      'Sala de Restauración',
      'Biblioteca y Archivo',
      'Aula de Formación',
      'Laboratorio de Digitalización',
      'Sala de Conferencias',
      'Archivo Histórico',
      'Taller de Conservación'
    ];
    
    const statuses = ['Completada', 'En proceso', 'Programada', 'Cancelada', 'Pospuesta'];
    const priorities = ['Baja', 'Media', 'Alta', 'Urgente'];
    const approvalStatuses = ['Pendiente', 'Aprobada', 'Rechazada', 'En revisión'];
    const departments = [
      'Dirección', 'Conservación', 'Restauración', 'Investigación', 
      'Documentación', 'Comunicación', 'Administración', 'Seguridad', 
      'Servicios Generales', 'Difusión Cultural', 'Biblioteca y Archivo'
    ];
    
    const schedules = [];
    
    for (let i = 0; i < 50; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + Math.floor(Math.random() * 8) + 1);
      
      // Generar ID único similar al tuyo
      const scheduleId = `SCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
      
      schedules.push({
        scheduleId,
        title: `${activityTypes[Math.floor(Math.random() * activityTypes.length)]} - ${i + 1}`,
        description: `Descripción de la actividad ${i + 1}`,
        spaceName: spaces[Math.floor(Math.random() * spaces.length)],
        spaceGuid: `GUID-${Math.random().toString(36).substring(2, 10)}`,
        activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        approvalStatus: approvalStatuses[Math.floor(Math.random() * approvalStatuses.length)],
        startDate,
        endDate,
        startTime: `${8 + Math.floor(Math.random() * 4)}:00`,
        endTime: `${16 + Math.floor(Math.random() * 4)}:00`,
        allDay: Math.random() > 0.7,
        estimatedAttendance: Math.floor(Math.random() * 50) + 5,
        responsible: {
          name: `Responsable ${i + 1}`,
          email: `responsable${i + 1}@museo.com`,
          department: departments[Math.floor(Math.random() * departments.length)],
          phone: `+34 9${Math.floor(Math.random() * 90000000) + 10000000}`
        },
        participants: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, j) => ({
          name: `Participante ${j + 1}`,
          email: `participante${j + 1}@museo.com`,
          role: 'Participante'
        })),
        resources: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, k) => ({
          name: `Recurso ${k + 1}`,
          quantity: Math.floor(Math.random() * 5) + 1,
          type: ['Equipamiento', 'Material', 'Mobiliario', 'Tecnología', 'Personal'][Math.floor(Math.random() * 5)]
        })),
        tags: [`tag${i % 5}`, `categoria${i % 3}`],
        createdAt: new Date(startDate.getTime() - Math.random() * 86400000),
        updatedAt: new Date()
      });
    }
    
    return schedules;
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Métricas principales
  const calculateMetrics = () => {
    const schedules = dashboardData.schedules;
    
    const totalActivities = schedules.length;
    const completedActivities = schedules.filter(s => s.status === 'Completada').length;
    const activeActivities = schedules.filter(s => s.status === 'En proceso').length;
    const upcomingActivities = schedules.filter(s => s.status === 'Programada').length;
    
    const totalAttendance = schedules.reduce((sum, s) => sum + (s.estimatedAttendance || 0), 0);
    const avgAttendance = totalActivities > 0 ? Math.round(totalAttendance / totalActivities) : 0;
    
    const uniqueSpaces = [...new Set(schedules.map(s => s.spaceName))].length;
    
    const completionRate = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
    
    return {
      totalActivities,
      completedActivities,
      activeActivities,
      upcomingActivities,
      totalAttendance,
      avgAttendance,
      uniqueSpaces,
      completionRate
    };
  };

  // Datos para gráfico de actividades por tipo
  const getActivityTypeData = () => {
    const schedules = dashboardData.schedules;
    const typeCount = {};
    
    schedules.forEach(schedule => {
      typeCount[schedule.activityType] = (typeCount[schedule.activityType] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  };

  // Datos para gráfico de uso de espacios
  const getSpaceUsageData = () => {
    const schedules = dashboardData.schedules;
    const spaceCount = {};
    
    schedules.forEach(schedule => {
      // Usar el nombre real del espacio en lugar del código
      const realName = getRealSpaceName(schedule.spaceName);
      spaceCount[realName] = (spaceCount[realName] || 0) + 1;
    });
    
    return Object.entries(spaceCount)
      .map(([name, count]) => ({ 
        name: name.length > 25 ? name.substring(0, 25) + '...' : name, 
        fullName: name,
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  // Datos para gráfico temporal (mejorado para datos reales)
  const getTemporalData = () => {
    const schedules = dashboardData.schedules;
    const dailyCount = {};
    
    schedules.forEach(schedule => {
      // Manejar tanto objetos Date como strings
      const startDate = schedule.startDate instanceof Date 
        ? schedule.startDate 
        : new Date(schedule.startDate);
      
      const date = startDate.toLocaleDateString('es-ES');
      dailyCount[date] = (dailyCount[date] || 0) + 1;
    });
    
    return Object.entries(dailyCount)
      .map(([date, count]) => ({ 
        date, 
        count,
        // Agregar fecha ordenable
        sortDate: new Date(date.split('/').reverse().join('-'))
      }))
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(-14) // Últimos 14 días
      .map(({ date, count }) => ({ date, count }));
  };

  // Datos para gráfico de estados
  const getStatusData = () => {
    const schedules = dashboardData.schedules;
    const statusCount = {};
    
    schedules.forEach(schedule => {
      statusCount[schedule.status] = (statusCount[schedule.status] || 0) + 1;
    });
    
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  };

  // Datos para gráfico de prioridades
  const getPriorityData = () => {
    const schedules = dashboardData.schedules;
    const priorityCount = {};
    
    schedules.forEach(schedule => {
      priorityCount[schedule.priority] = (priorityCount[schedule.priority] || 0) + 1;
    });
    
    return Object.entries(priorityCount).map(([name, value]) => ({ name, value }));
  };

  const metrics = calculateMetrics();

  if (dashboardData.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-500" size={48} />
          <h2 className="text-xl font-semibold text-gray-700">Cargando dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Building className="mr-3 text-blue-600" size={32} />
                Dashboard de Uso de Espacios
              </h1>
              <p className="text-gray-600 mt-1">
                Análisis y métricas del uso de espacios en la edificación patrimonial
              </p>
              {dashboardData.error && (
                <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                  ⚠️ Conectando con datos de ejemplo - Verificar conexión API: {dashboardData.error}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Última semana</option>
                <option value="month">Último mes</option>
                <option value="quarter">Último trimestre</option>
              </select>
              
              <button
                onClick={loadDashboardData}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <RefreshCw size={18} className="mr-2" />
                Actualizar
              </button>
              
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Download size={18} className="mr-2" />
                Exportar
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mt-2">
            Última actualización: {lastUpdated.toLocaleString()}
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Actividades</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalActivities}</p>
              </div>
              <Activity className="text-blue-500" size={32} />
            </div>
            <div className="mt-2 text-sm text-green-600">
              ↗ +12% vs mes anterior
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Finalización</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.completionRate}%</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
            <div className="mt-2 text-sm text-green-600">
              ↗ +5% vs mes anterior
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Espacios Activos</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.uniqueSpaces}</p>
              </div>
              <MapPin className="text-purple-500" size={32} />
            </div>
            <div className="mt-2 text-sm text-blue-600">
              {metrics.activeActivities} en proceso
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Asistencia Promedio</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.avgAttendance}</p>
              </div>
              <Users className="text-orange-500" size={32} />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Total: {metrics.totalAttendance} personas
            </div>
          </div>
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Uso de espacios */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="mr-2 text-blue-500" size={20} />
              Uso de Espacios
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getSpaceUsageData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name, props) => [value, 'Actividades']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return payload[0].payload.fullName || label;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Actividades por tipo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="mr-2 text-green-500" size={20} />
              Actividades por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={getActivityTypeData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getActivityTypeData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficos secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Tendencia temporal */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-purple-500" size={20} />
              Tendencia Temporal
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={getTemporalData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES')}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8B5CF6" 
                  fill="#8B5CF6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Estados de actividades */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="mr-2 text-orange-500" size={20} />
              Estados
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={getStatusData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Prioridades */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-red-500" size={20} />
              Prioridades
            </h3>
            <div className="space-y-3">
              {getPriorityData().map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de actividades recientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividades Recientes
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actividad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Espacio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asistentes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.schedules.slice(0, 10).map((schedule) => (
                  <tr key={schedule.scheduleId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.activityType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={getRealSpaceName(schedule.spaceName)}>
                        {getRealSpaceName(schedule.spaceName)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {schedule.spaceName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.startDate instanceof Date 
                        ? schedule.startDate.toLocaleDateString('es-ES')
                        : new Date(schedule.startDate).toLocaleDateString('es-ES')
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        schedule.status === 'Completada' ? 'bg-green-100 text-green-800' :
                        schedule.status === 'En proceso' ? 'bg-blue-100 text-blue-800' :
                        schedule.status === 'Programada' ? 'bg-yellow-100 text-yellow-800' :
                        schedule.status === 'Pospuesta' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.estimatedAttendance || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceUsageDashboard;