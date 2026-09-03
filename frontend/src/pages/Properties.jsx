import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function Properties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/propiedades').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { properties, sharesByProperty } = data;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1>Mis propiedades</h1>
        <Link className="btn" to="/propiedades/nueva">+ Nueva propiedad</Link>
      </div>
      <div className="card">
        {properties.length === 0 ? (
          <div className="empty-state">Todavía no cargaste propiedades. <Link to="/propiedades/nueva">Cargá la primera →</Link></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Propiedad</th>
                  <th>Tipo</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Compartida</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => {
                  const shares = sharesByProperty[p.id] || [];
                  const sharedCount = shares.filter(s => s.status !== 'rechazada').length;
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/propiedades/${p.id}`}>{p.title}</Link><br />
                        <span className="muted">{p.city}{p.city ? ', ' : ''}{p.province}</span>
                      </td>
                      <td>{typeLabel(p.type)} · {operationLabel(p.operation)}</td>
                      <td>{money(p.price, p.currency)}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td>
                        {sharedCount > 0
                          ? <span className="badge badge-compartida">compartida con {sharedCount}</span>
                          : <span className="muted">sin compartir</span>}
                      </td>
                      <td><Link to={`/propiedades/${p.id}`} className="btn btn-secondary btn-small">Gestionar</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
