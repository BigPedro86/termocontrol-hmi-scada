
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HeaterDetail from './pages/HeaterDetail';
import ExpansionTank from './pages/ExpansionTank';
import GLPManagement from './pages/GLPManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import Alarms from './pages/Alarms';
import Events from './pages/Events';
import IOMap from './pages/IOMap';
import { ComponentsPage } from './pages/ComponentsPage';

/**
 * Regra 7: A supervisão nunca desliga.
 * Todas as telas de visualização e alarmes funcionam sem login.
 * Login é necessário apenas para telas de comando/configuração.
 */
const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/heater/:id" element={<HeaterDetail />} />
        <Route path="/tank" element={<ExpansionTank />} />
        <Route path="/glp" element={<GLPManagement />} />
        <Route path="/alarms" element={<Alarms />} />
        <Route path="/events" element={<Events />} />
        <Route path="/iomap" element={<IOMap />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<UserManagement />} />
      </Route>
      <Route path="/login" element={<Login />} />
      {import.meta.env.DEV && <Route path="/components" element={<ComponentsPage />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;
