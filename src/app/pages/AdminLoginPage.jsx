import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../providers/useAuth';
import { useToast } from '../providers/useToast';
import { sanitizeEmail } from '../providers/marketplaceStorage';

export default function AdminLoginPage() {
  const { isAdmin, loading, signIn } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname ?? '/admin';

  if (!loading && isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const safeEmail = sanitizeEmail(email);

    if (!safeEmail || password.length < 6) {
      showToast('Ingresa credenciales validas.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(safeEmail, password);
      showToast('Sesion admin iniciada.');
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error(error);
      showToast(error?.message ? `Error: ${error.message}` : 'No se pudo iniciar sesion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ width: 'min(520px, calc(100% - 32px))', margin: '0 auto', padding: '48px 0' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: 16,
          padding: 24,
          border: '1px solid #d9e2ef',
          borderRadius: 8,
          background: '#ffffff',
          boxShadow: '0 18px 42px rgba(15, 23, 42, .08)'
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Admin</h2>
          <p style={{ margin: '6px 0 0', color: '#526173', fontWeight: 700 }}>
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

        <button className="apSubmit" type="submit" disabled={submitting || loading}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
