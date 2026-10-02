import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

function moneyExpensas(amount, moneda) {
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString('es-AR');
  return `${moneda === 'USD' ? 'U$D' : '$'} ${formatted}`;
}

export default function Ficha() {
  const { id } = useParams();
  const [propData, setPropData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/propiedades/${id}`),
      api.get('/session'),
    ]).then(([pd, sd]) => {
      setPropData(pd);
      setSessionData(sd);
    }).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!propData || !sessionData) return <p className="muted">Cargando...</p>;

  const { property, media = [] } = propData;
  const agency = sessionData.agency;
  const user = sessionData.user;
  const color = agency.brandColor || '#1f6f54';
  const photos = media.filter(m => m.type === 'image').slice(0, 4);

  const shortId = property.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const codeRef = `${agency.name?.slice(0, 4).toUpperCase() || 'PROP'}-${shortId}`;

  function row(label, value) {
    if (!value && value !== 0) return null;
    return (
      <div className="char-row">
        <span className="char-label">{label}:</span>
        <span className="char-value"><strong>{value}</strong></span>
      </div>
    );
  }

  const styles = `
    :root { --brand: ${color}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #222; background: #f0f0f0; padding: 24px; }
    .print-bar { max-width: 860px; margin: 0 auto 12px; text-align: right; }
    .print-btn { background: ${color}; color: #fff; border: none; padding: 9px 18px; border-radius: 7px; font-size: 0.88rem; font-weight: 600; cursor: pointer; }
    .sheet { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #ddd; }
    /* Reference bar */
    .ref-bar { padding: 7px 18px; background: #f9f9f9; border-bottom: 1px solid #e8e8e8; font-size: 0.78rem; color: #888; }
    .ref-bar strong { color: #444; }
    /* Main layout */
    .main-grid { display: grid; grid-template-columns: 1fr 240px; }
    /* Left column */
    .left-col { padding: 20px 22px; border-right: 1px solid #e8e8e8; }
    .prop-address { font-size: 1.7rem; font-weight: 700; line-height: 1.2; color: #111; margin-bottom: 4px; }
    .prop-entre { font-size: 0.9rem; color: #555; margin-bottom: 2px; }
    .prop-location { font-size: 0.82rem; color: #888; margin-bottom: 12px; }
    .price-block { margin-bottom: 14px; }
    .price-main { font-size: 1.55rem; font-weight: 700; color: ${color}; }
    .price-expensas { font-size: 0.88rem; color: #666; margin-top: 2px; }
    /* Right column */
    .right-col { display: flex; flex-direction: column; }
    .photos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; flex: 1; }
    .photos-grid.one   { grid-template-columns: 1fr; }
    .photos-grid.two   { grid-template-columns: 1fr 1fr; }
    .photos-grid.three { grid-template-columns: 1fr 1fr; }
    .photos-grid.four  { grid-template-columns: 1fr 1fr; }
    .photo-img { width: 100%; height: 120px; object-fit: cover; display: block; }
    .photo-img.tall { height: 240px; }
    /* Agency card */
    .agency-card { padding: 14px; border-top: 1px solid #e8e8e8; background: #fafafa; }
    .agency-logo { width: 80px; height: 50px; object-fit: contain; display: block; margin: 0 auto 8px; }
    .agency-logo-placeholder { width: 80px; height: 50px; background: ${color}; color: #fff; font-size: 1.4rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; border-radius: 4px; }
    .agency-agent { font-size: 0.82rem; font-weight: 700; text-align: center; }
    .agency-agent-role { font-size: 0.72rem; color: #888; text-align: center; }
    .agency-name { font-size: 0.8rem; font-weight: 700; text-align: center; margin-top: 6px; }
    .agency-info { font-size: 0.72rem; color: #666; text-align: center; line-height: 1.5; }
    /* Sections */
    .section { margin-top: 14px; }
    .section-title { font-size: 0.82rem; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 4px; border-bottom: 1.5px solid ${color}; margin-bottom: 8px; }
    .chars-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .char-row { font-size: 0.82rem; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
    .char-label { color: #666; }
    .char-value { margin-left: 4px; }
    .services-line { font-size: 0.82rem; color: #444; line-height: 1.6; }
    .services-others { font-size: 0.82rem; color: #444; margin-top: 4px; }
    .description { font-size: 0.82rem; line-height: 1.55; color: #333; white-space: pre-wrap; }
    /* Footer */
    .ficha-footer { border-top: 1px solid #e8e8e8; padding: 10px 18px; font-size: 0.68rem; color: #aaa; line-height: 1.4; }
    @media print {
      body { background: #fff; padding: 0; }
      .print-bar { display: none; }
      .sheet { border: none; max-width: 100%; }
      .photo-img { height: 100px; }
      .photo-img.tall { height: 200px; }
    }
    @media (max-width: 600px) {
      .main-grid { grid-template-columns: 1fr; }
      .right-col { border-top: 1px solid #e8e8e8; }
    }
  `;

  const yCallesText = property.yCalles ? ` y ${property.yCalles}` : '';
  const entreCallesText = property.entreCalles
    ? `Entre ${property.entreCalles}${yCallesText}`
    : '';
  const locationParts = [property.zonaGeografica, property.partido || property.city].filter(Boolean);

  const chars1 = [
    { label: 'Apto crédito', value: property.aptoCredito ? 'Sí' : 'No' },
    { label: 'Apto prof.', value: property.aptoProf ? 'Sí' : 'No' },
    { label: 'Estado', value: property.estadoPropiedad },
    { label: 'Antigüedad', value: property.aEstrenar ? 'A estrenar' : property.antiguedad != null ? `${property.antiguedad} año${property.antiguedad !== 1 ? 's' : ''}` : null },
    { label: 'Cant. plantas', value: property.plantas },
    { label: 'Disposición', value: property.disposicion },
    { label: 'Orientación', value: property.orientacion },
    { label: 'Dormitorio/s', value: property.bedrooms || null },
    { label: 'Baño/s', value: property.bathrooms || null },
    { label: 'Agua caliente', value: property.aguaCaliente },
    { label: 'Calefacción', value: property.calefaccion },
  ].filter(c => c.value != null && c.value !== '');

  const charsEdificio = [
    { label: 'Categoría edificio', value: property.categoriaEdificio },
    { label: 'Pisos', value: property.pisosEdificio != null ? String(property.pisosEdificio) : null },
    { label: 'Deptos. por piso', value: property.deptosPorPiso != null ? String(property.deptosPorPiso) : null },
    { label: 'Ascensores', value: property.ascensoresPrincipales != null ? String(property.ascensoresPrincipales) : null },
  ].filter(c => c.value != null && c.value !== '');

  const superficies = [
    { label: 'Sup. total', value: property.superficieTotal ? `${property.superficieTotal} m²` : (property.areaM2 ? `${property.areaM2} m²` : null) },
    { label: 'Sup. cubierta', value: property.superficieCubierta ? `${property.superficieCubierta} m²` : null },
    { label: 'Sup. descubierta', value: property.superficieDescubierta ? `${property.superficieDescubierta} m²` : null },
    { label: 'Sup. semicubierta', value: property.superficieSemicubierta ? `${property.superficieSemicubierta} m²` : null },
    { label: 'Terreno', value: property.superficieTerreno ? `${property.superficieTerreno} m²` : null },
  ].filter(c => c.value != null);

  const serviciosList = Array.isArray(property.servicios) ? property.servicios : [];
  const amenitiesList = Array.isArray(property.amenitiesEdificio) ? property.amenitiesEdificio : [];

  const photoCount = photos.length;
  const gridClass = ['zero', 'one', 'two', 'three', 'four'][photoCount] || 'four';

  return (
    <>
      <style>{styles}</style>
      <div className="print-bar">
        <button className="print-btn" onClick={() => window.print()}>Imprimir / Guardar como PDF</button>
      </div>
      <div className="sheet">
        {/* Reference bar */}
        <div className="ref-bar">
          <strong>{codeRef}</strong>&nbsp;|&nbsp;{typeLabel(property.type)} en {operationLabel(property.operation)}
        </div>

        {/* Main 2-column grid */}
        <div className="main-grid">
          {/* LEFT */}
          <div className="left-col">
            <h1 className="prop-address">{property.address || property.title}</h1>
            {entreCallesText && <p className="prop-entre">{entreCallesText}</p>}
            {locationParts.length > 0 && (
              <p className="prop-location">{locationParts.join(' | ')}</p>
            )}

            <div className="price-block">
              <div className="price-main">{money(property.price, property.currency)}</div>
              {property.expensas > 0 && (
                <div className="price-expensas">
                  {moneyExpensas(property.expensas, property.expensasMoneda)} expensas
                </div>
              )}
            </div>

            {/* Características */}
            {chars1.length > 0 && (
              <div className="section">
                <div className="section-title">Características</div>
                <div className="chars-grid">
                  {chars1.map(c => (
                    <div key={c.label} className="char-row">
                      <span className="char-label">{c.label}: </span>
                      <strong>{c.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Características del edificio */}
            {charsEdificio.length > 0 && (
              <div className="section">
                <div className="section-title">Características del edificio</div>
                <div className="chars-grid">
                  {charsEdificio.map(c => (
                    <div key={c.label} className="char-row">
                      <span className="char-label">{c.label}: </span>
                      <strong>{c.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Superficies */}
            {superficies.length > 0 && (
              <div className="section">
                <div className="section-title">Superficies</div>
                <div className="chars-grid">
                  {superficies.map(c => (
                    <div key={c.label} className="char-row">
                      <span className="char-label">{c.label}: </span>
                      <strong>{c.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Servicios */}
            {(serviciosList.length > 0 || amenitiesList.length > 0) && (
              <div className="section">
                <div className="section-title">Servicios</div>
                {serviciosList.length > 0 && (
                  <p className="services-line">{serviciosList.join(' - ')}</p>
                )}
                {amenitiesList.length > 0 && (
                  <p className="services-others">
                    <strong>Otros: </strong>{amenitiesList.join(' - ')}
                  </p>
                )}
              </div>
            )}

            {/* Descripción */}
            {property.description && (
              <div className="section">
                <div className="section-title">Descripción</div>
                <p className="description">{property.description}</p>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="right-col">
            {photoCount > 0 && (
              <div className={`photos-grid ${gridClass}`}>
                {photos.map((ph, i) => (
                  <img
                    key={ph.id}
                    src={ph.url}
                    alt={`Foto ${i + 1}`}
                    className={`photo-img${photoCount <= 2 ? ' tall' : ''}`}
                  />
                ))}
              </div>
            )}
            <div className="agency-card">
              {agency.logoPath
                ? <img src={agency.logoPath} alt={agency.name} className="agency-logo" />
                : <div className="agency-logo-placeholder">{agency.name?.slice(0, 1).toUpperCase()}</div>}
              {user?.name && (
                <>
                  <p className="agency-agent">{user.name}</p>
                  <p className="agency-agent-role">Agente Responsable</p>
                  {user.email && <p className="agency-info">{user.email}</p>}
                </>
              )}
              <p className="agency-name">{agency.name}</p>
              {agency.city && <p className="agency-info">{agency.city}</p>}
              {agency.phone && <p className="agency-info">{agency.phone}</p>}
            </div>
          </div>
        </div>

        {/* Footer legal */}
        <div className="ficha-footer">
          Nota importante: Toda la información y medidas provistas son aproximadas y deberán ratificarse con la documentación pertinente.
          Los gastos (expensas, ABL) expresados refieren a la última información recabada y deberán confirmarse.
          Fotografías no vinculantes ni contractuales.
        </div>
      </div>
    </>
  );
}
