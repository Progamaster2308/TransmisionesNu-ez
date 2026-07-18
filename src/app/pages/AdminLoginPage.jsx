import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../providers/useAuth';
import { useToast } from '../providers/useToast';
import { sanitizeEmail } from '../providers/marketplaceStorage';
import {
  formatLockTime,
  getAdminLoginLock,
  registerAdminLoginFailure,
  resetAdminLoginLock
} from '../providers/adminLoginSecurity';

export default function AdminLoginPage() {
  const { isAdmin, loading, signIn } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lock, setLock] = useState(() => getAdminLoginLock());

  const redirectTo = location.state?.from?.pathname ?? '/admin';

  if (!loading && isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const currentLock = getAdminLoginLock();

    if (currentLock.locked) {
      setLock(currentLock);
      showToast(`Demasiados intentos. Espera ${formatLockTime(currentLock.remainingMs)}.`);
      return;
    }

    const safeEmail = sanitizeEmail(email);

    if (!safeEmail || password.length < 6 || password.length > 128) {
      showToast('Ingresa credenciales validas.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(safeEmail, password);
      resetAdminLoginLock();
      setLock(getAdminLoginLock());
      showToast('Sesion admin iniciada.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      const nextLock = registerAdminLoginFailure();
      setLock(nextLock);
      showToast(nextLock.locked
        ? `Demasiados intentos. Espera ${formatLockTime(nextLock.remainingMs)}.`
        : `No se pudo iniciar sesion. Intentos restantes: ${nextLock.remainingAttempts}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="adminLoginPage">
      <form className="adminLoginPanel" onSubmit={handleSubmit}>
        <div>
          <h2>Admin</h2>
          <p>
            Inicia sesion con tu usuario de Supabase.
          </p>
        </div>

        <div className="field">
          <label>Correo admin</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@ejemplo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 6 caracteres"
            autoComplete="current-password"
            required
            minLength={6}
          />
        </div>

        <button className="apSubmit" type="submit" disabled={submitting || loading || lock.locked}>
          {lock.locked ? `Espera ${formatLockTime(lock.remainingMs)}` : submitting ? 'Entrando...' : 'Entrar'}
        </button>

        {lock.locked && (
          <p className="adminLoginWarning">
            Acceso pausado por seguridad. Intenta nuevamente en {formatLockTime(lock.remainingMs)}.
          </p>
        )}
      </form>
    </main>
  );
}
