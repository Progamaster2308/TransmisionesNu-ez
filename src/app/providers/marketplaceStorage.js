// Capa de abstracción para Supabase (solo ejemplo / se conectará al UI)

export function normalizeMoney(n) {
  const value = Number(n);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function sanitizeText(v, maxLen = 120) {
  const s = String(v ?? '').replaceAll(String.fromCharCode(0), '').trim();
  return s.slice(0, maxLen);
}

export function sanitizeEmail(v, maxLen = 160) {
  const s = sanitizeText(v, maxLen).toLowerCase();
  // Validación básica cliente
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return '';
  return s;
}

export function safeDateISO(v) {
  // Esperamos YYYY-MM-DD
  const s = String(v ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  return s;
}

