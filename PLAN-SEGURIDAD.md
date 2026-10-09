# Análisis de seguridad y plan de remediación — SpyderConnect

**Fecha:** 2026-10-09 · **Alcance:** `backend/src/*`, `backend/public/widget.js`, `frontend/src/*`, configuración de deploy, dependencias, historial git.
**Contexto:** se va a integrar una pasarela de pagos con Mercado Pago (incluida la administración de tarjetas). Eso convierte a la plataforma en objetivo de fraude y la mete en alcance de **PCI DSS**, así que el umbral de criticidad está calibrado para ese escenario.

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | Lo más grave |
|---|---|---|
| 🔴 Crítica | 4 | Hash de contraseñas expuesto en la API · Webhook de MP sin firma y repetible · Pago "simulado" activo en producción · Suscripción no se valida en el servidor |
| 🟠 Alta | 7 | Sin rate limiting · Sesiones eternas · Permisos por usuario solo en el frontend · API key de agencias filtrada públicamente · Cookie sin `Secure` · Sin headers de seguridad · DoS por memoria |
| 🟡 Media | 9 | Inyección HTML en emails · Abuso de Cloudinary · URLs de media arbitrarias · Mensajes de error con detalles internos · etc. |
| 🟢 Baja | 6 | Endurecimiento general |

**Veredicto:** hoy la plataforma **no está lista** para procesar pagos. Los hallazgos C1–C4 deben resolverse antes de activar Mercado Pago en producción; los Altos, antes de habilitar el guardado de tarjetas.

**Lo que está bien:** las consultas SQL usan parámetros (`?`) en todo `db-mysql.js` (no se encontró inyección SQL); las contraseñas se hashean con `scrypt` y salt; los tokens de reset/invitación/API key usan `crypto.randomBytes`; el reset expira en 1 h; la verificación de la API key es de tiempo constante; el widget usa `textContent` (no hay XSS) y dentro del Shadow DOM; `.env` nunca se commiteó; el `npm audit` del backend está limpio.

---

## 2. Hallazgos críticos 🔴

### C1 — El hash y el salt de la contraseña se devuelven en las respuestas de la API
- **Dónde:** `toUser()` en [db-mysql.js:41](backend/src/db-mysql.js:41) incluye `passwordHash` y `passwordSalt`. Ese objeto se serializa tal cual en:
  - `POST /api/login`, `GET /api/session`, `POST /api/registro`, `POST /api/unirse/:token` ([api.js:133](backend/src/api.js:133), [api.js:147](backend/src/api.js:147), [api.js:186](backend/src/api.js:186), [api.js:1201](backend/src/api.js:1201))
  - `GET /api/equipo` → **los hashes de todos los usuarios de la agencia** ([api.js:937](backend/src/api.js:937))
  - `GET /api/admin/inmobiliarias/:id` y `GET /api/admin/soporte` → hashes de usuarios de cualquier agencia.
- **Ataque:** cualquier admin de agencia (o un XSS, una extensión maliciosa, un log de proxy, la caché del navegador) obtiene hash+salt y los crackea offline. Con mínimo de 6 caracteres (y **sin mínimo en `/api/registro`**), las contraseñas débiles caen en minutos con GPU.
- **Impacto:** toma de cuentas, incluido el admin de plataforma. Con pagos: acceso a la gestión de tarjetas y suscripciones de otros. También se expone el `documento` (DNI), que es dato personal (Ley 25.326).
- **Arreglo:** crear `toPublicUser()` (sin `passwordHash`, `passwordSalt` y, salvo que haga falta, `documento`) y usarlo en **todas** las respuestas. Mantener `toUser()` solo para uso interno de `login`. Forzar el reseteo de contraseñas de los usuarios existentes como medida preventiva.

