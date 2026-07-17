import { Link, useLocation } from 'react-router-dom';

import { sanitizeText } from '../providers/marketplaceStorage';

import './NotFoundPage.css';

export default function NotFoundPage() {
  const location = useLocation();
  const missingPath = sanitizeText(location.pathname, 80) || '/';

  return (
    <main className="notFoundPage">
      <section className="notFoundHero" aria-labelledby="not-found-title">
        <div className="notFoundBrand">
          <span className="notFoundLogo"><img src="/tnlogo.png" alt="" aria-hidden="true" /></span>
          <span>Transmisiones Núñez</span>
        </div>

        <div className="notFoundContent">
          <div className="notFoundCopy">
            <h1 id="not-found-title">Esta página no entró al taller</h1>
            <p className="notFoundText">
              La dirección <strong>{missingPath}</strong> no está disponible en el sistema. Regresa al inicio para continuar desde la entrada principal de Transmisiones Núñez.
            </p>

            <div className="notFoundActions">
              <Link className="notFoundPrimary" to="/">Volver al inicio</Link>
            </div>
          </div>

          <div className="notFoundVisual" aria-hidden="true">
            <div className="notFoundPlate">
              <span>TN</span>
              <strong>Transmisiones Núñez</strong>
            </div>
            <div className="notFoundDial">
              <span>4</span>
              <span>0</span>
              <span>4</span>
            </div>
            <div className="notFoundShaft" />
            <div className="notFoundTool" />
            <div className="notFoundScan">
              <span />
              <span />
              <span />
            </div>
            <div className="notFoundStatus">
              <strong>Diagnóstico</strong>
              <span>Ruta no disponible</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
