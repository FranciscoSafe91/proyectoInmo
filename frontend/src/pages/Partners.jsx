import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function Partners() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback((query) => {
    api.get(`/socios?q=${encodeURIComponent(query)}`).then(setData).catch(e => setError(e.message));
  }, []);

  useEffect(() => { load(q); }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  async function handleSolicitar(agencyId) {
    await api.post(`/socios/${agencyId}/solicitar`);
    load(q);
  }

  if (error) return <div className="banner banner-error">{error}</div>;

  const results = data?.results || [];
  const partnerIds = new Set(data?.partnerIds || []);
  const sentPendingIds = new Set(data?.sentPendingIds || []);
  const receivedPendingIds = new Set(data?.receivedPendingIds || []);
  const currentPartners = data?.currentPartners || [];

  function accountTypeBadge(agency) {
    return agency.accountType === 'agente_independiente'
      ? <span className="badge badge-compartida">Agente independiente</span>
      : null;
  }

  function actionCell(a) {
    if (partnerIds.has(a.id)) return <span className="badge badge-aceptada">Socios</span>;
    if (sentPendingIds.has(a.id)) return <span className="badge badge-pendiente">Solicitud enviada</span>;
    if (receivedPendingIds.has(a.id)) return <Link className="btn btn-small" to="/invitaciones">Responder solicitud</Link>;
    return <button className="btn btn-small" onClick={() => handleSolicitar(a.id)}>Enviar solicitud de sociedad</button>;
  }

  return (
    <>
      <h1>Socios</h1>
      <p className="subtitle">Formá tu red de inmobiliarias socias. Una vez que sean socias, vas a poder compartirles propiedades puntuales.</p>

      <div className="card">
        <h3>Mis socios actuales</h3>
        {currentPartners.length === 0 ? (
          <p className="muted">Todavía no tenés inmobiliarias socias.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Inmobiliaria</th><th>Ciudad</th><th></th></tr></thead>
              <tbody>
                {currentPartners.map(a => (
                  <tr key={a.id}>
                    <td>{a.name} {accountTypeBadge(a)}</td>
                    <td>{a.city || '-'}</td>
                    <td><span className="badge badge-aceptada">Socios</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Buscar inmobiliarias</h3>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            name="q"
            placeholder="Buscar por nombre o ciudad..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </form>
        {!data ? (
          <p className="muted">Cargando...</p>
        ) : results.length === 0 ? (
          <div className="empty-state">No se encontraron inmobiliarias.</div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Inmobiliaria</th><th>Ciudad</th><th></th></tr></thead>
              <tbody>
                {results.map(a => (
                  <tr key={a.id}>
                    <td>{a.name} {accountTypeBadge(a)}</td>
                    <td>{a.city || '-'}</td>
                    <td>{actionCell(a)}</td>
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
