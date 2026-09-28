import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Building2, MapPin, Sparkles, Check, X } from 'lucide-react';
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
  return parts.length ? parts.join(' · ') : 'Cualquier propiedad de la red';
}

// ---------------------------------------------------------------------------
// Solicitudes recibidas (vista del dueño de la propiedad)
// ---------------------------------------------------------------------------
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
  if (!data) return null;
  if (data.items.length === 0) return null;

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
            <div className="match-request-thumb">
              {property.coverUrl
                ? <img src={property.coverUrl} alt={property.title} />
                : <Building2 size={22} aria-hidden="true" />}
            </div>
            <div className="match-request-info">
              <strong>{property.title}</strong>
              <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
              <span className="muted small" style={{ marginTop: 4 }}>
                <strong>{alertAgency.name}</strong> busca: {summarizeAlert(alert)}
                {alert.title ? ` — "${alert.title}"` : ''}
              </span>
            </div>
            <div className="match-request-actions">
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

// ---------------------------------------------------------------------------
// Lista de alertas propias (vista del buscador)
// ---------------------------------------------------------------------------
function AlertsList() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/matcheadas').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { alerts } = data;

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Resultados de tus búsquedas</span>
          <h1>Matcheadas</h1>
          <p className="subtitle">Propiedades de toda la red que coinciden con las alertas que creaste.</p>
        </div>
        <Link className="btn" to="/alertas/nueva">
          <Sparkles size={17} aria-hidden="true" /> Nueva alerta
        </Link>
      </section>

      <MatchRequestsReceived />

      {alerts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Bell size={38} aria-hidden="true" />
            <h2>Todavía no creaste ninguna alerta</h2>
            <p>Creá una alerta para buscar propiedades en toda la red y ver los resultados acá.</p>
            <Link className="btn" to="/alertas/nueva">
              <Sparkles size={17} aria-hidden="true" /> Crear alerta
            </Link>
          </div>
        </div>
      ) : (
        <div className="matcheadas-grid">
          {alerts.map(alert => (
            <Link
              key={alert.id}
              to={`/matcheadas/${alert.id}`}
              className={'matcheadas-alert-card' + (!alert.active ? ' matcheadas-alert-card--paused' : '')}
            >
              <div className="matcheadas-card-head">
                <div className="matcheadas-card-icon">
                  <Sparkles size={18} aria-hidden="true" />
                </div>
                <div className="matcheadas-badge">{alert.matchCount}</div>
              </div>
              <div className="matcheadas-card-body">
                <strong>{alert.title || '(Sin título)'}</strong>
                <p>{summarizeAlert(alert)}</p>
                {!alert.active && <span className="badge badge-borrador" style={{ marginTop: 6 }}>Pausada</span>}
              </div>
              <div className="matcheadas-card-footer">
                <span>
                  {alert.matchCount === 0
                    ? 'Sin coincidencias aceptadas aún'
                    : alert.matchCount === 1
                    ? '1 propiedad coincide'
                    : `${alert.matchCount} propiedades coinciden`}
                </span>
                <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de propiedad aceptada
// ---------------------------------------------------------------------------
function PropertyCard({ property, ownerAgency }) {
  const thumb = property.coverUrl || null;
  return (
    <Link to={`/propiedades/${property.id}`} className="matcheadas-property-card">
      <div className="matcheadas-property-thumb">
        {thumb
          ? <img src={thumb} alt={property.title} />
          : <Building2 size={28} aria-hidden="true" />}
      </div>
      <div className="matcheadas-property-info">
        <strong>{property.title}</strong>
        <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
        {(property.localidad || property.partido || property.zonaGeografica) && (
          <span className="matcheadas-property-loc">
            <MapPin size={12} aria-hidden="true" />
            {[property.localidad, property.partido, property.zonaGeografica].filter(Boolean).join(', ')}
          </span>
        )}
        <span className="muted small">Publicada por: {ownerAgency.name}</span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Detalle de alerta (propiedades aceptadas)
// ---------------------------------------------------------------------------
function AlertDetail({ alertId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api.get(`/matcheadas/${alertId}`).then(setData).catch(e => setError(e.message));
  }, [alertId]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { alert, properties } = data;

  if (!alert) return (
    <div className="card">
      <p className="muted">Alerta no encontrada.</p>
      <Link to="/matcheadas" className="btn btn-secondary" style={{ marginTop: 12 }}>← Volver</Link>
    </div>
  );

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Matcheadas</span>
          <h1>{alert.title || '(Sin título)'}</h1>
          <p className="subtitle">{summarizeAlert(alert)}</p>
        </div>
        <Link className="btn btn-secondary" to="/matcheadas">
          <ArrowLeft size={17} aria-hidden="true" /> Volver
        </Link>
      </section>

      <div className="card">
        {properties.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <Sparkles size={34} aria-hidden="true" />
            <h2>Sin coincidencias aceptadas aún</h2>
            <p>Cuando el dueño de una propiedad coincidente acepte tu solicitud, va a aparecer acá.</p>
          </div>
        ) : (
          <>
            <p className="muted small" style={{ marginBottom: 16 }}>
              {properties.length === 1
                ? '1 propiedad aceptó mostrarse para esta alerta.'
                : `${properties.length} propiedades aceptaron mostrarse para esta alerta.`}
            </p>
            <div className="matcheadas-property-list">
              {properties.map(({ property, ownerAgency }) => (
                <PropertyCard key={property.id} property={property} ownerAgency={ownerAgency} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function Matcheadas() {
  const { alertId } = useParams();
  return alertId ? <AlertDetail alertId={alertId} /> : <AlertsList />;
}
