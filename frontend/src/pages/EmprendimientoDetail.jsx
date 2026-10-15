import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Building2, Camera, ChevronLeft, ChevronRight, Film, MapPin, X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const ETAPA_LABEL = {
  en_pozo: 'En Pozo',
  en_construccion: 'En construcción',
  terminado: 'Terminado',
};

function getYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
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

function MediaCarousel({ media, youtubeUrl, title }) {
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
        <span>Este emprendimiento todavía no tiene fotos o videos.</span>
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
            </div>
          ) : activeItem.type === 'video' ? (
            <video src={activeItem.url} />
          ) : (
            <img src={activeItem.url} alt={title} />
          )}

          {allItems.length > 1 && (
            <>
              <button type="button" className="gallery-arrow left" onClick={e => move(e, -1)} aria-label="Ver anterior">
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" className="gallery-arrow right" onClick={e => move(e, 1)} aria-label="Ver siguiente">
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

export default function EmprendimientoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canDo } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/emprendimientos/${id}`).then(setData).catch(e => setError(e.message));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('¿Seguro que querés eliminar este emprendimiento? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await api.delete(`/emprendimientos/${id}`);
      navigate('/emprendimientos');
    } catch (e) {
      setError(e.data?.error || 'Error al eliminar el emprendimiento.');
      setDeleting(false);
    }
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { emprendimiento: e, media = [] } = data;

  const direccion = [e.calle, e.nroCalle].filter(Boolean).join(' ');
  const ubicacion = [e.localidad, e.partido, e.zonaGeografica].filter(Boolean).join(', ');

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Link to="/emprendimientos" className="btn btn-secondary btn-small" style={{ marginBottom: 8 }}>
            ← Volver
          </Link>
          <h1>{e.nombre}</h1>
          <p className="subtitle">
            {ETAPA_LABEL[e.etapaObra] || e.etapaObra}
            {e.fechaEntrega ? ` · Entrega: ${e.fechaEntrega}` : ''}
            {e.leyendaComercial ? ` · ${e.leyendaComercial}` : ''}
          </p>
        </div>
        <span className={`badge badge-${e.estado || 'vigente'}`}>{e.estado || 'vigente'}</span>
      </div>

      <div className="property-detail-grid">
        <div>
          {e.logoUrl && (
            <div style={{ marginBottom: 16 }}>
              <img src={e.logoUrl} alt={`Logo ${e.nombre}`} style={{ maxHeight: 80, borderRadius: 6 }} />
            </div>
          )}

          <MediaCarousel media={media} youtubeUrl={e.youtubeUrl} title={e.nombre} />

          <div className="card">
            <p>{e.descripcion || <span className="muted">Sin descripción.</span>}</p>

            <table>
              <tbody>
                {direccion && <tr><th>Dirección</th><td>{direccion}</td></tr>}
                {e.entreCalles && <tr><th>Entre calles</th><td>{e.entreCalles}{e.yCalles ? ` y ${e.yCalles}` : ''}</td></tr>}
                {ubicacion && <tr><th>Ubicación</th><td><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />{ubicacion}</td></tr>}
                {e.cercaDe && <tr><th>Cerca de</th><td>{e.cercaDe}</td></tr>}
                {e.dptosPorPiso && <tr><th>Dptos. por piso</th><td>{e.dptosPorPiso}</td></tr>}
                {e.cantidadPisos && <tr><th>Pisos</th><td>{e.cantidadPisos}</td></tr>}
                {e.cantidadDptos && <tr><th>Departamentos</th><td>{e.cantidadDptos}</td></tr>}
                {e.cantidadAscensores && <tr><th>Ascensores</th><td>{e.cantidadAscensores}</td></tr>}
                {e.paginaWeb && (
                  <tr>
                    <th>Página web</th>
                    <td><a href={e.paginaWeb} target="_blank" rel="noopener noreferrer">{e.paginaWeb}</a></td>
                  </tr>
                )}
              </tbody>
            </table>

            {e.conFinanciacion && (
              <>
                <h3 style={{ marginTop: 20 }}>Financiación</h3>
                <table>
                  <tbody>
                    {e.anticipo && <tr><th>Anticipo</th><td>{e.anticipo}%</td></tr>}
                    {e.cuotas && <tr><th>Cuotas</th><td>{e.cuotas}</td></tr>}
                    {e.financia && <tr><th>Financia</th><td>{e.financia}</td></tr>}
                    {e.descripcionFinanciacion && <tr><th>Detalle</th><td>{e.descripcionFinanciacion}</td></tr>}
                  </tbody>
                </table>
              </>
            )}

            {(e.servicios?.length > 0 || e.instalaciones?.length > 0) && (
              <>
                {e.servicios?.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 20 }}>Servicios</h3>
                    <div className="tag-list">
                      {e.servicios.map(s => <span key={s} className="tag">{s}</span>)}
                    </div>
                  </>
                )}
                {e.instalaciones?.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 20 }}>Instalaciones</h3>
                    <div className="tag-list">
                      {e.instalaciones.map(s => <span key={s} className="tag">{s}</span>)}
                    </div>
                  </>
                )}
              </>
            )}

            {(e.construye || e.comercializa || e.dirige || e.administra) && (
              <>
                <h3 style={{ marginTop: 20 }}>Firmas responsables</h3>
                <table>
                  <tbody>
                    {e.construye && <tr><th>Construye</th><td>{e.construye}</td></tr>}
                    {e.comercializa && <tr><th>Comercializa</th><td>{e.comercializa}</td></tr>}
                    {e.dirige && <tr><th>Dirige</th><td>{e.dirige}</td></tr>}
                    {e.administra && <tr><th>Administra</th><td>{e.administra}</td></tr>}
                  </tbody>
                </table>
              </>
            )}

            <div className="btn-row" style={{ marginTop: 20 }}>
              {canDo('editar_propiedades') && (
                <Link className="btn btn-secondary btn-small" to={`/emprendimientos/${e.id}/editar`}>
                  Editar emprendimiento
                </Link>
              )}
              {canDo('eliminar_propiedades') && (
                <button className="btn btn-danger btn-small" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3><Building2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Emprendimiento</h3>
            <table>
              <tbody>
                <tr><th>Estado</th><td><span className={`badge badge-${e.estado || 'vigente'}`}>{e.estado || 'vigente'}</span></td></tr>
                <tr><th>Etapa</th><td>{ETAPA_LABEL[e.etapaObra] || e.etapaObra}</td></tr>
                {e.fechaEntrega && <tr><th>Fecha de entrega</th><td>{e.fechaEntrega}</td></tr>}
              </tbody>
            </table>
          </div>

          {e.latitud && e.longitud && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <iframe
                title="Mapa del emprendimiento"
                width="100%"
                height="260"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(e.longitud) - 0.005},${Number(e.latitud) - 0.005},${Number(e.longitud) + 0.005},${Number(e.latitud) + 0.005}&layer=mapnik&marker=${e.latitud},${e.longitud}`}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
