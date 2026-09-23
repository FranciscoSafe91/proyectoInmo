import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Plus } from 'lucide-react';
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
                      {a.title || <span className="muted">(sin título)</span>}<br />
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
