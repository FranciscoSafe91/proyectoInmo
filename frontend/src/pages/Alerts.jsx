import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

function summarizeAlert(alert) {
  const parts = [];
  if (alert.operation) parts.push(operationLabel(alert.operation));
  if (alert.type) parts.push(typeLabel(alert.type));
  if (alert.city) parts.push(`en ${alert.city}`);
  if (alert.minBedrooms) parts.push(`${alert.minBedrooms}+ dorm.`);
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
  const [newAlert, setNewAlert] = useState({
    title: '', operation: '', type: '', city: '', currency: '', minPrice: '', maxPrice: '', minBedrooms: '',
  });

  function load() {
    api.get('/alertas').then(setData).catch(e => setError(e.message));
  }
  useEffect(load, []);

  function handleChange(e) {
    setNewAlert(v => ({ ...v, [e.target.name]: e.target.value }));
  }

  async function handleCreateAlert(e) {
    e.preventDefault();
    await api.post('/alertas', newAlert);
    setNewAlert({ title: '', operation: '', type: '', city: '', currency: '', minPrice: '', maxPrice: '', minBedrooms: '' });
    load();
  }

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
      <h1>Alertas de búsqueda</h1>
      <p className="subtitle">Creá una alerta cuando busques algo puntual que no tenés ni vos ni tus socios. En cuanto alguno de tus socios tenga (o cargue) algo compatible, se lo vas a poder pedir compartir al instante.</p>

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
        <h3>Crear una alerta</h3>
        {!hasPartners && (
          <p className="muted">Todavía no tenés inmobiliarias socias — las alertas solo avisan sobre la red de socios. <Link to="/socios">Sumá socios primero →</Link></p>
        )}
        <form onSubmit={handleCreateAlert}>
          <label htmlFor="title">Título (para identificarla, opcional)</label>
          <input type="text" id="title" name="title" value={newAlert.title} onChange={handleChange} placeholder="Ej: Depto 2 amb en Nueva Córdoba para cliente urgente" />

          <div className="grid grid-2">
            <div>
              <label htmlFor="operation">Operación</label>
              <select id="operation" name="operation" value={newAlert.operation} onChange={handleChange}>
                <option value="">Cualquiera</option>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
            </div>
            <div>
              <label htmlFor="type">Tipo de propiedad</label>
              <select id="type" name="type" value={newAlert.type} onChange={handleChange}>
                <option value="">Cualquiera</option>
                <option value="casa">Casa</option>
                <option value="departamento">Departamento</option>
                <option value="terreno">Terreno</option>
                <option value="local">Local comercial</option>
                <option value="oficina">Oficina</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <label htmlFor="city">Ciudad / zona</label>
          <input type="text" id="city" name="city" value={newAlert.city} onChange={handleChange} placeholder="Ej: Nueva Córdoba" />

          <div className="grid grid-3">
            <div>
              <label htmlFor="currency">Moneda</label>
              <select id="currency" name="currency" value={newAlert.currency} onChange={handleChange}>
                <option value="">Sin filtro de precio</option>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label htmlFor="minPrice">Precio mínimo</label>
              <input type="number" id="minPrice" name="minPrice" min="0" value={newAlert.minPrice} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="maxPrice">Precio máximo</label>
              <input type="number" id="maxPrice" name="maxPrice" min="0" value={newAlert.maxPrice} onChange={handleChange} />
            </div>
          </div>

          <label htmlFor="minBedrooms">Dormitorios mínimos</label>
          <input type="number" id="minBedrooms" name="minBedrooms" min="0" value={newAlert.minBedrooms} onChange={handleChange} style={{ maxWidth: 160 }} />

          <div className="btn-row">
            <button type="submit" className="btn">Crear alerta</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Mis alertas</h3>
        {alerts.length === 0 ? (
          <p className="muted">Todavía no creaste ninguna alerta.</p>
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
