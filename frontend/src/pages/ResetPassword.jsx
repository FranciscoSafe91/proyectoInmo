import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(''); // '' | 'loading' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) setStatus('error');
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      await api.post('/reset-password', { token, password });
      setStatus('ok');
    } catch (err) {
      setErrorMsg(err.data?.error || 'El enlace expiró o ya fue usado.');
      setStatus('error');
    }
  }

  if (!token || status === 'error') {
    return (
      <div className="auth-wrapper">
        <h1>Enlace inválido</h1>
        <div className="banner banner-error">
          {errorMsg || 'Este enlace de recuperación no es válido o ya expiró.'}
        </div>
        <p className="auth-switch"><Link to="/login">Volver al inicio de sesión</Link></p>
      </div>
    );
  }

  if (status === 'ok') {
    return (
      <div className="auth-wrapper">
        <h1>Contraseña actualizada</h1>
        <div className="banner banner-success">
          Tu contraseña fue restablecida correctamente. Ya podés ingresar con tu nueva contraseña.
        </div>
        <div className="btn-row" style={{ marginTop: 20 }}>
          <button className="btn" onClick={() => navigate('/login')}>Ir al inicio de sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <h1>Nueva contraseña</h1>
      <p style={{ color: '#667070', marginBottom: 20 }}>Ingresá tu nueva contraseña para recuperar el acceso.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="password">Nueva contraseña</label>
        <input
          type="password" id="password" required
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <label htmlFor="confirm">Confirmar contraseña</label>
        <input
          type="password" id="confirm" required
          placeholder="Repetí la contraseña"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
        />

        {errorMsg && (
          <div className="banner banner-error" style={{ marginTop: 10 }}>{errorMsg}</div>
        )}

        <div className="btn-row" style={{ marginTop: 18 }}>
          <button type="submit" className="btn" disabled={status === 'loading'}>
            {status === 'loading' ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </div>
      </form>

      <p className="auth-switch"><Link to="/login">Volver al inicio de sesión</Link></p>
    </div>
  );
}
