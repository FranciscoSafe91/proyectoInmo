import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Support() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', message: '', email: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/soporte').then(setData).catch(e => setError(e.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/soporte', form);
      setForm({ subject: '', message: '', email: '', phone: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  return (
    <>
      <h1>Soporte</h1>
      <p className="subtitle">¿Algo no funciona como esperabas, o tenés una duda? Contanos acá.</p>

      <div className="card">
        <h3>Enviar una consulta</h3>
        <p className="muted small">Tu mensaje queda registrado y lo vemos directamente en nuestro panel — no hace falta que te contestemos por mail para que lo veamos.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="subject">Asunto</label>
          <input type="text" id="subject" required placeholder="Ej: No puedo subir el logo"
            value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <label htmlFor="email">Email de contacto</label>
          <input type="email" id="email" required placeholder="tucorreo@ejemplo.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <label htmlFor="phone">Teléfono de contacto</label>
          <input type="tel" id="phone" placeholder="Ej: +54 9 11 1234-5678"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <label htmlFor="message">Contanos qué pasó</label>
          <textarea id="message" required
            placeholder="Cuanto más detalle (qué hiciste, qué esperabas que pasara, qué pasó en cambio), más rápido lo podemos resolver."
            value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          <div className="btn-row">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar consulta'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
