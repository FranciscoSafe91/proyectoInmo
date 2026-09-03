import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel, formatDate } from '../utils.js';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function WebPublishCell({ property, share, onUpdate }) {
  if (share.status !== 'aceptada') return <span className="muted small">—</span>;

  async function handleAutorizar() {
    await api.post(`/propiedades/${property.id}/compartir/${share.id}/autorizar-web`);
    onUpdate();
  }
  async function handleQuitar() {
    await api.post(`/propiedades/${property.id}/compartir/${share.id}/quitar-autorizacion-web`);
    onUpdate();
  }

  if (share.webPublishAuthorized) {
    return (
      <>
        <span className="badge badge-aceptada">Autorizada</span>{' '}
        <button className="btn btn-secondary btn-small" onClick={handleQuitar}>Quitar</button>
      </>
    );
  }
  return (
    <>
      <span className="badge badge-borrador">Solo interno</span>{' '}
      <button className="btn btn-small" onClick={handleAutorizar}>Autorizar para su web</button>
    </>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [allowWebPublish, setAllowWebPublish] = useState(false);

  function load() {
    api.get(`/propiedades/${id}`).then(setData).catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { property, owner, shares, partnerAgencies, isOwner } = data;
  const sharedAgencyIds = new Set(shares.filter(s => s.status !== 'rechazada').map(s => s.targetAgencyId));
  const availablePartners = (partnerAgencies?.list || []).filter(a => !sharedAgencyIds.has(a.id));
  const byId = partnerAgencies?.byId || {};

  function togglePartner(id) {
    setSelectedPartners(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleCompartir(e) {
    e.preventDefault();
    await api.post(`/propiedades/${property.id}/compartir`, {
      targetAgencyIds: selectedPartners,
      allowWebPublish,
    });
    setSelectedPartners([]);
    setAllowWebPublish(false);
    load();
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1>{property.title}</h1>
          <p className="subtitle">{typeLabel(property.type)} · {operationLabel(property.operation)} · publicada por {owner.name}</p>
        </div>
        <StatusBadge status={property.status} />
      </div>

      <div className="property-detail-grid">
        <div>
          <div className="card">
            <h3>{money(property.price, property.currency)}</h3>
            <p>{property.description || <span className="muted">Sin descripción.</span>}</p>
            <table>
              <tbody>
                <tr><th>Dirección</th><td>{property.address || '-'}</td></tr>
                <tr><th>Ciudad</th><td>{property.city || '-'}, {property.province || '-'}</td></tr>
                <tr><th>Dormitorios</th><td>{property.bedrooms || '-'}</td></tr>
                <tr><th>Baños</th><td>{property.bathrooms || '-'}</td></tr>
                <tr><th>Superficie</th><td>{property.areaM2 ? property.areaM2 + ' m²' : '-'}</td></tr>
              </tbody>
            </table>
            <div className="btn-row">
              {isOwner && <Link className="btn btn-secondary btn-small" to={`/propiedades/${property.id}/editar`}>Editar propiedad</Link>}
              <Link className="btn btn-secondary btn-small" to={`/propiedades/${property.id}/ficha`} target="_blank">🖨️ Ficha para imprimir</Link>
            </div>
          </div>
        </div>

        <div>
          {isOwner ? (
            <>
              <div className="card">
                <h3>A quién se la compartiste</h3>
                {shares.length === 0 ? (
                  <p className="muted">Todavía no la compartiste con ninguna inmobiliaria.</p>
                ) : (
                  <table>
                    <thead>
                      <tr><th>Inmobiliaria</th><th>Estado</th><th>Publicación en su web</th><th>Fecha</th></tr>
                    </thead>
                    <tbody>
                      {shares.map(s => (
                        <tr key={s.id}>
                          <td>{byId[s.targetAgencyId]?.name || 'Inmobiliaria'}</td>
                          <td><StatusBadge status={s.status} /></td>
                          <td><WebPublishCell property={property} share={s} onUpdate={load} /></td>
                          <td className="muted">{formatDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card">
                <h3>Compartir con socios</h3>
                {availablePartners.length === 0 ? (
                  <p className="muted">
                    {(partnerAgencies?.list || []).length === 0
                      ? <>Todavía no tenés inmobiliarias socias. <Link to="/socios">Sumá socios primero →</Link></>
                      : 'Ya la compartiste con todos tus socios actuales.'}
                  </p>
                ) : (
                  <form onSubmit={handleCompartir}>
                    <fieldset>
                      <legend>Elegí con quién compartir</legend>
                      {availablePartners.map(a => (
                        <div key={a.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            id={`share-${a.id}`}
                            checked={selectedPartners.includes(a.id)}
                            onChange={() => togglePartner(a.id)}
                          />
                          <label htmlFor={`share-${a.id}`} style={{ margin: 0, fontWeight: 'normal' }}>{a.name}</label>
                        </div>
                      ))}
                    </fieldset>
                    <div className="checkbox-row">
                      <input
                        type="checkbox"
                        id="allowWebPublish"
                        checked={allowWebPublish}
                        onChange={e => setAllowWebPublish(e.target.checked)}
                      />
                      <label htmlFor="allowWebPublish" style={{ margin: 0, fontWeight: 'normal' }}>
                        Autorizar también a publicarla en su propia web (además de manejarla puertas adentro)
                      </label>
                    </div>
                    <p className="small muted" style={{ margin: '6px 0 10px' }}>
                      Si no marcás esto, la inmobiliaria va a poder ver y trabajar la propiedad dentro del sistema, pero no va a aparecer en el feed ni en el widget de su web hasta que se lo autorices. Podés cambiarlo después desde esta misma pantalla, por cada inmobiliaria.
                    </p>
                    <button type="submit" className="btn btn-small" disabled={selectedPartners.length === 0}>Enviar invitación</button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <h3>Propiedad compartida</h3>
              <p className="muted">Esta propiedad pertenece a <strong>{owner.name}</strong> y fue compartida con vos. Se actualiza automáticamente si la inmobiliaria dueña cambia el precio o los datos.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
