import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, typeLabel, operationLabel } from '../utils.js';

export default function SharedProperties() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/compartidas').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { items } = data;

  return (
    <>
      <h1>Compartidas conmigo</h1>
      <p className="subtitle">Propiedades de inmobiliarias socias que aceptaste sumar a tu cartera. Se actualizan automáticamente.</p>
      <div className="card">
        {items.length === 0 ? (
          <div className="empty-state">
            Todavía no tenés propiedades compartidas. Cuando una inmobiliaria socia te comparta una y la aceptes en{' '}
            <Link to="/invitaciones">Invitaciones</Link>, va a aparecer acá.
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Propiedad</th>
                    <th>Tipo</th>
                    <th>Precio</th>
                    <th>Inmobiliaria dueña</th>
                    <th>Publicación</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ property, ownerAgency, webPublishAuthorized }) => (
                    <tr key={property.id}>
                      <td>
                        <Link to={`/propiedades/${property.id}`}>{property.title}</Link><br />
                        <span className="muted">{property.city}{property.city ? ', ' : ''}{property.province}</span>
                      </td>
                      <td>{typeLabel(property.type)} · {operationLabel(property.operation)}</td>
                      <td>{money(property.price, property.currency)}</td>
                      <td>{ownerAgency.name}</td>
                      <td>
                        {webPublishAuthorized
                          ? <span className="badge badge-aceptada">Autorizada para tu web</span>
                          : <span className="badge badge-borrador">Solo uso interno</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>
              "Autorizada para tu web" quiere decir que la inmobiliaria dueña te dio permiso para que también aparezca en tu propia web (feed/widget), además de que la manejes acá adentro. Si dice "Solo uso interno", podés trabajarla dentro del sistema, pero no va a salir en tu web hasta que te autoricen.
            </p>
          </>
        )}
      </div>
    </>
  );
}
