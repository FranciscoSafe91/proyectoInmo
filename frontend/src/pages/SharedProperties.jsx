import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, ChevronDown, MapPin, Ruler, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, TYPE_LABELS } from '../utils.js';

const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'precio_asc', label: 'Menor precio' },
  { value: 'pct_desc', label: 'Mayor porcentaje' },
  { value: 'pct_asc', label: 'Menor porcentaje' },
];

const CARACTERISTICAS = [
  { key: 'electricidad', label: 'Electricidad', servicio: 'Electricidad' },
  { key: 'agua', label: 'Agua corriente', servicio: 'Agua Corriente' },
  { key: 'gas', label: 'Gas natural', servicio: 'Gas' },
  { key: 'aptoCredito', label: 'Apto Crédito', special: true },
];

const BEDROOMS_OPTIONS = ['1', '2', '3', '4', '5'];
const BATHROOMS_OPTIONS = ['1', '2', '3', '4', '5'];
const COCHERAS_OPTIONS = ['0', '1', '2', '3', '4'];

const EMPTY_FILTERS = {
  operation: '', type: '', currency: '',
  minPrice: '', maxPrice: '',
  minBedrooms: '', minBathrooms: '',
  minCocheras: '',
  minSup: '', maxSup: '',
  aptoCredito: false,
  servicios: [],
};

function countActiveExtra(f) {
  let n = 0;
  if (f.minBathrooms) n++;
  if (f.minCocheras) n++;
  if (f.minSup || f.maxSup) n++;
  if (f.aptoCredito) n++;
  if (f.servicios.length) n++;
  return n;
}

function sortItems(items, sortBy) {
  const sorted = [...items];
  if (sortBy === 'precio_desc') return sorted.sort((a, b) => (Number(b.property.price) || 0) - (Number(a.property.price) || 0));
  if (sortBy === 'precio_asc') return sorted.sort((a, b) => (Number(a.property.price) || 0) - (Number(b.property.price) || 0));
  if (sortBy === 'pct_desc') return sorted.sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1));
  if (sortBy === 'pct_asc') return sorted.sort((a, b) => (a.percentage ?? Infinity) - (b.percentage ?? Infinity));
  return sorted;
}

