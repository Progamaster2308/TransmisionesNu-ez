import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useCart } from '../providers/useCart';
import { useAuth } from '../providers/useAuth';
import { useFavorites } from '../providers/useFavorites';

import './AppShell.css';

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const { count: favoriteCount } = useFavorites();
  const { isAuthenticated, signOut } = useAuth();

  const vistaActual = location.pathname.startsWith('/admin') ? 'admin' : 'tienda';
  const cartItems = items.reduce((acc, it) => acc + it.cantidad, 0);

  const handleToggleAdminMode = async () => {
    if (location.pathname.startsWith('/admin')) {
      if (isAuthenticated) await signOut();
      navigate('/');
      return;
    }

    navigate('/admin');
  };

  return (
    <div className="app-container">
      <header className="nu-shellHeader">
        <nav className="nu-shellNav">
          <Link to="/" className="nu-brand">
            <span className="nu-brandMark"><img src="/tnlogo.png" alt="" aria-hidden="true" /></span>
            <span className="nu-brandText">Transmisiones Núñez</span>
          </Link>

          <div className="nu-navLinks">
            <Link to="/catalogo" className="nu-navLink">
              Catálogo
            </Link>
            <Link to="/citas" className="nu-navLink">
              Soporte
            </Link>
            <Link to="/chat" className="nu-navLink">
              Chat
            </Link>
            <Link to="/favoritos" className="nu-navLink">
              Favoritos ({favoriteCount})
            </Link>
            <Link to="/carrito" className="nu-cartLink">
              Pedido ({cartItems})
            </Link>
            <button
              type="button"
              onClick={handleToggleAdminMode}
              className="nu-adminBtn"
            >
              {vistaActual === 'admin' ? 'Salir admin' : 'Admin'}
            </button>
          </div>
        </nav>
      </header>

      <div className="main-viewport">
        {children}
      </div>
    </div>
  );
}
