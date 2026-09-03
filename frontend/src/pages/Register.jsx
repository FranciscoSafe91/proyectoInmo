import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const INITIAL = {
  nombre: '', apellido: '', documento: '', email: '',
  accountType: 'inmobiliaria', agencyName: '', direccion: '',
  username: '', password: '', confirmPassword: '', terms: false,
};

export default function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (values.password !== values.confirmPassword) {
      return setError('Las contraseñas no coinciden.');
    }
    if (values.password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (!values.terms) {
      return setError('Debés aceptar los términos y condiciones para continuar.');
    }

    setSubmitting(true);
    try {
      await api.post('/registro', values);
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err.data?.error || 'Error al registrar. Verificá los datos e intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrapper" style={{ maxWidth: 560 }}>
      <h1>Crear cuenta</h1>
      <p className="subtitle" style={{ textAlign: 'center' }}>
        Completá tus datos para empezar a publicar y compartir propiedades.
      </p>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>

        {/* —— Datos personales —— */}
        <h3 style={{ margin: '4px 0 10px', color: 'var(--text-muted, #667070)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Datos personales
        </h3>

        <div className="grid grid-2">
          <div>
            <label htmlFor="nombre">Nombre *</label>
            <input
              type="text" id="nombre" name="nombre" required
              placeholder="Ej: Juan"
              value={values.nombre} onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="apellido">Apellido *</label>
            <input
              type="text" id="apellido" name="apellido" required
              placeholder="Ej: García"
              value={values.apellido} onChange={handleChange}
            />
          </div>
        </div>

        <label htmlFor="documento">Documento (DNI / CUIT)</label>
        <input
          type="text" id="documento" name="documento"
          placeholder="Ej: 28.000.000"
          value={values.documento} onChange={handleChange}
        />

        <label htmlFor="email">Email *</label>
        <input
          type="email" id="email" name="email" required
          placeholder="tu@email.com"
          value={values.email} onChange={handleChange}
        />

        <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e1e4e0' }} />

        {/* —— Datos de la inmobiliaria / agente —— */}
        <h3 style={{ margin: '4px 0 10px', color: 'var(--text-muted, #667070)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Datos de la cuenta
        </h3>

        <label htmlFor="accountType">Tipo de cuenta *</label>
        <select id="accountType" name="accountType" value={values.accountType} onChange={handleChange}>
          <option value="inmobiliaria">Inmobiliaria</option>
          <option value="agente_independiente">Agente independiente</option>
        </select>

        <label htmlFor="agencyName">
          {values.accountType === 'agente_independiente' ? 'Nombre / marca personal *' : 'Nombre de la inmobiliaria *'}
        </label>
        <input
          type="text" id="agencyName" name="agencyName" required
          placeholder={values.accountType === 'agente_independiente' ? 'Ej: María López Propiedades' : 'Ej: Del Centro Inmobiliaria'}
          value={values.agencyName} onChange={handleChange}
        />

        <label htmlFor="direccion">Dirección</label>
        <input
          type="text" id="direccion" name="direccion"
          placeholder="Ej: Av. Colón 1234, Córdoba"
          value={values.direccion} onChange={handleChange}
        />

        <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e1e4e0' }} />

        {/* —— Acceso —— */}
        <h3 style={{ margin: '4px 0 10px', color: 'var(--text-muted, #667070)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Datos de acceso
        </h3>

        <label htmlFor="username">Nombre de usuario *</label>
        <input
          type="text" id="username" name="username" required
          placeholder="Ej: juangarcia"
          autoComplete="username"
          value={values.username} onChange={handleChange}
        />

        <div className="grid grid-2">
          <div>
            <label htmlFor="password">Contraseña *</label>
            <input
              type="password" id="password" name="password" required
              minLength={6} placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              value={values.password} onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirmar contraseña *</label>
            <input
              type="password" id="confirmPassword" name="confirmPassword" required
              placeholder="Repetí la contraseña"
              autoComplete="new-password"
              value={values.confirmPassword} onChange={handleChange}
            />
          </div>
        </div>

        <div className="checkbox-row" style={{ marginTop: 16 }}>
          <input
            type="checkbox" id="terms" name="terms"
            checked={values.terms} onChange={handleChange}
          />
          <label htmlFor="terms" style={{ margin: 0, fontWeight: 'normal', fontSize: '0.88rem' }}>
            Acepto los{' '}
            <a href="#" onClick={e => e.preventDefault()} style={{ color: '#1f6f54' }}>
              términos y condiciones
            </a>
            {' '}y la política de privacidad *
          </label>
        </div>

        <div className="btn-row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <Link to="/" className="btn btn-secondary">Cancelar</Link>
        </div>
      </form>

      <p className="auth-switch">¿Ya tenés cuenta? <Link to="/login">Ingresá acá</Link></p>
    </div>
  );
}
