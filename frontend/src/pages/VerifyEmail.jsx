import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { session, refresh } = useAuth();
  const [status, setStatus] = useState(token ? 'loading' : 'error'); // loading | ok | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    api.post('/verificar-email', { token })
      .then(() => { setStatus('ok'); if (session) refresh(); })
      .catch(err => { setErrorMsg(err.data?.error || 'El enlace expiró o ya fue usado.'); setStatus('error'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const next = session ? { to: '/suscripcion', label: 'Ir a mi suscripción' } : { to: '/login', label: 'Ir al inicio de sesión' };

  if (status === 'loading') {
    return <div className="auth-wrapper"><p className="muted">Confirmando tu email...</p></div>;
  }

  if (status === 'ok') {
    return (
      <div className="auth-wrapper">
        <h1>Email confirmado</h1>
        <div className="banner banner-success">Listo, tu email quedó verificado.</div>
        <p className="auth-switch"><Link to={next.to}>{next.label}</Link></p>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <h1>Enlace inválido</h1>
      <div className="banner banner-error">
        {errorMsg || 'Este enlace de verificación no es válido.'} Podés pedir uno nuevo desde "Mi suscripción".
      </div>
      <p className="auth-switch"><Link to={next.to}>{next.label}</Link></p>
    </div>
  );
}
