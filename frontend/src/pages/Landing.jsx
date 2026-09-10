import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BedDouble, Building2, Check, Handshake,
  Mail, MapPin, Menu, Percent, Phone, Ruler, Search,
  ShieldCheck, SlidersHorizontal, UserRound, X,
} from 'lucide-react';
import '../landing.css';

const properties = [
  {
    title: 'Duplex Cerviño',
    location: 'Palermo Chico · Compartida por Grupo Raíz',
    price: 'USD 192k', type: 'Venta', rooms: '3 amb.', area: '82 m²', commission: '2.5%',
    alt: 'Living moderno de una propiedad publicada en SpyderConnect',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Loft Thames',
    location: 'Palermo Soho · Compartida por Nova Propiedades',
    price: 'USD 168k', type: 'Apto crédito', rooms: '2 amb.', area: '74 m²', commission: '2.0%',
    alt: 'Casa luminosa usada como vista previa de una propiedad compartida',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  },
];

const valueItems = [
  { title: 'Compartí inmuebles disponibles', text: 'Cargá propiedades con datos clave, tipo de operación y porcentaje ofrecido para colaborar.', icon: Building2 },
  { title: 'Buscá por necesidad real', text: 'Filtrá por zona, precio, ambientes, superficie y estado para encontrar el inmueble exacto.', icon: Search },
  { title: 'Activá acuerdos entre agentes', text: 'Conectá con otra inmobiliaria, presentá tu cliente y dejá claras las condiciones desde el inicio.', icon: Handshake },
];

const steps = [
  { title: 'Publicá o buscá', text: 'La inmobiliaria publica sus propiedades o carga una búsqueda concreta para un cliente activo.', icon: Building2 },
  { title: 'Encontrá coincidencias', text: 'La plataforma cruza filtros y muestra inmuebles compatibles ofrecidos por otros agentes.', icon: Search },
  { title: 'Cerrá con comisión', text: 'Ambas partes avanzan con la operación sabiendo qué porcentaje corresponde y bajo qué condiciones.', icon: Percent },
];

const commissionItems = [
  'Porcentaje visible en cada propiedad compartida',
  'Condiciones comerciales disponibles antes del contacto',
  'Registro claro de quién publica y quién aporta el cliente',
];

const useCases = [
  { tag: 'Tengo cliente', title: 'Buscás una propiedad que no tenés en cartera', text: 'Cargás la necesidad del comprador o inquilino y encontrás inmuebles compatibles publicados por otras inmobiliarias.', result: 'Más opciones sin perder al cliente', icon: Search },
  { tag: 'Tengo propiedad', title: 'Querés mover un inmueble más rápido', text: 'Compartís una propiedad disponible con comisión definida para que otros agentes puedan acercar interesados.', result: 'Mayor exposición con reglas claras', icon: Building2 },
  { tag: 'Tengo operación', title: 'Necesitás formalizar una colaboración', text: 'Dejás asentado quién publica, quién aporta el cliente y qué porcentaje corresponde si avanza la operación.', result: 'Menos fricción entre partes', icon: Handshake },
  { tag: 'Tengo urgencia', title: 'Buscás alquiler o venta con filtros precisos', text: 'Aplicás zona, presupuesto, ambientes, superficie y condiciones para reducir ruido y contactar solo matches útiles.', result: 'Búsquedas más rápidas y ordenadas', icon: Percent },
];

