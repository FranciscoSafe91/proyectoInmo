import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, MapPin, Plus, Ruler, Search, Share2, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, TYPE_LABELS, OPERATION_LABELS } from '../utils.js';

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

const AMBIENTES_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '1', label: '1 ambiente' },
  { value: '2', label: '2 ambientes' },
  { value: '3', label: '3 ambientes' },
  { value: '4', label: '4 ambientes' },
  { value: '5', label: '5+ ambientes' },
];

export default function Properties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterAmbientes, setFilterAmbientes] = useState('');
  const [filterPrecioMin, setFilterPrecioMin] = useState('');
  const [filterPrecioMax, setFilterPrecioMax] = useState('');

  useEffect(() => {
    api.get('/propiedades').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { properties, sharesByProperty, coverMediaByProperty = {} } = data;

  const zonas = [...new Set(
    properties.flatMap(p => [p.city, p.province].filter(Boolean))
  )].sort();

  function handleSearch(e) {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function clearFilters() {
    setFilterOperation('');
    setFilterType('');
    setFilterZona('');
    setFilterAmbientes('');
    setFilterPrecioMin('');
    setFilterPrecioMax('');
    setSearchInput('');
    setSearchQuery('');
  }

  const hasActiveFilters = filterOperation || filterType || filterZona || filterAmbientes || filterPrecioMin || filterPrecioMax || searchQuery;

  const q = searchQuery.toLowerCase();
  const filteredProperties = properties.filter(p => {
    if (q && !(
      (p.title || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.province || '').toLowerCase().includes(q) ||
      (typeLabel(p.type) || '').toLowerCase().includes(q) ||
      (operationLabel(p.operation) || '').toLowerCase().includes(q)
    )) return false;
    if (filterOperation && p.operation !== filterOperation) return false;
    if (filterType && p.type !== filterType) return false;
    if (filterZona && p.city !== filterZona && p.province !== filterZona) return false;
    if (filterAmbientes) {
      const beds = Number(p.bedrooms) || 0;
      if (filterAmbientes === '5') { if (beds < 5) return false; }
      else { if (beds !== Number(filterAmbientes)) return false; }
    }
    if (filterPrecioMin && Number(p.price) < Number(filterPrecioMin)) return false;
    if (filterPrecioMax && Number(p.price) > Number(filterPrecioMax)) return false;
    return true;
  });

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

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Buscar por título, ciudad, provincia, tipo..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <button type="submit" className="btn">
          <Search size={16} aria-hidden="true" /> Buscar
        </button>
      </form>

      <div className="property-filters">
        <div className="property-filters-header">
          <span className="property-filters-label"><SlidersHorizontal size={15} aria-hidden="true" /> Filtros</span>
          {hasActiveFilters && (
            <button className="btn-link" onClick={clearFilters}>
              <X size={14} aria-hidden="true" /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="property-filters-row">
          <select value={filterOperation} onChange={e => setFilterOperation(e.target.value)}>
            <option value="">Tipo de operación</option>
            {Object.entries(OPERATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tipo de propiedad</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select value={filterZona} onChange={e => setFilterZona(e.target.value)}>
            <option value="">Zona</option>
            {zonas.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          <select value={filterAmbientes} onChange={e => setFilterAmbientes(e.target.value)}>
            {AMBIENTES_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.value === '' ? 'Ambientes' : o.label}</option>
            ))}
          </select>

          <div className="filter-price-range">
            <input
              type="number"
              placeholder="Precio mín."
              value={filterPrecioMin}
              onChange={e => setFilterPrecioMin(e.target.value)}
              min="0"
            />
            <span className="filter-price-sep">–</span>
            <input
              type="number"
              placeholder="Precio máx."
              value={filterPrecioMax}
              onChange={e => setFilterPrecioMax(e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>

      {filteredProperties.length === 0 && properties.length > 0 ? (
        <div className="empty-state empty-state-card">
          <Search size={38} aria-hidden="true" />
          <h2>Sin resultados</h2>
          <p>No hay propiedades que coincidan con "{searchQuery}".</p>
          <button className="btn btn-secondary" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
            Limpiar búsqueda
          </button>
        </div>
      ) : filteredProperties.length === 0 ? (
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
          {filteredProperties.map(p => {
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
