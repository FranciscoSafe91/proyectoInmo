import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api.js';
import { formatDateTime } from '../utils.js';

const POLL_MS = 60 * 1000;

// Campanita de la barra del panel: muestra cuántas notificaciones sin leer hay.
export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  function load() {
    api.get('/notificaciones')
      .then(d => { setItems(d.notificaciones || []); setUnread(d.unread || 0); })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // Cierra el panel al hacer clic afuera
  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  // Al leer una notificación, desaparece del contador
  function markRead(n) {
    if (n.read) return;
    setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread(u => Math.max(0, u - 1));
    api.post(`/notificaciones/${n.id}/leer`).catch(load);
  }

  function markAll() {
    setItems(prev => prev.map(x => ({ ...x, read: true })));
    setUnread(0);
    api.post('/notificaciones/leer-todas').catch(load);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`}
        style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 44, height: 44, borderRadius: 999, cursor: 'pointer',
          background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.22)', color: '#fff',
        }}
      >
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, padding: '0 5px',
              borderRadius: 999, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 380, maxWidth: '90vw',
            maxHeight: 440, overflowY: 'auto', zIndex: 50, background: '#fff', color: '#1f2933',
            borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.25)', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid #e5e7eb' }}>
            <strong>Notificaciones</strong>
            {unread > 0 && (
              <button type="button" className="btn btn-small btn-secondary" onClick={markAll}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p style={{ margin: 0, padding: 14, color: '#6b7280' }}>No tenés notificaciones.</p>
          ) : items.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit',
                padding: '10px 14px', border: 'none', borderBottom: '1px solid #f1f5f9',
                background: n.read ? '#fff' : '#f0fdf4', fontWeight: n.read ? 400 : 600,
              }}
            >
              <div>{n.message}</div>
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginTop: 2 }}>{formatDateTime(n.createdAt)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
