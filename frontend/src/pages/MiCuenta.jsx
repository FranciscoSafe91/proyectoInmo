import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const ACCOUNT_TYPE_LABELS = {
  inmobiliaria: 'Inmobiliaria',
  agente_independiente: 'Agente independiente',
};

export default function MiCuenta() {
  const [agency, setAgency] = useState(null);
  const [form, setForm] = useState({ phone: '', city: '', brandColor: '#1f6f54' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    api.get('/mi-cuenta').then(data => {
      setAgency(data.agency);
      setForm({
        phone: data.agency.phone || '',
        city: data.agency.city || '',
        brandColor: data.agency.brandColor || '#1f6f54',
      });
    }).catch(e => setError(e.message));
  }
  useEffect(load, []);

  function handleChange(e) {
    setForm(v => ({ ...v, [e.target.name]: e.target.value }));
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const data = await api.put('/mi-cuenta', form);
      setAgency(data.agency);
      setSuccess('Cambios guardados.');
    } catch (err) {
      setError(err.data?.error || 'Error al guardar.');
    }
  }

  async function handleLogoUpload(e) {
    e.preventDefault();
    const file = e.target.logo.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const data = await api.postForm('/mi-cuenta/logo', formData);
      setAgency(data.agency);
    } catch (err) {
      setError(err.data?.error || 'Error al subir el logo.');
    }
  }

  async function handleQuitarLogo() {
    try {
      const data = await api.post('/mi-cuenta/logo/quitar');
      setAgency(data.agency);
    } catch (err) {
      setError(err.data?.error || 'Error al quitar el logo.');
    }
  }

  if (!agency) return <p className="muted">Cargando...</p>;

  return (
    <>
      <h1>Mi cuenta</h1>
      <p className="subtitle">Estos datos son los que van a verse en tus fichas impresas y en la ficha pública de tus propiedades.</p>

      {error && <div className="banner banner-error">{error}</div>}
      {success && <div className="banner banner-success">{success}</div>}

      <div className="card">
        <h3>Marca</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fafafa' }}>
            {agency.logoPath
              ? <img src={agency.logoPath} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <span className="muted small">Sin logo</span>}
          </div>
          <form onSubmit={handleLogoUpload} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" required />
            <button type="submit" className="btn btn-small">Subir logo</button>
          </form>
          {agency.logoPath && (
            <button className="btn btn-secondary btn-small" onClick={handleQuitarLogo}>Quitar logo</button>
          )}
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Formatos aceptados: PNG, JPG, WEBP o SVG. Tamaño máximo 8 MB.</p>
      </div>

      <div className="card">
        <h3>Datos de contacto y color de marca</h3>
        <form onSubmit={handleSaveContact}>
          <label htmlFor="phone">Teléfono</label>
          <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} />

          <label htmlFor="city">Ciudad</label>
          <input type="text" id="city" name="city" value={form.city} onChange={handleChange} />

          <label htmlFor="brandColor">Color de marca</label>
          <input type="color" id="brandColor" name="brandColor" value={form.brandColor} onChange={handleChange} style={{ width: 80, padding: 4 }} />

          <div className="btn-row">
            <button type="submit" className="btn">Guardar cambios</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Tipo de cuenta</h3>
        <p><span className="badge badge-aceptada">{ACCOUNT_TYPE_LABELS[agency.accountType] || agency.accountType}</span></p>
        <p className="muted small">Definido al registrarte. Tanto una inmobiliaria como un agente independiente pueden formar sociedades entre sí sin restricciones.</p>
      </div>
    </>
  );
}
