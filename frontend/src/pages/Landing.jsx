import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-hero">
      <h1>🏠 Compartí propiedades entre inmobiliarias socias</h1>
      <p>Publicá una propiedad, elegí con qué inmobiliarias asociadas la querés compartir y, apenas la aceptan,
      aparece automáticamente en su cartera. Sin llamados, sin planillas, sin pedir "che, ¿tenés algo por la zona?".</p>
      <div className="btn-row" style={{ justifyContent: 'center' }}>
        <Link className="btn" to="/registro">Registrar mi inmobiliaria</Link>
        <Link className="btn btn-secondary" to="/login">Ya tengo cuenta</Link>
      </div>
    </div>
  );
}
