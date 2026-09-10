<template>
  <div class="page">
    <header class="topbar">
      <nav class="nav" aria-label="Navegación principal">
        <a href="#inicio" class="logo" aria-label="SpyderConnect inicio">
          <span class="logo-mark">SC</span>
          <span class="logo-text">Spyder<span>Connect</span></span>
        </a>

        <div class="nav-links">
          <a href="#propiedades">Propiedades</a>
          <a href="#funciona">Cómo funciona</a>
          <a href="#comisiones">Comisiones</a>
          <a href="#casos">Casos</a>
          <a href="#planes">Planes</a>
        </div>

        <div class="nav-actions">
          <a href="/login" class="btn btn-ghost">Iniciar sesión</a>
          <a href="/registro" class="btn btn-primary">Solicitar acceso</a>
        </div>

        <button
          class="menu-button"
          type="button"
          :aria-expanded="menuOpen"
          :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
          aria-controls="mobile-menu"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="22" aria-hidden="true" />
          <Menu v-else :size="22" aria-hidden="true" />
        </button>
      </nav>

      <div id="mobile-menu" class="mobile-menu" :class="{ open: menuOpen }">
        <a href="#propiedades" @click="menuOpen = false">Propiedades</a>
        <a href="#funciona" @click="menuOpen = false">Cómo funciona</a>
        <a href="#comisiones" @click="menuOpen = false">Comisiones</a>
        <a href="#casos" @click="menuOpen = false">Casos</a>
        <a href="#planes" @click="menuOpen = false">Planes</a>
        <a href="/login" @click="menuOpen = false">Iniciar sesión</a>
        <a href="/registro" @click="menuOpen = false">Solicitar acceso</a>
      </div>
    </header>

    <main id="inicio">
      <section class="hero">
        <div class="hero-grid">
          <div class="hero-copy">
            <div class="eyebrow">
              <span></span>
              Red colaborativa inmobiliaria
            </div>
            <h1>Conectá propiedades, agentes y oportunidades.</h1>
            <p>
              SpyderConnect permite que inmobiliarias y agentes compartan inmuebles disponibles,
              encuentren propiedades para sus clientes y cierren operaciones con comisiones claras.
            </p>
            <div class="hero-actions">
              <a href="#contacto" class="btn btn-primary btn-large">
                Solicitar acceso
                <ArrowRight :size="18" aria-hidden="true" />
              </a>
              <a href="#funciona" class="btn btn-dark btn-large">Ver cómo funciona</a>
            </div>
            <div class="hero-metrics" aria-label="Métricas destacadas">
              <div>
                <strong>2.4%</strong>
                <span>comisión promedio</span>
              </div>
              <div>
                <strong>18 min</strong>
                <span>para recibir un match</span>
              </div>
              <div>
                <strong>+320</strong>
                <span>inmuebles compartidos</span>
              </div>
            </div>
          </div>

          <div class="product-preview" aria-label="Vista previa de la plataforma">
            <div class="preview-shell">
              <aside class="preview-sidebar">
                <div class="preview-brand">Spyder<span>Connect</span></div>
                <button class="preview-tab active" type="button">
                  <Search :size="15" aria-hidden="true" />
                  Buscar match
                </button>
                <button class="preview-tab" type="button">
                  <Building2 :size="15" aria-hidden="true" />
                  Publicadas
                </button>
                <button class="preview-tab" type="button">
                  <Handshake :size="15" aria-hidden="true" />
                  Operaciones
                </button>
              </aside>

              <section class="preview-main">
                <header class="preview-header">
                  <div>
                    <span>Cliente comprador</span>
                    <h2>Depto 3 ambientes en Palermo</h2>
                  </div>
                  <div class="live-chip">Match activo</div>
                </header>

                <div class="filter-bar">
                  <div>
                    <MapPin :size="14" aria-hidden="true" />
                    Palermo
                  </div>
                  <div>
                    <BedDouble :size="14" aria-hidden="true" />
                    2 dorm.
                  </div>
                  <div>
                    <Ruler :size="14" aria-hidden="true" />
                    70-95 m²
                  </div>
                  <div>
                    <SlidersHorizontal :size="14" aria-hidden="true" />
                    USD 180k
                  </div>
                </div>

                <div class="properties-grid">
                  <article
                    v-for="property in properties"
                    :key="property.title"
                    class="property-card"
                  >
                    <img :src="property.image" :alt="property.alt" />
                    <div class="property-body">
                      <div class="property-top">
                        <h3>{{ property.title }}</h3>
                        <span>{{ property.price }}</span>
                      </div>
                      <p>{{ property.location }}</p>
                      <div class="property-meta">
                        <span>{{ property.type }}</span>
                        <span>{{ property.rooms }}</span>
                        <span>{{ property.area }}</span>
                        <strong>{{ property.commission }}</strong>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <aside class="deal-panel">
                <div class="deal-icon">
                  <Percent :size="20" aria-hidden="true" />
                </div>
                <span>Operación compartida</span>
                <h3>Comisión ofrecida</h3>
                <strong>2.5%</strong>
                <p>Inmobiliaria Norte acepta compartir honorarios si acercás al comprador.</p>
                <div class="trust-row">
                  <ShieldCheck :size="16" aria-hidden="true" />
                  Documentación verificada
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section id="propiedades" class="section section-light">
        <div class="section-container">
          <div class="section-header">
            <span class="section-tag">Propiedades compartidas</span>
            <h2>Más inventario disponible, sin perder el control de tus operaciones.</h2>
            <p>
              Publicá inmuebles con condiciones claras o encontrá propiedades de otras inmobiliarias
              cuando tu cliente busca algo específico.
            </p>
          </div>

          <div class="value-grid">
            <article v-for="item in valueItems" :key="item.title" class="value-card">
              <div class="icon-box">
                <component :is="item.icon" :size="22" aria-hidden="true" />
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="funciona" class="section section-dark">
        <div class="section-container">
          <div class="section-header section-header-light">
            <span class="section-tag light">Cómo funciona</span>
            <h2>Una operación compartida, sin mensajes perdidos ni acuerdos ambiguos.</h2>
            <p>
              SpyderConnect ordena el proceso para que cada parte sepa qué inmueble comparte,
              quién acerca el cliente y qué comisión corresponde.
            </p>
          </div>

          <div class="steps-grid">
            <article v-for="(step, index) in steps" :key="step.title" class="step-card">
              <span class="step-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <div class="icon-box dark-icon">
                <component :is="step.icon" :size="22" aria-hidden="true" />
              </div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="comisiones" class="section section-paper">
        <div class="section-container commission-layout">
          <div class="commission-copy">
            <span class="section-tag">Comisiones claras</span>
            <h2>El porcentaje queda visible antes de iniciar la colaboración.</h2>
            <p>
              Cada publicación puede indicar la comisión ofrecida, el tipo de operación,
              las condiciones comerciales y la documentación disponible.
            </p>

            <div class="check-list">
              <div v-for="item in commissionItems" :key="item">
                <ShieldCheck :size="18" aria-hidden="true" />
                <span>{{ item }}</span>
              </div>
            </div>
          </div>

          <div class="commission-card" aria-label="Resumen de comisión">
            <div class="commission-card-header">
              <span>Resumen de colaboración</span>
              <strong>Venta</strong>
            </div>
            <div class="commission-amount">
              <span>Comisión ofrecida</span>
              <strong>2.5%</strong>
            </div>
            <div class="commission-split">
              <div>
                <span>Publica</span>
                <strong>Inmobiliaria Norte</strong>
              </div>
              <div>
                <span>Acerca cliente</span>
                <strong>Agente asociado</strong>
              </div>
            </div>
            <a href="#contacto" class="btn btn-primary">Quiero participar</a>
          </div>
        </div>
      </section>

      <section id="casos" class="section section-light">
        <div class="section-container">
          <div class="section-header">
            <span class="section-tag">Casos de uso</span>
            <h2>Para cuando tenés el cliente, la propiedad o la oportunidad.</h2>
            <p>
              SpyderConnect sirve tanto para ampliar tu inventario como para mover propiedades
              que ya tenés disponibles dentro de una red de agentes confiables.
            </p>
          </div>

          <div class="usecase-grid">
            <article v-for="useCase in useCases" :key="useCase.title" class="usecase-card">
              <div class="usecase-top">
                <div class="icon-box">
                  <component :is="useCase.icon" :size="22" aria-hidden="true" />
                </div>
                <span>{{ useCase.tag }}</span>
              </div>
              <h3>{{ useCase.title }}</h3>
              <p>{{ useCase.text }}</p>
              <strong>{{ useCase.result }}</strong>
            </article>
          </div>

          <div class="match-strip">
            <div>
              <span>Búsqueda activa</span>
              <strong>Casa con jardín en zona norte</strong>
            </div>
            <div>
              <span>Coincidencias</span>
              <strong>7 propiedades compatibles</strong>
            </div>
            <div>
              <span>Comisión</span>
              <strong>2% a 3%</strong>
            </div>
            <a href="#contacto" class="btn btn-primary">Publicar mi búsqueda</a>
          </div>
        </div>
      </section>

      <section id="planes" class="section section-paper">
        <div class="section-container">
          <div class="section-header">
            <span class="section-tag">Planes</span>
            <h2>Elegí cómo querés entrar a la red.</h2>
            <p>
              Desde agentes que buscan más inventario hasta inmobiliarias que quieren activar
              colaboraciones con su equipo completo.
            </p>
          </div>

          <div class="plans-grid">
            <article
              v-for="plan in plans"
              :key="plan.name"
              class="plan-card"
              :class="{ featured: plan.featured }"
            >
              <div v-if="plan.featured" class="plan-badge">Más elegido</div>
              <div class="icon-box">
                <component :is="plan.icon" :size="22" aria-hidden="true" />
              </div>
              <h3>{{ plan.name }}</h3>
              <p>{{ plan.description }}</p>
              <div class="plan-price">
                <strong>{{ plan.price }}</strong>
                <span>{{ plan.period }}</span>
              </div>
              <ul>
                <li v-for="feature in plan.features" :key="feature">
                  <Check :size="16" aria-hidden="true" />
                  <span>{{ feature }}</span>
                </li>
              </ul>
              <a href="#contacto" class="btn" :class="plan.featured ? 'btn-primary' : 'btn-outline'">
                {{ plan.cta }}
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="contacto" class="contact-section">
        <div class="contact-box">
          <span class="section-tag light">Acceso anticipado</span>
          <h2>Sumá tu inmobiliaria a la red de SpyderConnect.</h2>
          <p>
            Dejanos un correo y te contactamos para mostrarte cómo publicar propiedades,
            buscar oportunidades y configurar comisiones compartidas.
          </p>

          <form class="contact-form" @submit.prevent="leadSent = true">
            <label for="email" class="sr-only">Correo electrónico</label>
            <input
              id="email"
              v-model="leadEmail"
              type="email"
              placeholder="tu@inmobiliaria.com"
              required
            />
            <button class="btn btn-primary" type="submit">Solicitar acceso</button>
          </form>

          <p v-if="leadSent" class="success-message" role="status">
            Listo, registramos tu interés para la demo.
          </p>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div>
            <a href="#inicio" class="logo footer-logo" aria-label="SpyderConnect inicio">
              <span class="logo-mark">SC</span>
              <span class="logo-text">Spyder<span>Connect</span></span>
            </a>
            <p>
              Una red privada para que inmobiliarias y agentes compartan oportunidades,
              encuentren propiedades y colaboren con comisiones claras.
            </p>
          </div>

          <div class="footer-col">
            <h3>Producto</h3>
            <a href="#propiedades">Propiedades</a>
            <a href="#funciona">Cómo funciona</a>
            <a href="#comisiones">Comisiones</a>
            <a href="#casos">Casos</a>
            <a href="#planes">Planes</a>
          </div>

          <div class="footer-col">
            <h3>Contacto</h3>
            <div>
              <Mail :size="16" aria-hidden="true" />
              <span>hola@spyderconnect.com</span>
            </div>
            <div>
              <Phone :size="16" aria-hidden="true" />
              <span>+54 11 0000-0000</span>
            </div>
            <div>
              <MapPin :size="16" aria-hidden="true" />
              <span>Buenos Aires, Argentina</span>
            </div>
          </div>

          <div class="footer-card">
            <span>Para inmobiliarias</span>
            <strong>Red con acceso curado</strong>
            <p>Diseñada para operar con agentes identificados, propiedades verificables y acuerdos visibles.</p>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© 2026 SpyderConnect. Todos los derechos reservados.</p>
          <div>
            <a href="#contacto">Privacidad</a>
            <a href="#contacto">Términos</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ArrowRight,
  BedDouble,
  Building2,
  Check,
  Handshake,
  Mail,
  MapPin,
  Menu,
  Percent,
  Phone,
  Ruler,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from '@lucide/vue'

