"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
const data = [{
  name: 'Ene',
  visitors: 4000,
  temperature: 24,
  humidity: 65
}, {
  name: 'Feb',
  visitors: 3000,
  temperature: 22,
  humidity: 59
}, {
  name: 'Mar',
  visitors: 2000,
  temperature: 23,
  humidity: 61
}, {
  name: 'Abr',
  visitors: 2780,
  temperature: 25,
  humidity: 63
}, {
  name: 'May',
  visitors: 1890,
  temperature: 26,
  humidity: 64
}, {
  name: 'Jun',
  visitors: 2390,
  temperature: 27,
  humidity: 60
}];
const AnalyticsDashboard = () => {
  return <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-950/70 border border-blue-900/30 rounded-lg p-4">
          <h2 className="text-blue-400 text-lg mb-4">Visitantes por Mes</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A8A" />
                <XAxis dataKey="name" stroke="#93C5FD" />
                <YAxis stroke="#93C5FD" />
                <Tooltip contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #1E3A8A',
                borderRadius: '0.5rem'
              }} />
                <Area type="monotone" dataKey="visitors" stroke="#3B82F6" fillOpacity={1} fill="url(#colorVisitors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gray-950/70 border border-blue-900/30 rounded-lg p-4">
          <h2 className="text-blue-400 text-lg mb-4">
            Condiciones Ambientales
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A8A" />
                <XAxis dataKey="name" stroke="#93C5FD" />
                <YAxis stroke="#93C5FD" />
                <Tooltip contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #1E3A8A',
                borderRadius: '0.5rem'
              }} />
                <Bar dataKey="temperature" fill="#3B82F6" />
                <Bar dataKey="humidity" fill="#60A5FA" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{
        title: 'Visitantes Hoy',
        value: '1,234',
        change: '+12%'
      }, {
        title: 'Temperatura Media',
        value: '23.5°C',
        change: '-0.5°C'
      }, {
        title: 'Humedad Media',
        value: '62%',
        change: '+2%'
      }].map((stat, index) => <div key={index} className="bg-gray-950/70 border border-blue-900/30 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">{stat.title}</h3>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-2xl font-bold text-blue-300">
                {stat.value}
              </span>
              <span className={`text-sm ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {stat.change}
              </span>
            </div>
          </div>)}
      </div>
    </div>;
};
export default AnalyticsDashboard;