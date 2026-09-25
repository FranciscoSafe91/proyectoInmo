import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const ROLE_LABELS = { admin: 'Administrador', agente: 'Agente' };

const ALL_MENU_ITEMS = [
  { key: 'propiedades',  label: 'Propiedades publicadas' },
  { key: 'compartidas',  label: 'Carpeta compartida' },
  { key: 'buscar_match', label: 'Buscar match' },
  { key: 'matcheadas',   label: 'Matcheadas' },
  { key: 'socios',       label: 'Socios' },
  { key: 'invitaciones', label: 'Invitaciones' },
  { key: 'alertas',      label: 'Alertas' },
];

const ALL_KEYS = ALL_MENU_ITEMS.map(i => i.key);

function PermisosEditor({ user, onSaved }) {
  const currentPermisos = user.menuPermisos ?? ALL_KEYS;
  const [checked, setChecked] = useState(new Set(currentPermisos));
  const [saving, setSaving] = useState(false);

  function toggle(key) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const permisos = ALL_KEYS.filter(k => checked.has(k));
      await api.put(`/equipo/usuarios/${user.id}/permisos`, { permisos });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const changed = JSON.stringify([...checked].sort()) !== JSON.stringify([...currentPermisos].sort());

  return (
    <div className="permisos-editor">
      <div className="permisos-grid">
        {ALL_MENU_ITEMS.map(({ key, label }) => (
          <label key={key} className="permisos-row">
            <input
              type="checkbox"
              checked={checked.has(key)}
              onChange={() => toggle(key)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {changed && (
        <button className="btn btn-small" style={{ marginTop: 10 }} onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar permisos'}
        </button>
      )}
    </div>
  );
}

function UserRow({ user, currentUserId, onRoleChange, onDelete, onPermisosSaved }) {
  const [open, setOpen] = useState(false);
  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === 'admin';

  return (
    <>
      <tr>
        <td>
          {user.name || user.email}
          {isSelf && <span className="muted small"> (vos)</span>}
        </td>
        <td className="muted small">{user.email}</td>
        <td>
          {isSelf ? (
            <span className="badge badge-aceptada">{ROLE_LABELS[user.role]}</span>
          ) : (
            <select
              value={user.role}
              onChange={e => onRoleChange(user.id, e.target.value)}
              style={{ padding: '4px 6px', fontSize: 13 }}
            >
              <option value="admin">Administrador</option>
              <option value="agente">Agente</option>
            </select>
          )}
        </td>
        <td>
          {!isSelf && !isAdmin && (
            <button
              className={`btn btn-secondary btn-small${open ? ' active' : ''}`}
              onClick={() => setOpen(o => !o)}
            >
              {open ? 'Cerrar' : 'Permisos'}
            </button>
          )}{' '}
          {!isSelf && (
            <button className="btn btn-danger btn-small" onClick={() => onDelete(user.id, user.name || user.email)}>
              Quitar
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} style={{ background: 'var(--app-bg)', padding: '10px 16px' }}>
            <PermisosEditor user={user} onSaved={() => { onPermisosSaved(); }} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function Usuarios() {
  const { session } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('agente');

  function load() {
    api.get('/equipo').then(setData).catch(e => setError(e.data?.error || e.message));
  }
  useEffect(load, []);

  async function handleInvitar(e) {
    e.preventDefault();
    try {
      await api.post('/equipo/invitar', { role, note });
      setNote(''); setRole('agente');
      load();
    } catch (err) {
      setError(err.data?.error || 'Error al crear el link.');
    }
  }

  async function handleRoleChange(userId, newRole) {
    await api.put(`/equipo/usuarios/${userId}/rol`, { role: newRole });
    load();
  }

  async function handleDelete(userId, name) {
    if (!window.confirm(`¿Quitar a ${name} de la cuenta?`)) return;
    await api.delete(`/equipo/usuarios/${userId}`);
    load();
  }

  async function handleCancelarInvitacion(id) {
    await api.post(`/equipo/invitaciones/${id}/cancelar`);
    load();
  }

  if (session?.user.role !== 'admin') {
    return <div className="banner banner-error">Solo los administradores pueden acceder a esta sección.</div>;
  }
  if (error && !data) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { users, pendingInvitations, currentUser, baseUrl } = data;

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Cuenta</span>
          <h1>Usuarios</h1>
          <p className="subtitle">Gestioná quién tiene acceso a tu cuenta y qué secciones puede ver cada uno.</p>
        </div>
      </section>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        <h3>Personas con acceso</h3>
        <p className="muted small">Los <strong>Administradores</strong> ven todo y pueden gestionar usuarios. Los <strong>Agentes</strong> solo ven las secciones que habilitás.</p>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  currentUserId={currentUser.id}
                  onRoleChange={handleRoleChange}
                  onDelete={handleDelete}
                  onPermisosSaved={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Invitar usuario</h3>
        <p className="muted small">Generá un link de invitación y enviáselo por WhatsApp o email. Es válido una sola vez.</p>
        <form onSubmit={handleInvitar}>
          <div className="grid grid-2">
            <div>
              <label htmlFor="note">Nota (para identificarlo)</label>
              <input
                type="text" id="note" name="note"
                placeholder="Ej: María, agente"
                value={note} onChange={e => setNote(e.target.value)}
              />
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
            <button type="submit" className="btn btn-small">Generar link</button>
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