const menuOpen = ref(false)
const leadEmail = ref('')
const leadSent = ref(false)

const properties = [
  {
    title: 'Duplex Cerviño',
    location: 'Palermo Chico · Compartida por Grupo Raíz',
    price: 'USD 192k',
    type: 'Venta',
    rooms: '3 amb.',
    area: '82 m²',
    commission: '2.5%',
    alt: 'Living moderno de una propiedad publicada en SpyderConnect',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
  },
  {
    title: 'Loft Thames',
    location: 'Palermo Soho · Compartida por Nova Propiedades',
    price: 'USD 168k',
    type: 'Apto crédito',
    rooms: '2 amb.',
    area: '74 m²',
    commission: '2.0%',
    alt: 'Casa luminosa usada como vista previa de una propiedad compartida',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  },
]

const valueItems = [
  {
    title: 'Compartí inmuebles disponibles',
    text: 'Cargá propiedades con datos clave, tipo de operación y porcentaje ofrecido para colaborar.',
    icon: Building2,
  },
  {
    title: 'Buscá por necesidad real',
    text: 'Filtrá por zona, precio, ambientes, superficie y estado para encontrar el inmueble exacto.',
    icon: Search,
  },
  {
    title: 'Activá acuerdos entre agentes',
    text: 'Conectá con otra inmobiliaria, presentá tu cliente y dejá claras las condiciones desde el inicio.',
    icon: Handshake,
  },
]

