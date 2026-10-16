import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BedDouble, Building2, Check, Loader2, MapPin, Plus, Ruler, Search, Share2, SlidersHorizontal, Users, X } from 'lucide-react';

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

function ModalCompartirSocios({ propiedadesIds, onClose, onDone }) {
  const [socios, setSocios] = useState(null);
  const [loadingError, setLoadingError] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [pctVendedor, setPctVendedor] = useState('');
  const [pctComprador, setPctComprador] = useState('');
  const [wholeBolsa, setWholeBolsa] = useState(false);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, count, errores }
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get('/socios?q=')
      .then(d => setSocios(d.currentPartners || []))
      .catch(e => setLoadingError(e.message));
  }, []);

  function toggleSocio(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleEnviar(e) {
    e.preventDefault();
    setFormError('');

    if (seleccionados.length === 0) {
      setFormError('Seleccioná al menos un socio.');
      return;
    }
    if (!wholeBolsa && pctVendedor === '' && pctComprador === '') {
      setFormError('Completá los honorarios o marcá "Toda la bolsa".');
      return;
    }

    setEnviando(true);

    const percentagesVendedor = {};
    const percentagesComprador = {};
    const percentages = {};
    const wholeBolsaObj = {};
    const commentsObj = {};

    for (const agId of seleccionados) {
      if (pctVendedor !== '') {
        percentagesVendedor[agId] = pctVendedor;
        percentages[agId] = pctVendedor; // reutilizar para alquiler
      }
      if (pctComprador !== '') percentagesComprador[agId] = pctComprador;
      wholeBolsaObj[agId] = wholeBolsa;
      if (comentario.trim()) commentsObj[agId] = comentario.trim();
    }

    let exitosas = 0;
    const errores = [];

    await Promise.all(
      propiedadesIds.map(async (propId) => {
        try {
          await api.post(`/propiedades/${propId}/compartir`, {
            targetAgencyIds: seleccionados,
            allowWebPublish: false,
            percentages,
            percentagesVendedor,
            percentagesComprador,
            wholeBolsa: wholeBolsaObj,
            comments: commentsObj,
          });
          exitosas++;
        } catch (err) {
          errores.push(propId);
        }
      })
    );

    setEnviando(false);
    setResultado({ exitosas, errores });
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Compartir con socios</h3>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {resultado ? (
          <div style={{ padding: '24px 0 8px' }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>
              {resultado.exitosas} propiedad{resultado.exitosas !== 1 ? 'es' : ''} compartida{resultado.exitosas !== 1 ? 's' : ''} con éxito.
            </p>
            {resultado.errores.length > 0 && (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                {resultado.errores.length} no pudieron compartirse (quizás ya estaban compartidas con esos socios).
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn" onClick={() => { onDone(); onClose(); }}>Cerrar</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEnviar}>
            <div style={{ padding: '16px 0 4px' }}>
              <p className="muted" style={{ marginBottom: 12, fontSize: '0.9rem' }}>
                Se compartirán <strong>{propiedadesIds.length} propiedad{propiedadesIds.length !== 1 ? 'es' : ''}</strong> con los socios que elijas, con los mismos honorarios y comentario.
              </p>

              {/* Lista de socios */}
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.92rem' }}>Socios</p>
              {loadingError ? (
                <p className="banner banner-error">{loadingError}</p>
              ) : socios === null ? (
                <p className="muted"><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cargando socios...</p>
              ) : socios.length === 0 ? (
                <p className="muted">No tenés socios disponibles. <Link to="/socios">Sumá socios primero →</Link></p>
              ) : (
                <div className="bulk-socios-list">
                  {socios.map(s => (
                    <label key={s.id} className="bulk-socio-row">
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(s.id)}
                        onChange={() => toggleSocio(s.id)}
                      />
                      <span className="bulk-socio-name">{s.name}</span>
                      {s.city && <span className="muted" style={{ fontSize: '0.82rem' }}>{s.city}</span>}
                    </label>
                  ))}
                </div>
              )}

              {/* Honorarios */}
              <p style={{ fontWeight: 600, margin: '16px 0 8px', fontSize: '0.92rem' }}>Honorarios</p>
              <div className="share-pct-cols" style={{ marginBottom: 8 }}>
                <div className="share-pct-col">
                  <label className="share-pct-label">Del vendedor</label>
                  <div className="share-pct-field">
                    <input
                      type="number"
                      min="0" max="100" step="0.01"
                      placeholder="ej. 3"
                      className="share-pct-input"
                      value={pctVendedor}
                      onChange={e => setPctVendedor(e.target.value)}
                      disabled={wholeBolsa}
                    />
                    <span className="share-pct-unit">%</span>
                  </div>
                </div>
                <div className="share-pct-col">
                  <label className="share-pct-label">Del comprador</label>
                  <div className="share-pct-field">
                    <input
                      type="number"
                      min="0" max="100" step="0.01"
                      placeholder="ej. 3"
                      className="share-pct-input"
                      value={pctComprador}
                      onChange={e => setPctComprador(e.target.value)}
                      disabled={wholeBolsa}
                    />
                    <span className="share-pct-unit">%</span>
                  </div>
                </div>
                <div className="share-pct-bolsa">
                  <label className="share-pct-label">&nbsp;</label>
                  <label className="checkbox-row" style={{ margin: 0, gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={wholeBolsa}
                      onChange={e => {
                        setWholeBolsa(e.target.checked);
                        if (e.target.checked) { setPctVendedor(''); setPctComprador(''); }
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Toda la bolsa</span>
                  </label>
                </div>
              </div>
              <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>
                Para propiedades en alquiler se usa el % del vendedor.
              </p>

              {/* Comentario */}
              <input
                type="text"
                placeholder="Comentario (opcional)"
                className="share-comment-input"
                style={{ width: '100%', marginBottom: 4 }}
                value={comentario}
                onChange={e => setComentario(e.target.value)}
              />
            </div>

            {formError && <p className="banner banner-error" style={{ marginTop: 8 }}>{formError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={enviando || socios === null || socios.length === 0}>
                {enviando
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Compartiendo...</>
                  : <><Users size={15} /> Compartir</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Properties() {
  const { canDo, session } = useAuth();
  const [data, setData] = useState(null);
  const [emprendimientosMap, setEmprendimientosMap] = useState({});
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterZona, setFilterZona] = useState('');
  const [filterAmbientes, setFilterAmbientes] = useState('');
  const [filterPrecioMin, setFilterPrecioMin] = useState('');
  const [filterPrecioMax, setFilterPrecioMax] = useState('');
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [modalSociosOpen, setModalSociosOpen] = useState(false);

  useEffect(() => {
    api.get('/propiedades').then(setData).catch(e => setError(e.message));
    api.get('/emprendimientos').then(d => {
      const map = {};
      (d.emprendimientos || []).forEach(e => { map[e.id] = e.nombre; });
      setEmprendimientosMap(map);
    }).catch(() => {});
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

  const publicadas = filteredProperties.filter(p => p.status === 'publicada');

  function toggleSeleccion(id) {
    setSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodas() {
    setSeleccionadas(new Set(publicadas.map(p => p.id)));
  }

  function cancelarSeleccion() {
    setModoSeleccion(false);
    setSeleccionadas(new Set());
  }

  function compartirWhatsApp() {
    const via = session?.agency?.id ? `?via=${session.agency.id}` : '';
    const props = publicadas.filter(p => seleccionadas.has(p.id));
    const lines = props.map(p =>
      `• ${p.title || typeLabel(p.type)}${p.city ? ` — ${p.city}` : ''}: ${window.location.origin}/public/propiedades/${p.id}${via}`
    );
    const text = `Mirá estas propiedades:\n\n${lines.join('\n')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  const todasSeleccionadas = publicadas.length > 0 && publicadas.every(p => seleccionadas.has(p.id));
  const propiedadesSeleccionadasIds = [...seleccionadas];

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Inventario propio</span>
          <h1>Mis propiedades</h1>
          <p className="subtitle">Gestioná tus publicaciones, su estado y con qué socios están circulando.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!modoSeleccion && publicadas.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setModoSeleccion(true)}>
              <Share2 size={16} aria-hidden="true" /> Compartir
            </button>
          )}
          {canDo('crear_propiedades') && (
            <Link className="btn" to="/propiedades/nueva">
              <Plus size={17} aria-hidden="true" /> Nueva propiedad
            </Link>
          )}
        </div>
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
        <div className={`estate-grid${modoSeleccion ? ' estate-grid--seleccion' : ''}`}>
          {filteredProperties.map(p => {
            const shares = sharesByProperty[p.id] || [];
            const sharedCount = shares.filter(s => s.status !== 'rechazada').length;
            const cover = coverMediaByProperty[p.id];
            const isPublicada = p.status === 'publicada';
            const isSelected = seleccionadas.has(p.id);

            return (
              <article
                key={p.id}
                className={`estate-card${modoSeleccion && isPublicada ? ' estate-card--selectable' : ''}${isSelected ? ' estate-card--selected' : ''}`}
                onClick={modoSeleccion && isPublicada ? () => toggleSeleccion(p.id) : undefined}
              >
                {modoSeleccion && isPublicada && (
                  <div className={`estate-card-check${isSelected ? ' estate-card-check--active' : ''}`}>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </div>
                )}

                {modoSeleccion ? (
                  <div className="estate-card-media">
                    <PropertyCover cover={cover} property={p} />
                    <div className="estate-card-badges">
                      <StatusBadge status={p.status} />
                      <span className="badge badge-borrador">{operationLabel(p.operation)}</span>
                    </div>
                  </div>
                ) : (
                  <Link className="estate-card-media" to={`/propiedades/${p.id}`} aria-label={`Ver ${p.title}`}>
                    <PropertyCover cover={cover} property={p} />
                    <div className="estate-card-badges">
                      <StatusBadge status={p.status} />
                      <span className="badge badge-borrador">{operationLabel(p.operation)}</span>
                    </div>
                  </Link>
                )}

                <div className="estate-card-body">
                  <div className="estate-card-top">
                    <div>
                      <span>{typeLabel(p.type)}</span>
                      <h2>
                        {modoSeleccion
                          ? p.title
                          : <Link to={`/propiedades/${p.id}`}>{p.title}</Link>
                        }
                      </h2>
                    </div>
                    <strong>{money(p.price, p.currency)}</strong>
                  </div>

                  <div className="estate-location">
                    <MapPin size={16} aria-hidden="true" />
                    <span>{p.city || 'Sin ciudad'}{p.province ? `, ${p.province}` : ''}</span>
                  </div>

                  {p.emprendimientoId && emprendimientosMap[p.emprendimientoId] && (
                    <div className="estate-location" style={{ marginTop: 4 }}>
                      <Building2 size={14} aria-hidden="true" />
                      <span style={{ fontSize: '0.82em', color: 'var(--app-accent, #2563eb)' }}>
                        {emprendimientosMap[p.emprendimientoId]}
                      </span>
                    </div>
                  )}

                  <div className="estate-meta">
                    <span><BedDouble size={15} aria-hidden="true" />{p.bedrooms || 0} dorm.</span>
                    <span><Ruler size={15} aria-hidden="true" />{p.superficieTotal || p.areaM2 || 0} m²</span>
                    <span><Share2 size={15} aria-hidden="true" />{sharedCount > 0 ? `${sharedCount} socio${sharedCount === 1 ? '' : 's'}` : 'Sin compartir'}</span>
                  </div>

                  {!modoSeleccion && (
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
                        <WhatsAppIcon size={14} /> Enviar por WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modoSeleccion && (
        <div className="share-bar">
          <span className="share-bar-count">
            {seleccionadas.size === 0
              ? 'Seleccioná las propiedades a compartir'
              : `${seleccionadas.size} propiedad${seleccionadas.size === 1 ? '' : 'es'} seleccionada${seleccionadas.size === 1 ? '' : 's'}`
            }
          </span>
          <div className="share-bar-actions">
            {!todasSeleccionadas && (
              <button className="btn btn-secondary btn-small" onClick={seleccionarTodas}>
                Seleccionar todas
              </button>
            )}
            {canDo('compartir_propiedades') && (
              <button
                className="btn btn-secondary btn-small"
                disabled={seleccionadas.size === 0}
                onClick={() => setModalSociosOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Users size={14} /> Compartir con socios
              </button>
            )}
            <button
              className="btn btn-small"
              style={{ background: seleccionadas.size === 0 ? undefined : '#25D366', color: seleccionadas.size === 0 ? undefined : '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              disabled={seleccionadas.size === 0}
              onClick={compartirWhatsApp}
            >
              <WhatsAppIcon size={14} /> WhatsApp
            </button>
            <button className="btn btn-secondary btn-small" onClick={cancelarSeleccion}>
              <X size={14} aria-hidden="true" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {modalSociosOpen && (
        <ModalCompartirSocios
          propiedadesIds={propiedadesSeleccionadasIds}
          onClose={() => setModalSociosOpen(false)}
          onDone={() => {
            cancelarSeleccion();
            api.get('/propiedades').then(setData).catch(() => {});
          }}
        />
      )}
    </>
  );
}
