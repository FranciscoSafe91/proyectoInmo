// router.js — mini router propio (sin Express) para mantener el prototipo
// sin dependencias externas.

function pathToRegex(path) {
  const paramNames = [];
  const pattern = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${pattern}$`), paramNames };
}

export class Router {
  constructor() {
    this.routes = []; // { method, regex, paramNames, handler }
  }

  add(method, path, handler) {
    const { regex, paramNames } = pathToRegex(path);
    this.routes.push({ method, regex, paramNames, handler });
  }

  get(path, handler) {
    this.add('GET', path, handler);
  }

  post(path, handler) {
    this.add('POST', path, handler);
  }

  put(path, handler) {
    this.add('PUT', path, handler);
  }

  delete(path, handler) {
    this.add('DELETE', path, handler);
  }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.regex.exec(pathname);
      if (!m) continue;
      const params = {};
      route.paramNames.forEach((name, idx) => {
        params[name] = decodeURIComponent(m[idx + 1]);
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}
