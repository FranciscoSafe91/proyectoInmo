import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDate, formatARS, accountTypeLabel } from '../utils.js';

const STATUS_LABELS = {
  trial: 'Prueba gratis', activa: 'Activa', vencida: 'Vencida',
  cancelada: 'Cancelada', sin_suscripcion: 'Sin suscripción',
};
const STATUS_BADGE_CLASS = {
  trial: 'badge-pendiente', activa: 'badge-aceptada', vencida: 'badge-rechazada',
  cancelada: 'badge-borrador', sin_suscripcion: 'badge-borrador',
};

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin').then(setData).catch(e => setError(e.message || 'No tenés acceso al panel de administración.'));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { rows, plan, openTicketsCount } = data;
  const counts = { trial: 0, activa: 0, vencida: 0, cancelada: 0 };
  rows.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  const mrr = counts.activa * plan.priceARS;

  return (
    <>
      <h1>Panel Safe Inmuebles</h1>
      <p className="subtitle">Vista general de todas las inmobiliarias registradas y su estado de pago.</p>

      <div className="grid grid-3">
        <div className="card stat-card"><div className="stat-number">{rows.length}</div><div className="stat-label">Inmobiliarias totales</div></div>
        <div className="card stat-card"><div className="stat-number">{counts.activa}</div><div className="stat-label">Suscripciones activas</div></div>
        <div className="card stat-card"><div className="stat-number">{formatARS(mrr)}</div><div className="stat-label">Ingreso mensual estimado</div></div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3>Tickets de soporte</h3>
            <p className="muted">{openTicketsCount > 0 ? `${openTicketsCount} consulta${openTicketsCount === 1 ? '' : 's'} sin responder` : 'No hay consultas abiertas.'}</p>
          </div>
          <Link to="/admin/soporte" className={`btn ${openTicketsCount > 0 ? '' : 'btn-secondary'} btn-small`}>Ver tickets</Link>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Plan</h3>
          <Link to="/admin/plan" className="btn btn-secondary btn-small">Editar plan y precio</Link>
        </div>
        <p className="muted">{plan.name} — {formatARS(plan.priceARS)} / mes</p>
      </div>

      <div className="card">
        <h3>Inmobiliarias ({counts.trial} en prueba, {counts.vencida} vencidas)</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Inmobiliaria</th><th>Estado</th><th>Fecha clave</th><th></th></tr></thead>
            <tbody>
              {rows.map(({ agency, subscription, status }) => (
                <tr key={agency.id}>
                  <td>
                    <Link to={`/admin/inmobiliarias/${agency.id}`}>{agency.name}</Link><br />
                    <span className="muted small">{accountTypeLabel(agency.accountType)} · {agency.city || '-'}</span>
                  </td>
                  <td><span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABELS[status]}</span></td>
                  <td>{status === 'trial' ? formatDate(subscription.trialEndsAt) : formatDate(subscription && subscription.currentPeriodEnd)}</td>
                  <td><Link to={`/admin/inmobiliarias/${agency.id}`} className="btn btn-secondary btn-small">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
