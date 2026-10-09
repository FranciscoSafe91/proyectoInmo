const BASE = '/api';
const DEMO_EMAIL = 'demo@spiderconnect.local';
const DEMO_PASSWORD = 'Demo1234';
const DEMO_SESSION_KEY = 'spiderconnect.demo.session';

const demoAgency = {
  id: 'demo-agency',
  name: 'SpiderConnect Demo',
  slug: 'spiderconnect-demo',
  email: DEMO_EMAIL,
  phone: '+54 11 5555-0101',
  city: 'Buenos Aires',
  accountType: 'inmobiliaria',
  logoPath: '',
  brandColor: '#1f6f54',
  apiKey: 'demo-api-key',
  createdAt: new Date().toISOString(),
};

const demoUser = {
  id: 'demo-user',
  agencyId: demoAgency.id,
  name: 'Usuario Demo',
  nombre: 'Usuario',
  apellido: 'Demo',
  email: DEMO_EMAIL,
  username: 'demo',
  role: 'admin',
  isPlatformAdmin: false,
  menuPermisos: null,
  createdAt: new Date().toISOString(),
};

const demoProperty = {
  id: 'demo-property-1',
  agencyId: demoAgency.id,
  createdByUserId: demoUser.id,
  title: 'Departamento demo en Palermo',
  description: 'Unidad luminosa para probar el flujo de propiedades, fichas y compartidos.',
  operation: 'venta',
  type: 'departamento',
  price: 185000,
  currency: 'USD',
  address: 'Av. Santa Fe 3200',
  city: 'CABA',
  province: 'Buenos Aires',
  bedrooms: 3,
  bathrooms: 2,
  areaM2: 82,
  status: 'publicada',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const demoMedia = {
  id: 'demo-media-1',
  propertyId: demoProperty.id,
  type: 'image',
  url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  filename: 'demo-property.jpg',
  sortOrder: 0,
  createdAt: new Date().toISOString(),
};

function isDevFallbackEnabled() {
  return Boolean(import.meta.env.DEV && window.localStorage);
}

function apiError(message, status = 400) {
  return Object.assign(new Error(message), { status, data: { error: message } });
}

function getStoredSession() {
  if (!isDevFallbackEnabled()) return null;
  return localStorage.getItem(DEMO_SESSION_KEY) === '1'
    ? { user: demoUser, agency: demoAgency }
    : null;
}

function storeSession(active) {
  if (!isDevFallbackEnabled()) return;
  if (active) localStorage.setItem(DEMO_SESSION_KEY, '1');
  else localStorage.removeItem(DEMO_SESSION_KEY);
}

function normalizePath(path) {
  return path.split('?')[0];
}

async function mockReq(method, path, body) {
  if (!isDevFallbackEnabled()) throw apiError('Backend no disponible', 503);

  const cleanPath = normalizePath(path);
  const session = getStoredSession();

  if (method === 'POST' && cleanPath === '/login') {
    if (body?.email === DEMO_EMAIL && body?.password === DEMO_PASSWORD) {
      storeSession(true);
      return { user: demoUser, agency: demoAgency };
    }
    throw apiError('Email o contrasena incorrectos.', 401);
  }

  if (method === 'POST' && cleanPath === '/registro') {
    storeSession(true);
    return { user: { ...demoUser, email: body?.email || DEMO_EMAIL }, agency: demoAgency };
  }

  if (method === 'POST' && cleanPath === '/logout') {
    storeSession(false);
    return { ok: true };
  }

  if (cleanPath === '/session') {
    if (!session) throw apiError('No autenticado', 401);
    return session;
  }

  if (!session) throw apiError('No autenticado', 401);

  if (cleanPath === '/dashboard') {
    return {
      agency: demoAgency,
      stats: {
        myProperties: 1,
        sharedWithMe: 0,
        partners: 0,
        pendingShares: 0,
        pendingPartnerships: 0,
        alertMatches: 0,
        myAlertMatchCount: 0,
      },
    };
  }

  if (cleanPath === '/propiedades') {
    return {
      properties: [demoProperty],
      sharesByProperty: { [demoProperty.id]: [] },
      coverMediaByProperty: { [demoProperty.id]: demoMedia },
    };
  }

  if (cleanPath === `/propiedades/${demoProperty.id}`) {
    return {
      property: demoProperty,
      media: [demoMedia],
      owner: demoAgency,
      shares: [],
      partnerAgencies: { list: [], byId: {} },
      isOwner: true,
    };
  }

  if (cleanPath === '/alertas') return { alerts: [], matches: [], hasPartners: false };
  if (cleanPath === '/compartidas') return { items: [] };
  if (cleanPath === '/invitaciones') return { pendingShares: [], pendingPartnerships: [] };
  if (cleanPath === '/socios') {
    return {
      results: [
        { id: 'demo-partner-1', name: 'Norte Propiedades', city: 'Belgrano', accountType: 'inmobiliaria' },
        { id: 'demo-partner-2', name: 'Raiz Urbana', city: 'San Isidro', accountType: 'inmobiliaria' },
      ],
      partnerIds: [],
      sentPendingIds: [],
      receivedPendingIds: [],
      currentPartners: [],
    };
  }

  if (cleanPath === '/configuracion') {
    return {
      agency: demoAgency,
      subscriptionStatus: 'trial',
      teamSize: 1,
      isPlatformAdmin: false,
      isAccountAdmin: true,
    };
  }

  if (cleanPath === '/mi-cuenta') return { agency: demoAgency };
  if (cleanPath === '/equipo') {
    return {
      users: [demoUser],
      pendingInvitations: [],
      currentUser: demoUser,
      baseUrl: window.location.origin,
    };
  }

  if (cleanPath === '/suscripcion') {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    return {
      plan: { name: 'Plan Mensual', priceARS: 15000 },
      subscription: { id: 'demo-subscription', agencyId: demoAgency.id, status: 'trial', trialEndsAt },
      status: 'trial',
      payments: [],
      mpConfigured: false,
      paymentsSimulated: true,
    };
  }

  if (cleanPath === '/mi-web') {
    const feedUrl = `${window.location.origin}/api/v1/feed/${demoAgency.id}?key=${demoAgency.apiKey}`;
    const widgetSrc = `${window.location.origin}/widget.js?agency=${demoAgency.id}&key=${demoAgency.apiKey}`;
    return {
      agency: demoAgency,
      feedUrl,
      widgetSrc,
      embedCode: `<div id="propiedades-compartidas"></div>\n<script src="${widgetSrc}" async></script>`,
    };
  }

  if (cleanPath === '/soporte') return { tickets: [], contactEmail: 'soporte@spiderconnect.local' };
  if (cleanPath === '/match-requests') return { requests: [] };
  if (cleanPath === '/matcheadas') return { alerts: [] };
  if (method !== 'GET') return { ok: true };

  throw apiError('Endpoint demo no implementado.', 404);
}

async function req(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }

  try {
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      // Suscripción vencida: el backend corta el acceso y se lleva al usuario a pagar.
      if (res.status === 402 && !window.location.pathname.startsWith('/suscripcion')) {
        window.location.assign('/suscripcion');
      }
      throw Object.assign(new Error(err.error || 'Error'), { status: res.status, data: err });
    }
    return res.json();
  } catch (err) {
    if (!import.meta.env.DEV) throw err;
    return mockReq(method, path, body);
  }
}

export const api = {
  get: (path) => req('GET', path),
  post: (path, body) => req('POST', path, body),
  put: (path, body) => req('PUT', path, body),
  delete: (path) => req('DELETE', path),
  postForm: (path, formData) => req('POST', path, formData),
};
