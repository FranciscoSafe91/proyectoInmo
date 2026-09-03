import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { agency, stats } = data;

  return (
    <>
      <h1>Hola, {agency.name} 👋</h1>
      <p className="subtitle">Este es el estado de tu red compartida de propiedades.</p>

      <div className="grid grid-3">
        <div className="card stat-card">
          <div className="stat-number">{stats.myProperties}</div>
          <div className="stat-label">Propiedades propias</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number">{stats.sharedWithMe}</div>
          <div className="stat-label">Compartidas conmigo</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number">{stats.partners}</div>
          <div className="stat-label">Inmobiliarias socias</div>
        </div>
      </div>

      {(stats.pendingShares + stats.pendingPartnerships > 0) && (
        <div className="banner banner-info">
          Tenés <strong>{stats.pendingShares}</strong> propiedad(es) esperando tu aceptación y{' '}
          <strong>{stats.pendingPartnerships}</strong> solicitud(es) de sociedad pendientes.{' '}
          <Link to="/invitaciones">Ver invitaciones →</Link>
        </div>
      )}

      {stats.alertMatches > 0 && (
        <div className="banner banner-success">
          Un socio tiene una alerta que coincide con <strong>{stats.alertMatches}</strong> propiedad(es) tuya(s).{' '}
          <Link to="/alertas">Ver en Alertas →</Link>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3>Publicar una propiedad nueva</h3>
          <p className="muted">Cargá una propiedad y elegí con qué socios compartirla apenas la publicás.</p>
          <Link className="btn" to="/propiedades/nueva">+ Nueva propiedad</Link>
        </div>
        <div className="card">
          <h3>Sumar inmobiliarias socias</h3>
          <p className="muted">Buscá inmobiliarias y enviales una solicitud de sociedad para poder compartirles propiedades.</p>
          <Link className="btn btn-secondary" to="/socios">Buscar socios</Link>
        </div>
      </div>
    </>
  );
}
