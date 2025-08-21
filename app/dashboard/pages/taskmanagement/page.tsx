"use client";

import React, { JSX, useState } from 'react';
import { 
  Search, Filter, Plus, Calendar, Clock, CheckCircle2,
  AlertCircle, ArrowUpCircle, Users, User, MoreVertical,
  ChevronDown, CheckSquare, Calendar as CalendarIcon,
  ListFilter, TagIcon, UserPlus, FileEdit, Trash2, LogOut, Play, X
} from 'lucide-react';

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const TaskManager = () => {
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // Added state for search term
  const [filterOpen, setFilterOpen] = useState(false); // Added state for filter open
  interface Task {
    id: string;
    titulo: string;
    prioridad: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    progreso: number;
    descripcion: string; // Added 'descripcion' property
    responsable: {
      nombre: string;
      cargo: string;
    };
    subtareas: { id: string; texto: string; completada: boolean }[];
    tipo: string; // Added 'tipo' property
    comentarios: { usuario: string; fecha: string; texto: string }[];
  }

  const [tasks, setTasks] = useState<Task[]>([]); // Added state for tasks
  const filteredTasks = tasks.filter(task =>
    task.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  ); // Filter tasks based on search term

  const priorityLabels: { [key: string]: { label: string; color: string } } = {
    alta: { label: "Alta", color: "bg-red-500 text-white" },
    media: { label: "Media", color: "bg-yellow-500 text-white" },
    baja: { label: "Baja", color: "bg-green-500 text-white" },
  }; // Define priority labels and colors

  const taskTypeLabels: { [key: string]: { label: string; color: string } } = {
    bug: { label: "Bug", color: "bg-red-500" },
    feature: { label: "Feature", color: "bg-blue-500" },
    improvement: { label: "Improvement", color: "bg-green-500" },
  }; // Define task type labels and colors

  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Added state for selected task
  const [showTaskDetails, setShowTaskDetails] = useState(false); // Added state for showing task details
  const [newComment, setNewComment] = useState(''); // Added state for new comment

  const statusLabels: { [key: string]: { label: string; color: string; icon: JSX.Element } } = {
    pending: {
      label: "Pendiente",
      color: "text-yellow-500",
      icon: <Clock className="w-4 h-4" />
    },
    inProgress: {
      label: "En Progreso",
      color: "text-blue-500",
      icon: <Play className="w-4 h-4" />
    },
    completed: {
      label: "Completado",
      color: "text-green-500",
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    cancelled: {
      label: "Cancelado",
      color: "text-red-500",
      icon: <X className="w-4 h-4" />
    }
  };

  const handleTaskClick = (task: Task) => {
    console.log("Task clicked:", task);
    setSelectedTask(task); // Set the selected task
    setShowTaskDetails(true); // Show task details modal
  };

  // Componente TaskList implementado
  const TaskList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Filter className="h-4 w-4" />
          <span>Filtrar</span>
        </button>
      </div>

      {/* Filtros desplegables */}
      {filterOpen && (
        <div className="bg-gray-800 p-4 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Campos de filtro aquí */}
        </div>
      )}

      {/* Lista de tareas */}
      <div className="space-y-2 max-h-[calc(300px-80px)] overflow-y-auto">
        {filteredTasks.map(task => (
          <div 
            key={task.id}
            onClick={() => handleTaskClick(task)}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">{task.titulo}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${priorityLabels[task.prioridad].color}`}>
                {priorityLabels[task.prioridad].label}
              </span>
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatDate(task.fechaInicio)} - {formatDate(task.fechaFin)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Componente TaskForm implementado
  const TaskForm = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <h3 className="text-white font-medium mb-2">Crear nueva tarea</h3>
          <p className="text-gray-400 text-sm">
            Completa los detalles para crear una nueva tarea en el sistema.
          </p>
        </div>
        
        <button
          onClick={() => setShowNewTaskForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva Tarea</span>
        </button>
      </div>
      
      {/* Estadísticas rápidas */}
      <div className="bg-gray-800 p-4 rounded-lg mt-auto">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-blue-400 font-bold">{tasks.length}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-amber-400 font-bold">
              {tasks.filter(t => t.estado === 'en_progreso').length}
            </div>
            <div className="text-xs text-gray-400">En progreso</div>
          </div>
          <div>
            <div className="text-green-400 font-bold">
              {tasks.filter(t => t.estado === 'completada').length}
            </div>
            <div className="text-xs text-gray-400">Completadas</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente TaskDetails completado
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              subtareas: task.subtareas.map(subtask =>
                subtask.id === subtaskId
                  ? { ...subtask, completada: !subtask.completada }
                  : subtask
              ),
            }
          : task
      )
    );
  };

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              subtareas: task.subtareas.filter(subtask => subtask.id !== subtaskId),
            }
          : task
      )
    );
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTask && newComment.trim()) {
      const updatedTask = {
        ...selectedTask,
        comentarios: [
          ...selectedTask.comentarios,
          {
            usuario: "Usuario Actual", // Replace with actual user
            fecha: new Date().toISOString(),
            texto: newComment.trim(),
          },
        ],
      };
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === selectedTask.id ? updatedTask : task
        )
      );
      setNewComment("");
    }
  };

  const TaskDetails = () => {
    const [newComment, setNewComment] = useState('');
    
    const handleCommentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedTask) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === selectedTask.id
              ? {
                  ...task,
                  comentarios: [
                    ...task.comentarios,
                    {
                      usuario: "Usuario Actual", // Replace with actual user
                      fecha: new Date().toISOString(),
                      texto: newComment.trim(),
                    },
                  ],
                }
              : task
          )
        );
        setNewComment('');
      }
    };

    const calculateDays = (task: Task | null) => {
      if (!task) return 0;
      const start = new Date(task.fechaInicio);
      const end = new Date(task.fechaFin);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const isOverdue = (task: Task | null) => {
      if (!task) return false;
      return task.estado !== 'completada' && new Date() > new Date(task.fechaFin);
    };

    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-[#1e293b] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-blue-900/30 flex justify-between items-center">
            <div className="flex items-center">
              <div className={`${taskTypeLabels[selectedTask.tipo].color} w-3 h-3 rounded-full mr-2`}></div>
              <h2 className="text-xl font-bold text-white">{selectedTask.titulo}</h2>
            </div>
            <button
              onClick={() => setShowTaskDetails(false)}
              className="text-gray-400 hover:text-white"
            >
              &times;
            </button>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-gray-400">Descripción</h3>
                    <p className="text-white mt-1">{selectedTask.descripcion}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm text-gray-400">Estado</h3>
                      <div className="flex items-center mt-1">
                        {statusLabels[selectedTask.estado].icon}
                        <span className={`ml-2 ${statusLabels[selectedTask.estado].color}`}>
                          {statusLabels[selectedTask.estado].label}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm text-gray-400">Progreso</h3>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${selectedTask.progreso}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400 mt-1">
                        {selectedTask.progreso}% completado
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Responsible */}
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Responsable</h3>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-white">{selectedTask.responsable.nombre}</div>
                      <div className="text-xs text-gray-400">{selectedTask.responsable.cargo}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                {/* Subtasks */}
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Subtareas</h3>
                  <div className="space-y-2">
                    {selectedTask.subtareas.map(subtask => (
                      <div key={subtask.id} className="flex items-center justify-between bg-[#111827] p-3 rounded-lg">
                        <div className="flex items-center">
                          <button
                            onClick={() => handleToggleSubtask(selectedTask.id, subtask.id)}
                            className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                              subtask.completada 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-500'
                            }`}
                          >
                            {subtask.completada && <CheckSquare className="h-3 w-3 text-white" />}
                          </button>
                          <span className={`${
                            subtask.completada ? 'line-through text-gray-500' : 'text-white'
                          }`}>
                            {subtask.texto}
                          </span>
                        </div>
                        <button
                          onClick={() => removeSubtask(selectedTask.id, subtask.id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Comments */}
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Comentarios</h3>
                  <div className="space-y-3">
                    {selectedTask.comentarios.map((comment, index) => (
                      <div key={index} className="bg-[#111827] p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-white font-medium">{comment.usuario}</div>
                            <div className="text-xs text-gray-400">{comment.fecha}</div>
                          </div>
                        </div>
                        <p className="mt-2 text-gray-300">{comment.texto}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleCommentSubmit} className="mt-3">
                    <div className="flex">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Añadir comentario..."
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-l-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg"
                      >
                        Enviar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-blue-900/30 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {isOverdue(selectedTask) ? (
                <span className="text-red-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Vencida
                </span>
              ) : (
                <span>{calculateDays(selectedTask)} días de duración</span>
              )}
            </div>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">
                <FileEdit className="h-4 w-4" />
              </button>
              <button className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Gestor de Tareas</h1>
        <button className="flex items-center gap-2 text-gray-400 hover:text-white">
          <LogOut className="h-5 w-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-950/70 border border-blue-900/30 rounded-lg p-4">
          <h2 className="text-blue-400 text-lg mb-4">Tareas</h2>
          <div className="h-[300px]">
            <TaskList />
          </div>
        </div>
        
        <div className="bg-gray-950/70 border border-blue-900/30 rounded-lg p-4">
          <h2 className="text-blue-400 text-lg mb-4">Crear Tarea</h2>
          <div className="h-[300px]">
            <TaskForm />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewTaskForm && <TaskForm />}
      {showTaskDetails && <TaskDetails />}
    </div>
  );
};

export default TaskManager;