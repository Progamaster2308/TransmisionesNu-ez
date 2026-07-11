import { Link } from 'react-router-dom';

import { useCart } from '../providers/useCart';
import { useFavorites } from '../providers/useFavorites';

import './FavoritesPage.css';

export default function FavoritesPage() {
  const { addToCart } = useCart();
  const { items, clearFavorites, toggleFavorite } = useFavorites();

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
                    <p>{disabled ? 'Agotado' : `Disponible: ${item.stock}`}</p>
                    <div className="favoriteButtons">
                      <button type="button" disabled={disabled} onClick={() => addToCart(item)}>
                        Agregar al pedido
                      </button>
                      <button type="button" onClick={() => toggleFavorite(item)}>
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
