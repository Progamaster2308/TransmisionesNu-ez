import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listProducts } from '../../shared/datastore/supabaseDataStore';
import '../pages/CatalogPage.css';
import { isSupabaseConfigError } from '../providers/supabaseClient';
import { sanitizeText } from '../providers/marketplaceStorage';
import { useCart } from '../providers/useCart';
import { useFavorites } from '../providers/useFavorites';
import { useToast } from '../providers/useToast';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
}

export default function CatalogPage() {
  const { items: cartItems, addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [zoomPoint, setZoomPoint] = useState({ x: 50, y: 50 });
  const [zoomActive, setZoomActive] = useState(false);

  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listProducts();
        if (mounted) setProductos(data);
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
        if (mounted) setProductos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return productos.filter((p) => {
      const okQ =
        !q ||
        p.nombre?.toLowerCase().includes(q) ||
        p.marca?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q);

      const okC = categoria === 'Todas' || p.categoria === categoria;
      return okQ && okC;
    });
  }, [productos, query, categoria]);

  const openPreview = (product) => {
    setPreviewProduct(product);
    setZoomPoint({ x: 50, y: 50 });
    setZoomActive(false);
  };

  const closePreview = () => {
    setPreviewProduct(null);
    setZoomPoint({ x: 50, y: 50 });
    setZoomActive(false);
  };

  const handleFavorite = (product) => {
    const favorite = isFavorite(product.id);
    toggleFavorite(product);
    showToast(favorite ? 'Producto quitado de favoritos.' : 'Producto agregado a favoritos.');
  };

  const handleAddToCart = (product) => {
    const stock = Number(product.stock ?? 0);
    const current = cartItems.find((item) => item.id === product.id);

    if (stock <= 0) {
      showToast('Producto no disponible.');
      return;
    }

    if (current && Number(current.cantidad || 0) >= stock) {
      showToast('Ya agregaste el máximo disponible.');
      return;
    }

    addToCart(product);
    showToast('Producto agregado al pedido.');
  };

  const handleZoomMove = (event) => {
    const stage = event.currentTarget;
    const image = stage.querySelector('img');
    if (!image?.naturalWidth || !image?.naturalHeight) return;

    const rect = stage.getBoundingClientRect();
    const styles = window.getComputedStyle(stage);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const availableWidth = rect.width - paddingLeft - paddingRight;
    const availableHeight = rect.height - paddingTop - paddingBottom;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const stageRatio = availableWidth / availableHeight;
    const renderedWidth = imageRatio > stageRatio ? availableWidth : availableHeight * imageRatio;
    const renderedHeight = imageRatio > stageRatio ? availableWidth / imageRatio : availableHeight;
    const offsetX = paddingLeft + (availableWidth - renderedWidth) / 2;
    const offsetY = paddingTop + (availableHeight - renderedHeight) / 2;

    const x = ((event.clientX - rect.left - offsetX) / renderedWidth) * 100;
    const y = ((event.clientY - rect.top - offsetY) / renderedHeight) * 100;

    setZoomPoint({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    });
    setZoomActive(true);
  };

  return (
    <main className="nu-page">
      <div className="nu-container">
        <div className="nu-pageHeader">
          <h2 className="nu-title">Catálogo disponible</h2>
          <p className="nu-subtitle">
            Consulta disponibilidad y arma tu pedido para que el vendedor confirme el seguimiento.
          </p>
          <div className="nu-controls">
            <input
              className="nu-input"
              placeholder="Buscar por nombre, marca o SKU..."
              value={query}
              onChange={(e) => setQuery(sanitizeText(e.target.value, 80))}
            />
            <select className="nu-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Link className="nu-linkBtn" to="/favoritos">
              Favoritos
            </Link>
            <Link className="nu-linkBtn" to="/carrito">
              Ver pedido
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="nu-skeleton" />
        ) : filtered.length === 0 ? (
          <div className="nu-empty">No se encontraron refacciones.</div>
        ) : (
          <div className="nu-grid">
            {filtered.map((p) => {
              const disabled = (p.stock ?? 0) <= 0;
              const favorite = isFavorite(p.id);
              const stockLevel = Math.max(0, Math.min(100, Number(p.stock || 0) * 10));

              return (
                <article key={p.id} className="nu-card">
                  <div className="nu-cardTop">
                    <div className="nu-badge">Disponible</div>
                    <button
                      type="button"
                      className={`nu-favBtn ${favorite ? 'nu-favBtn--active' : ''}`}
                      onClick={() => handleFavorite(p)}
                      aria-label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      Favorito
                    </button>
                    <div className="nu-imgWrap">
                      <img
                        className="nu-img"
                        alt={p.nombre}
                        src={p.imagen || '/favicon.svg'}
                        onError={(event) => {
                          event.currentTarget.src = '/favicon.svg';
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="nu-photoBtn"
                      onClick={() => openPreview(p)}
                      aria-label={`Ver fotos de ${p.nombre}`}
                    >
                      Ver fotos
                    </button>
                  </div>

                  <div className="nu-cardBody">
                    <div className="nu-sku">{p.sku}</div>
                    <h3 className="nu-cardTitle">{p.nombre}</h3>
                    <div className="nu-cardMeta" aria-label="Marca y categoría">
                      <span>{p.marca || 'Marca no especificada'}</span>
                      <span>{p.categoria || 'General'}</span>
                    </div>
                    <div className="nu-rating">{'★'.repeat(p.rating ?? 5)}</div>
                    <div className="nu-priceRow">
                      <strong>{formatCurrency(p.precio)}</strong>
                      {Number(p.precioOriginal || 0) > Number(p.precio || 0) && (
                        <span>{formatCurrency(p.precioOriginal)}</span>
                      )}
                    </div>

                    <div className="nu-stock">
                      {disabled ? 'Agotado' : `Disponible: ${p.stock}`}
                    </div>
                    <div className="nu-stockTrack" aria-hidden="true">
                      <span style={{ width: `${disabled ? 0 : stockLevel}%` }} />
                    </div>

                    <button
                      className="nu-btn nu-btn--primary"
                      disabled={disabled}
                      onClick={() => handleAddToCart(p)}
                    >
                      {disabled ? 'No disponible' : 'Agregar al pedido'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {previewProduct && (
          <div
            className="nu-previewOverlay"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto de ${previewProduct.nombre}`}
            onClick={closePreview}
          >
            <section className="nu-previewCard" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="nu-previewClose"
                onClick={closePreview}
                aria-label="Cerrar vista de producto"
              >
                Cerrar
              </button>

              <div className="nu-previewInfo">
                <div className="nu-sku">{previewProduct.sku}</div>
                <h3>{previewProduct.nombre}</h3>
                <p>{previewProduct.marca} - {previewProduct.categoria}</p>
                <strong>{formatCurrency(previewProduct.precio)}</strong>
              </div>

              <div
                className="nu-zoomStage"
                onMouseMove={handleZoomMove}
                onMouseEnter={() => setZoomActive(true)}
                onMouseLeave={() => {
                  setZoomActive(false);
                  setZoomPoint({ x: 50, y: 50 });
                }}
              >
                <img
                  className="nu-zoomImage"
                  alt={previewProduct.nombre}
                  src={previewProduct.imagen || '/favicon.svg'}
                  style={{
                    transform: zoomActive ? 'scale(2.35)' : 'scale(1)',
                    transformOrigin: `${zoomPoint.x}% ${zoomPoint.y}%`
                  }}
                  onError={(event) => {
                    event.currentTarget.src = '/favicon.svg';
                  }}
                />
              </div>

            </section>
          </div>
        )}
      </div>
    </main>
  );
}
