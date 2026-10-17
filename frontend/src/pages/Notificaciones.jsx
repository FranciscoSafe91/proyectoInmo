import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCircle2, Handshake, Pencil, Share2, Sparkles, UserMinus, UserPlus, X, XCircle,
} from 'lucide-react';
import { api } from '../api.js';
import { formatDateTime } from '../utils.js';

// Tipo de aviso -> ícono y etiqueta corta para el listado
const TIPOS = {
  solicitud_recibida: { label: 'Solicitud de sociedad', icon: UserPlus, tone: '#2563eb' },
  sociedad_aceptada: { label: 'Sociedad aceptada', icon: Handshake, tone: '#16a34a' },
  sociedad_rechazada: { label: 'Solicitud rechazada', icon: XCircle, tone: '#dc2626' },
  sociedad_disuelta: { label: 'Sociedad terminada', icon: UserMinus, tone: '#dc2626' },
  propiedad_compartida: { label: 'Propiedad compartida', icon: Share2, tone: '#7c3aed' },
  compartida_aceptada: { label: 'Compartida aceptada', icon: CheckCircle2, tone: '#16a34a' },
  compartida_rechazada: { label: 'Compartida rechazada', icon: XCircle, tone: '#dc2626' },
  propiedad_modificada: { label: 'Propiedad modificada', icon: Pencil, tone: '#d97706' },
  alerta_coincidencia: { label: 'Coincidencia de alerta', icon: Sparkles, tone: '#0d9488' },
};
const TIPO_DEFAULT = { label: 'Aviso', icon: Bell, tone: '#6b7280' };

// Pantalla donde se ve lo que trata cada aviso
function destinoDe(n) {
  switch (n.type) {
    case 'solicitud_recibida': return { to: '/invitaciones', label: 'Ver solicitudes' };
    case 'sociedad_aceptada':
    case 'sociedad_rechazada':
    case 'sociedad_disuelta': return { to: '/socios', label: 'Ver socios' };
    case 'propiedad_compartida':
    case 'propiedad_modificada': return { to: '/compartidas', label: 'Ver compartidas' };
    case 'compartida_aceptada':
    case 'compartida_rechazada': return n.relatedId ? { to: `/propiedades/${n.relatedId}`, label: 'Ver propiedad' } : { to: '/propiedades', label: 'Ver propiedades' };
    case 'alerta_coincidencia': return { to: '/matcheadas', label: 'Ver matcheadas' };
    default: return { to: '/notificaciones', label: 'Cerrar' };
  }
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function Notificaciones() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const [abierta, setAbierta] = useState(null);

  function load() {
    api.get('/notificaciones?limit=200')
      .then(d => setItems(d.notificaciones || []))
      .catch(e => setError(e.message));
  }

  useEffect(load, []);

  function markRead(n) {
    if (n.read) return;
    setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    api.post(`/notificaciones/${n.id}/leer`).catch(load);
  }

  // Abre el detalle del aviso y lo marca como leído
  function abrir(n) {
    setAbierta(n);
    markRead(n);
  }

  function markAll() {
    setItems(prev => prev.map(x => ({ ...x, read: true })));
    api.post('/notificaciones/leer-todas').catch(load);
  }

  const visibles = useMemo(
    () => (items || []).filter(n => !soloSinLeer || !n.read),
    [items, soloSinLeer]
  );

  // Agrupa por día manteniendo el orden (las más nuevas primero)
  const grupos = useMemo(() => {
    const out = [];
    for (const n of visibles) {
      const label = dayLabel(n.createdAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [visibles]);

  const sinLeer = (items || []).filter(n => !n.read).length;

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!items) return <p className="muted">Cargando...</p>;

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Alertas</span>
          <h1>Notificaciones</h1>
          <p className="subtitle">Todo lo que pasa con tus socios, tus propiedades compartidas y tus alertas, en un solo lugar.</p>
        </div>
        <Link className="btn btn-secondary" to="/alertas">Ver mis alertas</Link>
      </section>

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className={`btn btn-small ${soloSinLeer ? 'btn-secondary' : ''}`}
            onClick={() => setSoloSinLeer(false)}
          >
            Todas ({items.length})
          </button>
          <button
            type="button"
            className={`btn btn-small ${soloSinLeer ? '' : 'btn-secondary'}`}
            onClick={() => setSoloSinLeer(true)}
          >
            Sin leer ({sinLeer})
          </button>
        </div>
        {sinLeer > 0 && (
          <button type="button" className="btn btn-small btn-secondary" onClick={markAll}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="empty-state">
          {soloSinLeer ? 'No tenés notificaciones sin leer.' : 'Todavía no tenés notificaciones.'}
        </div>
      ) : grupos.map(grupo => (
        <section key={grupo.label} style={{ marginTop: 18 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--app-muted, #6b7280)' }}>
            {grupo.label}
          </h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {grupo.items.map((n, i) => {
              const tipo = TIPOS[n.type] || TIPO_DEFAULT;
              const Icon = tipo.icon;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => abrir(n)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', textAlign: 'left',
                    padding: '14px 16px', border: 'none', cursor: 'pointer', color: 'inherit',
                    background: n.read ? 'transparent' : 'var(--app-green-soft, #ecfdf5)',
                    borderTop: i === 0 ? 'none' : '1px solid var(--app-border, #e5e7eb)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: '0 0 auto', width: 36, height: 36, borderRadius: 999, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: `${tipo.tone}1a`, color: tipo.tone,
                    }}
                  >
                    <Icon size={18} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: tipo.tone }}>{tipo.label}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--app-muted, #6b7280)', whiteSpace: 'nowrap' }}>{timeLabel(n.createdAt)}</span>
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontWeight: n.read ? 400 : 600, overflowWrap: 'anywhere' }}>
                      {n.message}
                    </span>
                  </span>
                  {!n.read && (
                    <span aria-label="Sin leer" style={{ flex: '0 0 auto', width: 9, height: 9, marginTop: 6, borderRadius: 999, background: '#dc2626' }} />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {abierta && (() => {
        const tipo = TIPOS[abierta.type] || TIPO_DEFAULT;
        const destino = destinoDe(abierta);
        return (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setAbierta(null); }}>
            <div className="modal-box" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: tipo.tone }}>{tipo.label}</span>
                <button className="modal-close" onClick={() => setAbierta(null)} aria-label="Cerrar"><X size={18} /></button>
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem', overflowWrap: 'anywhere' }}>{abierta.message}</p>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>{formatDateTime(abierta.createdAt)}</p>
              {abierta.detail ? (
                <div style={{ border: '1px solid var(--app-border, #e5e7eb)', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {abierta.detail}
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>Este aviso no tiene más detalle.</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setAbierta(null)}>Cerrar</button>
                <Link className="btn" to={destino.to} onClick={() => setAbierta(null)}>{destino.label}</Link>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
