import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Partners() {
  const { canDo } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Grupos
  const [grupos, setGrupos] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState(null); // { id, name }
  const [addingMemberFor, setAddingMemberFor] = useState(null); // groupId
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [grupoError, setGrupoError] = useState('');

  const load = useCallback((query) => {
    api.get(`/socios?q=${encodeURIComponent(query)}`).then(setData).catch(e => setError(e.message));
  }, []);

  const loadGrupos = useCallback(() => {
    api.get('/grupos-socios').then(r => setGrupos(r.grupos || [])).catch(() => {});
  }, []);

  useEffect(() => { load(q); }, []);
  useEffect(() => { loadGrupos(); }, []);

  function handleSearch(e) {
    e.preventDefault();
    load(q);
  }

  async function handleSolicitar(agencyId) {
    await api.post(`/socios/${agencyId}/solicitar`);
    load(q);
  }

  async function handleDisolver(partnershipId, partnerName) {
    if (!window.confirm(`¿Seguro que querés dejar de ser socio de ${partnerName}? Se revocarán todas las propiedades compartidas entre ambas inmobiliarias.`)) return;
    await api.delete(`/socios/${partnershipId}`);
    load(q);
  }

  // --- Grupos handlers ---

  async function handleCreateGroup(e) {
    e.preventDefault();
    setGrupoError('');
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await api.post('/grupos-socios', { name });
      setNewGroupName('');
      loadGrupos();
    } catch (e) {
      setGrupoError(e.message);
    }
  }

  async function handleRenameGroup(e) {
    e.preventDefault();
    setGrupoError('');
    if (!editingGroup) return;
    const name = editingGroup.name.trim();
    if (!name) return;
    try {
      await api.put(`/grupos-socios/${editingGroup.id}`, { name });
      setEditingGroup(null);
      loadGrupos();
    } catch (e) {
      setGrupoError(e.message);
    }
  }

  async function handleDeleteGroup(grupoId, grupoName) {
    if (!window.confirm(`¿Eliminar el grupo "${grupoName}"?`)) return;
    try {
      await api.delete(`/grupos-socios/${grupoId}`);
      loadGrupos();
    } catch (e) {
      setGrupoError(e.message);
    }
  }

  async function handleAddMember(grupoId) {
    if (!selectedPartnerId) return;
    setGrupoError('');
    try {
      await api.post(`/grupos-socios/${grupoId}/miembros`, { partnerId: selectedPartnerId });
      setAddingMemberFor(null);
      setSelectedPartnerId('');
      loadGrupos();
    } catch (e) {
      setGrupoError(e.message);
    }
  }

  async function handleRemoveMember(grupoId, partnerId) {
    try {
      await api.delete(`/grupos-socios/${grupoId}/miembros/${partnerId}`);
      loadGrupos();
    } catch (e) {
      setGrupoError(e.message);
    }
  }

  if (error) return <div className="banner banner-error">{error}</div>;

  const results = data?.results || [];
  const partnerIds = new Set(data?.partnerIds || []);
  const sentPendingIds = new Set(data?.sentPendingIds || []);
  const receivedPendingIds = new Set(data?.receivedPendingIds || []);
  const currentPartners = data?.currentPartners || [];
  const partnerMap = Object.fromEntries(currentPartners.map(p => [p.id, p]));

  function accountTypeBadge(agency) {
    return agency.accountType === 'agente_independiente'
      ? <span className="badge badge-compartida">Agente independiente</span>
      : null;
  }

  function actionCell(a) {
    if (partnerIds.has(a.id)) return <span className="badge badge-aceptada">Socios</span>;
    if (sentPendingIds.has(a.id)) return <span className="badge badge-pendiente">Solicitud enviada</span>;
    if (receivedPendingIds.has(a.id)) return <Link className="btn btn-small" to="/invitaciones">Responder solicitud</Link>;
    return canDo('gestionar_socios')
      ? <button className="btn btn-small" onClick={() => handleSolicitar(a.id)}>Enviar solicitud de sociedad</button>
      : null;
  }

  return (
    <>
      <h1>Socios</h1>
      <p className="subtitle">Formá tu red de inmobiliarias socias. Una vez que sean socias, vas a poder compartirles propiedades puntuales.</p>

      <div className="card">
        <h3>Mis socios actuales</h3>
        {currentPartners.length === 0 ? (
          <p className="muted">Todavía no tenés inmobiliarias socias.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Inmobiliaria</th><th>Ciudad</th><th></th></tr></thead>
              <tbody>
                {currentPartners.map(a => (
                  <tr key={a.id}>
                    <td>{a.name} {accountTypeBadge(a)}</td>
                    <td>{a.city || '-'}</td>
                    <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="badge badge-aceptada">Socios</span>
                      {canDo('gestionar_socios') && a.partnershipId && (
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDisolver(a.partnershipId, a.name)}
                        >
                          Dejar de ser socio
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grupos de socios */}
      <div className="card">
        <h3>Grupos de socios</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          Organizá tus socios en grupos para encontrarlos más fácilmente.
        </p>

        {grupoError && <div className="banner banner-error" style={{ marginBottom: 12 }}>{grupoError}</div>}

        {grupos.length === 0 && (
          <p className="muted">Todavía no creaste ningún grupo.</p>
        )}

        {grupos.map(grupo => {
          const members = grupo.members || [];
          const isEditing = editingGroup?.id === grupo.id;
          const isAddingMember = addingMemberFor === grupo.id;
          const availableToAdd = currentPartners.filter(p => !members.includes(p.id));

          return (
            <div key={grupo.id} style={{ border: '1px solid var(--app-border)', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {isEditing ? (
                  <form onSubmit={handleRenameGroup} style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      style={{ flex: 1, minWidth: 140 }}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-small">Guardar</button>
                    <button type="button" className="btn btn-small" onClick={() => setEditingGroup(null)}>Cancelar</button>
                  </form>
                ) : (
                  <>
                    <strong style={{ fontSize: '1rem' }}>{grupo.name}</strong>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      {members.length === 0 ? 'Sin miembros' : `${members.length} miembro${members.length !== 1 ? 's' : ''}`}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                      <button className="btn btn-small" onClick={() => { setEditingGroup({ id: grupo.id, name: grupo.name }); setGrupoError(''); }}>
                        Renombrar
                      </button>
                      <button className="btn btn-danger btn-small" onClick={() => handleDeleteGroup(grupo.id, grupo.name)}>
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Miembros del grupo */}
              {members.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {members.map(pid => {
                    const partner = partnerMap[pid];
                    return (
                      <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--app-green-soft)', borderRadius: 999, padding: '3px 10px', fontSize: '0.85rem' }}>
                        {partner ? partner.name : pid}
                        {canDo('gestionar_socios') && (
                          <button
                            onClick={() => handleRemoveMember(grupo.id, pid)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--app-muted)', padding: '0 2px', fontSize: '0.9rem', lineHeight: 1 }}
                            title="Quitar del grupo"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Agregar miembro */}
              {canDo('gestionar_socios') && (
                <div style={{ marginTop: 10 }}>
                  {isAddingMember ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {availableToAdd.length === 0 ? (
                        <span className="muted" style={{ fontSize: '0.88rem' }}>Todos tus socios ya están en este grupo.</span>
                      ) : (
                        <select
                          value={selectedPartnerId}
                          onChange={e => setSelectedPartnerId(e.target.value)}
                          style={{ flex: 1, minWidth: 160 }}
                        >
                          <option value="">Seleccionar socio...</option>
                          {availableToAdd.map(p => (
                            <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>
                          ))}
                        </select>
                      )}
                      {availableToAdd.length > 0 && (
                        <button className="btn btn-small" onClick={() => handleAddMember(grupo.id)}>Agregar</button>
                      )}
                      <button className="btn btn-small" onClick={() => { setAddingMemberFor(null); setSelectedPartnerId(''); }}>Cancelar</button>
                    </div>
                  ) : (
                    currentPartners.length > 0 && availableToAdd.length > 0 && (
                      <button
                        className="btn btn-small"
                        onClick={() => { setAddingMemberFor(grupo.id); setSelectedPartnerId(''); setGrupoError(''); }}
                      >
                        + Agregar socio al grupo
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Crear nuevo grupo */}
        {canDo('gestionar_socios') && (
          <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Nombre del nuevo grupo..."
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <button type="submit" className="btn" disabled={!newGroupName.trim()}>
              Crear grupo
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>Buscar inmobiliarias</h3>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            name="q"
            placeholder="Buscar por nombre o ciudad..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </form>
        {!data ? (
          <p className="muted">Cargando...</p>
        ) : results.length === 0 ? (
          <div className="empty-state">No se encontraron inmobiliarias.</div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th>Inmobiliaria</th><th>Ciudad</th><th></th></tr></thead>
              <tbody>
                {results.map(a => (
                  <tr key={a.id}>
                    <td>{a.name} {accountTypeBadge(a)}</td>
                    <td>{a.city || '-'}</td>
                    <td>{actionCell(a)}</td>
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
