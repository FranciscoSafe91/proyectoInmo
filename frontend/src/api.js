const BASE = '/api';

async function req(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw Object.assign(new Error(err.error || 'Error'), { status: res.status, data: err });
  }
  return res.json();
}

export const api = {
  get: (path) => req('GET', path),
  post: (path, body) => req('POST', path, body),
  put: (path, body) => req('PUT', path, body),
  delete: (path) => req('DELETE', path),
  postForm: (path, formData) => req('POST', path, formData),
};