const plans = [
  {
    name: 'Agente', description: 'Para profesionales que quieren encontrar propiedades de terceros y publicar búsquedas activas.',
    price: 'A medida', period: 'acceso individual', cta: 'Consultar acceso', icon: UserRound, featured: false,
    features: ['Búsquedas con filtros avanzados', 'Contacto con inmobiliarias publicantes', 'Registro de oportunidades compartidas'],
  },
  {
    name: 'Inmobiliaria', description: 'Para equipos que necesitan publicar cartera, recibir interesados y coordinar operaciones.',
    price: 'A medida', period: 'por equipo', cta: 'Solicitar demo', icon: Building2, featured: true,
    features: ['Propiedades compartidas ilimitadas', 'Usuarios para agentes del equipo', 'Comisiones visibles por publicación', 'Panel de operaciones colaborativas'],
  },
  {
    name: 'Red', description: 'Para grupos, franquicias o alianzas que quieren operar con reglas comunes entre oficinas.',
    price: 'A medida', period: 'configuración privada', cta: 'Hablar con ventas', icon: ShieldCheck, featured: false,
    features: ['Acceso curado por organización', 'Condiciones comerciales configurables', 'Visibilidad entre sucursales o aliados'],
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSent, setLeadSent] = useState(false);

  return (
    <div className="landing-page">
      <header className="topbar">
        <nav className="nav" aria-label="Navegación principal">
          <a href="#inicio" className="logo" aria-label="SpyderConnect inicio">
            <span className="logo-mark">SC</span>
            <span className="logo-text">Spyder<span>Connect</span></span>
          </a>

          <div className="nav-links">
            <a href="#propiedades">Propiedades</a>
            <a href="#funciona">Cómo funciona</a>
            <a href="#comisiones">Comisiones</a>
            <a href="#casos">Casos</a>
            <a href="#planes">Planes</a>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="btn btn-ghost">Iniciar sesión</Link>
            <Link to="/registro" className="btn btn-primary">Solicitar acceso</Link>
          </div>

          <button
            className="menu-button"
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </nav>

        <div id="mobile-menu" className={`mobile-menu${menuOpen ? ' open' : ''}`}>
          <a href="#propiedades" onClick={() => setMenuOpen(false)}>Propiedades</a>
          <a href="#funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
          <a href="#comisiones" onClick={() => setMenuOpen(false)}>Comisiones</a>
          <a href="#casos" onClick={() => setMenuOpen(false)}>Casos</a>
          <a href="#planes" onClick={() => setMenuOpen(false)}>Planes</a>
          <Link to="/login" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
          <Link to="/registro" onClick={() => setMenuOpen(false)}>Solicitar acceso</Link>
        </div>
      </header>

      <main id="inicio">
        {/* ---- Hero ---- */}
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span></span>
                Red colaborativa inmobiliaria
              </div>
              <h1>Conectá propiedades, agentes y oportunidades.</h1>
              <p>
                SpyderConnect permite que inmobiliarias y agentes compartan inmuebles disponibles,
                encuentren propiedades para sus clientes y cierren operaciones con comisiones claras.
              </p>
              <div className="hero-actions">
                <a href="#contacto" className="btn btn-primary btn-large">
                  Solicitar acceso <ArrowRight size={18} aria-hidden />
                </a>
                <a href="#funciona" className="btn btn-dark btn-large">Ver cómo funciona</a>
              </div>
              <div className="hero-metrics" aria-label="Métricas destacadas">
                <div><strong>2.4%</strong><span>comisión promedio</span></div>
                <div><strong>18 min</strong><span>para recibir un match</span></div>
                <div><strong>+320</strong><span>inmuebles compartidos</span></div>
              </div>
            </div>

            <div className="product-preview" aria-label="Vista previa de la plataforma">
              <div className="preview-shell">
                <aside className="preview-sidebar">
                  <div className="preview-brand">Spyder<span>Connect</span></div>
                  <button className="preview-tab active" type="button"><Search size={15} aria-hidden /> Buscar match</button>
                  <button className="preview-tab" type="button"><Building2 size={15} aria-hidden /> Publicadas</button>
                  <button className="preview-tab" type="button"><Handshake size={15} aria-hidden /> Operaciones</button>
                </aside>

                <section className="preview-main">
                  <header className="preview-header">
                    <div>
                      <span>Cliente comprador</span>
                      <h2>Depto 3 ambientes en Palermo</h2>
                    </div>
                    <div className="live-chip">Match activo</div>
                  </header>

                  <div className="filter-bar">
                    <div><MapPin size={14} aria-hidden /> Palermo</div>
                    <div><BedDouble size={14} aria-hidden /> 2 dorm.</div>
                    <div><Ruler size={14} aria-hidden /> 70-95 m²</div>
                    <div><SlidersHorizontal size={14} aria-hidden /> USD 180k</div>
                  </div>

                  <div className="properties-grid">
                    {properties.map(p => (
                      <article key={p.title} className="property-card">
                        <img src={p.image} alt={p.alt} />
                        <div className="property-body">
                          <div className="property-top">
                            <h3>{p.title}</h3>
                            <span>{p.price}</span>
                          </div>
                          <p>{p.location}</p>
                          <div className="property-meta">
                            <span>{p.type}</span>
                            <span>{p.rooms}</span>
                            <span>{p.area}</span>
                            <strong>{p.commission}</strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <aside className="deal-panel">
                  <div className="deal-icon"><Percent size={20} aria-hidden /></div>
                  <span>Operación compartida</span>
                  <h3>Comisión ofrecida</h3>
                  <strong>2.5%</strong>
                  <p>Inmobiliaria Norte acepta compartir honorarios si acercás al comprador.</p>
                  <div className="trust-row">
                    <ShieldCheck size={16} aria-hidden /> Documentación verificada
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* ---- Propiedades ---- */}
        <section id="propiedades" className="section section-light">
          <div className="section-container">
            <div className="section-header">
              <span className="section-tag">Propiedades compartidas</span>
              <h2>Más inventario disponible, sin perder el control de tus operaciones.</h2>
              <p>Publicá inmuebles con condiciones claras o encontrá propiedades de otras inmobiliarias cuando tu cliente busca algo específico.</p>
            </div>
            <div className="value-grid">
              {valueItems.map(item => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="value-card">
                    <div className="icon-box"><Icon size={22} aria-hidden /></div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- Cómo funciona ---- */}
        <section id="funciona" className="section section-dark">
          <div className="section-container">
            <div className="section-header section-header-light">
              <span className="section-tag light">Cómo funciona</span>
              <h2>Una operación compartida, sin mensajes perdidos ni acuerdos ambiguos.</h2>
              <p>SpyderConnect ordena el proceso para que cada parte sepa qué inmueble comparte, quién acerca el cliente y qué comisión corresponde.</p>
            </div>
            <div className="steps-grid">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <article key={step.title} className="step-card">
                    <span className="step-number">{String(i + 1).padStart(2, '0')}</span>
                    <div className="icon-box dark-icon"><Icon size={22} aria-hidden /></div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- Comisiones ---- */}
        <section id="comisiones" className="section section-paper">
          <div className="section-container commission-layout">
            <div className="commission-copy">
              <span className="section-tag">Comisiones claras</span>
              <h2>El porcentaje queda visible antes de iniciar la colaboración.</h2>
              <p>Cada publicación puede indicar la comisión ofrecida, el tipo de operación, las condiciones comerciales y la documentación disponible.</p>
              <div className="check-list">
                {commissionItems.map(item => (
                  <div key={item}><ShieldCheck size={18} aria-hidden /><span>{item}</span></div>
                ))}
              </div>
            </div>

            <div className="commission-card" aria-label="Resumen de comisión">
              <div className="commission-card-header">
                <span>Resumen de colaboración</span>
                <strong>Venta</strong>
              </div>
              <div className="commission-amount">
                <span>Comisión ofrecida</span>
                <strong>2.5%</strong>
              </div>
              <div className="commission-split">
                <div><span>Publica</span><strong>Inmobiliaria Norte</strong></div>
                <div><span>Acerca cliente</span><strong>Agente asociado</strong></div>
              </div>
              <a href="#contacto" className="btn btn-primary">Quiero participar</a>
            </div>
          </div>
        </section>

        {/* ---- Casos de uso ---- */}
        <section id="casos" className="section section-light">
          <div className="section-container">
            <div className="section-header">
              <span className="section-tag">Casos de uso</span>
              <h2>Para cuando tenés el cliente, la propiedad o la oportunidad.</h2>
              <p>SpyderConnect sirve tanto para ampliar tu inventario como para mover propiedades que ya tenés disponibles dentro de una red de agentes confiables.</p>
            </div>

            <div className="usecase-grid">
              {useCases.map(uc => {
                const Icon = uc.icon;
                return (
                  <article key={uc.title} className="usecase-card">
                    <div className="usecase-top">
                      <div className="icon-box"><Icon size={22} aria-hidden /></div>
                      <span>{uc.tag}</span>
                    </div>
                    <h3>{uc.title}</h3>
                    <p>{uc.text}</p>
                    <strong>{uc.result}</strong>
                  </article>
                );
              })}
            </div>

            <div className="match-strip">
              <div><span>Búsqueda activa</span><strong>Casa con jardín en zona norte</strong></div>
              <div><span>Coincidencias</span><strong>7 propiedades compatibles</strong></div>
              <div><span>Comisión</span><strong>2% a 3%</strong></div>
              <Link to="/registro" className="btn btn-primary">Publicar mi búsqueda</Link>
            </div>
          </div>
        </section>

        {/* ---- Planes ---- */}
        <section id="planes" className="section section-paper">
          <div className="section-container">
            <div className="section-header">
              <span className="section-tag">Planes</span>
              <h2>Elegí cómo querés entrar a la red.</h2>
              <p>Desde agentes que buscan más inventario hasta inmobiliarias que quieren activar colaboraciones con su equipo completo.</p>
            </div>

            <div className="plans-grid">
              {plans.map(plan => {
                const Icon = plan.icon;
                return (
                  <article key={plan.name} className={`plan-card${plan.featured ? ' featured' : ''}`}>
                    {plan.featured && <div className="plan-badge">Más elegido</div>}
                    <div className="icon-box"><Icon size={22} aria-hidden /></div>
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                    <div className="plan-price">
                      <strong>{plan.price}</strong>
                      <span>{plan.period}</span>
                    </div>
                    <ul>
                      {plan.features.map(f => (
                        <li key={f}><Check size={16} aria-hidden /><span>{f}</span></li>
                      ))}
                    </ul>
                    <a href="#contacto" className={`btn ${plan.featured ? 'btn-primary' : 'btn-outline'}`}>{plan.cta}</a>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- Contacto ---- */}
        <section id="contacto" className="contact-section">
          <div className="contact-box">
            <span className="section-tag light">Acceso anticipado</span>
            <h2>Sumá tu inmobiliaria a la red de SpyderConnect.</h2>
            <p>Dejanos un correo y te contactamos para mostrarte cómo publicar propiedades, buscar oportunidades y configurar comisiones compartidas.</p>

            <form className="contact-form" onSubmit={e => { e.preventDefault(); setLeadSent(true); }}>
              <label htmlFor="lead-email" className="sr-only">Correo electrónico</label>
              <input
                id="lead-email"
                type="email"
                placeholder="tu@inmobiliaria.com"
                value={leadEmail}
                onChange={e => setLeadEmail(e.target.value)}
                required
              />
              <button className="btn btn-primary" type="submit">Solicitar acceso</button>
            </form>

            {leadSent && (
              <p className="success-message" role="status">Listo, registramos tu interés para la demo.</p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div>
              <a href="#inicio" className="logo footer-logo" aria-label="SpyderConnect inicio">
                <span className="logo-mark">SC</span>
                <span className="logo-text">Spyder<span>Connect</span></span>
              </a>
              <p>Una red privada para que inmobiliarias y agentes compartan oportunidades, encuentren propiedades y colaboren con comisiones claras.</p>
            </div>

            <div className="footer-col">
              <h3>Producto</h3>
              <a href="#propiedades">Propiedades</a>
              <a href="#funciona">Cómo funciona</a>
              <a href="#comisiones">Comisiones</a>
              <a href="#casos">Casos</a>
              <a href="#planes">Planes</a>
            </div>

            <div className="footer-col">
              <h3>Contacto</h3>
              <div><Mail size={16} aria-hidden /><span>hola@spyderconnect.com</span></div>
              <div><Phone size={16} aria-hidden /><span>+54 11 0000-0000</span></div>
              <div><MapPin size={16} aria-hidden /><span>Buenos Aires, Argentina</span></div>
            </div>

            <div className="footer-card">
              <span>Para inmobiliarias</span>
              <strong>Red con acceso curado</strong>
              <p>Diseñada para operar con agentes identificados, propiedades verificables y acuerdos visibles.</p>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 SpyderConnect. Todos los derechos reservados.</p>
            <div>
              <a href="#contacto">Privacidad</a>
              <a href="#contacto">Términos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
