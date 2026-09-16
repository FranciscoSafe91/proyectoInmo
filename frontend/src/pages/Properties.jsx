import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, MapPin, Plus, Ruler, Share2 } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function PropertyCover({ cover, property }) {
  if (cover?.type === 'image') {
    return <img src={cover.url} alt={property.title} />;
  }

  return (
    <div className="estate-card-placeholder">
      <Building2 size={34} aria-hidden="true" />
      <span>{typeLabel(property.type) || 'Propiedad'}</span>
    </div>
  );
}

export default function Properties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/propiedades').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { properties, sharesByProperty, coverMediaByProperty = {} } = data;

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Inventario propio</span>
          <h1>Mis propiedades</h1>
          <p className="subtitle">Gestioná tus publicaciones, su estado y con qué socios están circulando.</p>
        </div>
        <Link className="btn" to="/propiedades/nueva">
          <Plus size={17} aria-hidden="true" /> Nueva propiedad
        </Link>
      </section>

      {properties.length === 0 ? (
        <div className="empty-state empty-state-card">
          <Building2 size={38} aria-hidden="true" />
          <h2>Todavía no cargaste propiedades</h2>
          <p>Sumá tu primera publicación para empezar a compartirla con socios o usarla en tus alertas.</p>
          <Link className="btn" to="/propiedades/nueva">
            Cargar propiedad <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="estate-grid">
          {properties.map(p => {
            const shares = sharesByProperty[p.id] || [];
            const sharedCount = shares.filter(s => s.status !== 'rechazada').length;
            const cover = coverMediaByProperty[p.id];
            return (
              <article key={p.id} className="estate-card">
                <Link className="estate-card-media" to={`/propiedades/${p.id}`} aria-label={`Ver ${p.title}`}>
                  <PropertyCover cover={cover} property={p} />
                  <div className="estate-card-badges">
                    <StatusBadge status={p.status} />
                    <span className="badge badge-borrador">{operationLabel(p.operation)}</span>
                  </div>
                </Link>

                <div className="estate-card-body">
                  <div className="estate-card-top">
                    <div>
                      <span>{typeLabel(p.type)}</span>
                      <h2><Link to={`/propiedades/${p.id}`}>{p.title}</Link></h2>
                    </div>
                    <strong>{money(p.price, p.currency)}</strong>
                  </div>

                  <div className="estate-location">
                    <MapPin size={16} aria-hidden="true" />
                    <span>{p.city || 'Sin ciudad'}{p.province ? `, ${p.province}` : ''}</span>
                  </div>

                  <div className="estate-meta">
                    <span><BedDouble size={15} aria-hidden="true" />{p.bedrooms || 0} dorm.</span>
                    <span><Ruler size={15} aria-hidden="true" />{p.areaM2 || 0} m²</span>
                    <span><Share2 size={15} aria-hidden="true" />{sharedCount > 0 ? `${sharedCount} socio${sharedCount === 1 ? '' : 's'}` : 'Sin compartir'}</span>
                  </div>

                  <div className="estate-card-actions">
                    <Link to={`/propiedades/${p.id}`} className="btn btn-secondary btn-small">
                      Gestionar <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
