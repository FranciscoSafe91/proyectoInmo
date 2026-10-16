import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Camera, ImagePlus, Loader, MapPin, Search, Video } from 'lucide-react';
import { api } from '../api.js';
import GEO_DATA from '../geoData.js';

// ── Mapa (copiado de PropertyForm) ──────────────────────────────────────────
function loadLeaflet(cb) {
  if (window.L) { cb(); return; }
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);
  }
  if (!document.getElementById('leaflet-js')) {
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.async = true;
    script.onload = cb;
    document.head.appendChild(script);
  } else {
    document.getElementById('leaflet-js').addEventListener('load', cb, { once: true });
  }
}

function PropertyMap({ latitud, longitud, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    loadLeaflet(() => {
      if (mapRef.current) return;
      const L = window.L;
      const hasCoords = latitud && longitud;
      const center = hasCoords ? [Number(latitud), Number(longitud)] : [-34.6037, -58.3816];
      const map = L.map(containerRef.current).setView(center, hasCoords ? 15 : 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      if (hasCoords) {
        const m = L.marker(center, { draggable: true }).addTo(map);
        markerRef.current = m;
        m.on('dragend', () => {
          const { lat, lng } = m.getLatLng();
          onChangeRef.current(lat, lng);
        });
      }
      map.on('click', e => {
        const { lat, lng } = e.latlng;
        if (!markerRef.current) {
          const m = L.marker([lat, lng], { draggable: true }).addTo(map);
          markerRef.current = m;
          m.on('dragend', () => {
            const p = m.getLatLng();
            onChangeRef.current(p.lat, p.lng);
          });
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }
        onChangeRef.current(lat, lng);
      });
    });
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.L || !latitud || !longitud) return;
    const pos = [Number(latitud), Number(longitud)];
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      const m = window.L.marker(pos, { draggable: true }).addTo(mapRef.current);
      markerRef.current = m;
      m.on('dragend', () => {
        const p = m.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });
    }
    mapRef.current.panTo(pos);
  }, [latitud, longitud]);

  return <div ref={containerRef} className="property-map" />;
}

