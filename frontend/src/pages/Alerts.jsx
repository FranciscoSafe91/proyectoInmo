import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Building2, Check, Plus, X } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

function summarizeAlert(alert) {
  const parts = [];
  if (alert.operation) parts.push(operationLabel(alert.operation));
  if (alert.type) parts.push(typeLabel(alert.type));
  if (alert.localidad) parts.push(`en ${alert.localidad}`);
  else if (alert.partido) parts.push(`en ${alert.partido}`);
  else if (alert.zonaGeografica) parts.push(`en ${alert.zonaGeografica}`);
  else if (alert.city) parts.push(`en ${alert.city}`);
  if (alert.minBedrooms) parts.push(`${alert.minBedrooms}+ dorm.`);
  if (alert.minBathrooms) parts.push(`${alert.minBathrooms}+ baños`);
  if (alert.minAreaM2) parts.push(`${alert.minAreaM2}+ m²`);
  if (alert.currency && (alert.minPrice || alert.maxPrice)) {
    const cur = alert.currency === 'USD' ? 'U$D' : '$';
    if (alert.minPrice && alert.maxPrice) parts.push(`${cur} ${alert.minPrice}–${alert.maxPrice}`);
    else if (alert.minPrice) parts.push(`desde ${cur} ${alert.minPrice}`);
    else parts.push(`hasta ${cur} ${alert.maxPrice}`);
  }
  return parts.length ? parts.join(' · ') : 'Cualquier propiedad de tus socios';
}

function MatchRequestsReceived() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState({});

  const load = () => {
    api.get('/match-requests').then(setData).catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const respond = async (id, action) => {
    setResponding(r => ({ ...r, [id]: true }));
    try {
      await api.post(`/match-requests/${id}/${action}`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setResponding(r => ({ ...r, [id]: false }));
    }
  };

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data || data.items.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Bell size={18} />
        <strong>Solicitudes de match recibidas</strong>
        <span className="badge" style={{ background: 'var(--color-accent,#f59e0b)', color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 12 }}>
          {data.items.length}
        </span>
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Otra inmobiliaria encontró una de tus propiedades como posible coincidencia con su búsqueda. Aceptá para permitirles verla, o rechazá si no querés compartir esta información.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.items.map(({ matchRequest, property, alert, alertAgency }) => (
          <div key={matchRequest.id} className="match-request-item">
            <Link to={`/propiedades/${property.id}`} className="match-request-thumb" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              {property.coverUrl
                ? <img src={property.coverUrl} alt={property.title} />
                : <Building2 size={22} aria-hidden="true" />}
            </Link>
            <div className="match-request-info">
              <Link to={`/propiedades/${property.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}>{property.title}</Link>
              <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
              <span className="muted small" style={{ marginTop: 4 }}>
                <strong>{alertAgency.name}</strong> busca: {summarizeAlert(alert)}
                {alert.title ? ` — "${alert.title}"` : ''}
              </span>
            </div>
            <div className="match-request-actions">
              <Link to={`/propiedades/${property.id}`} className="btn btn-secondary btn-sm">Ver</Link>
              <button
                className="btn btn-success btn-sm"
                disabled={responding[matchRequest.id]}
                onClick={() => respond(matchRequest.id, 'aceptar')}
              >
                <Check size={14} /> Aceptar
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={responding[matchRequest.id]}
                onClick={() => respond(matchRequest.id, 'rechazar')}
              >
                <X size={14} /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Alerts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.get('/alertas').then(setData).catch(e => setError(e.message));
  }
  useEffect(load, []);

  async function handlePausar(id) {
    await api.post(`/alertas/${id}/pausar`);
    load();
  }
  async function handleActivar(id) {
    await api.post(`/alertas/${id}/activar`);
    load();
  }
  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta alerta?')) return;
    await api.delete(`/alertas/${id}`);
    load();
  }
  async function handleCompartir(alertId, propertyId) {
    await api.post(`/alertas/${alertId}/compartir/${propertyId}`);
    load();
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { alerts, matches, hasPartners } = data;

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Búsquedas activas</span>
          <h1>Mis alertas</h1>
          <p className="subtitle">Creá una alerta cuando busques algo que no tenés ni vos ni tus socios. En cuanto alguien tenga algo compatible, te avisamos.</p>
        </div>
        <Link className="btn" to="/alertas/nueva">
          <Plus size={17} aria-hidden="true" /> Nueva alerta
        </Link>
      </section>

      <MatchRequestsReceived />

      <div className="card">
        <h3>Coincidencias para tus propiedades</h3>
        <p className="muted small">Estas son alertas de tus socios que coinciden con propiedades tuyas — podés compartírselas con un clic.</p>
        {matches.length === 0 ? (
          <p className="muted">Por ahora no hay ninguna coincidencia pendiente.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tu propiedad</th><th>Socio que la busca</th><th></th></tr></thead>
              <tbody>
                {matches.map(({ alert, property, requestingAgency }) => (
                  <tr key={`${alert.id}-${property.id}`}>
                    <td>
                      <Link to={`/propiedades/${property.id}`}>{property.title}</Link><br />
                      <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
                    </td>
                    <td>
                      {requestingAgency.name}<br />
                      <span className="muted small">busca: {summarizeAlert(alert)}</span>
                      {alert.mudanzaInmediata && (
                        <><br /><span style={{ display: 'inline-block', marginTop: 4, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 600, color: '#856404' }}>🚚 Mudanza inmediata</span></>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-small" onClick={() => handleCompartir(alert.id, property.id)}>Compartir ahora</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Mis alertas</h3>
        {!hasPartners && (
          <p className="muted">Todavía no tenés inmobiliarias socias — las alertas solo avisan sobre la red de socios. <Link to="/socios">Sumá socios primero →</Link></p>
        )}
        {alerts.length === 0 ? (
          <div className="empty-state">
            <Bell size={38} aria-hidden="true" />
            <h2>Todavía no creaste ninguna alerta</h2>
            <p>Cuando busques algo puntual para un cliente, creá una alerta y tus socios te avisarán si tienen algo compatible.</p>
            <Link className="btn" to="/alertas/nueva">
              <Plus size={17} aria-hidden="true" /> Crear primera alerta
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Alerta</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td>
                      {a.title || <span className="muted">(sin título)</span>}
                      {a.mudanzaInmediata && (
                        <> <span style={{ display: 'inline-block', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, padding: '1px 7px', fontSize: '0.78rem', fontWeight: 600, color: '#856404', verticalAlign: 'middle' }}>🚚 Inmediata</span></>
                      )}<br />
                      <span className="muted small">{summarizeAlert(a)}</span>
                    </td>
                    <td>
                      {a.active
                        ? <span className="badge badge-publicada">Activa</span>
                        : <span className="badge badge-borrador">Pausada</span>}
                    </td>
                    <td>
                      {a.active
                        ? <button className="btn btn-secondary btn-small" onClick={() => handlePausar(a.id)}>Pausar</button>
                        : <button className="btn btn-secondary btn-small" onClick={() => handleActivar(a.id)}>Activar</button>}{' '}
                      <button className="btn btn-danger btn-small" onClick={() => handleEliminar(a.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
