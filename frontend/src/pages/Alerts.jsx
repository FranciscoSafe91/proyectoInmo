import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Plus, Send, X } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function summarizeAlert(alert) {
  const parts = [];
  if (alert.operation) parts.push(operationLabel(alert.operation));
  if (alert.type) parts.push(typeLabel(alert.type));
  if (alert.localidades && alert.localidades.length > 0) parts.push(`en ${alert.localidades.join(', ')}`);
  else if (alert.localidad) parts.push(`en ${alert.localidad}`);
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
  const { canDo } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState({});
  const [acceptModal, setAcceptModal] = useState(null);
  const [acceptComment, setAcceptComment] = useState('');
  const [accepting, setAccepting] = useState(false);

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
  async function handleRespond(matchRequestId, action) {
    if (action === 'aceptar') {
      setAcceptModal({ id: matchRequestId });
      setAcceptComment('');
      return;
    }
    setResponding(r => ({ ...r, [matchRequestId]: true }));
    try {
      await api.post(`/match-requests/${matchRequestId}/${action}`);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setResponding(r => ({ ...r, [matchRequestId]: false }));
    }
  }

  async function handleConfirmAccept() {
    if (!acceptModal) return;
    setAccepting(true);
    try {
      await api.post(`/match-requests/${acceptModal.id}/aceptar`, { comment: acceptComment });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAccepting(false);
      setAcceptModal(null);
      setAcceptComment('');
    }
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { alerts, matches, hasPartners } = data;

  return (
    <>
      {acceptModal && (
        <div className="modal-backdrop" onClick={() => setAcceptModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Aceptar solicitud de match</h3>
            <p className="muted">Opcional — podés dejarle un comentario al socio que busca esta propiedad.</p>
            <textarea
              rows={4}
              placeholder="Ej: Perfecto, pueden contactar al propietario esta semana."
              value={acceptComment}
              onChange={e => setAcceptComment(e.target.value)}
            />
            <div className="btn-row">
              <button className="btn btn-success" onClick={handleConfirmAccept} disabled={accepting}>
                {accepting ? 'Aceptando...' : 'Confirmar aceptación'}
              </button>
              <button className="btn btn-secondary" onClick={() => setAcceptModal(null)} disabled={accepting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Búsquedas activas</span>
          <h1>Mis alertas</h1>
          <p className="subtitle">Creá una alerta cuando busques algo que no tenés ni vos ni tus socios. En cuanto alguien tenga algo compatible, te avisamos.</p>
        </div>
        {canDo('crear_alertas') && (
          <Link className="btn" to="/alertas/nueva">
            <Plus size={17} aria-hidden="true" /> Nueva alerta
          </Link>
        )}
      </section>

      <div className="page-two-col">

        {/* ── Columna izquierda: Alertas recibidas ── */}
        <div>
          <h2 className="page-col-heading">
            <Bell size={17} aria-hidden="true" /> Alertas que coinciden
          </h2>
          <div className="card">
            <p className="muted small" style={{ marginBottom: 16 }}>
              Alertas de tus socios que coinciden con propiedades tuyas. Aceptá para que puedan verlas.
            </p>
            {matches.length === 0 ? (
              <p className="muted">Por ahora no hay ninguna coincidencia pendiente.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Tu propiedad</th><th>Socio que la busca</th><th></th></tr></thead>
                  <tbody>
                    {matches.map(({ matchRequest, property, alert, alertAgency }) => (
                      <tr key={matchRequest.id}>
                        <td>
                          <Link to={`/propiedades/${property.id}`}>{property.title}</Link><br />
                          <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
                        </td>
                        <td>
                          {alertAgency.name}<br />
                          <span className="muted small">busca: {summarizeAlert(alert)}</span>
                          {alert.mudanzaInmediata && (
                            <><br /><span style={{ display: 'inline-block', marginTop: 4, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 4, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 600, color: '#856404' }}>🚚 Mudanza inmediata</span></>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-success btn-small"
                            disabled={responding[matchRequest.id]}
                            onClick={() => handleRespond(matchRequest.id, 'aceptar')}
                          ><Check size={13} /> Aceptar</button>{' '}
                          <button
                            className="btn btn-danger btn-small"
                            disabled={responding[matchRequest.id]}
                            onClick={() => handleRespond(matchRequest.id, 'rechazar')}
                          ><X size={13} /> Rechazar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Columna derecha: Alertas enviadas ── */}
        <div>
          <h2 className="page-col-heading">
            <Send size={17} aria-hidden="true" /> Alertas enviadas
          </h2>
          <div className="card">
            {!hasPartners && (
              <p className="muted" style={{ marginBottom: 12 }}>Todavía no tenés inmobiliarias socias — las alertas solo avisan sobre la red de socios. <Link to="/socios">Sumá socios primero →</Link></p>
            )}
            {alerts.length === 0 ? (
              <div className="empty-state">
                <Bell size={38} aria-hidden="true" />
                <h2>Todavía no creaste ninguna alerta</h2>
                <p>Cuando busques algo puntual para un cliente, creá una alerta y tus socios te avisarán si tienen algo compatible.</p>
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
        </div>

      </div>
    </>
  );
}
