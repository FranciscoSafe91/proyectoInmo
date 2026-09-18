import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, MapPin, Ruler, Search, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

export default function SharedProperties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/compartidas').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { items } = data;

  function handleSearch(e) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  const q = searchQuery.toLowerCase();
  const filteredItems = q
    ? items.filter(({ property, ownerAgency }) =>
        (property.title || '').toLowerCase().includes(q) ||
        (property.city || '').toLowerCase().includes(q) ||
        (property.province || '').toLowerCase().includes(q) ||
        (typeLabel(property.type) || '').toLowerCase().includes(q) ||
        (operationLabel(property.operation) || '').toLowerCase().includes(q) ||
        (ownerAgency.name || '').toLowerCase().includes(q)
      )
    : items;

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Cartera colaborativa</span>
          <h1>Compartidas conmigo</h1>
          <p className="subtitle">Propiedades de inmobiliarias socias que aceptaste sumar a tu cartera. Se actualizan automáticamente.</p>
        </div>
        <Link className="btn btn-secondary" to="/invitaciones">
          Ver invitaciones <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {items.length === 0 ? (
        <div className="empty-state empty-state-card">
          <ShieldCheck size={38} aria-hidden="true" />
          <h2>No tenés propiedades compartidas</h2>
          <p>Cuando una inmobiliaria socia te comparta una propiedad y la aceptes, va a aparecer acá.</p>
          <Link className="btn" to="/invitaciones">
            Revisar invitaciones <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Buscar por título, ciudad, provincia, inmobiliaria..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn">
              <Search size={16} aria-hidden="true" /> Buscar
            </button>
          </form>

          {filteredItems.length === 0 ? (
            <div className="empty-state empty-state-card">
              <Search size={38} aria-hidden="true" />
              <h2>Sin resultados</h2>
              <p>No hay propiedades que coincidan con "{searchQuery}".</p>
              <button className="btn btn-secondary" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
                Limpiar búsqueda
              </button>
            </div>
          ) : (
          <div className="estate-grid">
            {filteredItems.map(({ property, ownerAgency, webPublishAuthorized }) => (
              <article key={property.id} className="estate-card">
                <Link className="estate-card-media" to={`/propiedades/${property.id}`} aria-label={`Ver ${property.title}`}>
                  <div className="estate-card-placeholder">
                    <Building2 size={34} aria-hidden="true" />
                    <span>{typeLabel(property.type) || 'Propiedad'}</span>
                  </div>
                  <div className="estate-card-badges">
                    <span className="badge badge-compartida">Compartida</span>
                    {webPublishAuthorized
                      ? <span className="badge badge-aceptada">Web autorizada</span>
                      : <span className="badge badge-borrador">Uso interno</span>}
                  </div>
                </Link>

                <div className="estate-card-body">
                  <div className="estate-card-top">
                    <div>
                      <span>{ownerAgency.name}</span>
                      <h2><Link to={`/propiedades/${property.id}`}>{property.title}</Link></h2>
                    </div>
                    <strong>{money(property.price, property.currency)}</strong>
                  </div>

                  <div className="estate-location">
                    <MapPin size={16} aria-hidden="true" />
                    <span>{property.city || 'Sin ciudad'}{property.province ? `, ${property.province}` : ''}</span>
                  </div>

                  <div className="estate-meta">
                    <span>{operationLabel(property.operation)}</span>
                    <span><BedDouble size={15} aria-hidden="true" />{property.bedrooms || 0} dorm.</span>
                    <span><Ruler size={15} aria-hidden="true" />{property.areaM2 || 0} m²</span>
                  </div>

                  <div className="estate-card-actions">
                    <Link to={`/propiedades/${property.id}`} className="btn btn-secondary btn-small">
                      Ver detalle <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          )}
          <p className="small muted helper-note">
            "Web autorizada" significa que la inmobiliaria dueña permite que también aparezca en tu feed/widget. Si figura como uso interno, podés trabajarla dentro del sistema pero no publicarla en tu web.
          </p>
        </>
      )}
    </>
  );
}
