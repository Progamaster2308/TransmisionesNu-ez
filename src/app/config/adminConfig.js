export const ADMIN_EMAIL = 'transmisionesnunezz@gmail.com';

export function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL;
}