### C2 — Webhook de Mercado Pago sin verificación de firma, sin idempotencia y sin validar el monto
- **Dónde:** [server.js:62-82](backend/src/server.js:62) + `applySuccessfulPayment` en [db-mysql.js:1402](backend/src/db-mysql.js:1402).
- **Problemas:**
  1. **Replay:** no se controla si `mp_payment_id` ya se procesó. Cada POST con el mismo ID de pago aprobado **suma 30 días más**. El endpoint es público y el `payment_id` le llega al usuario en la URL de retorno. Un solo pago real se convierte en una suscripción infinita.
  2. **Sin firma:** no se valida el header `x-signature` (HMAC-SHA256 con la clave secreta del webhook). Hoy la consulta a `getPayment()` mitiga la falsificación, pero no el replay ni el spam.
  3. **No se verifica el monto ni la moneda** contra el plan: un pago de $1 con `external_reference` = id de agencia la activa.
  4. **Siempre devuelve 200**, incluso si falla la base de datos → MP no reintenta y el pago real se pierde.
  5. No se procesan `refunded` / `charged_back` / `cancelled` → después de un contracargo el usuario sigue activo.
  6. Para Preapproval (suscripciones) los tópicos reales son `subscription_preapproval` y `subscription_authorized_payment`; el handler solo mira `payment` (es una falla funcional y también una inconsistencia de estado).
  7. Body sin límite de tamaño.
- **Impacto:** fraude directo sobre los ingresos, estado de facturación inconsistente, contracargos no reflejados.
- **Arreglo:**
  - `ALTER TABLE pagos ADD UNIQUE KEY uq_mp_payment (mp_payment_id)` + insertar el pago **antes** de extender el período, dentro de una transacción; si choca con la clave única → ya procesado, se responde 200 y no se hace nada.
  - Validar `x-signature` (`ts` + `v1`) con `MP_WEBHOOK_SECRET`, comparación con `timingSafeEqual`, rechazar si `ts` tiene más de 5 min.
  - Verificar `payment.transaction_amount >= plan.priceARS`, `currency_id === 'ARS'`, `status === 'approved'` y que `external_reference` corresponda a una agencia cuyo `mp_preapproval_id` coincida con `payment.metadata`/preapproval.
  - Devolver 500 ante errores internos para que MP reintente; 200 solo cuando se procesó o ya estaba procesado.
  - Manejar reembolsos y contracargos (pasar a `vencida`/`suspendida`).
  - Limitar el body (p. ej. 64 KB).

### C3 — Pago "simulado" que se activa solo si falta `MP_ACCESS_TOKEN`
- **Dónde:** [api.js:1046](backend/src/api.js:1046). Si `mercadopago.isConfigured()` es falso, `POST /api/suscripcion/pagar` registra un pago aprobado sin cobrar nada.
- **Estado actual:** según las variables documentadas para Hostinger, `MP_ACCESS_TOKEN` **no está configurado en producción** → hoy cualquier admin de agencia se autoactiva gratis, tantas veces como quiera.
- **Impacto:** pérdida de ingresos; además, un error de configuración en un deploy futuro (variable borrada o mal escrita) abre el sistema sin que nadie se dé cuenta (*fail-open*).
- **Arreglo:** el modo simulado solo puede existir con `NODE_ENV !== 'production'` **y** con un flag explícito (`PAYMENTS_SIMULATED=true`). En producción, si MP no está configurado → error 503 y log de alerta. Al arrancar el server en producción, abortar si faltan `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`.

### C4 — El estado de la suscripción no se aplica en el servidor
- **Dónde:** `effectiveSubscriptionStatus` solo se usa para *mostrar* el estado ([api.js:877](backend/src/api.js:877), [api.js:1022](backend/src/api.js:1022)). Ningún endpoint bloquea a una agencia `vencida`/`cancelada`.
- **Impacto:** el cobro no sirve para nada: una agencia vencida sigue usando todo llamando a la API directamente (el bloqueo del frontend, si existe, se saltea con curl).
- **Arreglo:** middleware `requireActiveSubscription(session)` aplicado a las rutas de negocio (propiedades, compartir, alertas, socios, mi-web, feed público). Dejar libres `session`, `logout`, `suscripcion*`, `soporte`, `mi-cuenta`. El feed `/api/v1/feed` y el widget también deberían cortar.

---

## 3. Hallazgos altos 🟠

### A1 — Sin rate limiting ni protección contra fuerza bruta
- **Dónde:** `/api/login`, `/api/registro`, `/api/forgot-password`, `/api/reset-password`, `/api/unirse/:token`, webhook.
- **Ataque:** credential stuffing / fuerza bruta de contraseñas; spam de emails de reset (daña la reputación del dominio SMTP); registro masivo de cuentas para abusar de Cloudinary.
- **Arreglo:** limitador en memoria (o en MySQL si hay varias instancias) por IP **y** por email: p. ej. 5 intentos de login cada 15 min, bloqueo progresivo; 3 resets/hora por email. Usar `X-Forwarded-For` solo si se confía en el proxy de Hostinger. Considerar un CAPTCHA (Turnstile/hCaptcha) en registro y en forgot-password.

