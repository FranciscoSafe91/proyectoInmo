/*
 * Sistema Compartido de Propiedades — widget embebible.
 *
 * Se pega en cualquier página web así:
 *   <div id="propiedades-compartidas"></div>
 *   <script src=".../widget.js?agency=AGENCY_ID&key=API_KEY" async></script>
 *
 * No depende de ninguna librería externa. Dibuja el listado dentro de un
 * Shadow DOM para no chocar con los estilos del sitio donde se pega.
 */
(function () {
  var scriptEl =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var scriptUrl;
  try {
    scriptUrl = new URL(scriptEl.src, window.location.href);
  } catch (e) {
    return;
  }

  var agencyId = scriptUrl.searchParams.get('agency');
  var apiKey = scriptUrl.searchParams.get('key');
  var origin = scriptUrl.origin;
  var targetId = scriptEl.getAttribute('data-target') || 'propiedades-compartidas';

  function el(tag, props) {
    var e = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        e[k] = props[k];
      });
    }
    return e;
  }

  function formatMoney(amount, currency) {
    var n = Number(amount) || 0;
    var formatted = n.toLocaleString('es-AR');
    return (currency === 'USD' ? 'U$D ' : '$ ') + formatted;
  }

  function renderInto(root, data) {
    var brandColor = (data.inmobiliaria && data.inmobiliaria.colorMarca) || '#1f6f54';
    var logoUrl = data.inmobiliaria && data.inmobiliaria.logoUrl;

    var style = document.createElement('style');
    style.textContent = [
      '.pc-wrap { display:block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; box-sizing: border-box; }',
      '.pc-wrap *, .pc-wrap *::before, .pc-wrap *::after { box-sizing: border-box; }',
      '.pc-brand { display:flex; align-items:center; gap:8px; margin-bottom:12px; }',
      '.pc-brand img { width:28px; height:28px; object-fit:contain; border-radius:6px; }',
      '.pc-brand span { font-weight:700; font-size:0.95rem; color:' + brandColor + '; }',
      '.pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }',
      '.pc-card { border: 1px solid #e1e4e0; border-radius: 10px; padding: 14px; background: #fff; color: #22292b; text-decoration: none; display: block; }',
      '.pc-card:hover { border-color: ' + brandColor + '; }',
      '.pc-price { font-weight: 700; font-size: 1.05rem; color: ' + brandColor + '; margin: 0 0 4px; }',
      '.pc-title { font-weight: 600; font-size: 0.95rem; margin: 0 0 6px; }',
      '.pc-meta { font-size: 0.82rem; color: #667070; margin: 0 0 4px; }',
      '.pc-badge { display:inline-block; font-size: 0.68rem; font-weight:600; padding: 1px 8px; border-radius: 999px; background:#e8f5ef; color:#16513e; margin-top:6px; }',
      '.pc-empty { color: #667070; font-size: 0.9rem; padding: 20px 0; }',
      '.pc-footer { text-align: right; font-size: 0.7rem; color: #98a0a0; margin-top: 10px; }',
      '.pc-footer a { color: #98a0a0; }',
    ].join('\n');

    var wrap = el('div', { className: 'pc-wrap' });

    if (data.inmobiliaria && (logoUrl || data.inmobiliaria.nombre)) {
      var brandRow = el('div', { className: 'pc-brand' });
      if (logoUrl) brandRow.appendChild(el('img', { src: logoUrl, alt: data.inmobiliaria.nombre || '' }));
      brandRow.appendChild(el('span', { textContent: data.inmobiliaria.nombre || '' }));
      wrap.appendChild(brandRow);
    }

    if (!data.propiedades || data.propiedades.length === 0) {
      wrap.appendChild(el('div', { className: 'pc-empty', textContent: 'Todavía no hay propiedades publicadas.' }));
    } else {
      var grid = el('div', { className: 'pc-grid' });
      data.propiedades.forEach(function (p) {
        var card = el('a', { className: 'pc-card', href: p.urlPublica || '#', target: '_blank', rel: 'noopener' });
        card.appendChild(el('div', { className: 'pc-price', textContent: formatMoney(p.precio, p.moneda) }));
        card.appendChild(el('div', { className: 'pc-title', textContent: p.titulo || '' }));
        card.appendChild(
          el('div', {
            className: 'pc-meta',
            textContent: [p.tipo, p.operacion, p.ciudad].filter(Boolean).join(' · '),
          })
        );
        if (p.origen === 'compartida') {
          card.appendChild(
            el('span', { className: 'pc-badge', textContent: 'Red de socios · ' + (p.inmobiliariaOrigen || '') })
          );
        }
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }

    var footer = el('div', { className: 'pc-footer' });
    var link = el('a', { href: origin, target: '_blank', rel: 'noopener', textContent: 'Sistema Compartido de Propiedades' });
    footer.appendChild(document.createTextNode('Powered by '));
    footer.appendChild(link);
    wrap.appendChild(footer);

    root.innerHTML = '';
    root.appendChild(style);
    root.appendChild(wrap);
  }

  function renderMessage(root, message, isError) {
    var box = document.createElement('div');
    box.style.cssText =
      'font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; font-size: 0.85rem; padding: 8px 0; color: ' +
      (isError ? '#c0392b' : '#667070') +
      ';';
    box.textContent = message;
    root.innerHTML = '';
    root.appendChild(box);
  }

  function init() {
    var container = document.getElementById(targetId);
    if (!container) return; // el sitio no tiene el div destino todavía

    var root = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;
    renderMessage(root, 'Cargando propiedades...', false);

    if (!agencyId || !apiKey) {
      renderMessage(root, 'Sistema Compartido de Propiedades: falta configurar el código (agency/key).', true);
      return;
    }

    var feedUrl = origin + '/api/v1/feed/' + encodeURIComponent(agencyId) + '?key=' + encodeURIComponent(apiKey);
    fetch(feedUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        renderInto(root, data);
      })
      .catch(function () {
        renderMessage(root, 'No se pudieron cargar las propiedades en este momento.', true);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