function PriceDropdown({ currency, minPrice, maxPrice, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hasValue = currency || minPrice || maxPrice;
  const label = hasValue
    ? [currency, minPrice && `Desde ${minPrice}`, maxPrice && `Hasta ${maxPrice}`].filter(Boolean).join(' · ')
    : 'Precio';

  return (
    <div className="sf-dropdown-wrap" ref={ref}>
      <button
        type="button"
        className={'sf-dropdown-btn' + (hasValue ? ' sf-dropdown-btn--active' : '')}
        onClick={() => setOpen(o => !o)}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="sf-dropdown-panel">
          <div className="sf-dropdown-row">
            <label className="sf-label">Moneda</label>
            <select value={currency} onChange={e => onChange('currency', e.target.value)}>
              <option value="">Cualquiera</option>
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
          <div className="sf-dropdown-row">
            <label className="sf-label">Precio mínimo</label>
            <input type="number" placeholder="Sin mínimo" min="0" value={minPrice}
              onChange={e => onChange('minPrice', e.target.value)} />
          </div>
          <div className="sf-dropdown-row">
            <label className="sf-label">Precio máximo</label>
            <input type="number" placeholder="Sin máximo" min="0" value={maxPrice}
              onChange={e => onChange('maxPrice', e.target.value)} />
          </div>
          <button className="btn btn-secondary btn-small" style={{ marginTop: 8 }}
            onClick={() => { onChange('currency', ''); onChange('minPrice', ''); onChange('maxPrice', ''); setOpen(false); }}>
            Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

function BtnGroup({ options, value, onChange, suffix = '+', zeroLabel }) {
  return (
    <div className="sf-btn-group">
      {options.map(opt => {
        const label = opt === '0' ? (zeroLabel ?? '0') : `${opt}${suffix}`;
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            className={'sf-btn-opt' + (active ? ' sf-btn-opt--active' : '')}
            onClick={() => onChange(active ? '' : opt)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function SharedProperties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recientes');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showMore, setShowMore] = useState(false);

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

  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  function toggleServicio(servicio) {
    setFilters(f => ({
      ...f,
      servicios: f.servicios.includes(servicio)
        ? f.servicios.filter(s => s !== servicio)
        : [...f.servicios, servicio],
    }));
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
    setSearchInput('');
    setSearchQuery('');
  }

  const q = searchQuery.toLowerCase();

  const filteredItems = items.filter(({ property, ownerAgency }) => {
    if (q && !(
      (property.title || '').toLowerCase().includes(q) ||
      (property.city || '').toLowerCase().includes(q) ||
      (property.province || '').toLowerCase().includes(q) ||
      (property.partido || '').toLowerCase().includes(q) ||
      (property.localidad || '').toLowerCase().includes(q) ||
      (typeLabel(property.type) || '').toLowerCase().includes(q) ||
      (operationLabel(property.operation) || '').toLowerCase().includes(q) ||
      (ownerAgency.name || '').toLowerCase().includes(q)
    )) return false;

    if (filters.operation && property.operation !== filters.operation) return false;
    if (filters.type && property.type !== filters.type) return false;
    if (filters.currency && property.currency !== filters.currency) return false;
    if (filters.minPrice && Number(property.price) < Number(filters.minPrice)) return false;
    if (filters.maxPrice && Number(property.price) > Number(filters.maxPrice)) return false;
    if (filters.minBedrooms && Number(property.bedrooms || 0) < Number(filters.minBedrooms)) return false;
    if (filters.minBathrooms && Number(property.bathrooms || 0) < Number(filters.minBathrooms)) return false;

    if (filters.minCocheras !== '') {
      const total = (property.cocherasCubiertas || 0) + (property.cocherasDescubiertas || 0) + (property.cocherasSemicubiertas || 0);
      if (Number(filters.minCocheras) === 0) {
        if (total > 0) return false;
      } else {
        if (total < Number(filters.minCocheras)) return false;
      }
    }

    const sup = property.superficieTotal || property.areaM2 || 0;
    if (filters.minSup && Number(sup) < Number(filters.minSup)) return false;
    if (filters.maxSup && Number(sup) > Number(filters.maxSup)) return false;

    if (filters.aptoCredito && !property.aptoCredito) return false;

    if (filters.servicios.length > 0) {
      const propServ = property.servicios || [];
      if (!filters.servicios.every(s => propServ.includes(s))) return false;
    }

    return true;
  });

  const sortedItems = sortItems(filteredItems, sortBy);

  const extraCount = countActiveExtra(filters);
  const anyFilter = filters.operation || filters.type || filters.currency || filters.minPrice ||
    filters.maxPrice || filters.minBedrooms || extraCount > 0 || q;

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
          {/* ── Barra de búsqueda ── */}
          <form className="search-bar" onSubmit={handleSearch} style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Ingresá ubicación, título o inmobiliaria..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn">
              <Search size={16} aria-hidden="true" /> Buscar
            </button>
          </form>

          {/* ── Barra de filtros ── */}
          <div className="sf-bar">
            <select className="sf-select" value={filters.operation} onChange={e => setFilter('operation', e.target.value)}>
              <option value="">Operación</option>
              <option value="venta">Venta</option>
              <option value="alquiler">Alquiler</option>
            </select>

            <select className="sf-select" value={filters.type} onChange={e => setFilter('type', e.target.value)}>
              <option value="">Propiedad</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <PriceDropdown
              currency={filters.currency}
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              onChange={setFilter}
            />

            <div className="sf-dropdown-wrap sf-dormitorios">
              <span className="sf-inline-label">Dorm.</span>
              <BtnGroup
                options={BEDROOMS_OPTIONS}
                value={filters.minBedrooms}
                onChange={v => setFilter('minBedrooms', v)}
              />
            </div>

            <button
              type="button"
              className={'sf-more-btn' + (extraCount > 0 ? ' sf-more-btn--active' : '')}
              onClick={() => setShowMore(s => !s)}
            >
              <SlidersHorizontal size={15} />
              Más filtros
              {extraCount > 0 && <span className="sf-more-count">{extraCount}</span>}
              <ChevronDown size={13} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>

            <select className="sf-select sf-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* ── Panel "Más filtros" ── */}
          {showMore && (
            <div className="sf-more-panel">
              <div className="sf-more-grid">
                <div className="sf-more-section">
                  <span className="sf-more-title">Baños</span>
                  <BtnGroup options={BATHROOMS_OPTIONS} value={filters.minBathrooms}
                    onChange={v => setFilter('minBathrooms', v)} />
                </div>

                <div className="sf-more-section">
                  <span className="sf-more-title">Cocheras</span>
                  <BtnGroup options={COCHERAS_OPTIONS} value={filters.minCocheras}
                    onChange={v => setFilter('minCocheras', v)} zeroLabel="Sin cochera" suffix="+" />
                </div>

                <div className="sf-more-section">
                  <span className="sf-more-title">Superficie total (m²)</span>
                  <div className="sf-range">
                    <input type="number" placeholder="Desde m²" min="0" value={filters.minSup}
                      onChange={e => setFilter('minSup', e.target.value)} />
                    <span className="sf-range-sep">—</span>
                    <input type="number" placeholder="Hasta m²" min="0" value={filters.maxSup}
                      onChange={e => setFilter('maxSup', e.target.value)} />
                  </div>
                </div>

                <div className="sf-more-section">
                  <span className="sf-more-title">Características</span>
                  <div className="sf-checks">
                    {CARACTERISTICAS.map(c => {
                      const checked = c.special
                        ? filters.aptoCredito
                        : filters.servicios.includes(c.servicio);
                      return (
                        <label key={c.key} className="sf-check">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => c.special
                              ? setFilter('aptoCredito', !filters.aptoCredito)
                              : toggleServicio(c.servicio)}
                          />
                          {c.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-secondary btn-small"
                  onClick={() => setFilters(f => ({
                    ...f,
                    minBathrooms: '', minCocheras: '', minSup: '', maxSup: '',
                    aptoCredito: false, servicios: [],
                  }))}>
                  Limpiar extras
                </button>
              </div>
            </div>
          )}

          {/* ── Resumen activo ── */}
          <div className="sf-summary">
            <span className="muted small">{filteredItems.length} propiedad{filteredItems.length !== 1 ? 'es' : ''}</span>
            {anyFilter && (
              <button type="button" className="btn-link" onClick={clearAll}>
                <X size={13} /> Limpiar todos los filtros
              </button>
            )}
          </div>

          {sortedItems.length === 0 ? (
            <div className="empty-state empty-state-card">
              <Search size={38} aria-hidden="true" />
              <h2>Sin resultados</h2>
              <p>No hay propiedades que coincidan con los filtros aplicados.</p>
              <button className="btn btn-secondary" onClick={clearAll}>Limpiar filtros</button>
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
                      <span><Ruler size={15} aria-hidden="true" />{property.superficieTotal || property.areaM2 || 0} m²</span>
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
