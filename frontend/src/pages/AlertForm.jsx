import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../api.js';
import { TYPE_LABELS } from '../utils.js';
import GEO_DATA from '../geoData.js';

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

const PROVINCIAS_AR = [
  'Capital Federal','Buenos Aires','Catamarca','Chaco','Chubut','Córdoba',
  'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza',
  'Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz',
  'Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán',
];

const EMPTY_ALERT = {
  title: '', operation: '', type: '', currency: '',
  minPrice: '', maxPrice: '', minBedrooms: '', minBathrooms: '', minAreaM2: '',
  zonaGeografica: '', partido: '', localidad: '',
  minCocheras: '',
  serviciosRequeridos: [],
  instalacionesRequeridas: [],
};

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

export default function AlertForm() {
  const navigate = useNavigate();
  const [alert, setAlert] = useState(EMPTY_ALERT);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'zonaGeografica') {
      setAlert(v => ({ ...v, zonaGeografica: value, partido: '', localidad: '' }));
    } else if (name === 'partido') {
      setAlert(v => ({ ...v, partido: value, localidad: '' }));
    } else {
      setAlert(v => ({ ...v, [name]: value }));
    }
  }

  function handleArrayChange(name, val) {
    setAlert(v => ({ ...v, [name]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/alertas', alert);
      navigate('/alertas');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <>
      <section className="page-hero compact-hero">
        <div>
          <span className="section-kicker">Nueva búsqueda</span>
          <h1>Crear alerta</h1>
          <p className="subtitle">Definí qué estás buscando y recibí un aviso cuando alguno de tus socios tenga algo compatible.</p>
        </div>
        <Link className="btn btn-secondary" to="/alertas">Ver mis alertas</Link>
      </section>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="title">Título (para identificarla, opcional)</label>
          <input
            type="text"
            id="title"
            name="title"
            value={alert.title}
            onChange={handleChange}
            placeholder="Ej: Depto 2 amb en Nueva Córdoba para cliente urgente"
            autoFocus
          />

          <div className="grid grid-2">
            <div>
              <label htmlFor="operation">Operación</label>
              <select id="operation" name="operation" value={alert.operation} onChange={handleChange}>
                <option value="">Cualquiera</option>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
            </div>
            <div>
              <label htmlFor="type">Tipo de propiedad</label>
              <select id="type" name="type" value={alert.type} onChange={handleChange}>
                <option value="">Cualquiera</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-3">
            <div>
              <label htmlFor="zonaGeografica">Zona geográfica</label>
              <select id="zonaGeografica" name="zonaGeografica" value={alert.zonaGeografica} onChange={handleChange}>
                <option value="">Cualquier zona</option>
                {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="partido">Partido</label>
              {GEO_DATA[alert.zonaGeografica] ? (
                <select id="partido" name="partido" value={alert.partido} onChange={handleChange}>
                  <option value="">Cualquier partido</option>
                  {GEO_DATA[alert.zonaGeografica].partidos.map(p => (
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
              {alert.partido && GEO_DATA[alert.zonaGeografica]?.localidades[alert.partido] ? (
                <select id="localidad" name="localidad" value={alert.localidad} onChange={handleChange}>
                  <option value="">Cualquier localidad</option>
                  {GEO_DATA[alert.zonaGeografica].localidades[alert.partido].map(l => (
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
            <div>
              <label htmlFor="currency">Moneda</label>
              <select id="currency" name="currency" value={alert.currency} onChange={handleChange}>
                <option value="">Sin filtro de precio</option>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label htmlFor="minPrice">Precio mínimo</label>
              <input type="number" id="minPrice" name="minPrice" min="0" value={alert.minPrice} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="maxPrice">Precio máximo</label>
              <input type="number" id="maxPrice" name="maxPrice" min="0" value={alert.maxPrice} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-3">
            <div>
              <label htmlFor="minBedrooms">Dormitorios mínimos</label>
              <input type="number" id="minBedrooms" name="minBedrooms" min="0" value={alert.minBedrooms} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="minBathrooms">Baños mínimos</label>
              <input type="number" id="minBathrooms" name="minBathrooms" min="0" value={alert.minBathrooms} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="minAreaM2">Superficie mínima (m²)</label>
              <input type="number" id="minAreaM2" name="minAreaM2" min="0" value={alert.minAreaM2} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label htmlFor="minCocheras">Cocheras mínimas</label>
            <select id="minCocheras" name="minCocheras" value={alert.minCocheras} onChange={handleChange} style={{ maxWidth: 200 }}>
              <option value="">Sin filtro</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 o más</option>
            </select>
          </div>

          <CheckboxSearchList
            sublabel="Servicios requeridos"
            name="alert-servicios"
            options={SERVICIOS}
            selected={alert.serviciosRequeridos}
            onChange={val => handleArrayChange('serviciosRequeridos', val)}
          />

          <CheckboxSearchList
            sublabel="Instalaciones requeridas"
            name="alert-instalaciones"
            options={INSTALACIONES}
            selected={alert.instalacionesRequeridas}
            onChange={val => handleArrayChange('instalacionesRequeridas', val)}
          />

          <div className="btn-row">
            <Link className="btn btn-secondary" to="/alertas">Cancelar</Link>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear alerta'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
