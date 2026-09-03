import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

export default function MiWeb() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const widgetContainerRef = useRef(null);

  function load() {
    api.get('/mi-web').then(setData).catch(e => setError(e.message));
  }
  useEffect(load, []);

  useEffect(() => {
    if (!data) return;
    // Inject widget script
    const container = widgetContainerRef.current;
    if (!container) return;
    // Remove old scripts
    container.innerHTML = '<div id="propiedades-compartidas"></div>';
    const script = document.createElement('script');
    script.src = data.widgetSrc;
    script.async = true;
    container.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [data]);

  async function handleRegenerarClave() {
    if (!window.confirm('Esto invalida el código que ya pegaste en tu web. ¿Confirmás?')) return;
    await api.post('/mi-web/regenerar-clave');
    load();
  }

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <p className="muted">Cargando...</p>;

  const { agency, feedUrl, widgetSrc, embedCode } = data;

  return (
    <>
      <h1>Publicar en mi web</h1>
      <p className="subtitle">
        Esto es lo que necesitás para que tus propiedades aparezcan automáticamente en tu propia página web: las tuyas propias, más las que te compartieron, aceptaste,{' '}
        <strong>y además te autorizaron a publicar en tu web</strong> (no alcanza con haberla aceptado — esa autorización es un paso aparte que le corresponde dar a la inmobiliaria dueña, desde la ficha de cada propiedad).
      </p>

      <div className="card">
        <h3>Opción 1 — Pegar el código en mi web (sin programador)</h3>
        <p className="muted">Copiá este código y pegalo en tu página web, en el lugar donde querés que aparezca el listado (por ejemplo en una sección "Propiedades"). La mayoría de los editores de sitios (WordPress, Wix, etc.) tienen un bloque de tipo "HTML personalizado" para pegar este tipo de código.</p>
        <pre className="code-box">{embedCode}</pre>
        <p className="small muted">⚠️ No compartas este código públicamente en foros ni se lo pases a inmobiliarias que no sean de tu confianza: incluye tu clave de acceso.</p>
      </div>

      <div className="card">
        <h3>Vista previa en vivo</h3>
        <p className="muted">Así se ve el widget ahora mismo con tus datos reales:</p>
        <div ref={widgetContainerRef}></div>
      </div>

      <div className="card">
        <h3>Opción 2 — Feed de datos (para tu programador o plataforma inmobiliaria)</h3>
        <p className="muted">Si tenés un desarrollador o usás una plataforma que permite importar un feed de datos, esta es la dirección con tus propiedades en formato JSON:</p>
        <pre className="code-box">{feedUrl}</pre>
        <p className="small muted">Devuelve tus propiedades publicadas + las compartidas que te autorizaron a publicar, y se actualiza solo — no hace falta pedir un archivo nuevo cada vez.</p>
      </div>

      <div className="card">
        <h3>Clave de acceso</h3>
        <p className="muted">Esta clave es lo que protege tu feed y tu widget para que solo vos (o quien vos le pases el código) pueda usarlos. Si creés que alguien más la tiene, regenerala — el código y el link viejos van a dejar de funcionar y vas a tener que actualizar el widget en tu web con el nuevo.</p>
        <button className="btn btn-secondary btn-small" onClick={handleRegenerarClave}>Regenerar clave</button>
      </div>
    </>
  );
}