const steps = [
  {
    title: 'Publicá o buscá',
    text: 'La inmobiliaria publica sus propiedades o carga una búsqueda concreta para un cliente activo.',
    icon: Building2,
  },
  {
    title: 'Encontrá coincidencias',
    text: 'La plataforma cruza filtros y muestra inmuebles compatibles ofrecidos por otros agentes.',
    icon: Search,
  },
  {
    title: 'Cerrá con comisión',
    text: 'Ambas partes avanzan con la operación sabiendo qué porcentaje corresponde y bajo qué condiciones.',
    icon: Percent,
  },
]

const commissionItems = [
  'Porcentaje visible en cada propiedad compartida',
  'Condiciones comerciales disponibles antes del contacto',
  'Registro claro de quién publica y quién aporta el cliente',
]

const useCases = [
  {
    tag: 'Tengo cliente',
    title: 'Buscás una propiedad que no tenés en cartera',
    text: 'Cargás la necesidad del comprador o inquilino y encontrás inmuebles compatibles publicados por otras inmobiliarias.',
    result: 'Más opciones sin perder al cliente',
    icon: Search,
  },
  {
    tag: 'Tengo propiedad',
    title: 'Querés mover un inmueble más rápido',
    text: 'Compartís una propiedad disponible con comisión definida para que otros agentes puedan acercar interesados.',
    result: 'Mayor exposición con reglas claras',
    icon: Building2,
  },
  {
    tag: 'Tengo operación',
    title: 'Necesitás formalizar una colaboración',
    text: 'Dejás asentado quién publica, quién aporta el cliente y qué porcentaje corresponde si avanza la operación.',
    result: 'Menos fricción entre partes',
    icon: Handshake,
  },
  {
    tag: 'Tengo urgencia',
    title: 'Buscás alquiler o venta con filtros precisos',
    text: 'Aplicás zona, presupuesto, ambientes, superficie y condiciones para reducir ruido y contactar solo matches útiles.',
    result: 'Búsquedas más rápidas y ordenadas',
    icon: Percent,
  },
]

