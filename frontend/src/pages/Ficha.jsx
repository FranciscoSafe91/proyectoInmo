import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

export default function Ficha() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [agency, setAgency] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/propiedades/${id}`),
      api.get('/mi-cuenta'),
    ]).then(([propData, acctData]) => {
      setData(propData);
      setAgency(acctData.agency);
    }).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data || !agency) return <p className="muted">Cargando...</p>;

  const { property } = data;
  const color = agency.brandColor || '#1f6f54';
  const logoUrl = agency.logoPath;

  const styles = `
    :root { --brand: ${color}; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #22292b; margin: 0; padding: 32px; background: #f6f7f5; }
    .sheet { max-width: 820px; margin: 0 auto; background: white; border: 1px solid #e1e4e0; border-radius: 12px; overflow: hidden; }
    .ficha-header { display: flex; align-items: center; gap: 16px; padding: 24px 28px; border-bottom: 4px solid ${color}; }
    .ficha-logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
    .ficha-logo-placeholder { width: 64px; height: 64px; border-radius: 8px; color: white; font-size: 1.6rem; font-weight: 700; display: flex; align-items: center; justify-content: center; background: ${color}; }
    .ficha-agency-name { font-size: 1.15rem; font-weight: 700; margin: 0; }
    .ficha-agency-contact { color: #667070; font-size: 0.85rem; margin: 2px 0 0; }
    .ficha-body { padding: 28px; }
    .ficha-title { font-size: 1.4rem; margin: 0 0 4px; }
    .ficha-subtitle { color: #667070; margin: 0 0 18px; }
    .ficha-price { font-size: 1.6rem; font-weight: 700; color: ${color}; margin: 0 0 18px; }
    .ficha-desc { margin: 0 0 20px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #eee; font-size: 0.92rem; }
    th { color: #667070; font-weight: 600; width: 40%; }
    .ficha-footer { text-align: center; padding: 16px; color: #98a0a0; font-size: 0.75rem; }
    .print-bar { max-width: 820px; margin: 0 auto 16px; text-align: right; }
    .print-btn { background: ${color}; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
    @media print { body { background: white; padding: 0; } .print-bar { display: none; } .sheet { border: none; border-radius: 0; max-width: 100%; } }
  `;

  const contact = [agency.phone, agency.email].filter(Boolean).join(' · ');

  return (
    <>
      <style>{styles}</style>
      <div className="print-bar">
        <button className="print-btn" onClick={() => window.print()}>🖨️ Imprimir / Guardar como PDF</button>
      </div>
      <div className="sheet">
        <div className="ficha-header">
          {logoUrl
            ? <img src={logoUrl} alt={agency.name} className="ficha-logo" />
            : <div className="ficha-logo-placeholder">{agency.name.slice(0, 1).toUpperCase()}</div>}
          <div>
            <p className="ficha-agency-name">{agency.name}</p>
            <p className="ficha-agency-contact">{contact}</p>
          </div>
        </div>
        <div className="ficha-body">
          <h1 className="ficha-title">{property.title}</h1>
          <p className="ficha-subtitle">
            {typeLabel(property.type)} · {operationLabel(property.operation)} · {property.city}{property.city ? ', ' : ''}{property.province}
          </p>
          <p className="ficha-price">{money(property.price, property.currency)}</p>
          <p className="ficha-desc">{property.description || ''}</p>
          <table>
            <tbody>
              <tr><th>Dirección</th><td>{property.address || '-'}</td></tr>
              <tr><th>Dormitorios</th><td>{property.bedrooms || '-'}</td></tr>
              <tr><th>Baños</th><td>{property.bathrooms || '-'}</td></tr>
              <tr><th>Superficie</th><td>{property.areaM2 ? property.areaM2 + ' m²' : '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="ficha-footer">Ficha generada por {agency.name}</div>
      </div>
    </>
  );
}
