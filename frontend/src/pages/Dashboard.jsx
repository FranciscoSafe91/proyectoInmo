import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Building2,
  Handshake,
  Plus,
  Search,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { api } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { agency, stats } = data;
  const pendingTotal = stats.pendingShares + stats.pendingPartnerships;
  const healthItems = [
    {
      label: 'Mis propiedades',
      value: stats.myProperties,
      hint: 'Inventario activo de tu cuenta',
      to: '/propiedades',
      icon: Building2,
      tone: 'green',
    },
    {
      label: 'Matcheadas',
      value: stats.myAlertMatchCount ?? 0,
      hint: 'Propiedades de socios que coinciden con tus alertas',
      to: '/matcheadas',
      icon: Sparkles,
      tone: 'violet',
    },
    {
      label: 'Compartidas conmigo',
      value: stats.sharedWithMe,
      hint: 'Oportunidades aceptadas de socios',
      to: '/compartidas',
      icon: Share2,
      tone: 'orange',
    },
    {
      label: 'Inmobiliarias socias',
      value: stats.partners,
      hint: 'Red disponible para operar',
      to: '/socios',
      icon: UsersRound,
      tone: 'ink',
    },
  ];
  const nextActions = [
    {
      title: 'Publicar una propiedad',
      text: 'Cargá fotos, datos clave y elegí con qué socios compartirla desde el primer momento.',
      to: '/propiedades/nueva',
      label: 'Nueva propiedad',
      icon: Plus,
      primary: true,
    },
    {
      title: 'Buscar socios',
      text: 'Sumá inmobiliarias a tu red para ampliar inventario y activar colaboraciones.',
      to: '/socios',
      label: 'Buscar socios',
      icon: Search,
    },
  ];

  return (
    <>
      <section className="page-hero dashboard-hero">
        <div>
          <span className="section-kicker">Panel de operaciones</span>
          <h1>{agency.name}</h1>
          <p className="subtitle">Un resumen claro de tu inventario, tu red y las oportunidades que esperan acción.</p>
        </div>
        <div className="hero-status-card">
          <span>Estado de la red</span>
          <strong>{pendingTotal > 0 ? `${pendingTotal} pendiente${pendingTotal === 1 ? '' : 's'}` : 'Todo al día'}</strong>
          <p>{stats.partners} socio{stats.partners === 1 ? '' : 's'} conectado{stats.partners === 1 ? '' : 's'} con tu cuenta.</p>
        </div>
      </section>

      <div className="metric-grid">
        {healthItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`metric-card metric-${item.tone}${isActive ? ' metric-card-active' : ''}`}
            >
              <div className="metric-icon"><Icon size={22} aria-hidden="true" /></div>
              <div>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
                <p>{item.hint}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="operations-grid">
        <article className="card operations-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">Prioridades</span>
              <h2>Movimientos pendientes</h2>
            </div>
            <Bell size={20} aria-hidden="true" />
          </div>

          <div className="task-list">
            <Link to="/invitaciones" className="task-row">
              <span>{stats.pendingShares}</span>
              <div>
                <strong>Propiedades para aceptar</strong>
                <p>Invitaciones de socios que pueden ampliar tu cartera.</p>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/invitaciones" className="task-row">
              <span>{stats.pendingPartnerships}</span>
              <div>
                <strong>Solicitudes de sociedad</strong>
                <p>Contactos esperando entrar a tu red colaborativa.</p>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/alertas" className="task-row task-success">
              <span>{stats.alertMatches}</span>
              <div>
                <strong>Alertas que coinciden</strong>
                <p>Socios buscando propiedades parecidas a las tuyas.</p>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="card network-card">
          <span className="section-kicker">Colaboración</span>
          <h2>Activá más circulación</h2>
          <p>Mientras más claro esté qué publicás, con quién trabajás y qué queda pendiente, más rápido se convierte una oportunidad en operación.</p>
          <div className="network-steps">
            <div><Building2 size={18} aria-hidden="true" /><span>Inventario ordenado</span></div>
            <div><Handshake size={18} aria-hidden="true" /><span>Socios conectados</span></div>
            <div><Bell size={18} aria-hidden="true" /><span>Alertas accionables</span></div>
          </div>
        </article>
      </section>

      <section className="action-grid">
        {nextActions.map(action => {
          const Icon = action.icon;
          return (
            <article key={action.title} className="action-card">
              <div className="icon-box"><Icon size={22} aria-hidden="true" /></div>
              <h3>{action.title}</h3>
              <p>{action.text}</p>
              <Link className={`btn ${action.primary ? '' : 'btn-secondary'}`} to={action.to}>
                {action.label} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
