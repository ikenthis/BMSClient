"use client";

import React from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Shield, 
  FileText,
  Database, 
  Settings, 
  Box,
  LogOut,
  ChevronLeft, 
  ChevronRight,
  IdCard,
  Calendar,
  PaintBucket,
  Building
} from 'lucide-react';

import { useSelector, useDispatch } from 'react-redux';
import { usePathname } from 'next/navigation';
import { RootState } from "@/store/store";
import { setAuthUser } from '@/store/authSlice';
import axios from 'axios';
import { toast } from 'sonner';
import { API_URL } from '@/server';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const pathname = usePathname();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/users/logout`, {}, { withCredentials: true });
      dispatch(setAuthUser(null));
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('Error al cerrar sesión');
      console.error(error);
    }
  };

  // Updated to match your folder structure
  const menuItems = [
    {label: 'Panel Principal', path: '/dashboard/pages/maindashboard', icon: LayoutDashboard},
    {label: 'Analisis del Edificio', path: '/dashboard/pages/analyticsdashboard', icon: Box},
    {label: 'Inventario', path: '/dashboard/pages/reports', icon: Database},
    {label: 'Colecciones', path: '/dashboard/pages/collections', icon: PaintBucket},
    {label: 'Gestor de Tareas', path: '/dashboard/pages/taskmanagement', icon: ClipboardList},
    {label: 'Actividades', path: '/dashboard/pages/Activities', icon: Calendar},
    {label: 'Espacios', path: '/dashboard/spaces', icon: Settings},
    {label: 'BIMHub', path: '/dashboard/pages/bimhub', icon: Building},
    {label: 'Seguridad', path: '/dashboard/pages/securityacces', icon: Shield},
    {label: 'Configuraciones', path: '/dashboard/settings', icon: Settings}
  ];

  return (
    <div className={`bg-[#121827] border-r border-blue-900/30 transition-all duration-300 fixed left-0 top-0 bottom-0 h-screen z-30
      ${isOpen ? 'w-64' : 'w-16'}`}>
      <div className="p-4 border-b border-blue-900/30 flex justify-between items-center">
        {isOpen && <span className="text-[#3b82f6] font-semibold">IPCE Dashboard</span>}
        <button onClick={onToggle} className="p-1 hover:bg-blue-900/20 rounded-lg ml-auto">
          {isOpen ? <ChevronLeft className="h-5 w-5 text-[#3b82f6]" /> : <ChevronRight className="h-5 w-5 text-[#3b82f6]" />}
        </button>
      </div>
      <div className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((menuItem) => (
          <Link 
            key={menuItem.path} 
            href={menuItem.path} 
            className={`flex items-center px-4 py-2 my-1 mx-2 rounded-lg transition-colors
              ${pathname === menuItem.path ? 'bg-blue-900/30 text-[#3b82f6]' : 'hover:bg-blue-900/20 text-gray-400 hover:text-[#3b82f6]'}`}
          >
            <menuItem.icon className="h-5 w-5" />
            {isOpen && <span className="ml-3">{menuItem.label}</span>}
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-blue-900/30">
        <div className={`flex items-center ${isOpen ? 'justify-start' : 'justify-center'} mb-4`}>
          <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Users className="h-4 w-4 text-[#3b82f6]" />
          </div>
          {isOpen && (
            <div className="ml-3">
              <div className="text-sm font-medium text-[#3b82f6]">Admin</div>
              <div className="text-xs text-gray-400">Conservador</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-4 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors ${
            isOpen ? 'justify-start' : 'justify-center'
          }`}
        >
          <LogOut className="h-5 w-5" />
          {isOpen && <span className="ml-3">Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;