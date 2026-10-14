import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, Building2, Check, MapPin, Send, Sparkles, X } from 'lucide-react';
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
// Matches recibidos: solicitudes de aceptar / rechazar
// ---------------------------------------------------------------------------
function sortByPrice(items, key = 'price') {
  return [...items].sort((a, b) => (Number(b.property[key]) || 0) - (Number(a.property[key]) || 0));
}

function MatchRequestsReceived() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState({});
  const [sortBy, setSortBy] = useState('recientes');
  const [acceptModal, setAcceptModal] = useState(null);
  const [acceptComment, setAcceptComment] = useState('');
  const [acceptPctVendedor, setAcceptPctVendedor] = useState('');
  const [acceptPctComprador, setAcceptPctComprador] = useState('');
  const [acceptTodaBolsa, setAcceptTodaBolsa] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const load = () => {
    api.get('/match-requests').then(setData).catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const respond = async (id, action) => {
    if (action === 'aceptar') {
      setAcceptModal({ id });
      setAcceptComment('');
      setAcceptPctVendedor('');
      setAcceptPctComprador('');
      setAcceptTodaBolsa(false);
      return;
    }
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

  const handleConfirmAccept = async () => {
    if (!acceptModal) return;
    setAccepting(true);
    try {
      await api.post(`/match-requests/${acceptModal.id}/aceptar`, {
        comment: acceptComment,
        percentageVendedor: acceptTodaBolsa ? null : (acceptPctVendedor !== '' ? Number(acceptPctVendedor) : null),
        percentageComprador: acceptTodaBolsa ? null : (acceptPctComprador !== '' ? Number(acceptPctComprador) : null),
        todaBolsa: acceptTodaBolsa,
      });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAccepting(false);
      setAcceptModal(null);
      setAcceptComment('');
      setAcceptPctVendedor('');
      setAcceptPctComprador('');
      setAcceptTodaBolsa(false);
    }
  };

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  if (data.items.length === 0) {
    return (
      <div className="card" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state" style={{ padding: '24px 16px' }}>
          <Bell size={34} aria-hidden="true" />
          <h2>Sin alertas recibidas pendientes</h2>
          <p>Cuando un socio busque algo y una de tus propiedades coincida, aparecerá acá para que puedas aceptar o rechazar.</p>
        </div>
      </div>
    );
  }

  const displayItems = sortBy === 'precio_desc' ? sortByPrice(data.items) : data.items;

  return (
    <>
      {acceptModal && (
        <div className="modal-backdrop" onClick={() => setAcceptModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Aceptar solicitud de match</h3>
            <p className="muted small" style={{ marginBottom: 14 }}>Establecé los porcentajes de la operación y dejá un comentario opcional.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="sf-label" style={{ display: 'block', marginBottom: 4 }}>Del vendedor (%)</label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  placeholder="Ej: 3"
                  value={acceptPctVendedor}
                  onChange={e => setAcceptPctVendedor(e.target.value)}
                  disabled={acceptTodaBolsa}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="sf-label" style={{ display: 'block', marginBottom: 4 }}>Del comprador (%)</label>
                <input
                  type="number" min="0" max="100" step="0.1"
                  placeholder="Ej: 3"
                  value={acceptPctComprador}
                  onChange={e => setAcceptPctComprador(e.target.value)}
                  disabled={acceptTodaBolsa}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 4, gap: 4 }}>
                <label className="sf-check" style={{ whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={acceptTodaBolsa} onChange={e => setAcceptTodaBolsa(e.target.checked)} />
                  Toda la bolsa
                </label>
              </div>
            </div>
            <textarea
              rows={3}
              placeholder="Comentarios (opcional)"
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
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p className="muted small" style={{ margin: 0 }}>
          Aceptá para permitirles ver tu propiedad, o rechazá si no querés compartirla.
        </p>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
          <option value="recientes">Más recientes</option>
          <option value="precio_desc">Mayor precio</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {displayItems.map(({ matchRequest, property, alert, alertAgency }) => (
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de propiedad aceptada (detalle de alerta)
// ---------------------------------------------------------------------------
function PropertyCard({ property, ownerAgency, ownerComment, percentageVendedor, percentageComprador, todaBolsa }) {
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
        {(todaBolsa || percentageVendedor != null || percentageComprador != null) && (
          <div style={{ marginTop: 5, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.84rem' }}>
            {todaBolsa
              ? <span style={{ fontWeight: 600, color: 'var(--app-primary)' }}>Toda la bolsa</span>
              : <>
                  {percentageVendedor != null && <span style={{ background: 'var(--app-green-soft, #e6f7f0)', borderRadius: 4, padding: '2px 8px' }}>Vend. <strong>{percentageVendedor}%</strong></span>}
                  {percentageComprador != null && <span style={{ background: 'var(--app-green-soft, #e6f7f0)', borderRadius: 4, padding: '2px 8px' }}>Comp. <strong>{percentageComprador}%</strong></span>}
                </>
            }
          </div>
        )}
        {ownerComment && (
          <div style={{ marginTop: 6, background: 'var(--app-surface, #f5f5f5)', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600 }}>Comentario del socio:</span> {ownerComment}
          </div>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Detalle de alerta (propiedades aceptadas)
// ---------------------------------------------------------------------------
function getPctTotal(item) {
  if (item.todaBolsa) return 100;
  return (item.percentageVendedor || 0) + (item.percentageComprador || 0);
}

function AlertDetail({ alertId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sortByPct, setSortByPct] = useState('desc');
  const [sortByPrice, setSortByPrice] = useState('desc');

  useEffect(() => {
    setData(null);
    api.get(`/matcheadas/${alertId}`).then(setData).catch(e => setError(e.message));
  }, [alertId]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { alert, properties } = data;

  const displayProperties = [...properties].sort((a, b) => {
    const pctCmp = sortByPct === 'asc'
      ? getPctTotal(a) - getPctTotal(b)
      : getPctTotal(b) - getPctTotal(a);
    if (pctCmp !== 0) return pctCmp;
    const priceA = Number(a.property.price) || 0;
    const priceB = Number(b.property.price) || 0;
    return sortByPrice === 'asc' ? priceA - priceB : priceB - priceA;
  });

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
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <p className="muted small" style={{ margin: 0, flex: '1 1 auto' }}>
                {displayProperties.length === 1
                  ? '1 propiedad aceptó mostrarse para esta alerta.'
                  : `${displayProperties.length} propiedades aceptaron mostrarse para esta alerta.`}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={sortByPct} onChange={e => setSortByPct(e.target.value)} className="sort-select">
                  <option value="desc">Porcentaje compartido: mayor a menor</option>
                  <option value="asc">Porcentaje compartido: menor a mayor</option>
                </select>
                <select value={sortByPrice} onChange={e => setSortByPrice(e.target.value)} className="sort-select">
                  <option value="desc">Valor de la propiedad: mayor a menor</option>
                  <option value="asc">Valor de la propiedad: menor a mayor</option>
                </select>
              </div>
            </div>
            <div className="matcheadas-property-list">
              {displayProperties.map(({ property, ownerAgency, ownerComment, percentageVendedor, percentageComprador, todaBolsa }) => (
                <PropertyCard key={property.id} property={property} ownerAgency={ownerAgency} ownerComment={ownerComment}
                  percentageVendedor={percentageVendedor} percentageComprador={percentageComprador} todaBolsa={todaBolsa} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Matches aceptados por Agency B (sección "Matcheadas" del propietario)
// ---------------------------------------------------------------------------
function MatcheadasRecibidas() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('recientes');
  const [canceling, setCanceling] = useState({});
  const [confirmCancel, setConfirmCancel] = useState(null);

  function load() {
    api.get('/match-requests/accepted').then(setData).catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(matchRequestId) {
    setCanceling(s => ({ ...s, [matchRequestId]: true }));
    try {
      await api.delete(`/match-requests/${matchRequestId}`);
      setConfirmCancel(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCanceling(s => ({ ...s, [matchRequestId]: false }));
    }
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;
  if (data.items.length === 0) return null;

  const displayItems = sortBy === 'precio_desc' ? sortByPrice(data.items) : data.items;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      {confirmCancel && (
        <div className="modal-backdrop" onClick={() => setConfirmCancel(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>¿Dejar de compartir?</h3>
            <p className="muted">Esto retirará el acceso de <strong>{confirmCancel.agencyName}</strong> a tu propiedad <strong>"{confirmCancel.propertyTitle}"</strong>. Esta acción no se puede deshacer.</p>
            <div className="btn-row">
              <button className="btn btn-danger" onClick={() => handleCancel(confirmCancel.id)} disabled={canceling[confirmCancel.id]}>
                {canceling[confirmCancel.id] ? 'Cancelando...' : 'Sí, dejar de compartir'}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmCancel(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} />
          <strong>Matcheadas</strong>
          <span className="badge" style={{ background: '#059669', color: '#fff', borderRadius: 99, padding: '2px 8px', fontSize: 12 }}>
            {data.items.length}
          </span>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
          <option value="recientes">Más recientes</option>
          <option value="precio_desc">Mayor precio</option>
        </select>
      </div>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Propiedades tuyas que ya fueron aceptadas como coincidencia con una búsqueda de un socio.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayItems.map(({ matchRequest, property, alert, alertAgency }) => (
          <div key={matchRequest.id} className="match-request-item">
            <Link to={`/propiedades/${property.id}`} className="match-request-thumb" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              {property.coverUrl
                ? <img src={property.coverUrl} alt={property.title} />
                : <Building2 size={22} aria-hidden="true" />}
            </Link>
            <div className="match-request-info">
              <Link to={`/propiedades/${property.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'underline' }}>{property.title}</Link>
              <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
              <span className="muted small" style={{ marginTop: 2 }}>
                <strong>{alertAgency.name}</strong> busca: {alert.title || summarizeAlert(alert)}
              </span>
            </div>
            <div className="match-request-actions">
              <Link to={`/propiedades/${property.id}`} className="btn btn-secondary btn-sm">Ver</Link>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => setConfirmCancel({ id: matchRequest.id, agencyName: alertAgency.name, propertyTitle: property.title })}
                disabled={canceling[matchRequest.id]}
              >
                Dejar de compartir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista principal: dos columnas
// ---------------------------------------------------------------------------
function MatcheadasList() {
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
          <p className="subtitle">Propiedades de toda la red que coinciden con las alertas que creaste, y solicitudes de match que recibiste.</p>
        </div>
        <Link className="btn" to="/alertas/nueva">
          <Sparkles size={17} aria-hidden="true" /> Nueva alerta
        </Link>
      </section>

      <div className="page-two-col">

        {/* ── Columna izquierda: Matches enviados ── */}
        <div>
          <h2 className="page-col-heading">
            <Send size={17} aria-hidden="true" /> Matches enviados
          </h2>

          {alerts.length === 0 ? (
            <div className="card" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <Bell size={38} aria-hidden="true" />
                <h2>Todavía no creaste ninguna alerta</h2>
                <p>Creá una alerta para buscar propiedades en toda la red y ver los resultados acá.</p>
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
        </div>

        {/* ── Columna derecha: Alertas que coinciden ── */}
        <div>
          <h2 className="page-col-heading">
            <Bell size={17} aria-hidden="true" /> Alertas que coinciden
          </h2>
          <MatchRequestsReceived />
          <MatcheadasRecibidas />
        </div>

      </div>
    </>
  );
}

export default function Matcheadas() {
  const { alertId } = useParams();
  return alertId ? <AlertDetail alertId={alertId} /> : <MatcheadasList />;
}