### A2 — Las sesiones nunca expiran del lado del servidor ni se revocan
- **Dónde:** `createSession`/`getSession` en [db-mysql.js:466](backend/src/db-mysql.js:466). La cookie dura 7 días, pero la fila en `sesiones` es eterna: un token robado sirve para siempre. Cambiar o resetear la contraseña **no** cierra las otras sesiones. Borrar un usuario tampoco borra sus sesiones (aunque `getUser` devuelva null).
- **Arreglo:** columna `expires_at` y control en `getSession`; expiración por inactividad (p. ej. 12 h para el panel de pagos); `DELETE FROM sesiones WHERE user_id=?` en el reset/cambio de contraseña y al borrar el usuario; rotar el token en el login; job de limpieza. Para acciones de pago/tarjetas → **reautenticación** (pedir la contraseña de nuevo).

### A3 — Los permisos por usuario (`menuPermisos`) solo se aplican en el frontend
- **Dónde:** el backend nunca lee `menuPermisos`. Solo valida `role === 'admin'` en equipo y suscripción. Ejemplos: cualquier agente puede `POST /api/mi-web/regenerar-clave` (rompe el widget de la agencia), `POST /api/mi-cuenta/logo/quitar`, `PUT /api/mi-cuenta`, `/api/propiedades/:id/media-url` (sobre propiedades de **otro** usuario de la misma agencia, ver [api.js:399](backend/src/api.js:399)).
- **Impacto:** escalada horizontal y vertical dentro de la agencia. Con pagos: un agente podría ver o gestionar medios de pago si no se protege bien.
- **Arreglo:** helper `requirePermission(session, 'seccion.accion')` en el backend con la misma matriz que usa el frontend. Todo lo de pagos y tarjetas: **solo `role === 'admin'`** + reautenticación.

### A4 — La API key de las agencias se filtra a terceros y de forma pública
- **Dónde:** `toAgency()` incluye `apiKey` y `email`/`phone`. Se devuelve en:
  - `GET /api/public/propiedades/:id` (**sin autenticación**) → `owner` y `viaAgency` ([api.js:1173](backend/src/api.js:1173)).
  - `GET /api/socios?q=` → **todas** las agencias de la plataforma, con su API key ([api.js:508](backend/src/api.js:508)).
  - `/api/invitaciones`, `/api/compartidas`, `/api/matcheadas`, el feed, etc.
- **Impacto:** cualquiera lee el feed de cualquier agencia (incluidas las propiedades compartidas por sus socios) y enumera emails/teléfonos de todas las inmobiliarias. Si en el futuro la API key habilita algo más (p. ej. leads o pagos), el impacto escala.
- **Arreglo:** `toPublicAgency()` (id, nombre, ciudad, logo, color) para todo lo que vea un tercero; `apiKey` solo en `/api/mi-web` y solo para el admin.

### A5 — Cookie de sesión sin `Secure`, CORS y CSRF frágiles
- **Dónde:** [auth.js:44](backend/src/auth.js:44): `HttpOnly; SameSite=Lax` sin `Secure`. `parseJson` acepta cualquier `Content-Type` (incluido `text/plain`, que no dispara preflight).
- **Ataque:** cookie enviada por HTTP si hay un downgrade; `SameSite=Lax` protege contra CSRF cross-site, pero no cross-subdomain (si algún día se sirve contenido de usuarios en un subdominio).
- **Arreglo:** `Secure` en producción, considerar `SameSite=Strict` y el prefijo `__Host-`. Exigir `Content-Type: application/json` en endpoints JSON y validar el header `Origin` en todo POST/PUT/DELETE. Token anti-CSRF (double-submit) en endpoints de pago.