// ── Checkbox con búsqueda (copiado de PropertyForm) ──────────────────────────
function CheckboxSearchList({ sublabel, name, options, selected, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(o => selected.includes(o));

  function toggleAll() {
    if (allSelected) onChange(selected.filter(s => !filtered.includes(s)));
    else onChange([...new Set([...selected, ...filtered])]);
  }
  function toggle(item) {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  }

  return (
    <div className="checkbox-search-section">
      <span className="section-sublabel">{sublabel}</span>
      <div className="checkbox-search-list">
        <div className="checkbox-search-input-wrap">
          <Search size={14} aria-hidden="true" />
          <input type="text" placeholder="Buscar" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="checkbox-search-grid">
          <div className="checkbox-row">
            <input type="checkbox" id={`${name}-all`} checked={allSelected} onChange={toggleAll} />
            <label htmlFor={`${name}-all`} style={{ margin: 0, fontWeight: 600 }}>Seleccionar todo</label>
          </div>
          {filtered.map(opt => (
            <div key={opt} className="checkbox-row">
              <input type="checkbox" id={`${name}-${opt}`} checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              <label htmlFor={`${name}-${opt}`} style={{ margin: 0, fontWeight: 'normal' }}>{opt}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Datos ──────────────────────────────────────────────────────────────────
const PROVINCIAS_AR = [
  'Capital Federal','Buenos Aires','Catamarca','Chaco','Chubut','Córdoba',
  'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza',
  'Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz',
  'Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán',
];

const SERVICIOS_EMP = [
  'Agua Corriente','Cloacas','Electricidad','Gas','Internet',
  'Pavimento','Seguridad','Teléfono','Videocable',
];

const INSTALACIONES_EMP = [
  'Acceso controlado','Aire acondicionado','Calefacción','Calles pavimentadas',
  'Cancha de básquetbol','Cancha de deportes','Cancha de fútbol','Cancha de paddle',
  'Cancha de tenis','Cerco perimetral','Circuito cerrado de TV','Cisterna',
  'Gimnasio','Grupo electrógeno','Hidromasaje','Jacuzzi','Jardín',
  'Juegos para chicos','Lavadero','Microcine','Parrilla','Pileta',
  'Preinstalación de aire acondicionado','Quincho','Quincho techado','Restaurant','Sauna','Solarium',
  'SUM','Spa','Terraza','Vigilancia','Área comercial',
];

const EMPTY = {
  nombre: '',
  paginaWeb: '',
  leyendaComercial: '',
  estado: 'vigente',
  etapaObra: 'en_pozo',
  fechaEntrega: '',
  // ubicación
  zonaGeografica: '',
  partido: '',
  localidad: '',
  calle: '',
  nroCalle: '',
  mostrarPortales: 'direccion_real',
  entreCalles: '',
  yCalles: '',
  cercaDe: '',
  latitud: '',
  longitud: '',
  // financiación
  conFinanciacion: false,
  anticipo: '',
  cuotas: '',
  financia: '',
  descripcionFinanciacion: '',
  // características
  dptosPorPiso: '',
  cantidadPisos: '',
  cantidadDptos: '',
  cantidadAscensores: '',
  cocherasDisponibles: false,
  // listas
  servicios: [],
  instalaciones: [],
  // firmas
  construye: '',
  comercializa: '',
  dirige: '',
  administra: '',
  // descripción
  descripcion: '',
};

function getYoutubeEmbedId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function EmprendimientoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState('');

  // fotos
  const [fotos, setFotos] = useState([]);
  const [activePreview, setActivePreview] = useState(0);
  const [dragOver, setDragOver] = useState(null);
  const dragIndexRef = useRef(null);

  // logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  // planos
  const [planos, setPlanos] = useState([]);

  // youtube / multimedia
  const [youtubeUrl, setYoutubeUrl] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/emprendimientos/${id}`).then(data => {
      const e = data.emprendimiento;
      setForm({
        nombre: e.nombre || '',
        paginaWeb: e.paginaWeb || '',
        leyendaComercial: e.leyendaComercial || '',
        estado: e.estado || 'vigente',
        etapaObra: e.etapaObra || 'en_pozo',
        fechaEntrega: e.fechaEntrega || '',
        zonaGeografica: e.zonaGeografica || '',
        partido: e.partido || '',
        localidad: e.localidad || '',
        calle: e.calle || '',
        nroCalle: e.nroCalle || '',
        mostrarPortales: e.mostrarPortales || 'direccion_real',
        entreCalles: e.entreCalles || '',
        yCalles: e.yCalles || '',
        cercaDe: e.cercaDe || '',
        latitud: e.latitud ?? '',
        longitud: e.longitud ?? '',
        conFinanciacion: e.conFinanciacion || false,
        anticipo: e.anticipo ?? '',
        cuotas: e.cuotas ?? '',
        financia: e.financia || '',
        descripcionFinanciacion: e.descripcionFinanciacion || '',
        dptosPorPiso: e.dptosPorPiso ?? '',
        cantidadPisos: e.cantidadPisos ?? '',
        cantidadDptos: e.cantidadDptos ?? '',
        cantidadAscensores: e.cantidadAscensores ?? '',
        cocherasDisponibles: e.cocherasDisponibles || false,
        servicios: Array.isArray(e.servicios) ? e.servicios : [],
        instalaciones: Array.isArray(e.instalaciones) ? e.instalaciones : [],
        construye: e.construye || '',
        comercializa: e.comercializa || '',
        dirige: e.dirige || '',
        administra: e.administra || '',
        descripcion: e.descripcion || '',
      });
      setYoutubeUrl(e.youtubeUrl || '');
      if (e.logoUrl) setLogoPreview(e.logoUrl);
      // Fotos y planos ya guardados: se muestran y se pueden quitar o reordenar como en propiedades.
      const media = data.media || [];
      setFotos(media.filter(m => m.type === 'image').map(m => ({ id: m.id, type: 'image', url: m.url, isNew: false })));
      setPlanos(media.filter(m => m.type === 'plano').map(m => ({ id: m.id, url: m.url, isNew: false })));
    }).catch(err => setError(err.message));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    if (name === 'zonaGeografica') {
      setForm(v => ({ ...v, zonaGeografica: val, partido: '', localidad: '' }));
    } else if (name === 'partido') {
      setForm(v => ({ ...v, partido: val, localidad: '' }));
    } else {
      setForm(v => ({ ...v, [name]: val }));
    }
  }

  function handleArrayChange(name, val) {
    setForm(v => ({ ...v, [name]: val }));
  }

  // ── Geocodificación ───────────────────────────────────────────────────────
  async function geocodeAddress() {
    const parts = [
      form.calle && form.nroCalle ? `${form.calle} ${form.nroCalle}` : form.calle,
      form.localidad || form.partido,
      form.zonaGeografica,
      'Argentina',
    ].filter(Boolean);
    if (parts.length < 2) { setGeocodeMsg('Completá al menos calle y localidad o partido.'); return; }
    setGeocoding(true); setGeocodeMsg('');
    try {
      const q = encodeURIComponent(parts.join(', '));
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ar`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setForm(v => ({ ...v, latitud: Number(lat).toFixed(7), longitud: Number(lon).toFixed(7) }));
        setGeocodeMsg(`Encontrado: ${display_name}`);
      } else {
        setGeocodeMsg('No se encontró la dirección. Ubicá el pin manualmente.');
      }
    } catch {
      setGeocodeMsg('Error al buscar la dirección. Intentá de nuevo.');
    } finally {
      setGeocoding(false);
    }
  }

  // ── Fotos ─────────────────────────────────────────────────────────────────
  function handleFotosChange(e) {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    const items = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      type: 'image',
      url: URL.createObjectURL(file),
      filename: file.name,
      isNew: true,
      file,
    }));
    setFotos(prev => [...prev, ...items]);
    setActivePreview(0);
  }

  function removeFoto(fid) {
    setFotos(prev => {
      const item = prev.find(m => m.id === fid);
      if (item?.isNew) URL.revokeObjectURL(item.url);
      return prev.filter(m => m.id !== fid);
    });
    setActivePreview(0);
  }

  function handleThumbDragStart(index) { dragIndexRef.current = index; }
  function handleThumbDragOver(e, index) { e.preventDefault(); setDragOver(index); }
  function handleThumbDrop(e, index) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from !== null && from !== index) {
      setFotos(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        return next;
      });
      setActivePreview(index);
    }
    dragIndexRef.current = null; setDragOver(null);
  }
  function handleThumbDragEnd() { dragIndexRef.current = null; setDragOver(null); }

  // ── Logo ──────────────────────────────────────────────────────────────────
  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  // ── Planos ────────────────────────────────────────────────────────────────
  function handlePlanosChange(e) {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    const items = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      filename: file.name,
      isNew: true,
      file,
    }));
    setPlanos(prev => [...prev, ...items]);
  }

  function removePlano(pid) {
    setPlanos(prev => {
      const item = prev.find(m => m.id === pid);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter(m => m.id !== pid);
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError(''); setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
        else formData.append(key, value ?? '');
      });
      formData.append('youtubeUrl', youtubeUrl);
      if (logoFile) formData.append('logo', logoFile);
      // Orden final: "new:<i>" = archivo nuevo i (foto<i> / plano<i>), cualquier otro valor = foto o plano ya guardado.
      const buildOrder = items => {
        let n = 0;
        return items.map(it => (it.isNew ? `new:${n++}` : it.id));
      };
      formData.append('fotoOrder', JSON.stringify(buildOrder(fotos)));
      formData.append('planoOrder', JSON.stringify(buildOrder(planos)));
      fotos.filter(f => f.isNew).forEach((f, i) => formData.append(`foto${i}`, f.file));
      planos.filter(p => p.isNew).forEach((p, i) => formData.append(`plano${i}`, p.file));

      let empId;
      if (isEdit) {
        await api.put(`/emprendimientos/${id}`, formData);
        empId = id;
      } else {
        const data = await api.post('/emprendimientos', formData);
        empId = data.emprendimiento.id;
      }
      navigate(`/emprendimientos`);
    } catch (err) {
      setError(err.data?.error || 'Error al guardar.');
      setSubmitting(false);
    }
  }

  const activeMedia = fotos[activePreview] || null;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{isEdit ? 'Editar emprendimiento' : 'Nuevo emprendimiento'}</h1>
          <p className="subtitle">Cargá los datos del emprendimiento para comenzar a gestionarlo.</p>
        </div>
        <Link className="btn btn-secondary" to="/emprendimientos">Cancelar</Link>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <form className="property-form-shell" onSubmit={handleSubmit}>
        <section className="property-form-main">

          {/* ── Datos básicos ─────────────────────────────────────────────── */}
          <div className="form-panel">
            <div className="form-section-title">
              <Building2 size={18} aria-hidden="true" />
              <h2>Datos básicos</h2>
            </div>

            <div className="grid grid-2">
              <div>
                <label htmlFor="nombre">Nombre <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></label>
                <input type="text" id="nombre" name="nombre" required value={form.nombre} onChange={handleChange} placeholder="Nombre del emprendimiento" />
              </div>
              <div>
                <label htmlFor="paginaWeb">Página Web</label>
                <input type="url" id="paginaWeb" name="paginaWeb" value={form.paginaWeb} onChange={handleChange} placeholder="http://" />
              </div>
            </div>

            <div className="grid grid-2">
              <div>
                <label htmlFor="leyendaComercial">Leyenda Comercial</label>
                <input type="text" id="leyendaComercial" name="leyendaComercial" value={form.leyendaComercial} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="estado">Estado <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></label>
                <select id="estado" name="estado" required value={form.estado} onChange={handleChange}>
                  <option value="vigente">Vigente</option>
                  <option value="vendido">Vendido</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div>
                <label>Etapa de obra <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></label>
                <div className="radio-group">
                  {[
                    { value: 'en_pozo', label: 'En Pozo' },
                    { value: 'en_construccion', label: 'En construcción' },
                    { value: 'terminado', label: 'Terminado' },
                  ].map(op => (
                    <label key={op.value} className="radio-label">
                      <input
                        type="radio"
                        name="etapaObra"
                        value={op.value}
                        checked={form.etapaObra === op.value}
                        onChange={handleChange}
                      />
                      {op.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="fechaEntrega">Fecha de entrega</label>
                <input type="month" id="fechaEntrega" name="fechaEntrega" value={form.fechaEntrega} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ── Ubicación ─────────────────────────────────────────────────── */}
          <div className="form-panel">
            <div className="form-section-title">
              <MapPin size={18} aria-hidden="true" />
              <h2>Ubicación</h2>
            </div>

            <div className="grid grid-3">
              <div>
                <label htmlFor="zonaGeografica">Zona Geográfica <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></label>
                <select id="zonaGeografica" name="zonaGeografica" required value={form.zonaGeografica} onChange={handleChange}>
                  <option value="">Seleccioná una zona</option>
                  {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="partido">Partido <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></label>
                {GEO_DATA[form.zonaGeografica] ? (
                  <select id="partido" name="partido" required value={form.partido} onChange={handleChange}>
                    <option value="">Seleccioná un partido</option>
                    {GEO_DATA[form.zonaGeografica].partidos.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <select id="partido" name="partido" disabled>
                    <option value="">— Elegí una zona primero —</option>
                  </select>
                )}
              </div>
              <div>
                <label htmlFor="localidad">Localidad <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></label>
                {form.partido && GEO_DATA[form.zonaGeografica]?.localidades[form.partido] ? (
                  <select id="localidad" name="localidad" required value={form.localidad} onChange={handleChange}>
                    <option value="">Seleccioná una localidad</option>
                    {GEO_DATA[form.zonaGeografica].localidades[form.partido].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                ) : (
                  <select id="localidad" name="localidad" disabled>
                    <option value="">— Elegí un partido primero —</option>
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-3">
              <div style={{ gridColumn: '1 / 2' }}>
                <label htmlFor="calle">Calle</label>
                <input type="text" id="calle" name="calle" value={form.calle} onChange={handleChange} placeholder="Nombre de la calle" />
              </div>
              <div>
                <label htmlFor="nroCalle">Nro. calle</label>
                <input type="text" id="nroCalle" name="nroCalle" value={form.nroCalle} onChange={handleChange} placeholder="1234" />
              </div>
              <div>
                <label htmlFor="mostrarPortales">Mostrar en portales</label>
                <select id="mostrarPortales" name="mostrarPortales" value={form.mostrarPortales} onChange={handleChange}>
                  <option value="direccion_real">Dirección real</option>
                  <option value="aproximada">Aproximada</option>
                  <option value="solo_zona">Solo zona</option>
                </select>
              </div>
            </div>

            <div className="grid grid-3">
              <div>
                <label htmlFor="entreCalles">Entre calle</label>
                <input type="text" id="entreCalles" name="entreCalles" value={form.entreCalles} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="yCalles">Y calle</label>
                <input type="text" id="yCalles" name="yCalles" value={form.yCalles} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="cercaDe">Cerca de</label>
                <input type="text" id="cercaDe" name="cercaDe" value={form.cercaDe} onChange={handleChange} placeholder="Ej: estación, hospital..." />
              </div>
            </div>

            <div className="geocode-row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={geocodeAddress} disabled={geocoding}>
                <MapPin size={15} aria-hidden="true" />
                {geocoding ? 'Buscando...' : 'Buscar dirección en el mapa'}
              </button>
              {geocodeMsg && (
                <span className={'geocode-msg' + (geocodeMsg.startsWith('No') || geocodeMsg.startsWith('Completá') ? ' geocode-msg--error' : '')}>
                  {geocodeMsg}
                </span>
              )}
            </div>

            <PropertyMap
              latitud={form.latitud}
              longitud={form.longitud}
              onChange={(lat, lng) => setForm(v => ({
                ...v,
                latitud: lat.toFixed(7),
                longitud: lng.toFixed(7),
              }))}
            />

            <div className="grid grid-2">
              <div>
                <label htmlFor="latitud">Latitud</label>
                <input type="number" id="latitud" name="latitud" step="any" value={form.latitud} onChange={handleChange} placeholder="-34.6455653" />
              </div>
              <div>
                <label htmlFor="longitud">Longitud</label>
                <input type="number" id="longitud" name="longitud" step="any" value={form.longitud} onChange={handleChange} placeholder="-58.5193541" />
              </div>
            </div>
          </div>

          {/* ── Financiación ──────────────────────────────────────────────── */}
          <div className="form-panel">
            <div className="form-section-title">
              <h2>Financiación</h2>
            </div>

            <div className="checkbox-row" style={{ marginBottom: 16 }}>
              <input type="checkbox" id="conFinanciacion" name="conFinanciacion" checked={form.conFinanciacion} onChange={handleChange} />
              <label htmlFor="conFinanciacion" style={{ margin: 0, fontWeight: 'normal' }}>Con financiación</label>
            </div>

            {form.conFinanciacion && (
              <>
                <div className="grid grid-3">
                  <div>
                    <label htmlFor="anticipo">% de Anticipo</label>
                    <input type="number" id="anticipo" name="anticipo" min="0" max="100" value={form.anticipo} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="cuotas">Cantidad de cuotas</label>
                    <input type="number" id="cuotas" name="cuotas" min="0" value={form.cuotas} onChange={handleChange} />
                  </div>
                  <div>
                    <label htmlFor="financia">Financia</label>
                    <input type="text" id="financia" name="financia" value={form.financia} onChange={handleChange} />
                  </div>
                </div>
                <div>
                  <label htmlFor="descripcionFinanciacion">Descripción de la Financiación</label>
                  <textarea id="descripcionFinanciacion" name="descripcionFinanciacion" rows={4} value={form.descripcionFinanciacion} onChange={handleChange} />
                </div>
              </>
            )}
          </div>

          {/* ── Características ───────────────────────────────────────────── */}
          <div className="form-panel">
            <div className="form-section-title">
              <h2>Características</h2>
            </div>
            <div className="grid grid-4">
              <div>
                <label htmlFor="dptosPorPiso">Departamentos por piso</label>
                <input type="number" id="dptosPorPiso" name="dptosPorPiso" min="0" value={form.dptosPorPiso} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="cantidadPisos">Cantidad de pisos</label>
                <input type="number" id="cantidadPisos" name="cantidadPisos" min="0" value={form.cantidadPisos} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="cantidadDptos">Cantidad departamentos</label>
                <input type="number" id="cantidadDptos" name="cantidadDptos" min="0" value={form.cantidadDptos} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="cantidadAscensores">Cantidad ascensores</label>
                <input type="number" id="cantidadAscensores" name="cantidadAscensores" min="0" value={form.cantidadAscensores} onChange={handleChange} />
              </div>
              <div className="checkbox-row" style={{ alignSelf: 'end' }}>
                <input type="checkbox" id="cocherasDisponibles" name="cocherasDisponibles" checked={form.cocherasDisponibles} onChange={handleChange} />
                <label htmlFor="cocherasDisponibles" style={{ margin: 0, fontWeight: 'normal' }}>Hay cocheras disponibles</label>
              </div>
            </div>
          </div>

          {/* ── Servicios ─────────────────────────────────────────────────── */}
          <div className="form-panel">
            <CheckboxSearchList
              sublabel="Servicios de la propiedad"
              name="servicios"
              options={SERVICIOS_EMP}
              selected={form.servicios}
              onChange={val => handleArrayChange('servicios', val)}
            />
          </div>

          {/* ── Instalaciones ─────────────────────────────────────────────── */}
          <div className="form-panel">
            <CheckboxSearchList
              sublabel="Instalaciones de la propiedad"
              name="instalaciones"
              options={INSTALACIONES_EMP}
              selected={form.instalaciones}
              onChange={val => handleArrayChange('instalaciones', val)}
            />
          </div>

          {/* ── Firmas responsables ───────────────────────────────────────── */}
          <div className="form-panel">
            <div className="form-section-title">
              <h2>Firmas responsables</h2>
            </div>
            <div className="grid grid-2">
              <div>
                <label htmlFor="construye">Construye</label>
                <input type="text" id="construye" name="construye" value={form.construye} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="comercializa">Comercializa</label>
                <input type="text" id="comercializa" name="comercializa" value={form.comercializa} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="dirige">Dirige</label>
                <input type="text" id="dirige" name="dirige" value={form.dirige} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="administra">Administra</label>
                <input type="text" id="administra" name="administra" value={form.administra} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ── Descripción ───────────────────────────────────────────────── */}
          <div className="form-panel">
            <div className="form-section-title">
              <h2>Descripción <span style={{ color: 'var(--app-error, #c0392b)' }}>*</span></h2>
            </div>
            <textarea id="descripcion" name="descripcion" rows={6} required value={form.descripcion} onChange={handleChange} placeholder="Describí el emprendimiento: características, terminaciones, disponibilidad..." />
          </div>

          <div className="btn-row form-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar emprendimiento'}
            </button>
          </div>
        </section>

        {/* ── Panel lateral: logo, fotos, multimedia, planos ──────────────── */}
        <aside className="property-media-panel">

          {/* Logo */}
          <div className="form-panel" style={{ marginBottom: 0 }}>
            <div className="form-section-title" style={{ marginBottom: 12 }}>
              <h2>Logo del emprendimiento</h2>
            </div>
            <div className="media-uploader" style={{ marginBottom: 0 }}>
              {logoPreview ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, display: 'block' }} />
                  <button type="button" className="thumb-remove" style={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={() => { setLogoFile(null); setLogoPreview(''); }}>×</button>
                </div>
              ) : (
                <div className="preview-empty" style={{ height: 100 }}>
                  <Camera size={24} aria-hidden="true" />
                  <span>Logo</span>
                </div>
              )}
              <input id="emp-logo" type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
              <label className="btn btn-secondary" htmlFor="emp-logo" style={{ marginTop: 8 }}>
                {logoPreview ? 'Cambiar logo' : 'Agregar logo'}
              </label>
            </div>
          </div>

          {/* Fotos */}
          <div className="media-uploader" style={{ marginTop: 24 }}>
            <div className="media-uploader-icon">
              <ImagePlus size={24} aria-hidden="true" />
            </div>
            <div>
              <h2>Imágenes</h2>
              <p>Máx. 50 fotos. Arrastrá para reordenar.</p>
            </div>
            <input id="emp-fotos" type="file" multiple accept="image/*" onChange={handleFotosChange} />
            <label className="btn btn-secondary" htmlFor="emp-fotos">Elegir archivos</label>
          </div>

          <article className="upload-preview-card">
            {activeMedia ? (
              <img src={activeMedia.url} alt={activeMedia.filename || form.nombre || 'Vista previa'} />
            ) : (
              <div className="preview-empty">
                <Camera size={30} aria-hidden="true" />
                <span>Foto principal</span>
              </div>
            )}
            <div className="preview-card-body">
              <div>
                <span>Emprendimiento</span>
                <h3>{form.nombre || 'Nombre del emprendimiento'}</h3>
              </div>
              {form.partido && <p>{form.partido}{form.zonaGeografica ? `, ${form.zonaGeografica}` : ''}</p>}
            </div>
          </article>

          {fotos.length > 0 && (
            <>
              <p className="media-thumbs-hint">Arrastrá las miniaturas para cambiar el orden.</p>
              <div className="media-thumbs">
                {fotos.map((item, index) => (
                  <div key={item.id} className="thumb-wrap">
                    <button
                      type="button"
                      className={[
                        index === activePreview ? 'active' : '',
                        dragOver === index ? 'drag-over' : '',
                      ].filter(Boolean).join(' ')}
                      draggable
                      onDragStart={() => handleThumbDragStart(index)}
                      onDragOver={e => handleThumbDragOver(e, index)}
                      onDrop={e => handleThumbDrop(e, index)}
                      onDragEnd={handleThumbDragEnd}
                      onClick={() => setActivePreview(index)}
                      aria-label={`Ver foto ${index + 1}`}
                    >
                      {item.uploading
                        ? <Loader size={16} className="spin" aria-hidden="true" />
                        : <img src={item.url} alt="" />}
                      <span className="thumb-order">{index + 1}</span>
                    </button>
                    {!item.uploading && (
                      <button type="button" className="thumb-remove"
                        onClick={() => removeFoto(item.id)}
                        aria-label={`Eliminar foto ${index + 1}`}>×</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Multimedia / YouTube */}
          <div className="youtube-url-field">
            <label htmlFor="youtubeUrl">
              <Video size={16} aria-hidden="true" />
              Video de YouTube
            </label>
            <input
              type="url"
              id="youtubeUrl"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {youtubeUrl && getYoutubeEmbedId(youtubeUrl) && (
              <div className="youtube-embed-preview">
                <iframe
                  src={`https://www.youtube.com/embed/${getYoutubeEmbedId(youtubeUrl)}`}
                  title="Vista previa del video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {/* Planos */}
          <div style={{ marginTop: 24 }}>
            <div className="media-uploader">
              <div className="media-uploader-icon">
                <ImagePlus size={24} aria-hidden="true" />
              </div>
              <div>
                <h2>Planos</h2>
                <p>Subí los planos del emprendimiento.</p>
              </div>
              <input id="emp-planos" type="file" multiple accept="image/*" onChange={handlePlanosChange} />
              <label className="btn btn-secondary" htmlFor="emp-planos">Agregar planos</label>
            </div>
            {planos.length > 0 && (
              <div className="media-thumbs" style={{ marginTop: 8 }}>
                {planos.map((item, index) => (
                  <div key={item.id} className="thumb-wrap">
                    <button type="button" className="" onClick={() => {}} aria-label={`Plano ${index + 1}`}>
                      <img src={item.url} alt="" />
                      <span className="thumb-order">{index + 1}</span>
                    </button>
                    <button type="button" className="thumb-remove"
                      onClick={() => removePlano(item.id)}
                      aria-label={`Eliminar plano ${index + 1}`}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </aside>
      </form>
    </>
  );
}
