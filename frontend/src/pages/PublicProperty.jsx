import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Camera, ChevronLeft, ChevronRight, Film, X } from 'lucide-react';
import { api } from '../api.js';
import {
  money, typeLabel, operationLabel,
  ESTADO_LABELS, AGUA_CALIENTE_LABELS, CALEFACCION_LABELS, LUMINOSIDAD_LABELS,
  VIGILANCIA_LABELS, PISO_LABELS, TECHO_LABELS, COSTA_LABELS, VISTA_LABELS, ORIENTACION_LABELS,
} from '../utils.js';

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

export default function PublicProperty() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const via = searchParams.get('via') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/propiedades/${id}${via ? `?via=${via}` : ''}`).then(setData).catch(e => setError(e.message));
  }, [id, via]);

  if (error) return <div className="card"><h1>Propiedad no disponible</h1><p className="muted">Esta propiedad no existe o ya no está publicada.</p></div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { property, media, owner, viaAgency, contactAgency = owner } = data;
  const imageMedia = (media || []).filter(m => m.type === 'image');
  const esBarrioCerrado = !!property.barrioCerrado;

  const characteristics = [
    { label: 'Dormitorios', value: property.bedrooms || null },
    { label: 'Baños', value: property.bathrooms || null },
    { label: 'Cocheras cubiertas', value: property.cocherasCubiertas || null },
    { label: 'Cocheras descubiertas', value: property.cocherasDescubiertas || null },
    { label: 'Cocheras semicubiertas', value: property.cocherasSemicubiertas || null },
    { label: 'Estado', value: ESTADO_LABELS[property.estadoPropiedad] || property.estadoPropiedad || null },
    { label: 'Antigüedad', value: property.aEstrenar ? 'A estrenar' : (property.antiguedad != null && property.antiguedad !== '') ? `${property.antiguedad} año${property.antiguedad !== 1 ? 's' : ''}` : null },
    { label: 'Plantas', value: property.plantas || null },
    { label: 'Disposición', value: property.disposicion || null },
    { label: 'Orientación', value: ORIENTACION_LABELS[property.orientacion] || property.orientacion || null },
    { label: 'Agua caliente', value: AGUA_CALIENTE_LABELS[property.aguaCaliente] || property.aguaCaliente || null },
    { label: 'Calefacción', value: CALEFACCION_LABELS[property.calefaccion] || property.calefaccion || null },
    { label: 'Luminosidad', value: LUMINOSIDAD_LABELS[property.luminosidad] || property.luminosidad || null },
    { label: 'Vigilancia', value: VIGILANCIA_LABELS[property.tipoVigilancia] || property.tipoVigilancia || null },
    { label: 'Tipo de piso', value: PISO_LABELS[property.tipoPiso] || property.tipoPiso || null },
    { label: 'Tipo de techo', value: TECHO_LABELS[property.tipoTecho] || property.tipoTecho || null },
    { label: 'Costa', value: COSTA_LABELS[property.tipoCosta] || property.tipoCosta || null },
    { label: 'Vista', value: VISTA_LABELS[property.tipoVista] || property.tipoVista || null },
    { label: 'Apto crédito', value: property.aptoCredito ? 'Sí' : null },
    { label: 'Apto profesional', value: property.aptoProf ? 'Sí' : null },
    { label: 'Zonificación', value: property.zonificacion || null },
  ].filter(c => c.value != null && c.value !== '');

  const superficies = [
    { label: 'Sup. total', value: property.superficieTotal ? `${property.superficieTotal} m²` : (property.areaM2 ? `${property.areaM2} m²` : null) },
    { label: 'Sup. cubierta', value: property.superficieCubierta ? `${property.superficieCubierta} m²` : null },
    { label: 'Sup. semicubierta', value: property.superficieSemicubierta ? `${property.superficieSemicubierta} m²` : null },
    { label: 'Sup. descubierta', value: property.superficieDescubierta ? `${property.superficieDescubierta} m²` : null },
    { label: 'Terreno', value: property.superficieTerreno ? `${property.superficieTerreno} m²` : null },
    { label: 'Ancho terreno', value: property.anchoTerreno ? `${property.anchoTerreno} m` : null },
    { label: 'Largo terreno', value: property.largoTerreno ? `${property.largoTerreno} m` : null },
    { label: 'Fondo libre', value: property.fondoLibre ? `${property.fondoLibre} m²` : null },
  ].filter(c => c.value != null);

  const serviciosList = Array.isArray(property.servicios) ? property.servicios : [];
  const instalacionesList = Array.isArray(property.instalaciones) ? property.instalaciones : [];
  const serviciosEdificioList = Array.isArray(property.serviciosEdificio) ? property.serviciosEdificio : [];
  const amenitiesList = Array.isArray(property.amenitiesEdificio) ? property.amenitiesEdificio : [];

  function TagList({ items }) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {items.map(item => (
          <span key={item} style={{ background: 'var(--app-bg-card, #f5f5f5)', border: '1px solid var(--app-border, #e0e0e0)', borderRadius: 6, padding: '3px 10px', fontSize: '0.85rem' }}>
            {item}
          </span>
        ))}
      </div>
    );
  }

  return (
    <>
      <h1>{property.title}</h1>
      <p className="subtitle">{typeLabel(property.type)} · {operationLabel(property.operation)}</p>

      {viaAgency && viaAgency.id !== owner.id && (
        <p className="muted">Compartida en la red de inmobiliarias socias por <strong>{owner.name}</strong>, publicada acá por <strong>{viaAgency.name}</strong>.</p>
      )}

      <PropertyMediaCarousel media={imageMedia} youtubeUrl={property.youtubeUrl} title={property.title} />

      <div className="card">
        <h3>{money(property.price, property.currency)}</h3>
        {property.expensas > 0 && (
          <p className="muted" style={{ marginTop: 4 }}>
            {property.expensasMoneda === 'USD' ? 'U$D' : '$'} {Number(property.expensas).toLocaleString('es-AR')} expensas
          </p>
        )}
        {property.description && <p style={{ marginTop: 10 }}>{property.description}</p>}

        <table style={{ marginTop: 12 }}>
          <tbody>
            {property.address && <tr><th>Dirección</th><td>{property.address}</td></tr>}
            {(property.entreCalles || property.yCalles) && (
              <tr><th>Entre calles</th><td>{[property.entreCalles, property.yCalles].filter(Boolean).join(' y ')}</td></tr>
            )}
            {(property.partido || property.city) && <tr><th>Localidad</th><td>{property.partido || property.city}{property.zonaGeografica ? `, ${property.zonaGeografica}` : ''}{property.province ? `, ${property.province}` : ''}</td></tr>}
          </tbody>
        </table>
      </div>

      {characteristics.length > 0 && (
        <div className="card">
          <h3>Características</h3>
          <table>
            <tbody>
              {characteristics.map(c => (
                <tr key={c.label}><th>{c.label}</th><td>{c.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {superficies.length > 0 && (
        <div className="card">
          <h3>Superficies</h3>
          <table>
            <tbody>
              {superficies.map(c => (
                <tr key={c.label}><th>{c.label}</th><td>{c.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {serviciosList.length > 0 && (
        <div className="card">
          <h3>Servicios</h3>
          <TagList items={serviciosList} />
        </div>
      )}

      {instalacionesList.length > 0 && (
        <div className="card">
          <h3>Instalaciones</h3>
          <TagList items={instalacionesList} />
        </div>
      )}

      {serviciosEdificioList.length > 0 && (
        <div className="card">
          <h3>{esBarrioCerrado ? 'Servicios del barrio' : 'Servicios del edificio'}</h3>
          <TagList items={serviciosEdificioList} />
        </div>
      )}

      {amenitiesList.length > 0 && (
        <div className="card">
          <h3>{esBarrioCerrado ? 'Amenities del barrio' : 'Amenities del edificio'}</h3>
          <TagList items={amenitiesList} />
        </div>
      )}

      <div className="card">
        <h3>Contacto</h3>
        {contactAgency.logoPath && (
          <img src={contactAgency.logoPath} alt={contactAgency.name} style={{ height: 48, objectFit: 'contain', marginBottom: 8, display: 'block' }} />
        )}
        <p><strong>{contactAgency.name}</strong></p>
        {contactAgency.city && <p className="muted">{contactAgency.city}</p>}
        <p>
          {contactAgency.email && <>✉️ {contactAgency.email}</>}
          {contactAgency.phone && <><br />📞 {contactAgency.phone}</>}
        </p>
      </div>
    </>
  );
}
