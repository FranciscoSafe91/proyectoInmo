import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

import Navbar from './pages/Navbar.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Properties from './pages/Properties.jsx';
import PropertyForm from './pages/PropertyForm.jsx';
import PropertyDetail from './pages/PropertyDetail.jsx';
import Ficha from './pages/Ficha.jsx';
import SharedProperties from './pages/SharedProperties.jsx';
import Partners from './pages/Partners.jsx';
import Invitations from './pages/Invitations.jsx';
import Alerts from './pages/Alerts.jsx';
import MiWeb from './pages/MiWeb.jsx';
import SettingsHub from './pages/SettingsHub.jsx';
import MiCuenta from './pages/MiCuenta.jsx';
import Team from './pages/Team.jsx';
import Subscription from './pages/Subscription.jsx';
import Support from './pages/Support.jsx';
import Admin from './pages/Admin.jsx';
import AdminAgency from './pages/AdminAgency.jsx';
import AdminSupport from './pages/AdminSupport.jsx';
import AdminPlan from './pages/AdminPlan.jsx';
import PublicProperty from './pages/PublicProperty.jsx';
import JoinInvite from './pages/JoinInvite.jsx';

function PrivateRoute({ children }) {
  const { session } = useAuth();
  if (session === undefined) return <p className="muted" style={{ padding: '40px 20px' }}>Cargando...</p>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { session } = useAuth();
  if (session === undefined) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { session } = useAuth();
  return (
    <>
      {session && <Navbar />}
      <main className="container">
        <Routes>
          <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/registro" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/unirse/:token" element={<JoinInvite />} />
          <Route path="/public/propiedades/:id" element={<PublicProperty />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/propiedades" element={<PrivateRoute><Properties /></PrivateRoute>} />
          <Route path="/propiedades/nueva" element={<PrivateRoute><PropertyForm /></PrivateRoute>} />
          <Route path="/propiedades/:id/editar" element={<PrivateRoute><PropertyForm /></PrivateRoute>} />
          <Route path="/propiedades/:id/ficha" element={<PrivateRoute><Ficha /></PrivateRoute>} />
          <Route path="/propiedades/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
          <Route path="/compartidas" element={<PrivateRoute><SharedProperties /></PrivateRoute>} />
          <Route path="/socios" element={<PrivateRoute><Partners /></PrivateRoute>} />
          <Route path="/invitaciones" element={<PrivateRoute><Invitations /></PrivateRoute>} />
          <Route path="/alertas" element={<PrivateRoute><Alerts /></PrivateRoute>} />
          <Route path="/mi-web" element={<PrivateRoute><MiWeb /></PrivateRoute>} />
          <Route path="/configuracion" element={<PrivateRoute><SettingsHub /></PrivateRoute>} />
          <Route path="/mi-cuenta" element={<PrivateRoute><MiCuenta /></PrivateRoute>} />
          <Route path="/equipo" element={<PrivateRoute><Team /></PrivateRoute>} />
          <Route path="/suscripcion" element={<PrivateRoute><Subscription /></PrivateRoute>} />
          <Route path="/soporte" element={<PrivateRoute><Support /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          <Route path="/admin/soporte" element={<PrivateRoute><AdminSupport /></PrivateRoute>} />
          <Route path="/admin/inmobiliarias/:id" element={<PrivateRoute><AdminAgency /></PrivateRoute>} />
          <Route path="/admin/plan" element={<PrivateRoute><AdminPlan /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">Prototipo — Sistema Compartido de Propiedades</footer>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
