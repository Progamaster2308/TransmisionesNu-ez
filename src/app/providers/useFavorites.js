import { useContext } from 'react';

import FavoritesContext from './FavoritesProvider.jsx';

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  return context;
}
