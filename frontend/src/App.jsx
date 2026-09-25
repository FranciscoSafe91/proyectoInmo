import React, { useState, useEffect } from 'react';
import { BrowserRouter, Link, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BedDouble, Building2, ChevronLeft, ChevronRight, Home, MapPin, Ruler, Share2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { api } from './api.js';
import { typeLabel, money } from './utils.js';

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
import AlertForm from './pages/AlertForm.jsx';
import Matcheadas from './pages/Matcheadas.jsx';
import MiWeb from './pages/MiWeb.jsx';
import SettingsHub from './pages/SettingsHub.jsx';
import MiCuenta from './pages/MiCuenta.jsx';
import Team from './pages/Team.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Subscription from './pages/Subscription.jsx';
import Support from './pages/Support.jsx';
import Admin from './pages/Admin.jsx';
import AdminAgency from './pages/AdminAgency.jsx';
import AdminSupport from './pages/AdminSupport.jsx';
import AdminPlan from './pages/AdminPlan.jsx';
import PublicProperty from './pages/PublicProperty.jsx';
import JoinInvite from './pages/JoinInvite.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

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

function MatchBar() {
  const [matches, setMatches] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api.get('/alertas').then(data => setMatches(data.matches || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (matches.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % matches.length), 6000);
    return () => clearInterval(t);
  }, [matches.length]);

  if (!matches.length) return null;

  const { property } = matches[idx];
  const barrio = property.localidad || property.partido || property.zonaGeografica || property.city || '';

  return (
    <div className="match-bar" role="status" aria-label="Alerta disponible">
      <div className="match-bar-icon">
        <Home size={20} aria-hidden="true" />
      </div>
      <div className="match-bar-cell match-bar-title">
        <span>Alerta disponible</span>
        <strong>{property.title}</strong>
      </div>
      <div className="match-bar-cell">
        <span>Tipo</span>
        <strong>{typeLabel(property.type)}</strong>
      </div>
      <div className="match-bar-cell">
        <span>Precio</span>
        <strong>{money(property.price, property.currency)}</strong>
      </div>
      {barrio && (
        <div className="match-bar-cell">
          <span>Barrio</span>
          <strong>{barrio}</strong>
        </div>
      )}
      <Link to="/alertas" className="btn btn-primary match-bar-btn">
        <Share2 size={14} aria-hidden="true" /> Compartir
      </Link>
      {matches.length > 1 && (
        <span className="match-bar-counter">{idx + 1}/{matches.length}</span>
      )}
    </div>
  );
}

function FeaturedFooter() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/propiedades').then(data => {
      const { properties, coverMediaByProperty = {}, sharesByProperty = {} } = data;
      const active = properties
        .filter(p => p.status === 'publicada')
        .slice(-3)
        .reverse()
        .map(p => ({
          id: p.id,
          title: p.title,
          location: [p.localidad, p.ciudad || p.city, p.province].filter(Boolean).join(', '),
          price: money(p.price, p.currency),
          rooms: p.bedrooms ? `${p.bedrooms} amb.` : typeLabel(p.type),
          area: p.areaM2 ? `${p.areaM2} m²` : '',
          shares: `${(sharesByProperty[p.id] || []).length} compartidos`,
          cover: coverMediaByProperty[p.id] || null,
        }));
      setItems(active);
    }).catch(() => {});
  }, []);

  const list = items.length ? items : sharedHighlights;
  const isReal = items.length > 0;
  const activeItem = list[activeIndex] || list[0];

  if (!activeItem) return null;

  const move = (step) => {
    setActiveIndex(current => (current + step + list.length) % list.length);
  };

  return (
    <footer className="footer app-footer featured-footer">
      <div className="featured-footer-copy">
        <span>{isReal ? 'Tus últimas publicadas' : 'Los más compartidos'}</span>
        <h2>{isReal ? 'Tus propiedades activas recientes' : 'Inmuebles que más se movieron esta semana'}</h2>
      </div>

      <div className="featured-carousel" aria-live="polite">
        <button className="carousel-button" type="button" onClick={() => move(-1)} aria-label="Ver inmueble anterior">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <article className="featured-property">
          {isReal ? (
            activeItem.cover?.type === 'image'
              ? <img src={activeItem.cover.url} alt={activeItem.title} />
              : <div className="featured-property-placeholder"><Building2 size={28} aria-hidden="true" /></div>
          ) : (
            <img src={activeItem.image} alt={activeItem.title} />
          )}
          <div className="featured-property-body">
            <div className="featured-property-top">
              <div>
                <p>{isReal ? '' : activeItem.agency}</p>
                <h3>{activeItem.title}</h3>
              </div>
              <strong>{activeItem.price}</strong>
            </div>

            {activeItem.location && (
              <div className="featured-location">
                <MapPin size={16} aria-hidden="true" />
                <span>{activeItem.location}</span>
              </div>
            )}

            <div className="featured-meta">
              {activeItem.rooms && <span><BedDouble size={15} aria-hidden="true" />{activeItem.rooms}</span>}
              {activeItem.area && <span><Ruler size={15} aria-hidden="true" />{activeItem.area}</span>}
              <span><Share2 size={15} aria-hidden="true" />{activeItem.shares}</span>
            </div>
          </div>
        </article>

        <button className="carousel-button" type="button" onClick={() => move(1)} aria-label="Ver siguiente inmueble">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="carousel-dots" aria-label="Inmuebles destacados">
        {list.map((item, index) => (
          <button
            key={item.id || item.title}
            type="button"
            className={index === activeIndex ? 'active' : ''}
            onClick={() => setActiveIndex(index)}
            aria-label={`Ver ${item.title}`}
          />
        ))}
      </div>

    </footer>
  );
}

function AppRoutes() {
  const { session } = useAuth();
  const { pathname } = useLocation();
  const isLanding = !session && pathname === '/';
  return (
    <>
      {session && <Navbar />}
      {session && <MatchBar />}
      <main className={session ? 'container app-main' : (isLanding ? '' : 'container')}>
        <Routes>
          <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/registro" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/unirse/:token" element={<JoinInvite />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/alertas/nueva" element={<PrivateRoute><AlertForm /></PrivateRoute>} />
          <Route path="/matcheadas" element={<PrivateRoute><Matcheadas /></PrivateRoute>} />
          <Route path="/matcheadas/:alertId" element={<PrivateRoute><Matcheadas /></PrivateRoute>} />
          <Route path="/mi-web" element={<PrivateRoute><MiWeb /></PrivateRoute>} />
          <Route path="/configuracion" element={<PrivateRoute><SettingsHub /></PrivateRoute>} />
          <Route path="/mi-cuenta" element={<PrivateRoute><MiCuenta /></PrivateRoute>} />
          <Route path="/equipo" element={<PrivateRoute><Team /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
          <Route path="/suscripcion" element={<PrivateRoute><Subscription /></PrivateRoute>} />
          <Route path="/soporte" element={<PrivateRoute><Support /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          <Route path="/admin/soporte" element={<PrivateRoute><AdminSupport /></PrivateRoute>} />
          <Route path="/admin/inmobiliarias/:id" element={<PrivateRoute><AdminAgency /></PrivateRoute>} />
          <Route path="/admin/plan" element={<PrivateRoute><AdminPlan /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {session ? <FeaturedFooter /> : (!isLanding && <footer className="footer">Prototipo - Sistema Compartido de Propiedades</footer>)}
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
