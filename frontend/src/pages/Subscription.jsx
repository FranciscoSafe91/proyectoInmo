import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDate, formatDateTime, formatARS } from '../utils.js';

const ACTIVITY_LABELS = {
  'pago.acreditado': 'Pago acreditado',
  'pago.revertido': 'Pago revertido',
  'pago.manual_admin': 'Pago registrado por administración',
  'suscripcion.checkout_iniciado': 'Inicio de pago en Mercado Pago',
  'tarjeta.cambiada': 'Tarjeta cambiada',
  'tarjeta.cambio_rechazado': 'Cambio de tarjeta rechazado',
  'tarjeta.reautenticacion_fallida': 'Contraseña incorrecta al cambiar tarjeta',
  'contraseña.reseteada': 'Contraseña restablecida',
  'email.verificado': 'Email verificado',
  'mi_web.api_key_regenerada': 'Clave del widget regenerada',
  'equipo.invitacion_creada': 'Invitación al equipo creada',
  'equipo.invitacion_aceptada': 'Invitación al equipo aceptada',
  'equipo.rol_cambiado': 'Rol de usuario cambiado',
  'equipo.usuario_eliminado': 'Usuario eliminado',
  'equipo.permisos_cambiados': 'Permisos de usuario cambiados',
  'cuenta.registrada': 'Cuenta creada',
  '2fa.activado': 'Verificación en dos pasos activada',
  '2fa.desactivado': 'Verificación en dos pasos desactivada',
  '2fa.login': 'Ingreso con verificación en dos pasos',
  '2fa.login_con_codigo_recuperacion': 'Ingreso con código de recuperación',
  '2fa.codigo_incorrecto': 'Código de verificación incorrecto',
};

const MP_SDK_URL = 'https://sdk.mercadopago.com/js/v2';

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MP_SDK_URL}"]`);
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Mercado Pago.')));
    if (!existing) { script.src = MP_SDK_URL; document.body.appendChild(script); }
  });
}

// Formulario de tarjeta de Mercado Pago (Card Payment Brick). Los campos de la
// tarjeta son iframes de Mercado Pago: nuestro código nunca ve el número ni el
// CVV, solo recibe un token de un solo uso que se manda al backend.
function CardChange({ publicKey, amount, needsCode, onDone, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const passwordRef = useRef('');
  passwordRef.current = password;
  const codeRef = useRef('');
  codeRef.current = code;

  useEffect(() => {
    let controller = null;
    let cancelled = false;
    loadMercadoPagoSdk()
      .then(async () => {
        if (cancelled) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'es-AR' });
        controller = await mp.bricks().create('cardPayment', 'cardPaymentBrick_container', {
          initialization: { amount: Number(amount) || 1 },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: 1 },
            visual: { texts: { formSubmit: 'Guardar tarjeta' } },
          },
          callbacks: {
            onReady: () => setReady(true),
            onError: () => setError('Hubo un problema con el formulario de Mercado Pago. Revisá los datos.'),
            onSubmit: (formData) => {
              setError('');
              if (!passwordRef.current) {
                setError('Ingresá tu contraseña para confirmar el cambio.');
                return Promise.reject(new Error('sin contraseña'));
              }
              return api.post('/suscripcion/tarjeta', {
                token: formData.token,
                paymentMethodId: formData.payment_method_id,
                password: passwordRef.current,
                code: codeRef.current,
              })
                .then(() => onDone())
                .catch(e => { setError(e.message); throw e; });
            },
          },
        });
        if (cancelled && controller) controller.unmount();
      })
      .catch(e => setError(e.message));
    return () => { cancelled = true; if (controller) controller.unmount(); };
  }, [publicKey, amount]);

  return (
    <div style={{ marginTop: 16 }}>
      <label htmlFor="reauth-password">Tu contraseña de SpyderConnect</label>
      <input
        type="password" id="reauth-password" autoComplete="current-password"
        placeholder="Para confirmar que sos vos"
        value={password} onChange={e => setPassword(e.target.value)}
      />
      {needsCode && (
        <>
          <label htmlFor="reauth-code">Código de tu app autenticadora</label>
          <input id="reauth-code" autoComplete="one-time-code" maxLength={11} value={code} onChange={e => setCode(e.target.value)} />
        </>
      )}
      {!ready && !error && <p className="muted small">Cargando formulario seguro de Mercado Pago...</p>}
      <div id="cardPaymentBrick_container" />
      {error && <div className="banner banner-error" style={{ marginTop: 10 }}>{error}</div>}
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn btn-secondary btn-small" onClick={onCancel}>Cancelar</button>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        Los datos de la tarjeta se cargan directamente en Mercado Pago. SpyderConnect no los ve ni los guarda.
      </p>
    </div>
  );
}

