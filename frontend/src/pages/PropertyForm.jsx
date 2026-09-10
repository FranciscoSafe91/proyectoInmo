import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Camera, Film, Home, ImagePlus, MapPin, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { TYPE_LABELS, money, operationLabel, typeLabel } from '../utils.js';

const EMPTY_PROPERTY = {
  title: '',
  description: '',
  operation: 'venta',
  type: 'casa',
  price: '',
  currency: 'USD',
  address: '',
  city: '',
  province: '',
  bedrooms: '',
  bathrooms: '',
  areaM2: '',
  status: 'publicada',
};

function buildPropertyFormData(property, mediaFiles) {
  const formData = new FormData();
  Object.entries(property).forEach(([key, value]) => {
    formData.append(key, value ?? '');
  });
  mediaFiles.forEach((file, index) => {
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
  const [existingMedia, setExistingMedia] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [activePreview, setActivePreview] = useState(0);
  const [error, setError] = useState('');

  const newMediaPreviews = useMemo(() => mediaFiles.map(file => ({
    id: `${file.name}-${file.lastModified}`,
    type: file.type.startsWith('video/') ? 'video' : 'image',
    url: URL.createObjectURL(file),
    filename: file.name,
  })), [mediaFiles]);

  const previewMedia = [...existingMedia, ...newMediaPreviews];
  const activeMedia = previewMedia[activePreview] || null;

  useEffect(() => {
    return () => {
      newMediaPreviews.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [newMediaPreviews]);

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
        address: p.address || '',
        city: p.city || '',
        province: p.province || '',
        bedrooms: p.bedrooms ?? '',
        bathrooms: p.bathrooms ?? '',
        areaM2: p.areaM2 ?? '',
        status: p.status || 'publicada',
      });
      setExistingMedia(data.media || []);
    }).catch(e => setError(e.message));
  }, [id, isEdit]);

  function handleChange(e) {
    setProperty(v => ({ ...v, [e.target.name]: e.target.value }));
  }

  function handleMediaChange(e) {
    const files = Array.from(e.target.files || []);
    setMediaFiles(files.slice(0, 8));
    setActivePreview(existingMedia.length ? 0 : 0);
  }

  function removeNewMedia(indexToRemove) {
    const next = mediaFiles.filter((_, index) => index !== indexToRemove);
    setMediaFiles(next);
    setActivePreview(0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const body = mediaFiles.length ? buildPropertyFormData(property, mediaFiles) : property;
      if (isEdit) {
        await api.put(`/propiedades/${id}`, body);
        navigate(`/propiedades/${id}`);
      } else {
        const data = await api.post('/propiedades', body);
        navigate(`/propiedades/${data.property.id}`);
      }
    } catch (err) {
      setError(err.data?.error || 'Error al guardar.');
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</h1>
          <p className="subtitle">Cargá los datos clave y sumá material visual para que el match sea más rápido.</p>
        </div>
        <Link className="btn btn-secondary" to={isEdit ? `/propiedades/${id}` : '/propiedades'}>Cancelar</Link>
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

            <label htmlFor="description">Descripción</label>
            <textarea id="description" name="description" value={property.description} onChange={handleChange} placeholder="Detalles, comodidades, estado general, luminosidad..." />

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
          </div>

          <div className="form-panel">
            <div className="form-section-title">
              <MapPin size={18} aria-hidden="true" />
              <h2>Ubicación y valores</h2>
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

          {previewMedia.length > 0 && (
            <div className="media-thumbs">
              {previewMedia.map((item, index) => (
                <button
                  key={item.id || item.url}
                  type="button"
                  className={index === activePreview ? 'active' : ''}
                  onClick={() => setActivePreview(index)}
                  aria-label={`Ver archivo ${index + 1}`}
                >
                  {item.type === 'video'
                    ? <Film size={16} aria-hidden="true" />
                    : <img src={item.url} alt="" />}
                </button>
              ))}
            </div>
          )}

          {mediaFiles.length > 0 && (
            <div className="selected-media-list">
              {mediaFiles.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}`}>
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeNewMedia(index)} aria-label={`Quitar ${file.name}`}>
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
            <button type="submit" className="btn">{isEdit ? 'Guardar cambios' : 'Publicar propiedad'}</button>
          </div>
        </aside>
      </form>
    </>
  );
}
