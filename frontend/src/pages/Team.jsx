import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { api } from '../api.js';

const ROLE_LABELS = { admin: 'Administrador', agente: 'Agente' };

const SECCIONES = [
  { key: 'propiedades',  label: 'Propiedades publicadas' },
  { key: 'compartidas',  label: 'Carpeta compartida' },
  { key: 'buscar_match', label: 'Buscar match' },
  { key: 'matcheadas',   label: 'Matcheadas' },
  { key: 'socios',       label: 'Socios' },
  { key: 'alertas',      label: 'Alertas' },
  { key: 'invitaciones', label: 'Invitaciones' },
];

export default function Team() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('agente');
  const [permisos, setPermisos] = useState(SECCIONES.map(s => s.key));
  const [newInviteLink, setNewInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  function load() {
    api.get('/equipo').then(setData).catch(e => setError(e.data?.error || e.message));
  }
  useEffect(load, []);

  function togglePermiso(key) {
    setPermisos(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  async function handleInvitar(e) {
    e.preventDefault();
    try {
      const menuPermisos = role === 'admin' ? null : permisos;
      const result = await api.post('/equipo/invitar', { role, note, menuPermisos });
      const { invitation } = result;
      setNewInviteLink(`${data.baseUrl}/unirse/${invitation.token}`);
      setCopied(false);
      setNote('');
      setRole('agente');
      setPermisos(SECCIONES.map(s => s.key));
      load();
    } catch (err) {
      setError(err.data?.error || 'Error al invitar.');
    }
  }

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(newInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback para navegadores que bloquean clipboard
      const el = document.createElement('textarea');
      el.value = newInviteLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function handleCancelarInvitacion(id) {
    await api.post(`/equipo/invitaciones/${id}/cancelar`);
    setNewInviteLink('');
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

  const { users, pendingInvitations, currentUser } = data;

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

          {role === 'agente' && (
            <div className="invite-permisos">
              <p className="invite-permisos-label">Secciones a las que va a tener acceso</p>
              <div className="invite-permisos-grid">
                {SECCIONES.map(s => (
                  <label key={s.key} className="invite-permiso-item">
                    <input
                      type="checkbox"
                      checked={permisos.includes(s.key)}
                      onChange={() => togglePermiso(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {role === 'admin' && (
            <p className="muted small" style={{ marginTop: 8 }}>Los administradores tienen acceso a todas las secciones.</p>
          )}

          <div className="btn-row">
            <button type="submit" className="btn btn-small">Generar link de invitación</button>
          </div>
        </form>

        {newInviteLink && (
          <div className="invite-link-box">
            <code className="invite-link-text">{newInviteLink}</code>
            <button
              type="button"
              className={`btn btn-small invite-copy-btn${copied ? ' copied' : ''}`}
              onClick={handleCopiar}
            >
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar link</>}
            </button>
          </div>
        )}

        {pendingInvitations.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Nota</th><th>Rol</th><th>Link</th><th></th></tr></thead>
              <tbody>
                {pendingInvitations.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.note || <span className="muted">(sin nota)</span>}</td>
                    <td>{ROLE_LABELS[inv.role]}</td>
                    <td><code className="small">{data.baseUrl}/unirse/{inv.token}</code></td>
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
