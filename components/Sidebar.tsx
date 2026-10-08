import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Flame, Cylinder, Factory, Bell, Activity, Cpu, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const { state } = useApp();
  
  const alarms = state?.alarms ?? [];
  const alarmsAQ01 = alarms.filter(a => a.equipment === 'AQ01' && !a.cleared).length;
  const alarmsAQ02 = alarms.filter(a => a.equipment === 'AQ02' && !a.cleared).length;
  const alarmsTank = alarms.filter(a => a.equipment === 'TX01' && !a.cleared).length;
  const alarmsGLP = alarms.filter(a => a.equipment === 'GLP' && !a.cleared).length;
  const activeAlarmsCount = alarms.filter(a => !a.cleared).length;

  return (
    <nav aria-label="Menu principal" className="w-[220px] shrink-0 bg-tc-nav-bg border-r border-tc-border flex flex-col h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-tc-border shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--tc-flame, #FF8A3D)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
        </svg>
        <span className="text-base font-bold text-tc-text">TermoControl</span>
      </div>

      <div className="flex flex-col gap-1 p-[16px_8px] overflow-y-auto overflow-x-hidden flex-1">
        
        <NavLink to="/" end className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span>Visão Geral</span>
        </NavLink>

        <NavLink to="/heater/AQ01" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Flame className="w-5 h-5 shrink-0" />
          <span>Aquecedor 01</span>
          {alarmsAQ01 > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-tc-alarm-crit shrink-0" aria-label="Alarme ativo"></span>}
        </NavLink>

        <NavLink to="/heater/AQ02" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Flame className="w-5 h-5 shrink-0" />
          <span>Aquecedor 02</span>
          {alarmsAQ02 > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-tc-alarm-crit shrink-0" aria-label="Alarme ativo"></span>}
        </NavLink>

        <NavLink to="/tank" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Cylinder className="w-5 h-5 shrink-0" />
          <span>Tanque de Expansão</span>
          {alarmsTank > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-tc-alarm-crit shrink-0" aria-label="Alarme ativo"></span>}
        </NavLink>

        <NavLink to="/glp" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Factory className="w-5 h-5 shrink-0" />
          <span>Estoque de GLP</span>
          {alarmsGLP > 0 && <span className="ml-auto w-2 h-2 rounded-full bg-tc-alarm-crit shrink-0" aria-label="Alarme ativo"></span>}
        </NavLink>

        <div className="h-[1px] bg-tc-border my-2 mx-1 shrink-0"></div>

        <NavLink to="/alarms" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Bell className="w-5 h-5 shrink-0" />
          <span>Alarmes</span>
          {activeAlarmsCount > 0 && (
            <span className="ml-auto min-w-[24px] h-5 px-1.5 box-border rounded bg-tc-alarm-crit-fill text-white text-xs font-bold flex items-center justify-center shrink-0">
              {activeAlarmsCount}
            </span>
          )}
        </NavLink>

        <NavLink to="/events" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Activity className="w-5 h-5 shrink-0" />
          <span>Eventos</span>
        </NavLink>

        <NavLink to="/iomap" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Cpu className="w-5 h-5 shrink-0" />
          <span>Mapa de E/S</span>
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `h-11 flex items-center gap-3 px-3 rounded-lg font-semibold ${isActive ? 'bg-tc-nav-active text-[#B3CEFF]' : 'text-tc-text-muted hover:text-tc-text'}`}>
          <Settings className="w-5 h-5 shrink-0" />
          <span>Configurações</span>
        </NavLink>

      </div>
    </nav>
  );
}
