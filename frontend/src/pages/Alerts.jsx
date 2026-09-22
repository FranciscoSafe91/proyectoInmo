import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, TYPE_LABELS } from '../utils.js';
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

function summarizeAlert(alert) {
  const parts = [];
  if (alert.operation) parts.push(operationLabel(alert.operation));
  if (alert.type) parts.push(typeLabel(alert.type));
  if (alert.localidad) parts.push(`en ${alert.localidad}`);
  else if (alert.partido) parts.push(`en ${alert.partido}`);
  else if (alert.zonaGeografica) parts.push(`en ${alert.zonaGeografica}`);
  else if (alert.city) parts.push(`en ${alert.city}`);
  if (alert.minBedrooms) parts.push(`${alert.minBedrooms}+ dorm.`);
  if (alert.minBathrooms) parts.push(`${alert.minBathrooms}+ baños`);
  if (alert.minAreaM2) parts.push(`${alert.minAreaM2}+ m²`);
  if (alert.currency && (alert.minPrice || alert.maxPrice)) {
    const cur = alert.currency === 'USD' ? 'U$D' : '$';
    if (alert.minPrice && alert.maxPrice) parts.push(`${cur} ${alert.minPrice}–${alert.maxPrice}`);
    else if (alert.minPrice) parts.push(`desde ${cur} ${alert.minPrice}`);
    else parts.push(`hasta ${cur} ${alert.maxPrice}`);
  }
  return parts.length ? parts.join(' · ') : 'Cualquier propiedad de tus socios';
}

