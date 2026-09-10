import React, { useState } from 'react';
import { BrowserRouter, Link, Routes, Route, Navigate } from 'react-router-dom';
import { BedDouble, ChevronLeft, ChevronRight, MapPin, Ruler, Share2 } from 'lucide-react';
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

const sharedHighlights = [
  {
    title: 'Departamento Lumiere',
    location: 'Belgrano, CABA',
    price: 'USD 215k',
    rooms: '3 amb.',
    area: '86 m²',
    shares: '34 compartidos',
    agency: 'Norte Propiedades',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Casa Ombú',
    location: 'San Isidro, Buenos Aires',
    price: 'USD 390k',
    rooms: '5 amb.',
    area: '210 m²',
    shares: '28 compartidos',
    agency: 'Grupo Raíz',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Loft Distrito',
    location: 'Palermo Soho, CABA',
    price: 'USD 178k',
    rooms: '2 amb.',
    area: '72 m²',
    shares: '21 compartidos',
    agency: 'Nova Propiedades',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
  },
];

function FeaturedFooter() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProperty = sharedHighlights[activeIndex];

  const move = (step) => {
    setActiveIndex((current) => (current + step + sharedHighlights.length) % sharedHighlights.length);
  };

  return (
    <footer className="footer app-footer featured-footer">
      <div className="featured-footer-copy">
        <span>Los más compartidos</span>
        <h2>Inmuebles que más se movieron esta semana</h2>
      </div>

      <div className="featured-carousel" aria-live="polite">
        <button className="carousel-button" type="button" onClick={() => move(-1)} aria-label="Ver inmueble anterior">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <article className="featured-property">
          <img src={activeProperty.image} alt={activeProperty.title} />
          <div className="featured-property-body">
            <div className="featured-property-top">
              <div>
                <p>{activeProperty.agency}</p>
                <h3>{activeProperty.title}</h3>
              </div>
              <strong>{activeProperty.price}</strong>
            </div>

            <div className="featured-location">
              <MapPin size={16} aria-hidden="true" />
              <span>{activeProperty.location}</span>
            </div>

            <div className="featured-meta">
              <span><BedDouble size={15} aria-hidden="true" />{activeProperty.rooms}</span>
              <span><Ruler size={15} aria-hidden="true" />{activeProperty.area}</span>
              <span><Share2 size={15} aria-hidden="true" />{activeProperty.shares}</span>
            </div>
          </div>
        </article>

        <button className="carousel-button" type="button" onClick={() => move(1)} aria-label="Ver siguiente inmueble">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="carousel-dots" aria-label="Inmuebles destacados">
        {sharedHighlights.map((property, index) => (
          <button
            key={property.title}
            type="button"
            className={index === activeIndex ? 'active' : ''}
            onClick={() => setActiveIndex(index)}
            aria-label={`Ver ${property.title}`}
          />
        ))}
      </div>

      <div className="footer-match-strip">
        <div>
          <span>Búsqueda activa</span>
          <strong>Casa con jardín en zona norte</strong>
        </div>
        <div>
          <span>Coincidencias</span>
          <strong>7 propiedades compatibles</strong>
        </div>
        <div>
          <span>Comisión</span>
          <strong>2% a 3%</strong>
        </div>
        <Link className="btn btn-primary" to="/alertas">Publicar mi búsqueda</Link>
      </div>
    </footer>
  );
}

function AppRoutes() {
  const { session } = useAuth();
  return (
    <>
      {session && <Navbar />}
      <main className={session ? 'container app-main' : 'container'}>
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
      {session ? <FeaturedFooter /> : <footer className="footer">Prototipo - Sistema Compartido de Propiedades</footer>}
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
