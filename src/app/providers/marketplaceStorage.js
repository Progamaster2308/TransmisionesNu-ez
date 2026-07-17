export function normalizeMoney(n) {
  const value = Number(n);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function sanitizeText(v, maxLen = 120) {
  const s = String(v ?? '')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return s.slice(0, maxLen);
}

export function sanitizeEmail(v, maxLen = 160) {
  const s = sanitizeText(v, maxLen).toLowerCase().replace(/\s+/g, '');
  if (!/^[a-z0-9._%+-]+@(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(s)) return '';
  return s;
}

export function sanitizeInternalPath(v, fallback = '/') {
  const s = sanitizeText(v, 120);
  if (!s.startsWith('/')) return fallback;
  if (s.startsWith('//')) return fallback;
  if (/[<>"'\\]/.test(s)) return fallback;
  if (!/^\/[a-z0-9/_-]*(?:\?[a-z0-9=&._-]*)?$/i.test(s)) return fallback;
  return s;
}

export function sanitizeUrl(v, maxLen = 500) {
  const s = sanitizeText(v, maxLen);
  if (!s) return '';
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(s)) return s;

  try {
    const url = new URL(s);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.toString().slice(0, maxLen);
  } catch {
    return '';
  }
}

export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addYearsISO(years = 1) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

export function safeDateISO(v, { min = getTodayISO(), max = addYearsISO(1) } = {}) {
  const s = String(v ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const date = new Date(`${s}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  if (date.toISOString().slice(0, 10) !== s) return '';
  if (min && s < min) return '';
  if (max && s > max) return '';
  return s;
}

export function sanitizePersonName(v, maxLen = 80) {
  const s = sanitizeText(v, maxLen).replace(/\s+/g, ' ');
  if (!/^[a-zA-ZÀ-ÿÑñ]+(?:[ '-][a-zA-ZÀ-ÿÑñ]+)*$/.test(s)) return '';
  return s;
}

export function sanitizePhone(v) {
  const s = String(v ?? '').replace(/\D/g, '').slice(0, 10);
  return /^\d{10}$/.test(s) ? s : '';
}

export function sanitizeVehicleText(v, maxLen = 60) {
  const s = sanitizeText(v, maxLen).replace(/\s+/g, ' ');
  if (!/^[a-zA-Z0-9À-ÿÑñ][a-zA-Z0-9À-ÿÑñ .-]*$/.test(s)) return '';
  return s;
}

export function sanitizeVehicleYear(v) {
  const year = Math.floor(Number(v) || 0);
  const max = new Date().getFullYear() + 1;
  return year >= 1950 && year <= max ? year : 0;
}

export function sanitizeLongMessage(v, maxLen = 700) {
  const s = sanitizeText(v, maxLen).replace(/\s+/g, ' ');
  if (!/^[a-zA-Z0-9À-ÿÑñ .,;:()/#-]+$/.test(s)) return '';
  return s;
}
