export const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

export function isAdminEmail(email) {
  return Boolean(ADMIN_EMAIL) && String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}
