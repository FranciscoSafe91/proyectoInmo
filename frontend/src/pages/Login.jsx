import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api.js';

export default function Login() {
  const { login, loginSecondFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state?.registered === true;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Segundo paso (verificación en dos pasos)
  const [ticket, setTicket] = useState(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Modal "Olvidé mi contraseña"
  const [showModal, setShowModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState(''); // 'ok' | 'error' | ''
  const [recoverySending, setRecoverySending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await login(email, password);
      if (data.requires2fa) { setTicket(data.ticket); setCode(''); return; }
      navigate('/dashboard');
    } catch (err) {
      setError(err.data?.error || 'Email o contraseña incorrectos.');
    }
  }

  async function handleSecondFactor(e) {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      await loginSecondFactor(ticket, code);
      navigate('/dashboard');
    } catch (err) {
      setError(err.data?.error || 'El código no es correcto.');
      // Ticket vencido o agotado: hay que volver a poner la contraseña.
      if (err.status === 401 && /expir/i.test(err.data?.error || '') || err.status === 429) setTicket(null);
    } finally {
      setVerifying(false);
    }
  }

  if (ticket) {
    return (
      <div className="auth-wrapper">
        <h1>Verificación en dos pasos</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Ingresá el código de 6 dígitos de tu app autenticadora. Si perdiste el teléfono, usá uno de tus códigos de recuperación.
        </p>
        {error && <div className="banner banner-error">{error}</div>}
        <form onSubmit={handleSecondFactor}>
          <label htmlFor="code">Código</label>
          <input
            id="code" name="code" required autoFocus autoComplete="one-time-code" inputMode="text"
            maxLength={11} placeholder="123456"
            value={code} onChange={e => setCode(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit" className="btn" disabled={verifying}>{verifying ? 'Verificando...' : 'Verificar'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setTicket(null); setError(''); }}>Volver</button>
          </div>
        </form>
      </div>
    );
  }

  function openModal() {
    setRecoveryEmail(email); // pre-llenar con lo que ya escribió
    setRecoveryStatus('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setRecoveryStatus('');
    setRecoveryEmail('');
  }

  async function handleRecovery(e) {
    e.preventDefault();
    setRecoverySending(true);
    setRecoveryStatus('');
    try {
      await api.post('/forgot-password', { email: recoveryEmail });
      setRecoveryStatus('ok');
    } catch {
      setRecoveryStatus('error');
    } finally {
      setRecoverySending(false);
    }
  }

  return (
    <>
      <div className="auth-wrapper">
        <h1>Ingresar</h1>

        {justRegistered && (
          <div className="banner banner-success">
            ¡Cuenta creada con éxito! Ingresá con tu email y contraseña.
          </div>
        )}

        {error && (
          <div className="banner banner-error">
            {error}
            <br />
            <button
              type="button"
              onClick={openModal}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#c0392b', textDecoration: 'underline',
                cursor: 'pointer', marginTop: 6, fontSize: '0.9rem',
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            type="email" id="email" name="email" required
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <label htmlFor="password">Contraseña</label>
          <input
            type="password" id="password" name="password" required
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <div className="btn-row">
            <button type="submit" className="btn">Ingresar</button>
          </div>
        </form>

        <p className="auth-switch">¿No tenés cuenta? <Link to="/registro">Registrá tu inmobiliaria</Link></p>
      </div>

      {/* ── Modal recuperar contraseña ── */}
      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 10,
              padding: '28px 28px 24px',
              width: '100%', maxWidth: 400,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem' }}>Recuperar contraseña</h2>
            <p style={{ color: '#667070', fontSize: '0.9rem', margin: '0 0 18px' }}>
              Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
            </p>

            {recoveryStatus === 'ok' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✅</div>
                <p style={{ fontWeight: 600, color: '#1f7a4d', margin: 0 }}>
                  ¡Email enviado!
                </p>
                <p style={{ color: '#667070', fontSize: '0.88rem', marginTop: 6 }}>
                  Si ese email está registrado, vas a recibir un enlace para restablecer tu contraseña. Revisá también la carpeta de spam.
                </p>
                <button className="btn" style={{ marginTop: 18 }} onClick={closeModal}>
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery}>
                <label htmlFor="recoveryEmail">Email</label>
                <input
                  type="email" id="recoveryEmail" required
                  placeholder="tu@email.com"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                />

                {recoveryStatus === 'error' && (
                  <div className="banner banner-error" style={{ marginTop: 10 }}>
                    Ese email no está registrado.
                  </div>
                )}

                <div className="btn-row" style={{ marginTop: 18 }}>
                  <button type="submit" className="btn" disabled={recoverySending}>
                    {recoverySending ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
