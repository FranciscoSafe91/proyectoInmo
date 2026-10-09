import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

// Agrupa el secreto en bloques de 4 para que sea fácil de tipear en la app.
function formatSecret(secret) {
  return (secret || '').match(/.{1,4}/g)?.join(' ') || '';
}

export default function Security() {
  const { refresh } = useAuth();
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState('idle'); // idle | password | scan | codes | disable
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null); // { secret, otpauthUrl }
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/seguridad/2fa').then(setState).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const reset = () => { setStep('idle'); setPassword(''); setCode(''); setSetup(null); setError(''); };

  async function run(fn) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const startSetup = (e) => { e.preventDefault(); run(async () => {
    const data = await api.post('/seguridad/2fa/iniciar', { password });
    setSetup(data); setPassword(''); setStep('scan');
  }); };

  const confirmSetup = (e) => { e.preventDefault(); run(async () => {
    const data = await api.post('/seguridad/2fa/activar', { code });
    setRecoveryCodes(data.recoveryCodes); setCode(''); setStep('codes');
    await load(); refresh();
  }); };

  const disable = (e) => { e.preventDefault(); run(async () => {
    await api.post('/seguridad/2fa/desactivar', { password, code });
    reset(); await load(); refresh();
  }); };

  if (!state) return error ? <div className="banner banner-error">{error}</div> : <p className="muted">Cargando...</p>;

  return (
    <>
      <h1>Seguridad</h1>
      <p className="subtitle">Protegé tu cuenta con verificación en dos pasos.</p>

      <div className="card">
        <h3>Verificación en dos pasos{' '}
          <span className={`badge ${state.enabled ? 'badge-aceptada' : 'badge-borrador'}`}>{state.enabled ? 'Activa' : 'Inactiva'}</span>
        </h3>
        <p className="muted">
          Además de tu contraseña, al ingresar te vamos a pedir un código de 6 dígitos que genera una app en tu teléfono
          (Google Authenticator, Microsoft Authenticator, Authy). Así, aunque alguien consiga tu contraseña, no puede entrar.
          Recomendado para administradores de la cuenta.
        </p>
        {error && <div className="banner banner-error">{error}</div>}

        {step === 'idle' && !state.enabled && (
          <div className="btn-row"><button className="btn" onClick={() => setStep('password')}>Activar</button></div>
        )}
        {step === 'idle' && state.enabled && (
          <>
            <p className="small muted">Te quedan {state.recoveryCodesRemaining} códigos de recuperación sin usar.</p>
            <div className="btn-row"><button className="btn btn-secondary" onClick={() => setStep('disable')}>Desactivar</button></div>
          </>
        )}

        {step === 'password' && (
          <form onSubmit={startSetup}>
            <label htmlFor="sec-password">Confirmá tu contraseña</label>
            <input type="password" id="sec-password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="btn-row">
              <button className="btn" disabled={busy}>Continuar</button>
              <button type="button" className="btn btn-secondary" onClick={reset}>Cancelar</button>
            </div>
          </form>
        )}

        {step === 'scan' && setup && (
          <form onSubmit={confirmSetup}>
            <ol className="small" style={{ paddingLeft: 18 }}>
              <li>Abrí tu app autenticadora y elegí <strong>Agregar cuenta → Ingresar clave de configuración</strong>.</li>
              <li>Nombre de la cuenta: <strong>SpyderConnect</strong>. Tipo: <strong>basada en tiempo</strong>.</li>
              <li>Clave:</li>
            </ol>
            <p style={{ fontFamily: 'monospace', fontSize: '1.15rem', letterSpacing: 1, userSelect: 'all', margin: '8px 0 12px' }}>
              {formatSecret(setup.secret)}
            </p>
            <p className="small muted">
              Si estás en el teléfono, también podés <a href={setup.otpauthUrl}>abrir directamente la app autenticadora</a>.
            </p>
            <label htmlFor="sec-code">Código de 6 dígitos que muestra la app</label>
            <input id="sec-code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value)} />
            <div className="btn-row">
              <button className="btn" disabled={busy}>Activar</button>
              <button type="button" className="btn btn-secondary" onClick={reset}>Cancelar</button>
            </div>
          </form>
        )}

        {step === 'codes' && (
          <>
            <div className="banner banner-success">¡Listo! La verificación en dos pasos quedó activa.</div>
            <p><strong>Guardá estos códigos de recuperación en un lugar seguro.</strong> Cada uno sirve una sola vez para ingresar si perdés el teléfono. No los vas a poder ver de nuevo.</p>
            <pre style={{ background: 'var(--surface-2, #f4f6f5)', padding: 12, borderRadius: 8, columns: 2 }}>{recoveryCodes.join('\n')}</pre>
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(recoveryCodes.join('\n'))}>Copiar</button>
              <button className="btn" onClick={() => { setRecoveryCodes([]); reset(); }}>Ya los guardé</button>
            </div>
          </>
        )}

        {step === 'disable' && (
          <form onSubmit={disable}>
            <label htmlFor="dis-password">Contraseña</label>
            <input type="password" id="dis-password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            <label htmlFor="dis-code">Código de la app (o un código de recuperación)</label>
            <input id="dis-code" required autoComplete="one-time-code" maxLength={11} value={code} onChange={e => setCode(e.target.value)} />
            <div className="btn-row">
              <button className="btn btn-danger" disabled={busy}>Desactivar</button>
              <button type="button" className="btn btn-secondary" onClick={reset}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      <p className="small muted"><Link to="/configuracion">← Volver a configuración</Link></p>
    </>
  );
}
