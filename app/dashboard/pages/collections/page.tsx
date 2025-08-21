"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend
} from 'recharts';
import { 
  Palette, Clock, AlertTriangle, CheckCircle, 
  TrendingUp, Calendar, Users, Archive,
  RefreshCw, Filter, Download, Eye,
  Building, Wrench, Star, Target
} from 'lucide-react';

// Configuración de la API
const API_URL = process.env.API_COLLECTION || 'http://localhost:4000/api';
console.log('API_URL para colecciones:', API_URL);

// Cliente de API real
const apiClient = {
  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('6months');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Colores para los gráficos
  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6',
    orange: '#F97316',
    pink: '#EC4899'
  };

  const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.teal];

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange, selectedFilter]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener estadísticas básicas
      const statsResponse = await apiClient.get('/art-collection/stats');
      
      // Obtener todos los elementos para generar datos adicionales
      const itemsResponse = await apiClient.get('/art-collection');
      
      if (statsResponse.data.status === 'success' && itemsResponse.data.status === 'success') {
        const stats = statsResponse.data.data;
        const items = itemsResponse.data.data.items;
        
        // Procesar datos adicionales que no están en las estadísticas básicas
        const processedData = processAdditionalData(stats, items);
        
        setDashboardData(processedData);
      } else {
        throw new Error('Error en la respuesta de la API');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processAdditionalData = (stats, items) => {
    // Procesar datos por período histórico (simulado basado en fechas)
    const currentYear = new Date().getFullYear();
    const periodCounts = {
      'Contemporáneo': 0,
      'Moderno': 0,
      'Renacimiento': 0,
      'Barroco': 0,
      'Románico': 0,
      'Gótico': 0
    };

    // Simular distribución por períodos basada en las fechas o nombres
    items.forEach(item => {
      const year = item.creationDate ? new Date(item.creationDate).getFullYear() : currentYear;
      if (year > 1950) periodCounts['Contemporáneo']++;
      else if (year > 1850) periodCounts['Moderno']++;
      else if (year > 1600) periodCounts['Barroco']++;
      else if (year > 1400) periodCounts['Renacimiento']++;
      else if (year > 1200) periodCounts['Gótico']++;
      else periodCounts['Románico']++;
    });

    const byPeriod = Object.entries(periodCounts)
      .map(([period, count]) => ({ period, count }))
      .filter(item => item.count > 0);

    // Generar datos de conservación simulados
    const conservationRatings = [
      { rating: '9-10', count: Math.floor(items.length * 0.18), label: 'Excelente' },
      { rating: '7-8', count: Math.floor(items.length * 0.32), label: 'Bueno' },
      { rating: '5-6', count: Math.floor(items.length * 0.36), label: 'Regular' },
      { rating: '3-4', count: Math.floor(items.length * 0.10), label: 'Malo' },
      { rating: '1-2', count: Math.floor(items.length * 0.04), label: 'Crítico' }
    ];

    // Generar datos mensuales simulados
    const monthlyRestorations = [
      { month: 'Ene', completed: Math.floor(Math.random() * 15) + 8, started: Math.floor(Math.random() * 12) + 5 },
      { month: 'Feb', completed: Math.floor(Math.random() * 15) + 8, started: Math.floor(Math.random() * 12) + 5 },
      { month: 'Mar', completed: Math.floor(Math.random() * 15) + 8, started: Math.floor(Math.random() * 12) + 5 },
      { month: 'Abr', completed: Math.floor(Math.random() * 15) + 8, started: Math.floor(Math.random() * 12) + 5 },
      { month: 'May', completed: Math.floor(Math.random() * 15) + 8, started: Math.floor(Math.random() * 12) + 5 },
      { month: 'Jun', completed: Math.floor(Math.random() * 15) + 8, started: Math.floor(Math.random() * 12) + 5 }
    ];

    // Distribución por espacios (simulada)
    const spaceGuids = [...new Set(items.map(item => item.spaceGuid))];
    const spaceNames = [
      'Sala Principal', 'Galería Norte', 'Almacén A', 
      'Sala de Manuscritos', 'Galería Sur', 'Depósito B'
    ];
    
    const spaceDistribution = spaceGuids.slice(0, 6).map((guid, index) => {
      const itemsInSpace = items.filter(item => item.spaceGuid === guid).length;
      return {
        spaceName: spaceNames[index] || `Espacio ${index + 1}`,
        count: itemsInSpace
      };
    }).filter(space => space.count > 0);

    return {
      ...stats,
      byPeriod,
      conservationRatings,
      monthlyRestorations,
      spaceDistribution
    };
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const exportData = () => {
    if (dashboardData) {
      const dataToExport = {
        timestamp: new Date().toISOString(),
        stats: dashboardData
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-stats-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <RefreshCw className="animate-spin" size={32} />
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-state">
          <AlertTriangle size={32} />
          <p>Error al cargar los datos del dashboard</p>
          <p className="error-message">{error}</p>
          <button onClick={loadDashboardData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-container">
        <div className="error-state">
          <AlertTriangle size={32} />
          <p>No se pudieron cargar los datos</p>
          <button onClick={loadDashboardData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <Palette size={28} />
            <div>
              <h1>Dashboard de Obras de Arte</h1>
              <p>Instituto del Patrimonio Cultural de España (IPCE)</p>
            </div>
          </div>
          
          <div className="header-actions">
            <select 
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="time-filter"
            >
              <option value="1month">Último mes</option>
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="1year">Último año</option>
            </select>
            
            <button 
              onClick={refreshData}
              disabled={refreshing}
              className="refresh-button"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
            </button>
            
            <button onClick={exportData} className="export-button">
              <Download size={16} />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div className="kpi-icon">
            <Palette size={24} />
          </div>
          <div className="kpi-content">
            <h3>Total de Obras</h3>
            <p className="kpi-value">{dashboardData.totalItems}</p>
            <span className="kpi-trend positive">
              <TrendingUp size={14} />
              Total registradas
            </span>
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-icon">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-content">
            <h3>Restauraciones Completadas</h3>
            <p className="kpi-value">{dashboardData.byStatus.find(s => s._id === 'Completada')?.count || 0}</p>
            <span className="kpi-trend positive">
              <TrendingUp size={14} />
              Finalizadas
            </span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <h3>En Proceso</h3>
            <p className="kpi-value">{dashboardData.byStatus.find(s => s._id === 'En proceso')?.count || 0}</p>
            <span className="kpi-trend neutral">
              Actualmente
            </span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-content">
            <h3>Con Retraso</h3>
            <p className="kpi-value">{dashboardData.delayedItems}</p>
            <span className="kpi-trend negative">
              Requieren atención
            </span>
          </div>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="charts-grid">
        {/* Distribución por tipo */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Distribución por Tipo de Obra</h3>
            <Eye size={16} />
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.byType}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({_id, percent}) => `${_id} ${(percent * 100).toFixed(0)}%`}
                >
                  {dashboardData.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado de restauración */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Estado de Restauración</h3>
            <Wrench size={16} />
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráficos secundarios */}
      {dashboardData.byPeriod && dashboardData.byPeriod.length > 0 && (
        <div className="charts-grid secondary">
          {/* Evolución mensual */}
          <div className="chart-card wide">
            <div className="chart-header">
              <h3>Evolución de Restauraciones (Estimado)</h3>
              <Calendar size={16} />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dashboardData.monthlyRestorations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke={COLORS.secondary} 
                    fill={COLORS.secondary}
                    name="Completadas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="started" 
                    stackId="1"
                    stroke={COLORS.warning} 
                    fill={COLORS.warning}
                    name="Iniciadas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribución por periodo histórico */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Por Período Histórico</h3>
              <Archive size={16} />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dashboardData.byPeriod} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="period" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.purple} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Métricas de conservación y espacios */}
      <div className="charts-grid tertiary">
        {/* Estado de conservación */}
        {dashboardData.conservationRatings && (
          <div className="chart-card">
            <div className="chart-header">
              <h3>Estado de Conservación (Estimado)</h3>
              <Star size={16} />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dashboardData.conservationRatings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={COLORS.teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Distribución por espacios */}
        {dashboardData.spaceDistribution && dashboardData.spaceDistribution.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h3>Distribución por Espacios</h3>
              <Building size={16} />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dashboardData.spaceDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="count"
                    label={({spaceName, percent}) => `${spaceName.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.spaceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Métricas adicionales */}
        <div className="metrics-card">
          <div className="chart-header">
            <h3>Métricas Clave</h3>
            <Target size={16} />
          </div>
          <div className="metrics-content">
            <div className="metric-item">
              <span className="metric-label">Tasa de Finalización</span>
              <span className="metric-value success">
                {((dashboardData.byStatus.find(s => s._id === 'Completada')?.count || 0) / dashboardData.totalItems * 100).toFixed(1)}%
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Obras con Retraso</span>
              <span className="metric-value danger">
                {dashboardData.delayedItems}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Tipos Diferentes</span>
              <span className="metric-value primary">
                {dashboardData.byType.length}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Espacios Activos</span>
              <span className="metric-value secondary">
                {dashboardData.spaceDistribution ? dashboardData.spaceDistribution.length : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg,rgb(3, 13, 58) 0%,rgb(3, 13, 58s) 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-title h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
        }

        .header-title p {
          margin: 4px 0 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .time-filter {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          font-size: 14px;
        }

        .refresh-button, .export-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-button {
          background: #f3f4f6;
          color: #374151;
        }

        .export-button {
          background: #3b82f6;
          color: white;
        }

        .refresh-button:hover {
          background: #e5e7eb;
        }

        .export-button:hover {
          background: #2563eb;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .kpi-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .kpi-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .kpi-card.primary .kpi-icon {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }

        .kpi-card.success .kpi-icon {
          background: linear-gradient(135deg, #10b981, #047857);
        }

        .kpi-card.warning .kpi-icon {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .kpi-card.danger .kpi-icon {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .kpi-content h3 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .kpi-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .kpi-trend.positive {
          color: #059669;
        }

        .kpi-trend.negative {
          color: #dc2626;
        }

        .kpi-trend.neutral {
          color: #6b7280;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .charts-grid.secondary {
          grid-template-columns: 2fr 1fr;
        }

        .charts-grid.tertiary {
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }

        .chart-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .chart-card.wide {
          grid-column: span 2;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }

        .chart-content {
          height: 100%;
        }

        .metrics-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .metrics-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .metric-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .metric-item:last-child {
          border-bottom: none;
        }

        .metric-label {
          font-size: 14px;
          color: #6b7280;
        }

        .metric-value {
          font-size: 18px;
          font-weight: 600;
        }

        .metric-value.success {
          color: #059669;
        }

        .metric-value.danger {
          color: #dc2626;
        }

        .metric-value.primary {
          color: #2563eb;
        }

        .metric-value.secondary {
          color: #7c3aed;
        }

        .loading-state, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          color: #6b7280;
          text-align: center;
        }

        .error-message {
          color: #dc2626;
          font-size: 14px;
          margin-top: 8px;
        }

        .retry-button {
          margin-top: 16px;
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-button:hover {
          background: #2563eb;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive design */
        @media (max-width: 1200px) {
          .charts-grid.secondary {
            grid-template-columns: 1fr;
          }
          
          .chart-card.wide {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 12px;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .charts-grid {
            grid-template-columns: 1fr;
          }

          .charts-grid.tertiary {
            grid-template-columns: 1fr;
          }

          .header-title h1 {
            font-size: 24px;
          }

          .kpi-value {
            font-size: 28px;
          }
        }

        @media (max-width: 480px) {
          .dashboard-header {
            padding: 16px;
          }

          .kpi-card {
            padding: 16px;
          }

          .chart-card, .metrics-card {
            padding: 16px;
          }

          .header-actions {
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .time-filter {
            width: 100%;
          }

          .refresh-button, .export-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;