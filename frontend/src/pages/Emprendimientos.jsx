import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Home, MapPin, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function EmprendimientoCover({ cover, emprendimiento }) {
  if (cover?.type === 'image') {
    return <img src={cover.url} alt={emprendimiento.nombre} />;
  }
  return (
    <div className="estate-card-placeholder">
      <Building2 size={34} aria-hidden="true" />
      <span>{emprendimiento.tipo || 'Emprendimiento'}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export default function Emprendimientos() {
  const { canDo } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterZona, setFilterZona] = useState('');

  useEffect(() => {
    api.get('/emprendimientos').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { emprendimientos, coverMediaByEmprendimiento = {}, propiedadesByEmprendimiento = {} } = data;

  const zonas = [...new Set(
    emprendimientos.flatMap(e => [e.ciudad, e.provincia].filter(Boolean))
  )].sort();

  const tipos = [...new Set(emprendimientos.map(e => e.tipo).filter(Boolean))].sort();

  function handleSearch(ev) {
    ev.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  function clearFilters() {
    setFilterTipo('');
    setFilterZona('');
    setSearchInput('');
    setSearchQuery('');
  }

  const hasActiveFilters = filterTipo || filterZona || searchQuery;

  const q = searchQuery.toLowerCase();
  const filtered = emprendimientos.filter(e => {
    if (q && !(
      (e.nombre || '').toLowerCase().includes(q) ||
      (e.ciudad || '').toLowerCase().includes(q) ||
      (e.provincia || '').toLowerCase().includes(q) ||
      (e.tipo || '').toLowerCase().includes(q)
    )) return false;
    if (filterTipo && e.tipo !== filterTipo) return false;
    if (filterZona && e.ciudad !== filterZona && e.provincia !== filterZona) return false;
    return true;
  });

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Emprendimientos</span>
          <h1>Mis emprendimientos</h1>
          <p className="subtitle">Gestioná tus emprendimientos inmobiliarios y su disponibilidad.</p>
        </div>
        {canDo('crear_propiedades') && (
          <Link className="btn" to="/emprendimientos/nueva">
            <Plus size={17} aria-hidden="true" /> Nuevo emprendimiento
          </Link>
        )}
      </section>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Buscar por nombre, ciudad, provincia, tipo..."
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
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
            <option value="">Tipo de emprendimiento</option>
            {tipos.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select value={filterZona} onChange={e => setFilterZona(e.target.value)}>
            <option value="">Zona</option>
            {zonas.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 && emprendimientos.length > 0 ? (
        <div className="empty-state empty-state-card">
          <Search size={38} aria-hidden="true" />
          <h2>Sin resultados</h2>
          <p>No hay emprendimientos que coincidan con "{searchQuery}".</p>
          <button className="btn btn-secondary" onClick={() => { setSearchInput(''); setSearchQuery(''); }}>
            Limpiar búsqueda
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state empty-state-card">
          <Building2 size={38} aria-hidden="true" />
          <h2>Todavía no cargaste emprendimientos</h2>
          <p>Sumá tu primer emprendimiento para empezar a gestionarlo.</p>
          {canDo('crear_propiedades') && (
            <Link className="btn" to="/emprendimientos/nueva">
              Cargar emprendimiento <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      ) : (
        <div className="estate-grid">
          {filtered.map(e => {
            const cover = coverMediaByEmprendimiento[e.id];
            return (
              <article key={e.id} className="estate-card">
                <Link className="estate-card-media" to={`/emprendimientos/${e.id}`} aria-label={`Ver ${e.nombre}`}>
                  <EmprendimientoCover cover={cover} emprendimiento={e} />
                  <div className="estate-card-badges">
                    <StatusBadge status={e.status || 'activo'} />
                    {e.tipo && <span className="badge badge-borrador">{e.tipo}</span>}
                  </div>
                </Link>

                <div className="estate-card-body">
                  <div className="estate-card-top">
                    <div>
                      <span>{e.tipo || 'Emprendimiento'}</span>
                      <h2><Link to={`/emprendimientos/${e.id}`}>{e.nombre}</Link></h2>
                    </div>
                  </div>

                  <div className="estate-location">
                    <MapPin size={16} aria-hidden="true" />
                    <span>{e.partido || 'Sin ciudad'}{e.zonaGeografica ? `, ${e.zonaGeografica}` : ''}</span>
                  </div>

                  <div className="estate-meta">
                    <span>
                      <Home size={15} aria-hidden="true" />
                      {propiedadesByEmprendimiento[e.id]
                        ? `${propiedadesByEmprendimiento[e.id]} propiedad${propiedadesByEmprendimiento[e.id] === 1 ? '' : 'es'}`
                        : 'Sin propiedades'}
                    </span>
                  </div>

                  <div className="estate-card-actions">
                    <Link to={`/emprendimientos/${e.id}`} className="btn btn-secondary btn-small">
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
