import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { TYPE_LABELS } from '../utils.js';

export default function PropertyForm() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = Boolean(id) && !location.pathname.endsWith('/nueva');

  const [property, setProperty] = useState({
    title: '', description: '', operation: 'venta', type: 'casa',
    price: '', currency: 'USD', address: '', city: '', province: '',
    bedrooms: '', bathrooms: '', areaM2: '', status: 'publicada',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      api.get(`/propiedades/${id}`).then(data => {
        const p = data.property;
        setProperty({
          title: p.title || '',
          description: p.description || '',
          operation: p.operation || 'venta',
          type: p.type || 'casa',
          price: p.price ?? '',
          currency: p.currency || 'USD',
          address: p.address || '',
          city: p.city || '',
          province: p.province || '',
          bedrooms: p.bedrooms ?? '',
          bathrooms: p.bathrooms ?? '',
          areaM2: p.areaM2 ?? '',
          status: p.status || 'publicada',
        });
      }).catch(e => setError(e.message));
    }
  }, [id, isEdit]);

  function handleChange(e) {
    setProperty(v => ({ ...v, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (isEdit) {
        await api.put(`/propiedades/${id}`, property);
        navigate(`/propiedades/${id}`);
      } else {
        const data = await api.post('/propiedades', property);
        navigate(`/propiedades/${data.property.id}`);
      }
    } catch (err) {
      setError(err.data?.error || 'Error al guardar.');
    }
  }

  return (
    <>
      <h1>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</h1>
      {error && <div className="banner banner-error">{error}</div>}
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="title">Título</label>
          <input type="text" id="title" name="title" required value={property.title} onChange={handleChange} placeholder="Ej: Casa 3 ambientes con jardín" />

          <label htmlFor="description">Descripción</label>
          <textarea id="description" name="description" value={property.description} onChange={handleChange} placeholder="Detalles, comodidades, estado..." />

          <div className="grid grid-2">
            <div>
              <label htmlFor="operation">Operación</label>
              <select id="operation" name="operation" value={property.operation} onChange={handleChange}>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
            </div>
            <div>
              <label htmlFor="type">Tipo de propiedad</label>
              <select id="type" name="type" value={property.type} onChange={handleChange}>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-2">
            <div>
              <label htmlFor="price">Precio</label>
              <input type="number" id="price" name="price" min="0" step="1" value={property.price} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="currency">Moneda</label>
              <select id="currency" name="currency" value={property.currency} onChange={handleChange}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <label htmlFor="address">Dirección</label>
          <input type="text" id="address" name="address" value={property.address} onChange={handleChange} />

          <div className="grid grid-2">
            <div>
              <label htmlFor="city">Ciudad</label>
              <input type="text" id="city" name="city" value={property.city} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="province">Provincia</label>
              <input type="text" id="province" name="province" value={property.province} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-3">
            <div>
              <label htmlFor="bedrooms">Dormitorios</label>
              <input type="number" id="bedrooms" name="bedrooms" min="0" value={property.bedrooms} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="bathrooms">Baños</label>
              <input type="number" id="bathrooms" name="bathrooms" min="0" value={property.bathrooms} onChange={handleChange} />
            </div>
            <div>
              <label htmlFor="areaM2">Superficie (m²)</label>
              <input type="number" id="areaM2" name="areaM2" min="0" value={property.areaM2} onChange={handleChange} />
            </div>
          </div>

          <label htmlFor="status">Estado</label>
          <select id="status" name="status" value={property.status} onChange={handleChange}>
            <option value="publicada">Publicada</option>
            <option value="borrador">Borrador</option>
            <option value="pausada">Pausada</option>
          </select>

          <div className="btn-row">
            <button type="submit" className="btn">{isEdit ? 'Guardar cambios' : 'Publicar propiedad'}</button>
            <Link className="btn btn-secondary" to={isEdit ? `/propiedades/${id}` : '/propiedades'}>Cancelar</Link>
          </div>
        </form>
      </div>
    </>
  );
}
