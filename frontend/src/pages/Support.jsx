import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { formatDateTime } from '../utils.js';

const STATUS_LABELS = { abierto: 'Abierto', resuelto: 'Resuelto' };
const STATUS_BADGE_CLASS = { abierto: 'badge-pendiente', resuelto: 'badge-aceptada' };

export default function Support() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState('');

  const load = () => api.get('/soporte').then(setData).catch(e => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/soporte', form);
      setForm({ subject: '', message: '' });
      setFlash('Consulta enviada correctamente.');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { tickets, contactEmail } = data;

  return (
    <>
      <h1>Soporte</h1>
      <p className="subtitle">¿Algo no funciona como esperabas, o tenés una duda? Contanos acá.</p>

      {flash && <div className="banner banner-success">{flash}</div>}

      <div className="card">
        <h3>Contacto directo</h3>
        <p className="muted">Si preferís escribirnos por fuera del sistema:</p>
        <p>✉️ <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
      </div>

      <div className="card">
        <h3>Enviar una consulta</h3>
        <p className="muted small">Tu mensaje queda registrado y lo vemos directamente en nuestro panel — no hace falta que te contestemos por mail para que lo veamos.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="subject">Asunto</label>
          <input type="text" id="subject" required placeholder="Ej: No puedo subir el logo"
            value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
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

      <div className="card">
        <h3>Tus consultas anteriores</h3>
        {tickets.length === 0 ? (
          <p className="muted">Todavía no enviaste ninguna consulta.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Consulta</th><th>Estado</th><th>Fecha</th><th>Respuesta</th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td>
                      {t.subject || <span className="muted">(sin asunto)</span>}<br />
                      <span className="muted small">{t.message}</span>
                    </td>
                    <td><span className={`badge ${STATUS_BADGE_CLASS[t.status]}`}>{STATUS_LABELS[t.status]}</span></td>
                    <td className="muted small">{formatDateTime(t.createdAt)}</td>
                    <td className="muted small">{t.adminNote || '-'}</td>
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
