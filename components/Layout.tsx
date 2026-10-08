import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { AlarmStrip } from './ui/AlarmStrip';
import { useApp } from '../context/AppContext';

const Layout: React.FC = () => {
  const { state, currentUser, sendCommand } = useApp();
  
  const activeAlarms = state?.alarms?.filter(a => !a.cleared) ?? [];
  
  // Find highest severity unacked, or just latest
  const sorted = [...activeAlarms].sort((a, b) => {
    if (a.severity === 'Danger' && b.severity !== 'Danger') return -1;
    if (a.severity !== 'Danger' && b.severity === 'Danger') return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const latestAlarm = sorted[0];

  const canAck = currentUser !== null && ['Operator', 'Supervisor', 'Maintenance', 'Admin'].includes(currentUser.role);

  return (
    <div className="flex w-full h-screen bg-tc-bg text-tc-text font-sans text-sm overflow-hidden min-w-[1366px]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <Topbar />
        
        {latestAlarm ? (
          <AlarmStrip 
            alarms={activeAlarms} 
            canAck={canAck} 
            onAck={(id) => sendCommand(latestAlarm.equipment, 'ALARM_ACK', id)}
          />
        ) : (
          <AlarmStrip alarms={[]} />
        )}

        <main className="flex-1 box-border p-6 overflow-y-auto overflow-x-hidden flex flex-col gap-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
