import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, MapPin, Plus, Ruler, Search, Share2, SlidersHorizontal, X } from 'lucide-react';

function WhatsAppIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}
import { api } from '../api.js';
import { money, typeLabel, operationLabel, TYPE_LABELS, OPERATION_LABELS } from '../utils.js';
import { useAuth } from '../contexts/AuthContext.jsx';

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
  const { canDo, session } = useAuth();
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
        {canDo('crear_propiedades') && (
          <Link className="btn" to="/propiedades/nueva">
            <Plus size={17} aria-hidden="true" /> Nueva propiedad
          </Link>
        )}
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
                    <span><Ruler size={15} aria-hidden="true" />{p.superficieTotal || p.areaM2 || 0} m²</span>
                    <span><Share2 size={15} aria-hidden="true" />{sharedCount > 0 ? `${sharedCount} socio${sharedCount === 1 ? '' : 's'}` : 'Sin compartir'}</span>
                  </div>

                  <div className="estate-card-actions">
                    <Link to={`/propiedades/${p.id}`} className="btn btn-secondary btn-small">
                      Gestionar <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <a
                      className="btn btn-small"
                      style={{ background: '#25D366', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      href={`https://wa.me/?text=${encodeURIComponent(`Mirá esta propiedad: ${window.location.origin}/public/propiedades/${p.id}${session?.agency?.id ? `?via=${session.agency.id}` : ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsAppIcon size={14} /> Compartir
                    </a>
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