### A6 — No hay headers de seguridad
- **Dónde:** [server.js](backend/src/server.js) no envía `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.
- **Impacto:** clickjacking sobre el panel (p. ej. engañar a alguien para que haga clic en "pagar" o "eliminar tarjeta"), MIME sniffing, sin defensa en profundidad frente a XSS. **PCI DSS 4.0 (req. 6.4.3 y 11.6.1)** exige controlar los scripts de las páginas de pago.
- **Arreglo:** CSP estricta. Para MP Bricks: `script-src 'self' https://sdk.mercadopago.com https://http2.mlstatic.com; frame-src https://*.mercadopago.com https://*.mercadolibre.com; connect-src 'self' https://api.mercadopago.com https://api.mercadolibre.com ...` (validar contra la doc vigente de MP). HSTS con `max-age=31536000; includeSubDomains`. `X-Frame-Options: DENY` (salvo `widget.js`).

### A7 — DoS por memoria en la subida de archivos
- **Dónde:** `parsePropertyRequest` bufferea hasta **80 MB** en RAM por request ([api.js:64](backend/src/api.js:64)); `rawBody` corta con `req.destroy()` pero la promesa nunca se resuelve (request colgado); `serveStatic` usa `readFileSync` sobre archivos de cualquier tamaño.
- **Impacto:** con pocas requests concurrentes autenticadas (el registro es libre y gratis) se tira el proceso Node de Hostinger → caída total, incluidos los webhooks de pago (que se pierden por C2.4).
- **Arreglo:** bajar el límite a lo razonable (fotos ≤ 10 MB), parsear multipart en streaming (o subir directo a Cloudinary con firma restringida), rechazar `rawBody` con `reject()`, servir estáticos con `createReadStream`, límite global de conexiones/timeouts (`server.requestTimeout`, `headersTimeout`).

---

## 4. Hallazgos medios 🟡

| ID | Hallazgo | Dónde | Impacto | Arreglo |
|---|---|---|---|---|
| M1 | **Inyección HTML en emails**: nombre de agencia, título de propiedad/alerta y mensajes de soporte se interpolan sin escapar | [mail.js:68-120](backend/src/mail.js:68) | Phishing enviado **desde tu dominio** a otras inmobiliarias (p. ej. un link falso de "actualizá tu tarjeta"). Muy relevante cuando haya pagos. | Función `escapeHtml()` en toda interpolación; validar que `resetUrl` empiece con `APP_URL` |
| M2 | **Abuso de Cloudinary**: `/api/upload/video` (200 MB) y `/api/cloudinary/sign` no validan propiedad ni cuota; la firma no restringe tipo, tamaño ni carpeta | [api.js:350-392](backend/src/api.js:350) | Costos, hosting gratuito de contenido ilegal bajo tu cuenta | Cuota por agencia, `allowed_formats` y `max_file_size` en la firma, asociar a una propiedad propia, eliminar el endpoint legacy |
| M3 | **URLs de media arbitrarias**: `media-url` guarda cualquier `url`/`type`; solo valida la agencia, no el creador | [api.js:395](backend/src/api.js:395) | Tracking pixels/contenido externo en la ficha pública; `type` libre | Aceptar solo `https://res.cloudinary.com/<tu-cloud>/...` y `type ∈ {image, video}` |
| M4 | **Detalles internos en errores**: `Error al guardar la propiedad: ${e.message}` devuelve errores SQL | [api.js:276](backend/src/api.js:276) | Revela esquema/consultas | Mensaje genérico + id de correlación en el log |
| M5 | **Contraseñas débiles**: registro sin mínimo; reset/invitación con mínimo 6 | [api.js:155](backend/src/api.js:155), [api.js:212](backend/src/api.js:212) | Facilita C1/A1 | Mínimo 10 caracteres + chequeo contra listas de contraseñas filtradas; parámetros de scrypt explícitos (`N=2^17`) |
| M6 | **Sin verificación de email** al registrarse; enumeración de usuarios ("Ya existe un usuario con ese email") | [api.js:160](backend/src/api.js:160), [api.js:1193](backend/src/api.js:1193) | Cuentas con emails ajenos → el email del pagador en MP (`payerEmail = agency.email`) puede ser de un tercero | Verificación por email antes de activar; mensaje genérico |
| M7 | **Validación de entrada inexistente**: `role` en `updateUserRole` acepta cualquier string; porcentajes de compartir sin rango; `accountType` libre; campos de propiedad sin largo máximo | varios | Estados inválidos, roles inventados | Esquema de validación por endpoint (zod / validación manual) |
| M8 | **Confianza en `Host` / `X-Forwarded-Proto`**: `baseUrlFor()` arma URLs de feed/widget con el header `Host`; forgot-password cae a `Host` si falta `CORS_ORIGIN` | [api.js:52](backend/src/api.js:52), [api.js:201](backend/src/api.js:201) | Envenenamiento de links de reset (toma de cuenta) si la env var falta | `APP_URL` obligatoria y fija; nunca derivar de headers |
| M9 | **Logo SVG permitido** y tipo de archivo tomado del header `Content-Type` del cliente (no de los magic bytes) | [api.js:12](backend/src/api.js:12) | SVG con scripts (mitigado porque se sirve desde Cloudinary, otro origen) | Quitar `image/svg+xml`; validar los magic bytes |

