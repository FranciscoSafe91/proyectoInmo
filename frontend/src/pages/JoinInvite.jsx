import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function JoinInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [agency, setAgency] = useState(null);
  const [invalid, setInvalid] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/unirse/${token}`).then(d => setAgency(d.agency)).catch(e => setInvalid(e.message));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/unirse/${token}`, form);
      await refresh();
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (invalid) {
    return (
      <div className="auth-wrapper">
        <h1>Invitación no disponible</h1>
        <p className="subtitle" style={{ textAlign: 'center' }}>{invalid}</p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <a className="btn btn-secondary" href="/login">Ir a ingresar</a>
        </div>
      </div>
    );
  }

  if (!agency) return <p className="muted">Cargando...</p>;

  return (
    <div className="auth-wrapper">
      <h1>Te invitaron a {agency.name}</h1>
      <p className="subtitle" style={{ textAlign: 'center' }}>Creá tu acceso para sumarte a esta cuenta.</p>
      {error && <div className="banner banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Tu nombre</label>
        <input type="text" id="name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label htmlFor="email">Tu email</label>
        <input type="email" id="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <label htmlFor="password">Contraseña</label>
        <input type="password" id="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <div className="btn-row">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Uniéndome...' : `Unirme a ${agency.name}`}
          </button>
        </div>
      </form>
    </div>
  );
}
