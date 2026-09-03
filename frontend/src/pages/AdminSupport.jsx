import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatDateTime } from '../utils.js';

const STATUS_LABELS = { abierto: 'Abierto', resuelto: 'Resuelto' };
const STATUS_BADGE_CLASS = { abierto: 'badge-pendiente', resuelto: 'badge-aceptada' };

export default function AdminSupport() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState({});

  const load = () => api.get('/admin/soporte').then(setData).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    setLoading(l => ({ ...l, [id]: true }));
    try {
      await api.post(`/admin/soporte/${id}/resolver`, { adminNote: notes[id] || '' });
      load();
    } catch (e) { setError(e.message); }
    finally { setLoading(l => ({ ...l, [id]: false })); }
  };

  const reopen = async (id) => {
    setLoading(l => ({ ...l, [id]: true }));
    try {
      await api.post(`/admin/soporte/${id}/reabrir`);
      load();
    } catch (e) { setError(e.message); }
    finally { setLoading(l => ({ ...l, [id]: false })); }
  };

  if (error) return <><p><Link to="/admin">← Volver al panel</Link></p><div className="banner banner-error">{error}</div></>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { tickets } = data;

  return (
    <>
      <p><Link to="/admin">← Volver al panel</Link></p>
      <h1>Tickets de soporte</h1>
      <p className="subtitle">Consultas y problemas reportados por las inmobiliarias.</p>
      <div className="card">
        {tickets.length === 0 ? (
          <p className="muted">Todavía no hay consultas de soporte.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Consulta</th><th>Inmobiliaria</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead>
              <tbody>
                {tickets.map(({ ticket, agency, user }) => {
                  const isOpen = ticket.status === 'abierto';
                  return (
                    <tr key={ticket.id}>
                      <td>
                        <strong>{ticket.subject || '(sin asunto)'}</strong><br />
                        <span className="muted small">{ticket.message}</span>
                      </td>
                      <td>{agency ? agency.name : '-'}<br /><span className="muted small">{user ? user.name : '-'}</span></td>
                      <td><span className={`badge ${STATUS_BADGE_CLASS[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span></td>
                      <td className="muted small">{formatDateTime(ticket.createdAt)}</td>
                      <td>
                        {isOpen ? (
                          <>
                            <textarea
                              placeholder="Nota de respuesta (opcional)"
                              style={{ minHeight: 50, marginBottom: 6 }}
                              value={notes[ticket.id] || ''}
                              onChange={e => setNotes(n => ({ ...n, [ticket.id]: e.target.value }))}
                            />
                            <button className="btn btn-small" disabled={loading[ticket.id]} onClick={() => resolve(ticket.id)}>
                              {loading[ticket.id] ? '...' : 'Marcar resuelto'}
                            </button>
                          </>
                        ) : (
                          <>
                            {ticket.adminNote && <p className="muted small">{ticket.adminNote}</p>}
                            <button className="btn btn-secondary btn-small" disabled={loading[ticket.id]} onClick={() => reopen(ticket.id)}>
                              {loading[ticket.id] ? '...' : 'Reabrir'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