---

## 5. Hallazgos bajos 🟢

- **B1** `serveStatic`: el chequeo `startsWith(PUBLIC_DIR)` debería usar `PUBLIC_DIR + path.sep` (hoy no es explotable, pero es frágil). `decodeURIComponent` malformado → 500.
- **B2** `node_modules` de `landing/` y `backend/` están versionados en git → superficie de supply-chain y repo pesado. Agregar `**/node_modules/` al `.gitignore` y quitarlos del índice.
- **B3** `npm audit` del frontend: 10 vulnerabilidades (6 altas, en tooling de build como `source-map-js`). Bajo impacto en runtime, pero conviene `npm audit fix`.
- **B4** Logs con `console.error(e)` pueden volcar respuestas de MP con datos del pagador → sanitizar.
- **B5** El webhook y el feed usan `Access-Control-Allow-Origin: *` (bien para el feed; el webhook no lo necesita).
- **B6** Archivos `*.log` sueltos en la raíz y `dist/` desactualizado — limpieza.

---

## 6. Arquitectura requerida para pagos y tarjetas con Mercado Pago

> **Regla de oro:** el número de tarjeta, el CVV y la fecha de vencimiento **nunca** deben pasar por tu servidor, tu base de datos, tus logs ni tu JS propio. Si lo hacen, quedás en el alcance completo de PCI DSS (SAQ D: auditoría, escaneos ASV, pentest anual).

### 6.1 Modelo recomendado (SAQ A / A-EP)
1. **Cobro y suscripción:** seguir con **Preapproval** (checkout hosteado por MP, redirección) → alcance mínimo (SAQ A).
2. **"Administrar tarjetas"** (guardar / ver / eliminar): usar **Checkout Bricks (Card Payment Brick)** o **Secure Fields**: los campos de la tarjeta son iframes de MP y el frontend solo recibe un `card_token` de un solo uso.
3. El backend usa ese token con la **API de Customers & Cards** de MP (`POST /v1/customers/{id}/cards`). En tu DB se guarda **solo**: `mp_customer_id`, `mp_card_id`, `last_four_digits`, `payment_method_id` (visa/master), `expiration_month/year`, `issuer`. Nada más.
4. Para mostrar las tarjetas: `GET /v1/customers/{id}/cards` o los datos enmascarados guardados.
5. Para cobrar con una tarjeta guardada: nuevo token con `card_id` + CVV en el Brick (MP lo exige) → nunca guardar el CVV.

### 6.2 Controles obligatorios del lado del servidor
| Control | Detalle |
|---|---|
| Credenciales | `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` solo en variables de entorno; credenciales de **test** separadas de las de producción; rotación si se filtraron; jamás en el bundle de Vite (solo la `PUBLIC_KEY` puede ir al frontend) |
| Idempotencia | Header `X-Idempotency-Key` (UUID por intento) en todo `POST` a MP; clave única en `pagos.mp_payment_id` |
| Montos | El monto **siempre** se calcula en el servidor desde `plan_suscripcion`; nunca se acepta del cliente |
| Webhooks | Firma `x-signature` + replay window + idempotencia + reconsultar a MP el estado (nunca confiar en el body) + 500 para que reintente + cola de reintentos propia |
| Reconciliación | Job diario que compara `pagos` y `suscripciones` contra `GET /preapproval/search` y `/v1/payments/search` |
| Autorización | Solo `role=admin` de **esa** agencia gestiona medios de pago; verificar que `mp_customer_id` pertenece a `session.agency.id` en cada operación (evitar IDOR del tipo `DELETE /api/tarjetas/:cardId` con un id ajeno) |
| Reautenticación | Pedir la contraseña (o un OTP por email) antes de agregar/eliminar una tarjeta o cambiar de plan |
| Auditoría | Tabla `audit_log` (quién, qué, cuándo, IP, user-agent) para toda acción de pago; inmutable; retención ≥ 1 año |
| Logs | Nunca loguear el body completo de MP ni tokens; enmascarar emails y documentos |
| Notificaciones | Email al admin de la agencia cada vez que se agrega o quita una tarjeta o hay un cobro (detecta usos indebidos) |
| Fraude | Rate limit específico en endpoints de pago (anti *card testing*), y enviar a MP `payer.identification`, `additional_info` y `device_id` para su motor antifraude |

