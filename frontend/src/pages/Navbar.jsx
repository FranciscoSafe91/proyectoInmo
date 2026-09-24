import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  Handshake,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navbar() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    platform: true,
    network: true,
    account: true,
  });

  if (!session) return null;

  const active = (path) => location.pathname.startsWith(path) ? 'active' : '';
  const activeExact = (path) => location.pathname === path ? 'active' : '';
  const settingsActive = ['/configuracion', '/mi-cuenta', '/equipo', '/suscripcion', '/soporte'].includes(location.pathname)
    ? 'active'
    : '';

  const closeMenu = () => setOpen(false);
  const toggleSection = (section) => {
    setOpenSections(current => ({ ...current, [section]: !current[section] }));
  };

  const primaryLinks = [
    { to: '/dashboard', label: 'Home', icon: Home, className: activeExact('/dashboard') },
    { to: '/alertas/nueva', label: 'Buscar match', icon: Search, className: active('/alertas/nueva') },
    { to: '/matcheadas', label: 'Matcheadas', icon: Sparkles, className: active('/matcheadas') },
    { to: '/propiedades', label: 'Publicadas', icon: Building2, className: active('/propiedades') },
    { to: '/compartidas', label: 'Carpeta compartida', icon: Handshake, className: activeExact('/compartidas') },
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

  const renderLink = ({ to, label, icon: Icon, className = '', onClick }) => {
    if (onClick) {
      return (
        <button
          key={`action-${label}`}
          type="button"
          className={`sidebar-link ${className}`}
          onClick={() => {
            closeMenu();
            onClick();
          }}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </button>
      );
    }

    return (
      <Link key={`${to}-${label}`} to={to} className={`sidebar-link ${className}`} onClick={closeMenu}>
        <Icon size={17} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  };

  const renderSection = ({ id, label, links }) => {
    const sectionOpen = openSections[id];
    const contentId = `sidebar-section-${id}`;

    return (
      <div className="sidebar-section">
        <button
          className="sidebar-section-trigger"
          type="button"
          onClick={() => toggleSection(id)}
          aria-expanded={sectionOpen}
          aria-controls={contentId}
        >
          <span>{label}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        {sectionOpen && (
          <div id={contentId} className="navbar-links">
            {links.map(renderLink)}
          </div>
        )}
      </div>
    );
  };

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

        {renderSection({ id: 'platform', label: 'Plataforma', links: primaryLinks })}
        {renderSection({ id: 'network', label: 'Red', links: networkLinks })}
        {renderSection({
          id: 'account',
          label: 'Cuenta',
          links: [
            ...accountLinks,
            { label: 'Salir', icon: LogOut, onClick: logout },
          ],
        })}

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
