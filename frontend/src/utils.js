export const TYPE_LABELS = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  local: 'Local comercial',
  oficina: 'Oficina',
  otro: 'Otro',
};
export const OPERATION_LABELS = { venta: 'Venta', alquiler: 'Alquiler' };
export function typeLabel(t) { return TYPE_LABELS[t] || t; }
export function operationLabel(o) { return OPERATION_LABELS[o] || o; }
export function money(amount, currency) {
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString('es-AR');
  return `${currency === 'USD' ? 'U$D' : '$'} ${formatted}`;
}
export function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-AR');
}
export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function formatARS(amount) {
  return '$ ' + Number(amount).toLocaleString('es-AR');
}

const ACCOUNT_TYPE_LABELS = { inmobiliaria: 'Inmobiliaria', agente_independiente: 'Agente independiente' };
export function accountTypeLabel(type) { return ACCOUNT_TYPE_LABELS[type] || type; }