### 6.3 Frontend de pagos
- CSP estricta (A6) y **SRI** donde aplique; inventario de scripts en la página de pago (PCI 6.4.3).
- Sin scripts de terceros (analytics, chat) en las rutas de pago.
- `Referrer-Policy: strict-origin-when-cross-origin` para que los parámetros de `back_url` no se filtren.
- La página de retorno (`/suscripcion?payment_id=...`) **no** debe activar nada: solo mostrar "procesando" y consultar el estado al backend.

---

## 7. Plan de trabajo por fases

### Fase 0 — Inmediato (antes de cualquier otra cosa, ~1 día) — ✅ código implementado 2026-10-09
> 0.1–0.4 implementados. 0.5 queda como script (`rotar-credenciales.mjs`) para correr en producción después del deploy.
> HSTS se envía sin `includeSubDomains` hasta confirmar que todos los subdominios tienen HTTPS.

| # | Tarea | Hallazgo | Esfuerzo |
|---|---|---|---|
| 0.1 | `toPublicUser()` y quitar hash/salt/documento de todas las respuestas | C1 | S |
| 0.2 | Deshabilitar el pago simulado en producción (fail-closed) | C3 | S |
| 0.3 | `toPublicAgency()`: quitar `apiKey`/email/teléfono de respuestas a terceros | A4 | S |
| 0.4 | Cookie `Secure` + headers básicos (HSTS, nosniff, frame-options) | A5, A6 | S |
| 0.5 | Regenerar las API keys de todas las agencias e invalidar todas las sesiones (supuesto: ya estuvieron expuestas) | C1, A4 | S |

### Fase 1 — Pre-requisitos para activar Mercado Pago (~1 semana) — ✅ código implementado 2026-10-09
> Módulos nuevos: `backend/src/payments.js` (webhook, conciliación, control de suscripción) y `backend/src/security.js` (rate limiting, IP del cliente, CSRF).
> Variables nuevas: `MP_WEBHOOK_SECRET` (obligatoria junto con `MP_ACCESS_TOKEN`), `ENFORCE_SUBSCRIPTION=true` (activar recién cuando MP esté operativo), `APP_URL` (opcional; si falta se usa `CORS_ORIGIN`).
> No incluido: los endpoints de match-requests no tienen un permiso equivalente en el frontend y quedaron sin restricción por acción. El límite de tiempo sobre `ts` de la firma no se aplica: los reintentos de MP podrían reutilizarlo, y los replays ya no tienen efecto gracias a la idempotencia.

| # | Tarea | Hallazgo | Esfuerzo |
|---|---|---|---|
| 1.1 | Rehacer el webhook: firma, idempotencia (UNIQUE), validación de monto, tópicos de preapproval, reembolsos/contracargos, 500 ante error | C2 | M |
| 1.2 | Middleware `requireActiveSubscription` en el backend | C4 | M |
| 1.3 | Rate limiting en auth, reset, registro, invitaciones y webhook | A1 | M |
| 1.4 | Sesiones con expiración, revocación al cambiar la contraseña y rotación | A2 | S |
| 1.5 | Permisos (`menuPermisos`) aplicados en el backend; pagos solo para admin | A3 | M |
| 1.6 | Escapar el HTML en todos los emails | M1 | S |
| 1.7 | `APP_URL` obligatoria; eliminar la dependencia del header `Host` | M8 | S |
| 1.8 | Validación de `Origin` + `Content-Type` en endpoints mutables | A5 | S |
| 1.9 | Job de reconciliación con MP | §6.2 | M |