export default function Alerts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [newAlert, setNewAlert] = useState(EMPTY_ALERT);

  function load() {
    api.get('/alertas').then(setData).catch(e => setError(e.message));
  }
  useEffect(load, []);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'zonaGeografica') {
      setNewAlert(v => ({ ...v, zonaGeografica: value, partido: '', localidad: '' }));
    } else if (name === 'partido') {
      setNewAlert(v => ({ ...v, partido: value, localidad: '' }));
    } else {
      setNewAlert(v => ({ ...v, [name]: value }));
    }
  }

  function handleArrayChange(name, val) {
    setNewAlert(v => ({ ...v, [name]: val }));
  }

  async function handleCreateAlert(e) {
    e.preventDefault();
    await api.post('/alertas', newAlert);
    setNewAlert(EMPTY_ALERT);
    load();
  }

  async function handlePausar(id) {
    await api.post(`/alertas/${id}/pausar`);
    load();
  }
  async function handleActivar(id) {
    await api.post(`/alertas/${id}/activar`);
    load();
  }
  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta alerta?')) return;
    await api.delete(`/alertas/${id}`);
    load();
  }
  async function handleCompartir(alertId, propertyId) {
    await api.post(`/alertas/${alertId}/compartir/${propertyId}`);
    load();
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { alerts, matches, hasPartners } = data;

  return (
    <>
      <h1>Alertas de búsqueda</h1>
      <p className="subtitle">Creá una alerta cuando busques algo puntual que no tenés ni vos ni tus socios. En cuanto alguno de tus socios tenga (o cargue) algo compatible, se lo vas a poder pedir compartir al instante.</p>

      <div className="card">
        <h3>Coincidencias para tus propiedades</h3>
        <p className="muted small">Estas son alertas de tus socios que coinciden con propiedades tuyas — podés compartírselas con un clic.</p>
        {matches.length === 0 ? (
          <p className="muted">Por ahora no hay ninguna coincidencia pendiente.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tu propiedad</th><th>Socio que la busca</th><th></th></tr></thead>
              <tbody>
                {matches.map(({ alert, property, requestingAgency }) => (
                  <tr key={`${alert.id}-${property.id}`}>
                    <td>
                      <Link to={`/propiedades/${property.id}`}>{property.title}</Link><br />
                      <span className="muted small">{typeLabel(property.type)} · {operationLabel(property.operation)} · {money(property.price, property.currency)}</span>
                    </td>
                    <td>
                      {requestingAgency.name}<br />
                      <span className="muted small">busca: {summarizeAlert(alert)}</span>
                    </td>
                    <td>
                      <button className="btn btn-small" onClick={() => handleCompartir(alert.id, property.id)}>Compartir ahora</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Crear una alerta</h3>
        {!hasPartners && (
          <p className="muted">Todavía no tenés inmobiliarias socias — las alertas solo avisan sobre la red de socios. <Link to="/socios">Sumá socios primero →</Link></p>
        )}
        <form onSubmit={handleCreateAlert}>
          <label htmlFor="title">Título (para identificarla, opcional)</label>
          <input type="text" id="title" name="title" value={newAlert.title} onChange={handleChange} placeholder="Ej: Depto 2 amb en Nueva Córdoba para cliente urgente" />

          <div className="grid grid-2">
            <div>
              <label htmlFor="operation">Operación</label>
              <select id="operation" name="operation" value={newAlert.operation} onChange={handleChange}>
                <option value="">Cualquiera</option>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
            </div>
            <div>
              <label htmlFor="type">Tipo de propiedad</label>
              <select id="type" name="type" value={newAlert.type} onChange={handleChange}>
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
              <select id="zonaGeografica" name="zonaGeografica" value={newAlert.zonaGeografica} onChange={handleChange}>
                <option value="">Cualquier zona</option>
                {PROVINCIAS_AR.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="partido">Partido</label>
              {GEO_DATA[newAlert.zonaGeografica] ? (
                <select id="partido" name="partido" value={newAlert.partido} onChange={handleChange}>
                  <option value="">Cualquier partido</option>
                  {GEO_DATA[newAlert.zonaGeografica].partidos.map(p => (
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
              {newAlert.partido && GEO_DATA[newAlert.zonaGeografica]?.localidades[newAlert.partido] ? (
                <select id="localidad" name="localidad" value={newAlert.localidad} onChange={handleChange}>
                  <option value="">Cualquier localidad</option>
                  {GEO_DATA[newAlert.zonaGeografica].localidades[newAlert.partido].map(l => (
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
              <select id="currency" name="currency" value={newAlert.currency} onChange={handleChange}>
                <option value="">Sin filtro de precio</option>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label htmlFor="minPrice">Precio mínimo</label>
              <input type="number" id="minPrice" name="minPrice" min="0" value={newAlert.minPrice} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="maxPrice">Precio máximo</label>
              <input type="number" id="maxPrice" name="maxPrice" min="0" value={newAlert.maxPrice} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-3">
            <div>
              <label htmlFor="minBedrooms">Dormitorios mínimos</label>
              <input type="number" id="minBedrooms" name="minBedrooms" min="0" value={newAlert.minBedrooms} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="minBathrooms">Baños mínimos</label>
              <input type="number" id="minBathrooms" name="minBathrooms" min="0" value={newAlert.minBathrooms} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="minAreaM2">Superficie mínima (m²)</label>
              <input type="number" id="minAreaM2" name="minAreaM2" min="0" value={newAlert.minAreaM2} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label htmlFor="minCocheras">Cocheras mínimas</label>
            <select id="minCocheras" name="minCocheras" value={newAlert.minCocheras} onChange={handleChange} style={{ maxWidth: 200 }}>
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
            selected={newAlert.serviciosRequeridos}
            onChange={val => handleArrayChange('serviciosRequeridos', val)}
          />

          <CheckboxSearchList
            sublabel="Instalaciones requeridas"
            name="alert-instalaciones"
            options={INSTALACIONES}
            selected={newAlert.instalacionesRequeridas}
            onChange={val => handleArrayChange('instalacionesRequeridas', val)}
          />

          <div className="btn-row">
            <button type="submit" className="btn">Crear alerta</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Mis alertas</h3>
        {alerts.length === 0 ? (
          <p className="muted">Todavía no creaste ninguna alerta.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Alerta</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id}>
                    <td>
                      {a.title || <span className="muted">(sin título)</span>}<br />
                      <span className="muted small">{summarizeAlert(a)}</span>
                    </td>
                    <td>
                      {a.active
                        ? <span className="badge badge-publicada">Activa</span>
                        : <span className="badge badge-borrador">Pausada</span>}
                    </td>
                    <td>
                      {a.active
                        ? <button className="btn btn-secondary btn-small" onClick={() => handlePausar(a.id)}>Pausar</button>
                        : <button className="btn btn-secondary btn-small" onClick={() => handleActivar(a.id)}>Activar</button>}{' '}
                      <button className="btn btn-danger btn-small" onClick={() => handleEliminar(a.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
