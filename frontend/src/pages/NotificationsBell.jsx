import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { api } from '../api.js';
import { formatDateTime } from '../utils.js';

const POLL_MS = 60 * 1000;

// Campanita de la barra del panel: muestra cuántas notificaciones sin leer hay.
export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

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

  // El panel se monta en <body> con posición fija: se cierra al hacer clic afuera,
  // al hacer scroll o al cambiar el tamaño de la ventana, así no queda desalineado.
  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(e) {
      const inButton = buttonRef.current && buttonRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      if (!inButton && !inPanel) setOpen(false);
    }
    // El scroll dentro del propio panel no lo cierra (si no, no se puede recorrer la lista)
    function onScroll(e) {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    function close() { setOpen(false); }
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      load();
    }
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

  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        position: 'fixed', top: pos.top, right: pos.right, width: 380, maxWidth: 'calc(100vw - 24px)',
        maxHeight: `calc(100vh - ${pos.top + 16}px)`, overflowY: 'auto', zIndex: 1000,
        background: '#fff', color: '#1f2933', borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,.25)', textAlign: 'left',
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
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
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
      {panel && createPortal(panel, document.body)}
    </div>
  );
}
