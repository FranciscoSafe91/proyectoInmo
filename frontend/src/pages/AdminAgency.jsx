import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
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

export default function AdminAgency() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const load = () => api.get(`/admin/inmobiliarias/${id}`).then(setData).catch(e => setError(e.message));
  useEffect(() => { load(); }, [id]);

  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      await api.post(`/admin/inmobiliarias/${id}/marcar-pagado`);
      load();
    } catch (e) { setError(e.message); }
    finally { setMarking(false); }
  };

  if (error) return <><p><Link to="/admin">← Volver al panel</Link></p><div className="banner banner-error">{error}</div></>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { agency, subscription, status, users, payments } = data;

  return (
    <>
      <p><Link to="/admin">← Volver al panel</Link></p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>{agency.name}</h1>
          <p className="subtitle">{accountTypeLabel(agency.accountType)} · {agency.city || '-'} · {agency.email}</p>
        </div>
        <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABELS[status]}</span>
      </div>

      <div className="card">
        <h3>Suscripción</h3>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><th>Estado</th><td><span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABELS[status]}</span></td></tr>
              <tr><th>Fin de prueba</th><td>{formatDate(subscription.trialEndsAt)}</td></tr>
              <tr><th>Próximo vencimiento</th><td>{formatDate(subscription.currentPeriodEnd)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="btn-row">
          <button className="btn btn-small" onClick={handleMarkPaid} disabled={marking}>
            {marking ? 'Procesando...' : 'Marcar como pagado (efectivo/transferencia)'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Usuarios</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Historial de pagos</h3>
        {payments.length === 0 ? (
          <p className="muted">Sin pagos todavía.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Estado</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>{formatARS(p.amount)}</td>
                    <td>{p.method}</td>
                    <td>{p.status}</td>
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
