import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatDate, formatARS } from '../utils.js';

const STATUS_LABELS = {
  trial: 'Prueba gratis', activa: 'Activa', vencida: 'Vencida',
  cancelada: 'Cancelada', sin_suscripcion: 'Sin suscripción',
};
const STATUS_BADGE_CLASS = {
  trial: 'badge-pendiente', activa: 'badge-aceptada', vencida: 'badge-rechazada',
  cancelada: 'badge-borrador', sin_suscripcion: 'badge-borrador',
};

export default function Subscription() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get('/suscripcion').then(setData).catch(e => setError(e.message));
  }, []);

  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await api.post('/suscripcion/pagar');
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        const fresh = await api.get('/suscripcion');
        setData(fresh);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  };

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { plan, subscription, status, payments, mpConfigured } = data;

  const statusLine =
    status === 'trial' ? <>Tu prueba gratis termina el <strong>{formatDate(subscription.trialEndsAt)}</strong>.</> :
    status === 'activa' ? <>Tu próximo pago es el <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.</> :
    status === 'vencida' ? 'Tu suscripción está vencida. Renovala para seguir usando todas las funciones sin interrupciones.' :
    'Tu suscripción está cancelada.';

  return (
    <>
      <h1>Mi suscripción</h1>
      <p className="subtitle">Así te cobramos el uso del sistema — un solo plan, sin letra chica.</p>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3>{plan.name} — {formatARS(plan.priceARS)} / mes</h3>
            <p className="muted">{statusLine}</p>
          </div>
          <span className={`badge ${STATUS_BADGE_CLASS[status]}`}>{STATUS_LABELS[status]}</span>
        </div>
        {status !== 'activa' && (
          <>
            <div className="btn-row">
              <button className="btn" onClick={handlePay} disabled={paying}>
                {paying ? 'Procesando...' : status === 'trial' ? 'Activar suscripción ahora' : 'Pagar y renovar'}
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              {mpConfigured
                ? 'Vas a ser redirigido a Mercado Pago para completar el pago.'
                : '⚠️ Mercado Pago todavía no está configurado en este servidor: este botón simula un pago aprobado, para poder probar el flujo completo. Ver el README para activar pagos reales.'}
            </p>
          </>
        )}
      </div>

      <div className="card">
        <h3>Historial de pagos</h3>
        {payments.length === 0 ? (
          <p className="muted">Todavía no hay pagos registrados.</p>
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
                    <td>
                      <span className={`badge badge-${p.status === 'aprobado' ? 'aceptada' : p.status === 'pendiente' ? 'pendiente' : 'rechazada'}`}>
                        {p.status}
                      </span>
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
