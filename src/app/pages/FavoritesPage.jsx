import { Link } from 'react-router-dom';

import { useCart } from '../providers/useCart';
import { useFavorites } from '../providers/useFavorites';
import { useToast } from '../providers/useToast';

import './FavoritesPage.css';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
}

export default function FavoritesPage() {
  const { items: cartItems, addToCart } = useCart();
  const { items, clearFavorites, toggleFavorite } = useFavorites();
  const { showToast } = useToast();

  const handleAddToCart = (item) => {
    const stock = Number(item.stock ?? 0);
    const current = cartItems.find((cartItem) => cartItem.id === item.id);

    if (stock <= 0) {
      showToast('Producto no disponible.');
      return;
    }

    if (current && Number(current.cantidad || 0) >= stock) {
      showToast('Ya agregaste el máximo disponible.');
      return;
    }

    addToCart(item);
    showToast('Producto agregado al pedido.');
  };

  const handleRemoveFavorite = (item) => {
    toggleFavorite(item);
    showToast('Producto quitado de favoritos.');
  };

  return (
    <main className="favoritesPage">
      <section className="favoritesPanel">
        <div className="favoritesHeader">
          <div>
            <h2>Favoritos</h2>
            <p>Guarda refacciones para revisarlas después o agregarlas a tu pedido.</p>
          </div>
          <div className="favoritesActions">
            <Link to="/catalogo" className="nu-linkBtn">Ver catálogo</Link>
            {items.length > 0 && (
              <button type="button" className="favoritesClear" onClick={clearFavorites}>
                Limpiar favoritos
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="favoritesEmpty">
            <strong>No tienes favoritos guardados.</strong>
            <Link to="/catalogo" className="nu-linkBtn">Explorar catálogo</Link>
          </div>
        ) : (
          <div className="favoritesGrid">
            {items.map((item) => {
              const disabled = (item.stock ?? 0) <= 0;

              return (
                <article key={item.id} className="favoriteCard">
                  <img
                    className="favoriteImg"
                    alt={item.nombre}
                    src={item.imagen || '/favicon.svg'}
                    onError={(event) => {
                      event.currentTarget.src = '/favicon.svg';
                    }}
                  />
                  <div className="favoriteBody">
                    <span>{item.sku}</span>
                    <h3>{item.nombre}</h3>
                    <strong>{formatCurrency(item.precio)}</strong>
                    <p>{disabled ? 'Agotado' : `Disponible: ${item.stock}`}</p>
                    <div className="favoriteButtons">
                      <button type="button" disabled={disabled} onClick={() => handleAddToCart(item)}>
                        Agregar al pedido
                      </button>
                      <button type="button" onClick={() => handleRemoveFavorite(item)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
