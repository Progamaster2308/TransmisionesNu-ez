import { createContext, useCallback, useMemo, useState } from 'react';

const FAVORITES_KEY = 'tn:favorites';
const FavoritesContext = createContext(null);

function readInitialFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistFavorites(next) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // Storage can fail in private browsing; favorites still work for this session.
  }
}

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState(readInitialFavorites);

  const isFavorite = useCallback(
    (productId) => items.some((item) => item.id === productId),
    [items]
  );

  const toggleFavorite = useCallback((product) => {
    if (!product?.id) return;

    setItems((current) => {
      const exists = current.some((item) => item.id === product.id);
      const next = exists
        ? current.filter((item) => item.id !== product.id)
        : [...current, product];
      persistFavorites(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setItems([]);
    persistFavorites([]);
  }, []);

  const value = useMemo(
    () => ({ items, count: items.length, isFavorite, toggleFavorite, clearFavorites }),
    [items, isFavorite, toggleFavorite, clearFavorites]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export default FavoritesContext;
