import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navbar() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!session) return null;

  const active = (path) => location.pathname.startsWith(path) ? 'active' : '';
  const activeExact = (path) => location.pathname === path ? 'active' : '';

  const links = (
    <>
      <Link to="/dashboard" className={activeExact('/dashboard')} onClick={() => setOpen(false)}>Panel</Link>
      <Link to="/propiedades" className={active('/propiedades')} onClick={() => setOpen(false)}>Mis propiedades</Link>
      <Link to="/compartidas" className={activeExact('/compartidas')} onClick={() => setOpen(false)}>Compartidas conmigo</Link>
      <Link to="/socios" className={activeExact('/socios')} onClick={() => setOpen(false)}>Socios</Link>
      <Link to="/invitaciones" className={activeExact('/invitaciones')} onClick={() => setOpen(false)}>Invitaciones</Link>
      <Link to="/alertas" className={activeExact('/alertas')} onClick={() => setOpen(false)}>Alertas</Link>
      <Link
        to="/configuracion"
        className={['/configuracion', '/mi-cuenta', '/equipo', '/suscripcion', '/soporte'].includes(location.pathname) ? 'active' : ''}
        onClick={() => setOpen(false)}
      >Configuración</Link>
      {session.user.isPlatformAdmin && (
        <Link to="/admin" className={active('/admin')} onClick={() => setOpen(false)}>Admin</Link>
      )}
      <button className="link-button" onClick={() => { setOpen(false); logout(); }}>
        Salir ({session.user.name})
      </button>
    </>
  );

  return (
    <nav className="navbar">
      <img src="" alt="Descripción de la foto"></img>
      <div className="navbar-brand">Spider<span className="brand-accent">Connect</span></div>
      <div className="navbar-agency">{session.agency.name}</div>
      <button className="navbar-toggle" onClick={() => setOpen(o => !o)} aria-label="Menú">☰</button>
      <div className={`navbar-links${open ? ' open' : ''}`}>
        {links}
      </div>
    </nav>
  );
}
