export const TYPE_LABELS = {
  casa: 'Casa',
  departamento: 'Departamento',
  ph: 'PH',
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

// Debe coincidir con PASSWORD_MIN_LENGTH en backend/src/security.js.
export const PASSWORD_MIN_LENGTH = 10;

export const ESTADO_LABELS = { excelente: 'Excelente', muy_bueno: 'Muy bueno', bueno: 'Bueno', regular: 'Regular', a_refaccionar: 'A refaccionar' };
export const AGUA_CALIENTE_LABELS = { gas_individual: 'Gas individual', gas_central: 'Gas central', electrico: 'Eléctrico', solar: 'Solar', termotanque: 'Termotanque' };
export const CALEFACCION_LABELS = { gas_natural: 'Gas natural', electrica: 'Eléctrica', losa_radiante: 'Losa radiante', radiadores: 'Radiadores', aire_acondicionado: 'Aire acondicionado', sin_calefaccion: 'Sin calefacción' };
export const LUMINOSIDAD_LABELS = { muy_luminoso: 'Muy luminoso', luminoso: 'Luminoso', normal: 'Normal', poco_luminoso: 'Poco luminoso' };
export const VIGILANCIA_LABELS = { sin_vigilancia: 'Sin vigilancia', guardia_24hs: 'Guardia 24hs', vigilancia_nocturna: 'Vigilancia nocturna', camaras: 'Cámaras de seguridad', portero_electrico: 'Portero eléctrico' };
export const PISO_LABELS = { porcelanato: 'Porcelanato', ceramica: 'Cerámica', madera: 'Madera', marmol: 'Mármol', granito: 'Granito', cemento: 'Cemento', alfombra: 'Alfombra', otro: 'Otro' };
export const TECHO_LABELS = { losa: 'Losa', tejas: 'Tejas', chapa: 'Chapa', membrana: 'Membrana', pizarra: 'Pizarra', otro: 'Otro' };
export const COSTA_LABELS = { sin_costa: 'Sin costa', laguna: 'Laguna', rio: 'Río', mar: 'Mar', lago: 'Lago' };
export const VISTA_LABELS = { sin_vista: 'Sin vista especial', al_rio: 'Al río', al_lago: 'Al lago', al_mar: 'Al mar', a_la_montana: 'A la montaña', al_parque: 'Al parque' };
export const ORIENTACION_LABELS = { norte: 'Norte', sur: 'Sur', este: 'Este', oeste: 'Oeste', noreste: 'Noreste', noroeste: 'Noroeste', sureste: 'Sureste', suroeste: 'Suroeste' };

const ACCOUNT_TYPE_LABELS = { inmobiliaria: 'Inmobiliaria', agente_independiente: 'Agente independiente' };
export function accountTypeLabel(type) { return ACCOUNT_TYPE_LABELS[type] || type; }
