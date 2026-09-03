import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const ROLE_LABELS = { admin: 'Administrador', agente: 'Agente' };

export default function Team() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('agente');
  const [newInviteLink, setNewInviteLink] = useState('');

  function load() {
    api.get('/equipo').then(setData).catch(e => setError(e.data?.error || e.message));
  }
  useEffect(load, []);

  async function handleInvitar(e) {
    e.preventDefault();
    try {
      const result = await api.post('/equipo/invitar', { role, note });
      setNote(''); setRole('agente');
      setNewInviteLink('');
      load();
    } catch (err) {
      setError(err.data?.error || 'Error al invitar.');
    }
  }

  async function handleCancelarInvitacion(id) {
    await api.post(`/equipo/invitaciones/${id}/cancelar`);
    load();
  }

  async function handleChangeRole(userId, newRole) {
    await api.put(`/equipo/usuarios/${userId}/rol`, { role: newRole });
    load();
  }

  async function handleEliminar(userId, name) {
    if (!window.confirm(`¿Quitar a ${name} de la cuenta?`)) return;
    await api.delete(`/equipo/usuarios/${userId}`);
    load();
  }

  if (error && !data) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { users, pendingInvitations, currentUser, baseUrl } = data;

  return (
    <>
      <h1>Mi equipo</h1>
      <p className="subtitle">Sumá compañeros o agentes a tu misma cuenta. No hace falta que tengan su propia inmobiliaria dada de alta: comparten tu cartera y tus socios.</p>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        <h3>Personas con acceso</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id}>
                    <td>{u.name} {isSelf && <span className="muted small">(vos)</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      {isSelf ? (
                        <span className="badge badge-aceptada">{ROLE_LABELS[u.role]}</span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={e => handleChangeRole(u.id, e.target.value)}
                          className="btn-small"
                          style={{ padding: '4px 6px' }}
                        >
                          <option value="admin">Administrador</option>
                          <option value="agente">Agente</option>
                        </select>
                      )}
                    </td>
                    <td>
                      {!isSelf && (
                        <button className="btn btn-danger btn-small" onClick={() => handleEliminar(u.id, u.name)}>Quitar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Invitar a alguien</h3>
        <p className="muted small">El sistema todavía no envía emails: generá el link y mandáselo vos por donde prefieras (WhatsApp, email, etc.). Es válido una sola vez.</p>
        <form onSubmit={handleInvitar}>
          <div className="grid grid-2">
            <div>
              <label htmlFor="note">Nota (para identificar a quién invitaste)</label>
              <input type="text" id="note" name="note" placeholder="Ej: Juan, vendedor" value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <div>
              <label htmlFor="role">Rol</label>
              <select id="role" name="role" value={role} onChange={e => setRole(e.target.value)}>
                <option value="agente">Agente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn btn-small">Generar link de invitación</button>
          </div>
        </form>

        {pendingInvitations.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Nota</th><th>Rol</th><th>Link</th><th></th></tr></thead>
              <tbody>
                {pendingInvitations.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.note || <span className="muted">(sin nota)</span>}</td>
                    <td>{ROLE_LABELS[inv.role]}</td>
                    <td><code className="small">{baseUrl}/unirse/{inv.token}</code></td>
                    <td>
                      <button className="btn btn-secondary btn-small" onClick={() => handleCancelarInvitacion(inv.id)}>Cancelar</button>
                    </td>
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
