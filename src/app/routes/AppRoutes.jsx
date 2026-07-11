
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage.jsx';
import AdminPanelPage from '../pages/AdminPanelPage.jsx';
import AdminLoginPage from '../pages/AdminLoginPage.jsx';
import CatalogPage from '../pages/CatalogPage.jsx';
import CartPage from '../pages/CartPage.jsx';
import CheckoutPage from '../pages/CheckoutPage.jsx';
import FavoritesPage from '../pages/FavoritesPage.jsx';
import UserAppointmentsPage from '../pages/UserAppointmentsPage.jsx';
import AdminAppointmentsPage from '../pages/AdminAppointmentsPage.jsx';
import AdminOrdersPage from '../pages/AdminOrdersPage.jsx';
import ChatBotPage from '../pages/ChatBotPage.jsx';
import { useAuth } from '../providers/useAuth';

function RequireAdmin({ children }) {
  const location = useLocation();
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto', color: '#475569', fontWeight: 900 }}>
        Cargando sesion...
      </main>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/inicio" element={<WelcomePage />} />

      <Route path="/catalogo" element={<CatalogPage />} />
      <Route path="/market" element={<CatalogPage />} />
      <Route path="/favoritos" element={<FavoritesPage />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />

      <Route path="/citas" element={<UserAppointmentsPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/citas" element={<RequireAdmin><AdminAppointmentsPage /></RequireAdmin>} />
      <Route path="/admin/ordenes" element={<RequireAdmin><AdminOrdersPage /></RequireAdmin>} />

      <Route path="/admin" element={<RequireAdmin><AdminPanelPage /></RequireAdmin>} />

      <Route path="/chat" element={<ChatBotPage />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

