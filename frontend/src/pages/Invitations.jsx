import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Building2, Camera, ChevronLeft, ChevronRight, Eye, Film, MapPin, Ruler, X } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, formatDate } from '../utils.js';

function PreviewCarousel({ media, title }) {
  const [idx, setIdx] = useState(0);
  const item = media[idx];

  if (!media.length) {
    return (
      <div className="modal-preview-empty">
        <Camera size={32} aria-hidden="true" />
        <span>Sin fotos cargadas</span>
      </div>
    );
  }

  function move(step) {
    setIdx(cur => (cur + step + media.length) % media.length);
  }

  return (
    <div className="property-gallery-card">
      <div className="property-gallery-stage">
        {item.type === 'video'
          ? <video src={item.url} controls />
          : <img src={item.url} alt={title} />}
        {media.length > 1 && (
          <>
            <button type="button" className="gallery-arrow left" onClick={() => move(-1)} aria-label="Anterior">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="gallery-arrow right" onClick={() => move(1)} aria-label="Siguiente">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="property-gallery-thumbs">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={i === idx ? 'active' : ''}
              onClick={() => setIdx(i)}
              aria-label={`Imagen ${i + 1}`}
            >
              {m.type === 'video' ? <Film size={16} /> : <img src={m.url} alt="" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Invitations() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [previewTarget, setPreviewTarget] = useState(null); // { share, property, ownerAgency }
  const [previewFull, setPreviewFull] = useState(null);     // datos completos del endpoint
  const [previewLoading, setPreviewLoading] = useState(false);

  function load() {
    api.get('/invitaciones').then(setData).catch(e => setError(e.message));
  }
  useEffect(load, []);

  async function openPreview(share, property, ownerAgency) {
    setPreviewTarget({ share, property, ownerAgency });
    setPreviewFull(null);
    setPreviewLoading(true);
    try {
      const full = await api.get(`/propiedades/${property.id}`);
      setPreviewFull(full);
    } catch {
      // mostramos datos básicos sin media
    }
    setPreviewLoading(false);
  }

  function closePreview() {
    setPreviewTarget(null);
    setPreviewFull(null);
  }

  async function handleShare(shareId, action) {
    if (action === 'rechazar') {
      setRejectModal({ shareId });
      setRejectReason('');
      closePreview();
      return;
    }
    await api.post(`/invitaciones/compartir/${shareId}/${action}`);
    closePreview();
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

  const prop = previewFull?.property ?? previewTarget?.property;
  const media = previewFull?.media ?? [];

  return (
    <>
      {/* Modal de previsualización de propiedad */}
      {previewTarget && (
        <div className="modal-backdrop" onClick={closePreview}>
          <div className="modal-box modal-preview" onClick={e => e.stopPropagation()}>
            <div className="modal-preview-header">
              <h3>{prop?.title || 'Propiedad'}</h3>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                style={{ padding: '4px 8px', lineHeight: 1 }}
                onClick={closePreview}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-preview-body">
              <div className="modal-preview-media">
                {previewLoading
                  ? <div className="modal-preview-empty"><span>Cargando imágenes...</span></div>
                  : <PreviewCarousel media={media} title={prop?.title || ''} />}
              </div>

              <div className="modal-preview-info">
                <div>
                  <div className="modal-preview-price">{money(prop?.price, prop?.currency)}</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--app-muted)', marginTop: 2 }}>
                    {typeLabel(prop?.type)} · {operationLabel(prop?.operation)}
                  </div>
                </div>

                <div className="modal-preview-meta">
                  {prop?.city && (
                    <span><MapPin size={14} />{prop.city}{prop.province ? `, ${prop.province}` : ''}</span>
                  )}
                  {prop?.bedrooms != null && <span><BedDouble size={14} />{prop.bedrooms} dorm.</span>}
                  {prop?.areaM2 != null && <span><Ruler size={14} />{prop.areaM2} m²</span>}
                </div>

                {prop?.description && (
                  <p className="modal-preview-desc">{prop.description}</p>
                )}

                <table className="modal-preview-table">
                  <tbody>
                    <tr>
                      <td>Inmobiliaria</td>
                      <td>{previewTarget.ownerAgency?.name || '—'}</td>
                    </tr>
                    {prop?.address && (
                      <tr><td>Dirección</td><td>{prop.address}</td></tr>
                    )}
                    {prop?.bathrooms != null && (
                      <tr><td>Baños</td><td>{prop.bathrooms}</td></tr>
                    )}
                    <tr>
                      <td>Publicación</td>
                      <td>
                        {previewTarget.share.webPublishAuthorized
                          ? <span className="badge badge-aceptada">Podrás publicar en tu web</span>
                          : <span className="badge badge-borrador">Solo uso interno</span>}
                      </td>
                    </tr>
                    {previewTarget.share.percentage != null && (
                      <tr><td>Porcentaje</td><td>{previewTarget.share.percentage}%</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-preview-actions">
              <button
                className="btn btn-small btn-secondary"
                onClick={() => handleShare(previewTarget.share.id, 'rechazar')}
              >
                Rechazar
              </button>
              <button
                className="btn btn-small"
                onClick={() => handleShare(previewTarget.share.id, 'aceptar')}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de motivo de rechazo */}
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
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-small"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClick={() => openPreview(share, property, ownerAgency)}
                      >
                        <Eye size={14} /> {property.title}
                      </button>
                    </td>
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
