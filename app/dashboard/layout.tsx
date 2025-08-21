"use client";

import React, { useState } from 'react';
import { ReactNode } from 'react';
import Sidebar from './components/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleToggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="flex min-h-screen bg-[#111827]">
      <Sidebar isOpen={isOpen} onToggle={handleToggleSidebar} />
      <main className={`flex-1 transition-all duration-300 ${isOpen ? 'pl-64' : 'pl-16'}`}>
        
        {children}
      </main>
    </div>
  );
}