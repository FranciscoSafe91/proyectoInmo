import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronRight,
  Handshake,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navbar() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!session) return null;

  const active = (path) => location.pathname.startsWith(path) ? 'active' : '';
  const activeExact = (path) => location.pathname === path ? 'active' : '';
  const settingsActive = ['/configuracion', '/mi-cuenta', '/equipo', '/suscripcion', '/soporte'].includes(location.pathname)
    ? 'active'
    : '';

  const closeMenu = () => setOpen(false);

  const primaryLinks = [
    { to: '/dashboard', label: 'Buscar match', icon: Search, className: activeExact('/dashboard') },
    { to: '/propiedades', label: 'Publicadas', icon: Building2, className: active('/propiedades') },
    { to: '/compartidas', label: 'Operaciones', icon: Handshake, className: activeExact('/compartidas') },
  ];

  const networkLinks = [
    { to: '/socios', label: 'Socios', icon: UsersRound, className: activeExact('/socios') },
    { to: '/invitaciones', label: 'Invitaciones', icon: ChevronRight, className: activeExact('/invitaciones') },
    { to: '/alertas', label: 'Alertas', icon: Bell, className: activeExact('/alertas') },
  ];

  const accountLinks = [
    { to: '/configuracion', label: 'Configuración', icon: Settings, className: settingsActive },
  ];

  if (session.user.isPlatformAdmin) {
    accountLinks.push({ to: '/admin', label: 'Admin', icon: ShieldCheck, className: active('/admin') });
  }

  const renderLink = ({ to, label, icon: Icon, className }) => (
    <Link key={to} to={to} className={`sidebar-link ${className}`} onClick={closeMenu}>
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      <button
        className="navbar-toggle"
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMenu}
        />
      )}

      <aside className={`navbar sidebar${open ? ' open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-head">
          <Link to="/dashboard" className="sidebar-brand" onClick={closeMenu}>
            <span className="logo-mark">SC</span>
            <span className="navbar-brand">Spyder<span className="brand-accent">Connect</span></span>
          </Link>
          <div className="navbar-agency">{session.agency.name}</div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Plataforma</span>
          <div className="navbar-links">{primaryLinks.map(renderLink)}</div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Red</span>
          <div className="navbar-links">{networkLinks.map(renderLink)}</div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Cuenta</span>
          <div className="navbar-links">{accountLinks.map(renderLink)}</div>
        </div>

        <div className="sidebar-user">
          <div>
            <span>Sesión activa</span>
            <strong>{session.user.name}</strong>
          </div>
          <button className="link-button" type="button" onClick={() => { closeMenu(); logout(); }}>
            <LogOut size={16} aria-hidden="true" />
            Salir
          </button>
        </div>
      </aside>
    </>
  );
}
