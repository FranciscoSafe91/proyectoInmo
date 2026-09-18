import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

export default function Invitations() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState(null); // { shareId }
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  function load() {
    api.get('/invitaciones').then(setData).catch(e => setError(e.message));
  }
  useEffect(load, []);

  async function handleShare(shareId, action) {
    if (action === 'rechazar') {
      setRejectModal({ shareId });
      setRejectReason('');
      return;
    }
    await api.post(`/invitaciones/compartir/${shareId}/${action}`);
    load();
  }

  async function handleConfirmReject() {
    if (!rejectModal) return;
    setRejecting(true);
    await api.post(`/invitaciones/compartir/${rejectModal.shareId}/rechazar`, { reason: rejectReason });
    setRejectModal(null);
    setRejectReason('');
    setRejecting(false);
    load();
  }

  async function handlePartnership(partnershipId, action) {
    await api.post(`/socios/solicitud/${partnershipId}/${action}`);
    load();
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { pendingShares, pendingPartnerships } = data;

  return (
    <>
      {rejectModal && (
        <div className="modal-backdrop" onClick={() => setRejectModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Motivo del rechazo</h3>
            <p className="muted">Opcional — podés dejarle saber a la inmobiliaria por qué no aceptás esta propiedad.</p>
            <textarea
              rows={4}
              placeholder="Ej: La zona no coincide con nuestra cartera, precio fuera de rango, etc."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="btn-row">
              <button className="btn btn-danger" onClick={handleConfirmReject} disabled={rejecting}>
                {rejecting ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)} disabled={rejecting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <h1>Invitaciones</h1>
      <p className="subtitle">Acá aparecen las propiedades que te comparten y las solicitudes de sociedad que recibís.</p>

      <div className="card">
        <h3>Propiedades compartidas con vos, pendientes de aceptar</h3>
        {pendingShares.length === 0 ? (
          <p className="muted">No tenés propiedades pendientes de aceptar.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Propiedad</th><th>Tipo</th><th>Precio</th><th>Inmobiliaria</th><th>Publicación</th><th>Porcentaje</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pendingShares.map(({ share, property, ownerAgency }) => (
                  <tr key={share.id}>
                    <td><Link to={`/propiedades/${property.id}`}>{property.title}</Link></td>
                    <td>{typeLabel(property.type)} · {operationLabel(property.operation)}</td>
                    <td>{money(property.price, property.currency)}</td>
                    <td>{ownerAgency.name}</td>
                    <td>
                      {share.webPublishAuthorized
                        ? <span className="badge badge-aceptada">Podrás publicarla en tu web</span>
                        : <span className="badge badge-borrador">Solo uso interno</span>}
                    </td>
                    <td className="muted">{share.percentage != null ? `${share.percentage}%` : '—'}</td>
                    <td>
                      <button className="btn btn-small" onClick={() => handleShare(share.id, 'aceptar')}>Aceptar</button>{' '}
                      <button className="btn btn-small btn-secondary" onClick={() => handleShare(share.id, 'rechazar')}>Rechazar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Solicitudes de sociedad pendientes</h3>
        {pendingPartnerships.length === 0 ? (
          <p className="muted">No tenés solicitudes de sociedad pendientes.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Inmobiliaria</th><th>Ciudad</th><th></th></tr></thead>
              <tbody>
                {pendingPartnerships.map(({ partnership, fromAgency }) => (
                  <tr key={partnership.id}>
                    <td>{fromAgency.name}</td>
                    <td className="muted">{fromAgency.city || '-'}</td>
                    <td>
                      <button className="btn btn-small" onClick={() => handlePartnership(partnership.id, 'aceptar')}>Aceptar</button>{' '}
                      <button className="btn btn-small btn-secondary" onClick={() => handlePartnership(partnership.id, 'rechazar')}>Rechazar</button>
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