const STATUS_LABELS = {
  trial: 'Prueba gratis', activa: 'Activa', vencida: 'Vencida',
  cancelada: 'Cancelada', sin_suscripcion: 'Sin suscripción',
};
const STATUS_BADGE_CLASS = {
  trial: 'badge-pendiente', activa: 'badge-aceptada', vencida: 'badge-rechazada',
  cancelada: 'badge-borrador', sin_suscripcion: 'badge-borrador',
};

export default function Subscription() {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [changingCard, setChangingCard] = useState(false);
  const [notice, setNotice] = useState('');
  const [resending, setResending] = useState(false);

  const reload = () => api.get('/suscripcion').then(setData).catch(e => setError(e.message));

  useEffect(() => { reload(); }, []);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/verificar-email/reenviar');
      setNotice('Te mandamos un email con el link para confirmar tu cuenta.');
    } catch (e) {
      setNotice(e.message);
    } finally {
      setResending(false);
    }
  };

  const handleCardChanged = async () => {
    setChangingCard(false);
    setNotice('La tarjeta se actualizó correctamente. Te enviamos un email de confirmación.');
    await reload();
  };

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

  const { plan, subscription, status, payments, mpConfigured, paymentsSimulated,
    mpPublicKey, emailVerified, canChangeCard, activity = [] } = data;
  const needsVerification = mpConfigured && !emailVerified;
  const paymentsAvailable = (mpConfigured && emailVerified) || paymentsSimulated;

  const statusLine =
    status === 'trial' ? <>Tu prueba gratis termina el <strong>{formatDate(subscription.trialEndsAt)}</strong>.</> :
    status === 'activa' ? <>Tu próximo pago es el <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.</> :
    status === 'vencida' ? 'Tu suscripción está vencida. Renovala para seguir usando todas las funciones sin interrupciones.' :
    'Tu suscripción está cancelada.';

  return (
    <>
      <h1>Mi suscripción</h1>
      <p className="subtitle">Así te cobramos el uso del sistema — un solo plan, sin letra chica.</p>

      {notice && <div className="banner banner-success">{notice}</div>}
      {needsVerification && (
        <div className="banner banner-error">
          Para pagar o cambiar la tarjeta primero tenés que confirmar tu email.{' '}
          <button className="btn btn-secondary btn-small" onClick={handleResend} disabled={resending}>
            {resending ? 'Enviando...' : 'Reenviar email de confirmación'}
          </button>
        </div>
      )}

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
              <button className="btn" onClick={handlePay} disabled={paying || !paymentsAvailable}>
                {paying ? 'Procesando...' : status === 'trial' ? 'Activar suscripción ahora' : 'Pagar y renovar'}
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              {mpConfigured
                ? 'Vas a ser redirigido a Mercado Pago para completar el pago.'
                : paymentsSimulated
                  ? '⚠️ Modo de pago simulado (solo desarrollo): este botón registra un pago aprobado sin cobrar.'
                  : 'Los pagos online todavía no están disponibles. Contactá a soporte para activar tu suscripción.'}
            </p>
          </>
        )}
      </div>

      {mpConfigured && (
        <div className="card">
          <h3>Medio de pago</h3>
          <p className="muted">
            {subscription?.cardLastFour
              ? <>Tarjeta {subscription.cardBrand ? <strong>{subscription.cardBrand.toUpperCase()}</strong> : ''} terminada en <strong>{subscription.cardLastFour}</strong></>
              : subscription?.mpPreapprovalId
                ? 'La tarjeta está registrada en Mercado Pago.'
                : 'Todavía no hay una tarjeta asociada. Se carga al activar la suscripción.'}
          </p>
          {canChangeCard && emailVerified && !changingCard && (
            <div className="btn-row">
              <button className="btn btn-secondary" onClick={() => { setNotice(''); setChangingCard(true); }}>Cambiar tarjeta</button>
            </div>
          )}
          {changingCard && (
            <CardChange
              publicKey={mpPublicKey}
              amount={plan.priceARS}
              needsCode={Boolean(session?.user?.twoFactorEnabled)}
              onDone={handleCardChanged}
              onCancel={() => setChangingCard(false)}
            />
          )}
        </div>
      )}

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

      <div className="card">
        <h3>Actividad de seguridad</h3>
        <p className="small muted">Últimos movimientos sensibles de tu cuenta. Si ves algo que no reconocés, cambiá tu contraseña y escribinos a soporte.</p>
        {activity.length === 0 ? (
          <p className="muted">Sin actividad registrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Evento</th><th>Origen</th></tr></thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={i}>
                    <td>{formatDateTime(a.createdAt)}</td>
                    <td>{ACTIVITY_LABELS[a.action] || a.action}</td>
                    <td className="muted small">{a.ip === 'mercadopago' ? 'Mercado Pago' : a.ip || '-'}</td>
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
