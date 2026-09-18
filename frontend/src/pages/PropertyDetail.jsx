import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, ChevronRight, Film, Printer } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, formatDate } from '../utils.js';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function PropertyMediaCarousel({ media, title }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = media[activeIndex];

  if (!media.length) {
    return (
      <div className="property-media-empty">
        <Camera size={34} aria-hidden="true" />
        <span>Esta propiedad todavía no tiene fotos o videos cargados.</span>
      </div>
    );
  }

  function move(step) {
    setActiveIndex(current => (current + step + media.length) % media.length);
  }

  return (
    <section className="property-gallery-card">
      <div className="property-gallery-stage">
        {activeMedia.type === 'video' ? (
          <video src={activeMedia.url} controls />
        ) : (
          <img src={activeMedia.url} alt={title} />
        )}
        {media.length > 1 && (
          <>
            <button type="button" className="gallery-arrow left" onClick={() => move(-1)} aria-label="Ver archivo anterior">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button type="button" className="gallery-arrow right" onClick={() => move(1)} aria-label="Ver siguiente archivo">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="property-gallery-thumbs">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === activeIndex ? 'active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver archivo ${index + 1}`}
            >
              {item.type === 'video'
                ? <Film size={17} aria-hidden="true" />
                : <img src={item.url} alt="" />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function WebPublishCell({ property, share, onUpdate }) {
  if (share.status !== 'aceptada') return <span className="muted small">—</span>;

  async function handleAutorizar() {
    await api.post(`/propiedades/${property.id}/compartir/${share.id}/autorizar-web`);
    onUpdate();
  }
  async function handleQuitar() {
    await api.post(`/propiedades/${property.id}/compartir/${share.id}/quitar-autorizacion-web`);
    onUpdate();
  }

  if (share.webPublishAuthorized) {
    return (
      <>
        <span className="badge badge-aceptada">Autorizada</span>{' '}
        <button className="btn btn-secondary btn-small" onClick={handleQuitar}>Quitar</button>
      </>
    );
  }
  return (
    <>
      <span className="badge badge-borrador">Solo interno</span>{' '}
      <button className="btn btn-small" onClick={handleAutorizar}>Autorizar para su web</button>
    </>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [allowWebPublish, setAllowWebPublish] = useState(false);
  const [percentages, setPercentages] = useState({});
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('¿Seguro que querés eliminar esta propiedad? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await api.delete(`/propiedades/${id}`);
      navigate('/propiedades');
    } catch (e) {
      setError(e.data?.error || 'Error al eliminar la propiedad.');
      setDeleting(false);
    }
  }

  function load() {
    api.get(`/propiedades/${id}`).then(setData).catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { property, media = [], owner, shares, partnerAgencies, isOwner } = data;
  const sharedAgencyIds = new Set(shares.filter(s => s.status !== 'rechazada').map(s => s.targetAgencyId));
  const availablePartners = (partnerAgencies?.list || []).filter(a => !sharedAgencyIds.has(a.id));
  const byId = partnerAgencies?.byId || {};

  function togglePartner(id) {
    setSelectedPartners(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleCompartir(e) {
    e.preventDefault();
    await api.post(`/propiedades/${property.id}/compartir`, {
      targetAgencyIds: selectedPartners,
      allowWebPublish,
      percentages,
    });
    setSelectedPartners([]);
    setAllowWebPublish(false);
    setPercentages({});
    load();
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>{property.title}</h1>
          <p className="subtitle">{typeLabel(property.type)} · {operationLabel(property.operation)} · publicada por {owner.name}</p>
        </div>
        <StatusBadge status={property.status} />
      </div>

      <div className="property-detail-grid">
        <div>
          <PropertyMediaCarousel media={media} title={property.title} />

          <div className="card">
            <h3>{money(property.price, property.currency)}</h3>
            <p>{property.description || <span className="muted">Sin descripción.</span>}</p>
            <table>
              <tbody>
                <tr><th>Dirección</th><td>{property.address || '-'}</td></tr>
                <tr><th>Ciudad</th><td>{property.city || '-'}, {property.province || '-'}</td></tr>
                <tr><th>Dormitorios</th><td>{property.bedrooms || '-'}</td></tr>
                <tr><th>Baños</th><td>{property.bathrooms || '-'}</td></tr>
                <tr><th>Superficie</th><td>{property.areaM2 ? property.areaM2 + ' m²' : '-'}</td></tr>
              </tbody>
            </table>
            <div className="btn-row">
              {isOwner && <Link className="btn btn-secondary btn-small" to={`/propiedades/${property.id}/editar`}>Editar propiedad</Link>}
              <Link className="btn btn-secondary btn-small" to={`/propiedades/${property.id}/ficha`} target="_blank">
                <Printer size={15} aria-hidden="true" /> Ficha para imprimir
              </Link>
              {isOwner && (
                <button className="btn btn-danger btn-small" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          {isOwner ? (
            <>
              <div className="card">
                <h3>A quién se la compartiste</h3>
                {shares.length === 0 ? (
                  <p className="muted">Todavía no la compartiste con ninguna inmobiliaria.</p>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Inmobiliaria</th><th>Estado</th><th>Porcentaje</th><th>Fecha</th><th></th></tr>
                    </thead>
                    <tbody>
                      {shares.map(s => (
                        <>
                          <tr key={s.id}>
                            <td>{byId[s.targetAgencyId]?.name || 'Inmobiliaria'}</td>
                            <td><StatusBadge status={s.status} /></td>
                            <td className="muted">{s.percentage != null ? `${s.percentage}%` : '—'}</td>
                            <td className="muted">{formatDate(s.createdAt)}</td>
                            <td>
                              <button
                                className="btn btn-small btn-danger"
                                onClick={async () => {
                                  if (!window.confirm(`¿Dejar de compartir con ${byId[s.targetAgencyId]?.name || 'esta inmobiliaria'}? Va a perder acceso a la propiedad.`)) return;
                                  await api.delete(`/propiedades/${property.id}/compartir/${s.id}`);
                                  load();
                                }}
                              >
                                Dejar de compartir
                              </button>
                            </td>
                          </tr>
                          {s.status === 'rechazada' && s.rejectionReason && (
                            <tr key={`${s.id}-reason`} className="rejection-reason-row">
                              <td colSpan={5}>
                                <span className="rejection-reason-label">Motivo:</span> {s.rejectionReason}
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card">
                <h3>Compartir con socios</h3>
                {availablePartners.length === 0 ? (
                  <p className="muted">
                    {(partnerAgencies?.list || []).length === 0
                      ? <>Todavía no tenés inmobiliarias socias. <Link to="/socios">Sumá socios primero →</Link></>
                      : 'Ya la compartiste con todos tus socios actuales.'}
                  </p>
                ) : (
                  <form onSubmit={handleCompartir}>
                    <fieldset>
                      <legend>Elegí con quién compartir</legend>
                      {availablePartners.map(a => (
                        <div key={a.id} className="checkbox-row share-partner-row">
                          <input
                            type="checkbox"
                            id={`share-${a.id}`}
                            checked={selectedPartners.includes(a.id)}
                            onChange={() => togglePartner(a.id)}
                          />
                          <label htmlFor={`share-${a.id}`} style={{ margin: 0, fontWeight: 'normal', flex: 1 }}>{a.name}</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="%"
                            className="share-pct-input"
                            value={percentages[a.id] ?? ''}
                            onChange={e => setPercentages(prev => ({ ...prev, [a.id]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </fieldset>
                    <button type="submit" className="btn btn-small" disabled={selectedPartners.length === 0}>Enviar invitación</button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <h3>Propiedad compartida</h3>
              <p className="muted">Esta propiedad pertenece a <strong>{owner.name}</strong> y fue compartida con vos. Se actualiza automáticamente si la inmobiliaria dueña cambia el precio o los datos.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
