import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const STATUS_LABELS = {
  trial: 'Prueba gratis', activa: 'Activa', vencida: 'Vencida',
  cancelada: 'Cancelada', sin_suscripcion: 'Sin suscripción',
};
const STATUS_BADGE_CLASS = {
  trial: 'badge-pendiente', activa: 'badge-aceptada', vencida: 'badge-rechazada',
  cancelada: 'badge-borrador', sin_suscripcion: 'badge-borrador',
};

export default function SettingsHub() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/configuracion').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { agency, subscriptionStatus, teamSize, isPlatformAdmin } = data;

  return (
    <>
      <h1>Configuración</h1>
      <p className="subtitle">Todo lo relacionado a tu cuenta: marca, equipo, suscripción y soporte.</p>

      <div className="grid grid-2">
        <Link to="/mi-cuenta" className="card" style={{ display: 'block', color: 'inherit' }}>
          <h3>Mi cuenta</h3>
          <p className="muted small">Logo, color de marca y datos de contacto de {agency.name}.</p>
        </Link>

        <Link to="/equipo" className="card" style={{ display: 'block', color: 'inherit' }}>
          <h3>Mi equipo</h3>
          <p className="muted small">{teamSize} persona{teamSize === 1 ? '' : 's'} con acceso a esta cuenta. Invitá compañeros o agentes.</p>
        </Link>

        <Link to="/suscripcion" className="card" style={{ display: 'block', color: 'inherit' }}>
          <h3>Mi suscripción{' '}
            <span className={`badge ${STATUS_BADGE_CLASS[subscriptionStatus]}`}>{STATUS_LABELS[subscriptionStatus]}</span>
          </h3>
          <p className="muted small">Estado del plan mensual y pagos de {agency.name}.</p>
        </Link>

        <Link to="/soporte" className="card" style={{ display: 'block', color: 'inherit' }}>
          <h3>Soporte</h3>
          <p className="muted small">Enviá una consulta o revisá el estado de tus tickets.</p>
        </Link>

        {isPlatformAdmin && (
          <Link to="/admin" className="card" style={{ display: 'block', color: 'inherit' }}>
            <h3>Panel Safe Inmuebles</h3>
            <p className="muted small">Vista general de todas las inmobiliarias y su estado de pago.</p>
          </Link>
        )}
      </div>
    </>
  );
}
