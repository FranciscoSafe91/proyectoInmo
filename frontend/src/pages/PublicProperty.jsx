import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

export default function PublicProperty() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const via = searchParams.get('via') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/propiedades/${id}${via ? `?via=${via}` : ''}`).then(setData).catch(e => setError(e.message));
  }, [id, via]);

  if (error) return <div className="card"><h1>Propiedad no disponible</h1><p className="muted">Esta propiedad no existe o ya no está publicada.</p></div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { property, owner, viaAgency } = data;
  const brandColor = (viaAgency && viaAgency.brandColor) || '#1f6f54';

  return (
    <>
      {viaAgency && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {viaAgency.logoPath && (
            <img src={viaAgency.logoPath} alt={viaAgency.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6 }} />
          )}
          <span style={{ fontWeight: 700, color: brandColor }}>{viaAgency.name}</span>
        </div>
      )}
      <h1>{property.title}</h1>
      <p className="subtitle">{typeLabel(property.type)} · {operationLabel(property.operation)}</p>
      {viaAgency && viaAgency.id !== owner.id && (
        <p className="muted">Compartida en la red de inmobiliarias socias por <strong>{owner.name}</strong>, publicada acá por <strong>{viaAgency.name}</strong>.</p>
      )}

      <div className="card">
        <h3>{money(property.price, property.currency)}</h3>
        <p>{property.description || <span className="muted">Sin descripción.</span>}</p>
        <table>
          <tbody>
            <tr><th>Dirección</th><td>{property.address || '-'}</td></tr>
            <tr><th>Ciudad</th><td>{property.city || '-'}, {property.province || '-'}</td></tr>
            <tr><th>Dormitorios</th><td>{property.bedrooms || '-'}</td></tr>
            <tr><th>Baños</th><td>{property.bathrooms || '-'}</td></tr>
            <tr><th>Superficie</th><td>{property.areaM2 ? `${property.areaM2} m²` : '-'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Contacto</h3>
        <p><strong>{owner.name}</strong></p>
        <p className="muted">{owner.city || ''}</p>
        <p>
          {owner.email && <>✉️ {owner.email}</>}
          {owner.phone && <><br />📞 {owner.phone}</>}
        </p>
      </div>
    </>
  );
}
