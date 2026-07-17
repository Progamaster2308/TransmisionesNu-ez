import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  countProducts,
  getActiveBanner,
  getActiveRepairPromo,
  getDefaultBanner,
  getDefaultRepairPromo,
  listWorkShowcase
} from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';

import './WelcomePage.css';
import './WelcomeHeroFix.css';

const workshopMapsUrl = 'https://www.google.com/maps/place/Av.+Ejido+A+%26+C.+46,+M%C3%A9xico,+83498+San+Luis+R%C3%ADo+Colorado,+Son./@32.4275119,-114.7390882,87m/data=!3m1!1e3!4m6!3m5!1s0x80d64f3fe382f6c7:0x78547498f5547196!8m2!3d32.4275085!4d-114.7389354!16s%2Fg%2F11hb8gf69j!5m1!1e4?entry=ttu&g_ep=EgoyMDI2MDcwOC4wIKXMDSoASAFQAw%3D%3D';
const workshopMapEmbedUrl = 'https://www.google.com/maps?q=32.4275085,-114.7389354&t=k&z=19&output=embed';
const contactEmail = String(import.meta.env.VITE_CONTACT_EMAIL || '').trim();

function WelcomePage() {
  const [banner, setBanner] = useState(null);
  const [repairPromo, setRepairPromo] = useState(null);
  const [workShowcase, setWorkShowcase] = useState([]);
  const [productCount, setProductCount] = useState(null);
  const [contentReady, setContentReady] = useState(false);
  const [splashMinimumDone, setSplashMinimumDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [bannerResult, promoResult, productsResult, worksResult] = await Promise.allSettled([
          getActiveBanner(),
          getActiveRepairPromo(),
          countProducts(),
          listWorkShowcase()
        ]);
        if (mounted) {
          setBanner(bannerResult.status === 'fulfilled' && bannerResult.value ? bannerResult.value : getDefaultBanner());
          setRepairPromo(promoResult.status === 'fulfilled' && promoResult.value ? promoResult.value : getDefaultRepairPromo());
          setProductCount(productsResult.status === 'fulfilled' ? productsResult.value : null);
          setWorkShowcase(worksResult.status === 'fulfilled' ? worksResult.value.filter((item) => item.enabled && item.imagen).slice(0, 3) : []);
          setContentReady(true);
        }
      } catch (error) {
        console.error(error);
        if (mounted) {
          setBanner(getDefaultBanner());
          setRepairPromo(getDefaultRepairPromo());
          setContentReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashMinimumDone(true), 1850);
    return () => window.clearTimeout(timer);
  }, []);

  const showSplash = !contentReady || !splashMinimumDone;
  const activeBanner = banner || getDefaultBanner();
  const activeRepairPromo = repairPromo || getDefaultRepairPromo();
  const safeBanner = {
    titulo: activeBanner?.titulo ? sanitizeText(activeBanner.titulo, 120) : getDefaultBanner().titulo,
    subtitulo: activeBanner?.subtitulo ? sanitizeText(activeBanner.subtitulo, 180) : getDefaultBanner().subtitulo,
    descripcion: activeBanner?.descripcion ? sanitizeText(activeBanner.descripcion, 320) : getDefaultBanner().descripcion,
    cta_label: activeBanner?.cta_label ? sanitizeText(activeBanner.cta_label, 40) : getDefaultBanner().cta_label,
    cta_link: activeBanner?.cta_link ? sanitizeText(activeBanner.cta_link, 120) : getDefaultBanner().cta_link,
    imagen: activeBanner?.imagen ? sanitizeText(activeBanner.imagen, 500) : '',
    splash_image: activeBanner?.splash_image ? sanitizeText(activeBanner.splash_image, 500) : ''
  };

  const heroStyle = safeBanner.imagen
    ? { '--hero-image': `url(${safeBanner.imagen})` }
    : undefined;
  const splashStyle = safeBanner.splash_image
    ? { '--splash-image': `url(${safeBanner.splash_image})` }
    : undefined;
  const safePromo = {
    titulo: activeRepairPromo?.titulo ? sanitizeText(activeRepairPromo.titulo, 120) : getDefaultRepairPromo().titulo,
    subtitulo: activeRepairPromo?.subtitulo ? sanitizeText(activeRepairPromo.subtitulo, 180) : getDefaultRepairPromo().subtitulo,
    descripcion: activeRepairPromo?.descripcion ? sanitizeText(activeRepairPromo.descripcion, 320) : getDefaultRepairPromo().descripcion,
    cta_label: activeRepairPromo?.cta_label ? sanitizeText(activeRepairPromo.cta_label, 40) : getDefaultRepairPromo().cta_label,
    cta_link: activeRepairPromo?.cta_link ? sanitizeText(activeRepairPromo.cta_link, 120) : getDefaultRepairPromo().cta_link,
    imagen: activeRepairPromo?.imagen ? sanitizeText(activeRepairPromo.imagen, 500) : ''
  };
  const repairPromoStyle = safePromo.imagen
    ? { '--repair-promo-image': `url(${safePromo.imagen})` }
    : undefined;
  return (
    <>
      {showSplash && (
        <div className="dago-splash" style={splashStyle} aria-label="Transmisiones Núñez">
          <div className="dago-splash__brand">
            <span className="dago-splash__eyebrow">Bienvenido a</span>
            <strong>Transmisiones Núñez</strong>
            <span className="dago-splash__line" />
          </div>
        </div>
      )}

      <main className="nu-home">
        <section className="dago-hero dago-hero--integrated tn-hero" style={heroStyle}>
          <div className="tn-hero-copy">
            <p className="tn-hero-kicker">Transmisiones Núñez</p>
            <h1 className="tn-hero-heading">Refacciones y servicios disponibles para tu transmisión</h1>
            <p className="tn-hero-name">{safeBanner.titulo}</p>
            <p className="tn-hero-subtitle">{safeBanner.subtitulo}</p>
            <p className="tn-hero-desc">{safeBanner.descripcion}</p>
            <div className="tn-hero-actions">
              <button type="button" className="tn-hero-btn tn-hero-btn--light" onClick={() => navigate(safeBanner.cta_link)}>
                {safeBanner.cta_label}
              </button>
              <button type="button" className="tn-hero-btn tn-hero-btn--blue" onClick={() => navigate('/citas')}>
                Agendar soporte
              </button>
            </div>
          </div>

          <div className="dago-hero__product" aria-hidden="true">
            <div className="dago-hero__disc dago-hero__disc--one" />
            <div className="dago-hero__disc dago-hero__disc--two" />
            <div className="dago-hero__part dago-hero__part--tall" />
            <div className="dago-hero__part dago-hero__part--small" />
          </div>
        </section>

        <section className="dago-mosaic" aria-label="Servicios destacados">
          <button type="button" className="dago-mosaic__panel dago-mosaic__panel--diagnostic" onClick={() => navigate('/citas')}>
            <i className="tn-panel-icon tn-panel-icon--scan" aria-hidden="true" />
            <span>Diagnóstico de precisión</span>
            <strong>Escaneo, revisión y lectura de fallas</strong>
            <small>Consulta directa</small>
          </button>
          <button type="button" className="dago-mosaic__panel dago-mosaic__panel--remanufacture" onClick={() => navigate('/catalogo')}>
            <i className="tn-panel-icon tn-panel-icon--gear" aria-hidden="true" />
            <span>Remanufactura certificada</span>
            <strong>Componentes y refacciones verificadas</strong>
            <small>{productCount === null ? 'Catálogo activo' : `+${productCount} productos`}</small>
          </button>
          <button type="button" className="dago-mosaic__panel dago-mosaic__panel--warranty" onClick={() => navigate('/chat')}>
            <i className="tn-panel-icon tn-panel-icon--shield" aria-hidden="true" />
            <span>Garantía total</span>
            <strong>Seguimiento claro con el taller</strong>
            <small>24-72 horas</small>
          </button>
        </section>

        <section className="pickup-notice" aria-label="Aviso de compra en taller">
          <div>
            <span><i className="tn-section-icon tn-section-icon--notice" aria-hidden="true" />Importante</span>
            <h2>Sin entregas a domicilio</h2>
            <p>
              El catálogo es únicamente para buscar refacciones y generar un pedido de apartado.
              Para comprar y recoger las refacciones es necesario acudir al taller.
            </p>
          </div>
          <button type="button" onClick={() => document.querySelector('.workshop-map')?.scrollIntoView({ behavior: 'smooth' })}>
            Ver ubicación del taller
          </button>
        </section>

        <section className="repair-promo" style={repairPromoStyle}>
          <div>
            <span><i className="tn-section-icon tn-section-icon--service" aria-hidden="true" />Servicio</span>
            <h2>{safePromo.titulo}</h2>
            <p>{safePromo.subtitulo}</p>
            <small>{safePromo.descripcion}</small>
          </div>
          <button type="button" onClick={() => navigate(safePromo.cta_link)}>
            {safePromo.cta_label}
          </button>
        </section>

        <section className="workshop-map" aria-label="Ubicación del taller">
          <div className="workshop-map__copy">
            <span><i className="tn-section-icon tn-section-icon--location" aria-hidden="true" />Ubicación del taller</span>
            <h2>Visítanos para diagnóstico y reparación</h2>
            <p>Abre la ubicación en Maps para iniciar ruta directa al taller.</p>
            <a href={workshopMapsUrl} target="_blank" rel="noreferrer">
              Abrir en Google Maps
            </a>
          </div>

          <div className="workshop-map__frame">
            <iframe
              title="Mapa satelital de Transmisiones Núñez"
              src={workshopMapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="workshop-map__pin" aria-hidden="true">
              <strong>Transmisiones Núñez</strong>
              <span>Taller</span>
            </div>
          </div>
        </section>

        {workShowcase.length > 0 && (
          <section className="work-showcase" aria-label="Trabajos realizados">
            <div className="work-showcase__header">
              <span><i className="tn-section-icon tn-section-icon--work" aria-hidden="true" />Trabajos realizados</span>
              <h2>Reparaciones y ventas del taller</h2>
            </div>
            <div className="work-showcase__grid">
              {workShowcase.map((work) => (
                <article className="work-card" key={work.id || work.slot}>
                  <img src={work.imagen} alt={work.titulo} />
                  <div>
                    <h3>{work.titulo}</h3>
                    <p>{work.descripcion}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="tn-footer" aria-label="Contacto de Transmisiones Núñez">
          <p>Transmisiones Núñez. Todos los derechos reservados.</p>
          <div className="tn-footer__links">
            <button
              type="button"
              onClick={() => {
                window.open('https://www.facebook.com/share/18HommcM7n/', '_blank', 'noopener,noreferrer');
              }}
              aria-label="Facebook de Transmisiones Núñez"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.4l.6-3h-3V9c0-.6.4-1 1-1Z" />
              </svg>
              <span>Facebook</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (contactEmail) window.location.href = `mailto:${contactEmail}`;
              }}
              aria-label="Correo de Transmisiones Núñez"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2Zm8 7 8-5H4l8 5Zm0 2.2L4 10.2V16h16v-5.8l-8 5Z" />
              </svg>
              <span>Correo</span>
            </button>
          </div>
        </footer>
      </main>
    </>
  );
}

export default WelcomePage;
