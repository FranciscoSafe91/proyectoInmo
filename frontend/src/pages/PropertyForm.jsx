import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Camera, Film, Home, ImagePlus, MapPin, Ruler, Search, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { TYPE_LABELS, money, operationLabel, typeLabel } from '../utils.js';
import GEO_DATA from '../geoData.js';

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function PropertyMap({ latitud, longitud, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!GMAPS_KEY || !containerRef.current) return;

    function setupMap() {
      if (mapRef.current) return;
      const hasCoords = latitud && longitud;
      const center = hasCoords
        ? { lat: Number(latitud), lng: Number(longitud) }
        : { lat: -34.6037, lng: -58.3816 };

      const map = new window.google.maps.Map(containerRef.current, {
        center,
        zoom: hasCoords ? 15 : 12,
      });
      mapRef.current = map;

      if (hasCoords) {
        markerRef.current = new window.google.maps.Marker({ position: center, map, draggable: true });
        markerRef.current.addListener('dragend', e =>
          onChangeRef.current(e.latLng.lat(), e.latLng.lng())
        );
      }

      map.addListener('click', e => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        if (!markerRef.current) {
          markerRef.current = new window.google.maps.Marker({ position: { lat, lng }, map, draggable: true });
          markerRef.current.addListener('dragend', ev =>
            onChangeRef.current(ev.latLng.lat(), ev.latLng.lng())
          );
        } else {
          markerRef.current.setPosition({ lat, lng });
        }
        onChangeRef.current(lat, lng);
      });
    }

    if (window.google?.maps) {
      setupMap();
    } else if (!document.getElementById('gmaps-script')) {
      const script = document.createElement('script');
      script.id = 'gmaps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}`;
      script.async = true;
      script.onload = setupMap;
      document.head.appendChild(script);
    } else {
      document.getElementById('gmaps-script').addEventListener('load', setupMap);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !latitud || !longitud) return;
    const pos = { lat: Number(latitud), lng: Number(longitud) };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({ position: pos, map: mapRef.current, draggable: true });
      markerRef.current.addListener('dragend', e =>
        onChangeRef.current(e.latLng.lat(), e.latLng.lng())
      );
    }
    mapRef.current.panTo(pos);
  }, [latitud, longitud]);

  if (!GMAPS_KEY) {
    return (
      <div className="map-placeholder">
        <MapPin size={22} aria-hidden="true" />
        <p>Para activar el mapa agregá <code>VITE_GOOGLE_MAPS_API_KEY</code> en <code>frontend/.env.local</code></p>
      </div>
    );
  }

  return <div ref={containerRef} className="property-map" />;
}

const SERVICIOS = [
  'ABL','Agua Corriente','Agua de pozo','Cloacas','Conmutador','Electricidad',
  'Gas','Gas envasado','Internet','Limpieza','Pavimento','Rentas municipales',
  'Ropa de cama','Seguridad','Teléfono','Toallas','Videocable',
];

const INSTALACIONES = [
  'Aire acondicionado','Alarma','Amueblado','Ascensor','Balcón terraza','Baulera',
  'Caballeriza','Calefacción','Calefacción por aire caliente','Calefacción tiro balanceado',
  'Calefón','Cancha de básquetbol','Cancha de deportes','Cancha de fútbol','Cancha de paddle',
  'Cancha de tenis','Cocina equipada','Dependencia','Energía solar','Extractor aire',
  'Gimnasio','Grupo electrógeno','Hidromasaje','Hogar a leña','Jacuzzi','Jardín',
  'Jardín delantero','Jardín trasero','Juegos para chicos','Lavadero','Microcine',
  'Parque','Parrilla','Patio','Pileta','Piso radiante','Quincho techado','Radiadores',
  'Reciclado','Sala de juegos','Salón de fiestas','Sauna','Solarium','Spa','Termotanque',
  'Terraza','Toilette','Vigilancia','Vivienda multifamiliar',
];

const SERVICIOS_EDIFICIO = [
  'Internet','Seguridad','Teléfono','Videocable',
];