### Fase 2 — Antes de habilitar la gestión de tarjetas (~1–2 semanas) — ✅ código implementado 2026-10-09
> **2.1 Tarjetas:** el alta sigue por el checkout de MP (redirección). "Cambiar tarjeta" usa el Card Payment Brick y `PUT /preapproval/{id}` con `card_token_id`. En la base solo quedan `card_brand` y `card_last_four`. Requiere `MP_PUBLIC_KEY`.
> **2.2 CSP:** en modo `Report-Only` con reportes en `/api/csp-report`. Pendiente antes de pasar a `CSP_ENFORCE=true`: el SDK de MP ejecuta un script inline propio (cookies/huella antifraude). Hay que decidir si se habilita con hash (cambia con cada versión del SDK) o con `'unsafe-inline'` solo en `script-src`, y revisar los reportes con la clave real en producción.
> **2.3 Reautenticación:** cambiar la tarjeta pide la contraseña, con un límite de 5 fallos cada 15 min y 5 cambios por día por agencia.
> **2.4 Auditoría:** tabla `audit_log` (solo INSERT) visible en "Mi suscripción". Avisos por email en pagos, reversos y cambios de tarjeta.
> **2.5 Email y contraseñas:** la verificación de email se exige solo para pagar y cambiar la tarjeta. Mínimo de 10 caracteres más una lista de contraseñas comunes, solo para contraseñas nuevas.
> **2.6 DoS:** máximo 3 subidas pesadas simultáneas (`MAX_CONCURRENT_UPLOADS`), estáticos en streaming, el body excedido ya no deja la request colgada, y timeouts de headers y requests.

| # | Tarea | Hallazgo | Esfuerzo |
|---|---|---|---|
| 2.1 | Integrar Card Payment Brick / Secure Fields + Customers & Cards API (solo tokens) | §6.1 | L |
| 2.2 | CSP estricta compatible con MP + inventario de scripts en la página de pago | A6 | M |
| 2.3 | Reautenticación para operaciones sobre tarjetas | A2, §6.2 | M |
| 2.4 | Tabla `audit_log` + notificaciones por email de los eventos de pago | §6.2 | M |
| 2.5 | Verificación de email en el registro; política de contraseñas | M5, M6 | M |
| 2.6 | Límites de upload en streaming; timeouts del server | A7 | M |

### Fase 3 — Endurecimiento continuo
| # | Tarea | Hallazgo | Esfuerzo |
|---|---|---|---|
| 3.1 | Validación de esquema en todos los endpoints | M7 | M |
| 3.2 | Restringir Cloudinary (cuotas, firma con restricciones, quitar el endpoint legacy) | M2, M3, M9 | M |
| 3.3 | Errores genéricos + logging estructurado sin PII | M4, B4 | S |
| 3.4 | Sacar `node_modules` de git, `npm audit fix`, Dependabot | B2, B3 | S |
| 3.5 | 2FA (TOTP) para admins de agencia y de plataforma | — | M |
| 3.6 | Pentest externo antes del lanzamiento comercial de pagos; completar el SAQ PCI correspondiente | — | — |

*Esfuerzo: S ≤ medio día · M = 1–3 días · L = más de 3 días.*

---

## 8. Checklist de verificación (para cada fix)
- [ ] `curl /api/session` con cookie válida → la respuesta **no** contiene `passwordHash`, `passwordSalt` ni `apiKey`.
- [ ] `curl /api/public/propiedades/<id>` sin cookie → sin `apiKey`/`email`/`phone` del owner.
- [ ] POST repetido al webhook con el mismo `payment_id` → el período se extiende **una sola vez**.
- [ ] Webhook sin `x-signature` o con firma inválida → 401.
- [ ] Pago con monto menor al plan → no activa.
- [ ] Agencia con `current_period_end` vencido → `POST /api/propiedades` devuelve 402/403.
- [ ] `NODE_ENV=production` sin `MP_ACCESS_TOKEN` → el server no arranca o `/pagar` devuelve 503.
- [ ] 6 logins fallidos seguidos → 429.
- [ ] Reset de contraseña → las otras sesiones quedan invalidadas.
- [ ] Un agente sin permiso → `POST /api/mi-web/regenerar-clave` devuelve 403.
- [ ] Headers presentes en `curl -I https://spyderconnect.com/`.
- [ ] Ningún log ni tabla contiene un PAN/CVV (búsqueda con regex `\b\d{13,19}\b`).
