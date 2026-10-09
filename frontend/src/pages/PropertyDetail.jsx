import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Camera, ChevronDown, ChevronLeft, ChevronRight, Copy, Film, Printer, Search, X } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, formatDate } from '../utils.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function getYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YoutubePlayIcon() {
  return (
    <svg viewBox="0 0 68 48" width="56" height="40" aria-hidden="true">
      <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C0 13.05 0 24 0 24s0 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C68 34.95 68 24 68 24s0-10.95-1.48-16.26z" fill="#f00" />
      <path d="M45 24L27 14v20" fill="#fff" />
    </svg>
  );
}

function Lightbox({ items, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const item = items[index];

  const move = useCallback((step) => {
    setIndex(i => (i + step + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [move, onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Cerrar galería">
          <X size={22} />
        </button>

        <div className="lightbox-media">
          {item.type === 'youtube' ? (
            <div className="lightbox-youtube">
              <iframe
                src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1`}
                title="Video de YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : item.type === 'video' ? (
            <video src={item.url} controls autoPlay className="lightbox-video" />
          ) : (
            <img src={item.url} alt="" className="lightbox-img" />
          )}
        </div>

        {items.length > 1 && (
          <>
            <button type="button" className="lightbox-arrow left" onClick={() => move(-1)} aria-label="Anterior">
              <ChevronLeft size={24} />
            </button>
            <button type="button" className="lightbox-arrow right" onClick={() => move(1)} aria-label="Siguiente">
              <ChevronRight size={24} />
            </button>
            <div className="lightbox-counter">{index + 1} / {items.length}</div>
          </>
        )}
      </div>
    </div>
  );
}

function PropertyMediaCarousel({ media, youtubeUrl, title }) {
  const youtubeId = getYoutubeId(youtubeUrl);
  const allItems = [
    ...media,
    ...(youtubeId ? [{ id: 'yt', type: 'youtube', youtubeId, thumbUrl: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` }] : []),
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!allItems.length) {
    return (
      <div className="property-media-empty">
        <Camera size={34} aria-hidden="true" />
        <span>Esta propiedad todavía no tiene fotos o videos cargados.</span>
      </div>
    );
  }

  const activeItem = allItems[activeIndex];

  function move(e, step) {
    e.stopPropagation();
    setActiveIndex(current => (current + step + allItems.length) % allItems.length);
  }

  return (
    <>
      <section className="property-gallery-card">
        <div
          className="property-gallery-stage gallery-stage-clickable"
          onClick={() => setLightboxIndex(activeIndex)}
          role="button"
          tabIndex={0}
          aria-label="Abrir galería"
          onKeyDown={e => e.key === 'Enter' && setLightboxIndex(activeIndex)}
        >
          {activeItem.type === 'youtube' ? (
            <div className="gallery-yt-stage">
              <img src={activeItem.thumbUrl} alt={title} />
              <div className="gallery-yt-play"><YoutubePlayIcon /></div>
            </div>
          ) : activeItem.type === 'video' ? (
            <video src={activeItem.url} />
          ) : (
            <img src={activeItem.url} alt={title} />
          )}

          {allItems.length > 1 && (
            <>
              <button type="button" className="gallery-arrow left" onClick={e => move(e, -1)} aria-label="Ver archivo anterior">
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" className="gallery-arrow right" onClick={e => move(e, 1)} aria-label="Ver siguiente archivo">
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {allItems.length > 1 && (
          <div className="property-gallery-thumbs">
            {allItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === activeIndex ? 'active' : ''}
                onClick={() => setActiveIndex(index)}
                aria-label={`Ver archivo ${index + 1}`}
              >
                {item.type === 'youtube' ? (
                  <div className="thumb-yt">
                    <img src={item.thumbUrl} alt="YouTube" />
                    <div className="thumb-yt-badge"><Film size={12} /></div>
                  </div>
                ) : item.type === 'video' ? (
                  <Film size={17} aria-hidden="true" />
                ) : (
                  <img src={item.url} alt="" />
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {lightboxIndex !== null && (
        <Lightbox items={allItems} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
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
  const { canDo } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [allowWebPublish, setAllowWebPublish] = useState(false);
  const [percentages, setPercentages] = useState({});
  const [percentagesVendedor, setPercentagesVendedor] = useState({});
  const [percentagesComprador, setPercentagesComprador] = useState({});
  const [wholeBolsa, setWholeBolsa] = useState({});
  const [comments, setComments] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [expandedPartners, setExpandedPartners] = useState(new Set());
  const [partnerSearch, setPartnerSearch] = useState('');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [grupos, setGrupos] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    api.get('/grupos-socios').then(r => setGrupos(r.grupos || [])).catch(() => {});
  }, []);

  function toggleExpand(id) {
    setExpandedPartners(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handlePartnerSearch(e) {
    e.preventDefault();
    setPartnerSearchQuery(partnerSearch.trim());
  }

  function handleSelectGroup(grupoId) {
    setSelectedGroup(grupoId);
    if (!grupoId) return;
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo) return;
    const availableIds = new Set(availablePartners.map(a => a.id));
    const toAdd = grupo.members.filter(memberId => availableIds.has(memberId));
    setSelectedPartners(prev => {
      const next = new Set(prev);
      toAdd.forEach(id => next.add(id));
      return Array.from(next);
    });
  }

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
      percentagesVendedor,
      percentagesComprador,
      wholeBolsa,
      comments,
    });
    setSelectedPartners([]);
    setAllowWebPublish(false);
    setPercentages({});
    setPercentagesVendedor({});
    setPercentagesComprador({});
    setWholeBolsa({});
    setComments({});
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
          <PropertyMediaCarousel media={media} youtubeUrl={property.youtubeUrl} title={property.title} />

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
              {isOwner && canDo('editar_propiedades') && <Link className="btn btn-secondary btn-small" to={`/propiedades/${property.id}/editar`}>Editar propiedad</Link>}
              <Link className="btn btn-secondary btn-small" to={`/propiedades/${property.id}/ficha`} target="_blank">
                <Printer size={15} aria-hidden="true" /> Ficha para imprimir
              </Link>
              {isOwner && canDo('editar_propiedades') && (
                <Link className="btn btn-secondary btn-small" to={`/propiedades/nueva?duplicarDe=${property.id}`}>
                  <Copy size={15} aria-hidden="true" /> Duplicar propiedad
                </Link>
              )}
              {isOwner && canDo('eliminar_propiedades') && (
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

              {canDo('compartir_propiedades') && <div className="card">
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
                      <div className="share-legend-row">
                        <legend>Elegí con quién compartir</legend>
                        <form className="share-search-bar" onSubmit={handlePartnerSearch}>
                          <input
                            type="text"
                            placeholder="Buscar socio..."
                            value={partnerSearch}
                            onChange={e => setPartnerSearch(e.target.value)}
                          />
                          <button type="submit" className="btn btn-small btn-secondary">
                            <Search size={14} aria-hidden="true" /> Buscar
                          </button>
                        </form>
                      </div>
                      {availablePartners
                        .filter(a => !partnerSearchQuery || a.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()))
                        .map(a => {
                          const isOpen = expandedPartners.has(a.id);
                          return (
                            <div key={a.id} className="share-partner-block">
                              <div className="share-partner-header">
                                <div className="checkbox-row" style={{ margin: 0 }}>
                                  <input
                                    type="checkbox"
                                    id={`share-${a.id}`}
                                    checked={selectedPartners.includes(a.id)}
                                    onChange={() => togglePartner(a.id)}
                                  />
                                  <label htmlFor={`share-${a.id}`} style={{ margin: 0, fontWeight: 600 }}>{a.name}</label>
                                </div>
                                <button
                                  type="button"
                                  className={`share-expand-btn${isOpen ? ' open' : ''}`}
                                  onClick={() => toggleExpand(a.id)}
                                  aria-expanded={isOpen}
                                  aria-label={isOpen ? 'Colapsar' : 'Expandir'}
                                >
                                  <ChevronDown size={16} aria-hidden="true" />
                                </button>
                              </div>
                              {isOpen && (
                                <>
                                  <div className="share-pct-cols">
                                    <div className="share-pct-col">
                                      <label className="share-pct-label">Del vendedor</label>
                                      <div className="share-pct-field">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          placeholder="1 al 4"
                                          className="share-pct-input"
                                          value={percentagesVendedor[a.id] ?? ''}
                                          onChange={e => setPercentagesVendedor(prev => ({ ...prev, [a.id]: e.target.value }))}
                                        />
                                        <span className="share-pct-unit">%</span>
                                      </div>
                                    </div>
                                    <div className="share-pct-col">
                                      <label className="share-pct-label">Del comprador</label>
                                      <div className="share-pct-field">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.01"
                                          placeholder="1 al 4"
                                          className="share-pct-input"
                                          value={percentagesComprador[a.id] ?? ''}
                                          onChange={e => setPercentagesComprador(prev => ({ ...prev, [a.id]: e.target.value }))}
                                        />
                                        <span className="share-pct-unit">%</span>
                                      </div>
                                    </div>
                                    <div className="share-pct-bolsa">
                                      <label className="share-pct-label">&nbsp;</label>
                                      <label className="checkbox-row" style={{ margin: 0, gap: 6 }}>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(wholeBolsa[a.id])}
                                          onChange={e => setWholeBolsa(prev => ({ ...prev, [a.id]: e.target.checked }))}
                                        />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Toda la bolsa</span>
                                      </label>
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Comentarios"
                                    className="share-comment-input"
                                    value={comments[a.id] ?? ''}
                                    onChange={e => setComments(prev => ({ ...prev, [a.id]: e.target.value }))}
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}
                    </fieldset>
                    {grupos.length > 0 && (
                      <div className="share-group-selector">
                        <span className="share-pct-label">Compartir con un grupo</span>
                        <div className="share-group-row">
                          <select
                            value={selectedGroup}
                            onChange={e => setSelectedGroup(e.target.value)}
                            className="share-group-select"
                          >
                            <option value="">Seleccioná un grupo...</option>
                            {grupos.map(g => (
                              <option key={g.id} value={g.id}>
                                {g.name} ({g.members.length} {g.members.length === 1 ? 'socio' : 'socios'})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-small btn-secondary"
                            disabled={!selectedGroup}
                            onClick={() => handleSelectGroup(selectedGroup)}
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    )}
                    <button type="submit" className="btn btn-small" disabled={selectedPartners.length === 0}>Enviar invitación</button>
                  </form>
                )}
              </div>}
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