const AMENITIES_EDIFICIO = [
  'Ascensor','Baulera','Bicicletero','Caldera','Cancha de básquetbol','Cancha de deportes',
  'Cancha de paddle','Cancha de tenis','Coworking','Energía solar','Espacios verdes',
  'Estacionamiento de cortesía','Gimnasio','Grupo electrógeno','Hidromasaje','Jacuzzi',
  'Jardín','Juegos para chicos','Lavadero','Lobby','Microcine','Parrilla','Pileta',
  'Piscina climatizada','Piscina para niños','Portero visor','Quincho techado','Recepción',
  'Roof garden','Rooftop pool','SUM','Sala de juegos','Sala de masajes','Sala de relax',
  'Salón de fiestas','Sauna','Sistema contra incendio','Solarium','Spa',
  'Terraza del Edificio','Vestuario','Vigilancia','Vivienda encargado',
];

function QtyPicker({ label, name, value, onChange, options }) {
  function handleClick(v) {
    const next = String(value) === String(v) ? '' : v;
    onChange({ target: { name, value: next } });
  }
  return (
    <div className="qty-picker-group">
      <span>{label}</span>
      <div className="qty-picker">
        {options.map(opt => (
          <button key={opt.value} type="button"
            className={'qty-btn' + (String(value) === String(opt.value) ? ' active' : '')}
            onClick={() => handleClick(opt.value)}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxSearchList({ sublabel, name, options, selected, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(o => selected.includes(o));

  function toggleAll() {
    if (allSelected) {
      onChange(selected.filter(s => !filtered.includes(s)));
    } else {
      onChange([...new Set([...selected, ...filtered])]);
    }
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
              <input type="checkbox" id={`${name}-${opt}`}
                checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              <label htmlFor={`${name}-${opt}`} style={{ margin: 0, fontWeight: 'normal' }}>{opt}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const COCHERAS_OPTS = [
  { value: '1', label: '1' }, { value: '2', label: '2' },
  { value: '3', label: '3' }, { value: '4', label: '4' },
  { value: '5', label: '+5' },
];
const DORMITORIOS_OPTS = [
  { value: '0', label: 'Monoamb.' }, { value: '1', label: '1' },
  { value: '2', label: '2' }, { value: '3', label: '3' },
  { value: '4', label: '4' }, { value: '5', label: '+5' },
];
const BANOS_OPTS = [
  { value: '1', label: '1' }, { value: '2', label: '2' },
  { value: '3', label: '3' }, { value: '4', label: '4' },
  { value: '5', label: '+5' },
];

const PROVINCIAS_AR = [
  'Capital Federal','Buenos Aires','Catamarca','Chaco','Chubut','Córdoba',
  'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza',
  'Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz',
  'Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán',
];

const EMPTY_PROPERTY = {
  title: '',
  description: '',
  operation: 'venta',
  type: 'casa',
  price: '',
  currency: 'USD',
  bedrooms: '',
  bathrooms: '',
  areaM2: '',
  status: 'publicada',
  barrioCerrado: false,
  zonaGeografica: '',
  partido: '',
  localidad: '',
  calle: '',
  nroCalle: '',
  piso: '',
  depto: '',
  mostrarPortales: 'aproximada',
  entreCalles: '',
  yCalles: '',
  cercaDe: '',
  latitud: '',
  longitud: '',
  anchoTerreno: '',
  largoTerreno: '',
  superficieTerreno: '',
  superficieTotal: '',
  superficieCubierta: '',
  superficieDescubierta: '',
  fondoLibre: '',
  estadoPropiedad: '',
  antiguedad: '',
  aEstrenar: false,
  plantas: '',
  orientacion: '',
  aguaCaliente: '',
  calefaccion: '',
  luminosidad: '',
  tipoVigilancia: '',
  tipoPiso: '',
  tipoTecho: '',
  tipoCosta: '',
  tipoVista: '',
  tipoPendiente: '',
  necesitaReubicacion: false,
  cocherasCubiertas: '',
  cocherasDescubiertas: '',
  cocherasSemicubiertas: '',
  servicios: [],
  instalaciones: [],
  serviciosEdificio: [],
  amenitiesEdificio: [],
};

function buildPropertyFormData(property, orderedFiles) {
  const formData = new FormData();
  Object.entries(property).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value ?? '');
    }
  });
  orderedFiles.forEach((file, index) => {
    formData.append(`media${index}`, file);
  });
  return formData;
}

export default function PropertyForm() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && !location.pathname.endsWith('/nueva');

  const [property, setProperty] = useState(EMPTY_PROPERTY);
  const [allMedia, setAllMedia] = useState([]);
  const [activePreview, setActivePreview] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState('');
  const [dragOver, setDragOver] = useState(null);
  const dragIndexRef = useRef(null);

  const activeMedia = allMedia[activePreview] || null;

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/propiedades/${id}`).then(data => {
      const p = data.property;
      setProperty({
        title: p.title || '',
        description: p.description || '',
        operation: p.operation || 'venta',
        type: p.type || 'casa',
        price: p.price ?? '',
        currency: p.currency || 'USD',
        bedrooms: p.bedrooms ?? '',
        bathrooms: p.bathrooms ?? '',
        areaM2: p.areaM2 ?? '',
        status: p.status || 'publicada',
        barrioCerrado: p.barrioCerrado || false,
        zonaGeografica: p.zonaGeografica || '',
        partido: p.partido || '',
        localidad: p.localidad || '',
        calle: p.calle || '',
        nroCalle: p.nroCalle || '',
        piso: p.piso || '',
        depto: p.depto || '',
        mostrarPortales: p.mostrarPortales || 'aproximada',
        entreCalles: p.entreCalles || '',
        yCalles: p.yCalles || '',
        cercaDe: p.cercaDe || '',
        latitud: p.latitud ?? '',
        longitud: p.longitud ?? '',
        anchoTerreno: p.anchoTerreno ?? '',
        largoTerreno: p.largoTerreno ?? '',
        superficieTerreno: p.superficieTerreno ?? '',
        superficieTotal: p.superficieTotal ?? '',
        superficieCubierta: p.superficieCubierta ?? '',
        superficieDescubierta: p.superficieDescubierta ?? '',
        fondoLibre: p.fondoLibre ?? '',
        estadoPropiedad: p.estadoPropiedad || '',
        antiguedad: p.antiguedad ?? '',
        aEstrenar: p.aEstrenar || false,
        plantas: p.plantas || '',
        orientacion: p.orientacion || '',
        aguaCaliente: p.aguaCaliente || '',
        calefaccion: p.calefaccion || '',
        luminosidad: p.luminosidad || '',
        tipoVigilancia: p.tipoVigilancia || '',
        tipoPiso: p.tipoPiso || '',
        tipoTecho: p.tipoTecho || '',
        tipoCosta: p.tipoCosta || '',
        tipoVista: p.tipoVista || '',
        tipoPendiente: p.tipoPendiente || '',
        necesitaReubicacion: p.necesitaReubicacion || false,
        cocherasCubiertas: p.cocherasCubiertas != null ? String(p.cocherasCubiertas) : '',
        cocherasDescubiertas: p.cocherasDescubiertas != null ? String(p.cocherasDescubiertas) : '',
        cocherasSemicubiertas: p.cocherasSemicubiertas != null ? String(p.cocherasSemicubiertas) : '',
        servicios: Array.isArray(p.servicios) ? p.servicios : [],
        instalaciones: Array.isArray(p.instalaciones) ? p.instalaciones : [],
        serviciosEdificio: Array.isArray(p.serviciosEdificio) ? p.serviciosEdificio : [],
        amenitiesEdificio: Array.isArray(p.amenitiesEdificio) ? p.amenitiesEdificio : [],
      });
      setAllMedia((data.media || []).map(m => ({
        id: m.id,
        type: m.type,
        url: m.url,
        filename: m.filename || '',
        isNew: false,
      })));
    }).catch(e => setError(e.message));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    if (name === 'zonaGeografica') {
      setProperty(v => ({ ...v, zonaGeografica: val, partido: '', localidad: '' }));
    } else if (name === 'partido') {
      setProperty(v => ({ ...v, partido: val, localidad: '' }));
    } else {
      setProperty(v => ({ ...v, [name]: val }));
    }
  }

  function handleArrayChange(name, val) {
    setProperty(v => ({ ...v, [name]: val }));
  }

  async function geocodeAddress() {
    if (!GMAPS_KEY) return;
    const parts = [
      property.calle && property.nroCalle
        ? `${property.calle} ${property.nroCalle}`
        : property.calle,
      property.localidad || property.partido,
      property.zonaGeografica,
      'Argentina',
    ].filter(Boolean);
    if (parts.length < 2) {
      setGeocodeMsg('Completá al menos calle y localidad o partido.');
      return;
    }
    setGeocoding(true);
    setGeocodeMsg('');
    try {
      await new Promise((resolve, reject) => {
        function runGeocode() {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: parts.join(', ') }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const loc = results[0].geometry.location;
              setProperty(v => ({
                ...v,
                latitud: loc.lat().toFixed(7),
                longitud: loc.lng().toFixed(7),
              }));
              setGeocodeMsg(`Encontrado: ${results[0].formatted_address}`);
              resolve();
            } else {
              reject(new Error(status));
            }
          });
        }
        if (window.google?.maps) {
          runGeocode();
        } else {
          const existing = document.getElementById('gmaps-script');
          if (existing) {
            existing.addEventListener('load', runGeocode, { once: true });
          } else {
            const script = document.createElement('script');
            script.id = 'gmaps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}`;
            script.async = true;
            script.onload = runGeocode;
            document.head.appendChild(script);
          }
        }
      });
    } catch {
      setGeocodeMsg('No se encontró la dirección. Verificá los datos o ubicá el pin manualmente.');
    } finally {
      setGeocoding(false);
    }
  }

  function handleMediaChange(e) {
    const files = Array.from(e.target.files || []);
    const existingCount = allMedia.filter(m => !m.isNew).length;
    const newItems = files.slice(0, 8 - existingCount).map(file => ({
      id: `${file.name}-${file.lastModified}-${Date.now()}`,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      url: URL.createObjectURL(file),
      filename: file.name,
      isNew: true,
      file,
    }));
    setAllMedia(prev => {
      const existing = prev.filter(m => !m.isNew);
      return [...existing, ...newItems].slice(0, 8);
    });
    setActivePreview(0);
  }

  function removeMedia(id) {
    setAllMedia(prev => {
      const item = prev.find(m => m.id === id);
      if (item?.isNew) URL.revokeObjectURL(item.url);
      return prev.filter(m => m.id !== id);
    });
    setActivePreview(0);
  }

  function handleThumbDragStart(index) {
    dragIndexRef.current = index;
  }

  function handleThumbDragOver(e, index) {
    e.preventDefault();
    setDragOver(index);
  }

  function handleThumbDrop(e, index) {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from !== null && from !== index) {
      setAllMedia(prev => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(index, 0, moved);
        return next;
      });
      setActivePreview(index);
    }
    dragIndexRef.current = null;
    setDragOver(null);
  }

  function handleThumbDragEnd() {
    dragIndexRef.current = null;
    setDragOver(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const orderedFiles = allMedia.filter(m => m.isNew).map(m => m.file);
      const body = orderedFiles.length ? buildPropertyFormData(property, orderedFiles) : property;
      if (isEdit) {
        await api.put(`/propiedades/${id}`, body);
        navigate(`/propiedades/${id}`);
      } else {
        const data = await api.post('/propiedades', body);
        navigate(`/propiedades/${data.property.id}`);
      }
    } catch (err) {
      setError(err.data?.error || 'Error al guardar.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</h1>
          <p className="subtitle">Cargá los datos clave y sumá material visual para que el match sea más rápido.</p>
        </div>
        <Link className="btn btn-secondary" to="/propiedades">
          {isEdit ? '← Volver a propiedades' : 'Cancelar'}
        </Link>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <form className="property-form-shell" onSubmit={handleSubmit}>
        <section className="property-form-main">
          <div className="form-panel">
            <div className="form-section-title">
              <Home size={18} aria-hidden="true" />
              <h2>Datos principales</h2>
            </div>

            <label htmlFor="title">Título</label>
            <input type="text" id="title" name="title" required value={property.title} onChange={handleChange} placeholder="Ej: Casa 3 ambientes con jardín" />

            <div className="grid grid-2">
              <div>
                <label htmlFor="currency">Moneda</label>
                <select id="currency" name="currency" value={property.currency} onChange={handleChange}>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
              <div>
                <label htmlFor="price">Precio</label>
                <input type="number" id="price" name="price" min="0" step="1" required value={property.price} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-2">
              <div>
                <label htmlFor="type">Tipo de propiedad</label>
                <select id="type" name="type" value={property.type} onChange={handleChange}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="operation">Operación</label>
                <select id="operation" name="operation" value={property.operation} onChange={handleChange}>
                  <option value="venta">Venta</option>
                  <option value="alquiler">Alquiler</option>
                </select>
              </div>
            </div>

            <label htmlFor="description">Descripción</label>
            <textarea id="description" name="description" required value={property.description} onChange={handleChange} placeholder="Detalles, comodidades, estado general, luminosidad..." />

            <div className="checkbox-row">
              <input type="checkbox" id="necesitaReubicacion" name="necesitaReubicacion" checked={property.necesitaReubicacion} onChange={handleChange} />
              <label htmlFor="necesitaReubicacion" style={{ margin: 0, fontWeight: 'normal' }}>El propietario necesita reubicación</label>
            </div>
          </div>

          <div className="form-panel">
            <div className="form-section-title">
              <MapPin size={18} aria-hidden="true" />
              <h2>Ubicación</h2>
            </div>

            <div className="checkbox-row">
              <input type="checkbox" id="barrioCerrado" name="barrioCerrado" checked={property.barrioCerrado} onChange={handleChange} />
              <label htmlFor="barrioCerrado" style={{ margin: 0, fontWeight: 'normal' }}>Esta propiedad pertenece a un country / barrio cerrado</label>
            </div>

            <div className="grid grid-3">
              <div>
                <label htmlFor="zonaGeografica">Zona Geográfica</label>
                <select id="zonaGeografica" name="zonaGeografica" required value={property.zonaGeografica} onChange={handleChange}>
                  <option value="">Seleccioná una zona</option>
                  {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="partido">Partido</label>
                {GEO_DATA[property.zonaGeografica] ? (
                  <select id="partido" name="partido" required value={property.partido} onChange={handleChange}>
                    <option value="">Seleccioná un partido</option>
                    {GEO_DATA[property.zonaGeografica].partidos.map(p => (
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
                <label htmlFor="localidad">Localidad</label>
                {property.partido && GEO_DATA[property.zonaGeografica]?.localidades[property.partido] ? (
                  <select id="localidad" name="localidad" required value={property.localidad} onChange={handleChange}>
                    <option value="">Seleccioná una localidad</option>
                    {GEO_DATA[property.zonaGeografica].localidades[property.partido].map(l => (
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

            <label htmlFor="calle">Calle</label>
            <input type="text" id="calle" name="calle" required value={property.calle} onChange={handleChange} placeholder="Nombre de la calle" />

            <div className="grid grid-4">
              <div>
                <label htmlFor="nroCalle">Nro. calle</label>
                <input type="text" id="nroCalle" name="nroCalle" value={property.nroCalle} onChange={handleChange} placeholder="1234" />
              </div>
              <div>
                <label htmlFor="piso">Piso</label>
                <input type="text" id="piso" name="piso" value={property.piso} onChange={handleChange} placeholder="3°" />
              </div>
              <div>
                <label htmlFor="depto">Depto</label>
                <input type="text" id="depto" name="depto" value={property.depto} onChange={handleChange} placeholder="B" />
              </div>
            </div>

            <div className="grid grid-3">
              <div>
                <label htmlFor="entreCalles">Entre calle</label>
                <input type="text" id="entreCalles" name="entreCalles" value={property.entreCalles} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="yCalles">Y calle</label>
                <input type="text" id="yCalles" name="yCalles" value={property.yCalles} onChange={handleChange} />
              </div>
              <div>
                <label htmlFor="cercaDe">Cerca de</label>
                <input type="text" id="cercaDe" name="cercaDe" value={property.cercaDe} onChange={handleChange} placeholder="Ej: estación, hospital..." />
              </div>
            </div>

            {GMAPS_KEY && (
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
            )}

            <PropertyMap
              latitud={property.latitud}
              longitud={property.longitud}
              onChange={(lat, lng) => setProperty(v => ({
                ...v,
                latitud: lat.toFixed(7),
                longitud: lng.toFixed(7),
              }))}
            />

            <div className="grid grid-2">
              <div>
                <label htmlFor="latitud">Latitud</label>
                <input type="number" id="latitud" name="latitud" step="any" value={property.latitud} onChange={handleChange} placeholder="-34.6455653" />
              </div>
              <div>
                <label htmlFor="longitud">Longitud</label>
                <input type="number" id="longitud" name="longitud" step="any" value={property.longitud} onChange={handleChange} placeholder="-58.5193541" />
              </div>
            </div>

          </div>

          <div className="form-panel">
            <div className="form-section-title">
              <Ruler size={18} aria-hidden="true" />
              <h2>Características de la propiedad</h2>
            </div>

            <div className="qty-picker-section">
              <label>Cocheras</label>
              <div className="qty-picker-row">
                <QtyPicker label="Cubiertas" name="cocherasCubiertas"
                  value={property.cocherasCubiertas} onChange={handleChange} options={COCHERAS_OPTS} />
                <QtyPicker label="Descubiertas" name="cocherasDescubiertas"
                  value={property.cocherasDescubiertas} onChange={handleChange} options={COCHERAS_OPTS} />
                <QtyPicker label="Semicubiertas" name="cocherasSemicubiertas"
                  value={property.cocherasSemicubiertas} onChange={handleChange} options={COCHERAS_OPTS} />
              </div>
            </div>

            <div className="qty-picker-section">
              <label>Ambientes de la propiedad</label>
              <div className="qty-picker-row">
                <QtyPicker label="Dormitorios" name="bedrooms"
                  value={property.bedrooms} onChange={handleChange} options={DORMITORIOS_OPTS} />
                <QtyPicker label="Baños" name="bathrooms"
                  value={property.bathrooms} onChange={handleChange} options={BANOS_OPTS} />
              </div>
            </div>

            <div>
              <label htmlFor="areaM2">Superficie (m²)</label>
              <div className="field-unit" style={{ maxWidth: 200 }}>
                <input type="number" id="areaM2" name="areaM2" min="0" required value={property.areaM2} onChange={handleChange} />
                <span className="unit-tag">m²</span>
              </div>
            </div>

            <div className="grid grid-2">
              <div>
                <label>Medidas de terreno</label>
                <div className="medidas-terreno">
                  <input type="number" name="anchoTerreno" min="0" step="any" value={property.anchoTerreno} onChange={handleChange} placeholder="Ancho" />
                  <span className="unit-tag">m</span>
                  <span className="medidas-x">✕</span>
                  <input type="number" name="largoTerreno" min="0" step="any" value={property.largoTerreno} onChange={handleChange} placeholder="Largo" />
                  <span className="unit-tag">m</span>
                </div>
              </div>
              <div>
                <label htmlFor="superficieTerreno">Superficie terreno</label>
                <div className="field-unit">
                  <input type="number" id="superficieTerreno" name="superficieTerreno" min="0" step="any" value={property.superficieTerreno} onChange={handleChange} />
                  <span className="unit-tag">m²</span>
                </div>
              </div>
            </div>

            <div className="grid grid-4">
              <div>
                <label htmlFor="superficieTotal">Superficie total</label>
                <div className="field-unit">
                  <input type="number" id="superficieTotal" name="superficieTotal" min="0" step="any" value={property.superficieTotal} onChange={handleChange} />
                  <span className="unit-tag">m²</span>
                </div>
              </div>
              <div>
                <label htmlFor="superficieCubierta">Superficie cubierta</label>
                <div className="field-unit">
                  <input type="number" id="superficieCubierta" name="superficieCubierta" min="0" step="any" value={property.superficieCubierta} onChange={handleChange} />
                  <span className="unit-tag">m²</span>
                </div>
              </div>
              <div>
                <label htmlFor="superficieDescubierta">Superficie descubierta</label>
                <div className="field-unit">
                  <input type="number" id="superficieDescubierta" name="superficieDescubierta" min="0" step="any" value={property.superficieDescubierta} onChange={handleChange} />
                  <span className="unit-tag">m²</span>
                </div>
              </div>
              <div>
                <label htmlFor="fondoLibre">Fondo libre</label>
                <div className="field-unit">
                  <input type="number" id="fondoLibre" name="fondoLibre" min="0" step="any" value={property.fondoLibre} onChange={handleChange} />
                  <span className="unit-tag">m²</span>
                </div>
              </div>
            </div>

            <div className="grid grid-4">
              <div>
                <label htmlFor="estadoPropiedad">Estado de la propiedad</label>
                <select id="estadoPropiedad" name="estadoPropiedad" value={property.estadoPropiedad} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="excelente">Excelente</option>
                  <option value="muy_bueno">Muy bueno</option>
                  <option value="bueno">Bueno</option>
                  <option value="regular">Regular</option>
                  <option value="a_refaccionar">A refaccionar</option>
                </select>
              </div>
              <div>
                <label htmlFor="antiguedad">Antigüedad</label>
                <input type="number" id="antiguedad" name="antiguedad" min="0" value={property.antiguedad} onChange={handleChange} placeholder="Ej: 20" />
                <div className="checkbox-row" style={{ marginTop: 8 }}>
                  <input type="checkbox" id="aEstrenar" name="aEstrenar" checked={property.aEstrenar} onChange={handleChange} />
                  <label htmlFor="aEstrenar" style={{ margin: 0, fontWeight: 'normal' }}>A estrenar</label>
                </div>
              </div>
              <div>
                <label htmlFor="plantas">Plantas</label>
                <select id="plantas" name="plantas" value={property.plantas} onChange={handleChange}>
                  <option value="">Sin especificar</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5+">5 o más</option>
                </select>
              </div>
              <div>
                <label htmlFor="orientacion">Orientación</label>
                <select id="orientacion" name="orientacion" value={property.orientacion} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="norte">Norte</option>
                  <option value="sur">Sur</option>
                  <option value="este">Este</option>
                  <option value="oeste">Oeste</option>
                  <option value="noreste">Noreste</option>
                  <option value="noroeste">Noroeste</option>
                  <option value="sureste">Sureste</option>
                  <option value="suroeste">Suroeste</option>
                </select>
              </div>
            </div>

            <div className="grid grid-4">
              <div>
                <label htmlFor="aguaCaliente">Agua caliente</label>
                <select id="aguaCaliente" name="aguaCaliente" value={property.aguaCaliente} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="gas_individual">Gas individual</option>
                  <option value="gas_central">Gas central</option>
                  <option value="electrico">Eléctrico</option>
                  <option value="solar">Solar</option>
                  <option value="termotanque">Termotanque</option>
                </select>
              </div>
              <div>
                <label htmlFor="calefaccion">Calefacción</label>
                <select id="calefaccion" name="calefaccion" value={property.calefaccion} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="gas_natural">Gas natural</option>
                  <option value="electrica">Eléctrica</option>
                  <option value="losa_radiante">Losa radiante</option>
                  <option value="radiadores">Radiadores</option>
                  <option value="aire_acondicionado">Aire acondicionado</option>
                  <option value="sin_calefaccion">Sin calefacción</option>
                </select>
              </div>
              <div>
                <label htmlFor="luminosidad">Luminosidad</label>
                <select id="luminosidad" name="luminosidad" value={property.luminosidad} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="muy_luminoso">Muy luminoso</option>
                  <option value="luminoso">Luminoso</option>
                  <option value="normal">Normal</option>
                  <option value="poco_luminoso">Poco luminoso</option>
                </select>
              </div>
              <div>
                <label htmlFor="tipoVigilancia">Tipo de vigilancia</label>
                <select id="tipoVigilancia" name="tipoVigilancia" value={property.tipoVigilancia} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="sin_vigilancia">Sin vigilancia</option>
                  <option value="guardia_24hs">Guardia 24hs</option>
                  <option value="vigilancia_nocturna">Vigilancia nocturna</option>
                  <option value="camaras">Cámaras de seguridad</option>
                  <option value="portero_electrico">Portero eléctrico</option>
                </select>
              </div>
            </div>

            <div className="grid grid-4">
              <div>
                <label htmlFor="tipoPiso">Tipo de piso</label>
                <select id="tipoPiso" name="tipoPiso" value={property.tipoPiso} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="porcelanato">Porcelanato</option>
                  <option value="ceramica">Cerámica</option>
                  <option value="madera">Madera</option>
                  <option value="marmol">Mármol</option>
                  <option value="granito">Granito</option>
                  <option value="cemento">Cemento</option>
                  <option value="alfombra">Alfombra</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="tipoTecho">Tipo de techo</label>
                <select id="tipoTecho" name="tipoTecho" value={property.tipoTecho} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="losa">Losa</option>
                  <option value="tejas">Tejas</option>
                  <option value="chapa">Chapa</option>
                  <option value="membrana">Membrana</option>
                  <option value="pizarra">Pizarra</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="tipoCosta">Tipo de costa</label>
                <select id="tipoCosta" name="tipoCosta" value={property.tipoCosta} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="sin_costa">Sin costa</option>
                  <option value="laguna">Laguna</option>
                  <option value="rio">Río</option>
                  <option value="mar">Mar</option>
                  <option value="lago">Lago</option>
                </select>
              </div>
              <div>
                <label htmlFor="tipoVista">Tipo de vista</label>
                <select id="tipoVista" name="tipoVista" value={property.tipoVista} onChange={handleChange}>
                  <option value="">- Seleccionar -</option>
                  <option value="sin_vista">Sin vista especial</option>
                  <option value="al_rio">Al río</option>
                  <option value="al_lago">Al lago</option>
                  <option value="al_mar">Al mar</option>
                  <option value="a_la_montana">A la montaña</option>
                  <option value="al_parque">Al parque</option>
                </select>
              </div>
            </div>

            <CheckboxSearchList
              sublabel="Servicios de la propiedad"
              name="servicios"
              options={SERVICIOS}
              selected={property.servicios}
              onChange={val => handleArrayChange('servicios', val)}
            />

            <CheckboxSearchList
              sublabel="Instalaciones de la propiedad"
              name="instalaciones"
              options={INSTALACIONES}
              selected={property.instalaciones}
              onChange={val => handleArrayChange('instalaciones', val)}
            />

            <CheckboxSearchList
              sublabel="Servicios del edificio"
              name="serviciosEdificio"
              options={SERVICIOS_EDIFICIO}
              selected={property.serviciosEdificio}
              onChange={val => handleArrayChange('serviciosEdificio', val)}
            />

            <CheckboxSearchList
              sublabel="Amenities del edificio"
              name="amenitiesEdificio"
              options={AMENITIES_EDIFICIO}
              selected={property.amenitiesEdificio}
              onChange={val => handleArrayChange('amenitiesEdificio', val)}
            />

          </div>
        </section>

        <aside className="property-media-panel">
          <div className="media-uploader">
            <div className="media-uploader-icon">
              <ImagePlus size={24} aria-hidden="true" />
            </div>
            <div>
              <h2>Fotos y videos</h2>
              <p>Subí hasta 8 archivos para mostrar mejor la propiedad.</p>
            </div>
            <input id="property-media" type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleMediaChange} />
            <label className="btn btn-secondary" htmlFor="property-media">Elegir archivos</label>
          </div>

          <article className="upload-preview-card">
            {activeMedia ? (
              activeMedia.type === 'video' ? (
                <video src={activeMedia.url} controls />
              ) : (
                <img src={activeMedia.url} alt={activeMedia.filename || property.title || 'Vista previa de la propiedad'} />
              )
            ) : (
              <div className="preview-empty">
                <Camera size={30} aria-hidden="true" />
                <span>La galería va a aparecer acá.</span>
              </div>
            )}

            <div className="preview-card-body">
              <div>
                <span>{operationLabel(property.operation)} · {typeLabel(property.type)}</span>
                <h3>{property.title || 'Título de la propiedad'}</h3>
              </div>
              <strong>{money(property.price || 0, property.currency)}</strong>
              <p>{property.city || 'Ciudad'}{property.province ? `, ${property.province}` : ''}</p>
            </div>
          </article>

          {allMedia.length > 0 && (
            <>
              <p className="media-thumbs-hint">Arrastrá las miniaturas para cambiar el orden.</p>
              <div className="media-thumbs">
                {allMedia.map((item, index) => (
                  <button
                    key={item.id}
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
                    aria-label={`Ver archivo ${index + 1}`}
                  >
                    {item.type === 'video'
                      ? <Film size={16} aria-hidden="true" />
                      : <img src={item.url} alt="" />}
                    <span className="thumb-order">{index + 1}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {allMedia.some(m => m.isNew) && (
            <div className="selected-media-list">
              {allMedia.filter(m => m.isNew).map(item => (
                <div key={item.id}>
                  <span>{item.filename}</span>
                  <button type="button" onClick={() => removeMedia(item.id)} aria-label={`Quitar ${item.filename}`}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label htmlFor="status">Estado</label>
          <select id="status" name="status" value={property.status} onChange={handleChange}>
            <option value="publicada">Publicada</option>
            <option value="borrador">Borrador</option>
            <option value="pausada">Pausada</option>
          </select>

          <div className="btn-row form-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar propiedad'}
            </button>
          </div>
        </aside>
      </form>
    </>
  );
}
