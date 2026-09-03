import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function AdminPlan() {
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({ name: '', priceARS: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/plan').then(d => {
      setPlan(d.plan);
      setForm({ name: d.plan.name, priceARS: d.plan.priceARS });
    }).catch(e => setError(e.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/plan', { name: form.name, priceARS: Number(form.priceARS) });
      navigate('/admin');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <><p><Link to="/admin">← Volver al panel</Link></p><div className="banner banner-error">{error}</div></>;
  if (!plan) return <p className="muted">Cargando...</p>;

  return (
    <>
      <p><Link to="/admin">← Volver al panel</Link></p>
      <h1>Editar plan</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Nombre del plan</label>
          <input type="text" id="name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <label htmlFor="priceARS">Precio mensual (ARS)</label>
          <input type="number" id="priceARS" min="0" required value={form.priceARS} onChange={e => setForm(f => ({ ...f, priceARS: e.target.value }))} />
          <div className="btn-row">
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
        <p className="small muted" style={{ marginTop: 10 }}>Este cambio no afecta pagos ya hechos, solo los próximos.</p>
      </div>
    </>
  );
}
