import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, MapPin, Ruler, Search, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'precio_asc', label: 'Menor precio' },
  { value: 'pct_desc', label: 'Mayor porcentaje' },
  { value: 'pct_asc', label: 'Menor porcentaje' },
];

function sortItems(items, sortBy) {
  const sorted = [...items];
  if (sortBy === 'precio_desc') return sorted.sort((a, b) => (Number(b.property.price) || 0) - (Number(a.property.price) || 0));
  if (sortBy === 'precio_asc') return sorted.sort((a, b) => (Number(a.property.price) || 0) - (Number(b.property.price) || 0));
  if (sortBy === 'pct_desc') return sorted.sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
  if (sortBy === 'pct_asc') return sorted.sort((a, b) => (a.percentage ?? Infinity) - (b.percentage ?? Infinity));
  return sorted;
}

export default function SharedProperties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recientes');

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

  const sortedItems = sortItems(filteredItems, sortBy);

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
          <div className="list-controls">
            <form className="search-bar" onSubmit={handleSearch} style={{ flex: 1 }}>
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
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="sort-select"
              aria-label="Ordenar por"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {sortedItems.length === 0 ? (
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
            {sortedItems.map(({ property, ownerAgency, webPublishAuthorized, cover, percentage, percentageVendedor, percentageComprador, wholeBolsa }) => (
              <article key={property.id} className="estate-card">
                <Link className="estate-card-media" to={`/propiedades/${property.id}`} aria-label={`Ver ${property.title}`}>
                  {cover?.url
                    ? <img src={cover.url} alt={property.title} />
                    : <div className="estate-card-placeholder">
                        <Building2 size={34} aria-hidden="true" />
                        <span>{typeLabel(property.type) || 'Propiedad'}</span>
                      </div>
                  }
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

                  {(percentage != null || percentageVendedor != null || percentageComprador != null || wholeBolsa) && (
                    <div className="estate-meta" style={{ marginTop: 4 }}>
                      {wholeBolsa
                        ? <span style={{ fontWeight: 600, color: 'var(--app-primary)' }}>Toda la bolsa</span>
                        : <>
                            {percentage != null && <span style={{ fontWeight: 600, color: 'var(--app-primary)' }}>{percentage}%</span>}
                            {percentageVendedor != null && <span className="muted small">Vend. {percentageVendedor}%</span>}
                            {percentageComprador != null && <span className="muted small">Comp. {percentageComprador}%</span>}
                          </>
                      }
                    </div>
                  )}

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