const plans = [
  {
    name: 'Agente',
    description: 'Para profesionales que quieren encontrar propiedades de terceros y publicar búsquedas activas.',
    price: 'A medida',
    period: 'acceso individual',
    cta: 'Consultar acceso',
    icon: UserRound,
    featured: false,
    features: [
      'Búsquedas con filtros avanzados',
      'Contacto con inmobiliarias publicantes',
      'Registro de oportunidades compartidas',
    ],
  },
  {
    name: 'Inmobiliaria',
    description: 'Para equipos que necesitan publicar cartera, recibir interesados y coordinar operaciones.',
    price: 'A medida',
    period: 'por equipo',
    cta: 'Solicitar demo',
    icon: Building2,
    featured: true,
    features: [
      'Propiedades compartidas ilimitadas',
      'Usuarios para agentes del equipo',
      'Comisiones visibles por publicación',
      'Panel de operaciones colaborativas',
    ],
  },
  {
    name: 'Red',
    description: 'Para grupos, franquicias o alianzas que quieren operar con reglas comunes entre oficinas.',
    price: 'A medida',
    period: 'configuración privada',
    cta: 'Hablar con ventas',
    icon: ShieldCheck,
    featured: false,
    features: [
      'Acceso curado por organización',
      'Condiciones comerciales configurables',
      'Visibilidad entre sucursales o aliados',
    ],
  },
]
</script>
