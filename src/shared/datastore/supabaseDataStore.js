import { supabase } from '../../app/providers/supabaseClient';
import {
  normalizeMoney,
  safeDateISO,
  sanitizeEmail,
  sanitizeLongMessage,
  sanitizePersonName,
  sanitizePhone,
  sanitizeText,
  sanitizeVehicleText,
  sanitizeVehicleYear
} from '../../app/providers/marketplaceStorage';

const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'];
const ORDER_STATUSES = ['pending', 'confirmed', 'cancelled', 'ready', 'returned'];
const LOCAL_BANNER_KEY = 'astroelectronics_admin_banner';
const LOCAL_REPAIR_PROMO_KEY = 'astroelectronics_repair_promo';
const LOCAL_WORK_SHOWCASE_KEY = 'astroelectronics_work_showcase';

function createClientUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) => {
    const value = Number(char) ^ (Math.random() * 16 >> Number(char) / 4);
    return value.toString(16);
  });
}

const DEFAULT_BANNER = {
  titulo: 'Transmisiones Núñez',
  subtitulo: 'Catálogo disponible para consulta, pedidos y seguimiento directo.',
  descripcion: 'Consulta refacciones, transmisiones y servicios disponibles. Genera una orden y el vendedor recibirá el detalle para atenderte.',
  cta_label: 'Ver disponibles',
  cta_link: '/catalogo',
  imagen: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80',
  splash_image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80',
  enabled: true
};

const DEFAULT_REPAIR_PROMO = {
  titulo: 'Promoción en reparación de transmisiones',
  subtitulo: 'Diagnóstico inicial y revisión preventiva para detectar fallas antes de que escalen.',
  descripcion: 'Agenda una cita y recibe una valoración clara de tu transmisión, cambios, fugas o ruidos.',
  cta_label: 'Agendar diagnóstico',
  cta_link: '/citas',
  imagen: 'https://images.unsplash.com/photo-1632823469850-1b7b1e8b7e1e?auto=format&fit=crop&w=1400&q=80',
  enabled: true
};

const DEFAULT_AVAILABILITY = [
  { weekday: 1, day_label: 'Lunes', slots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'], enabled: true },
  { weekday: 2, day_label: 'Martes', slots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'], enabled: true },
  { weekday: 3, day_label: 'Miércoles', slots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'], enabled: true },
  { weekday: 4, day_label: 'Jueves', slots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00'], enabled: true },
  { weekday: 5, day_label: 'Viernes', slots: ['09:00', '10:00', '11:00', '12:00', '14:00'], enabled: true },
  { weekday: 6, day_label: 'Sábado', slots: ['09:00', '10:00', '11:00'], enabled: false },
  { weekday: 0, day_label: 'Domingo', slots: [], enabled: false }
];

const DEFAULT_WORK_SHOWCASE = [
  {
    slot: 1,
    titulo: 'Reparación de transmisión automática',
    descripcion: 'Diagnóstico, desarme y armado con revisión de piezas internas.',
    imagen: '',
    enabled: true
  },
  {
    slot: 2,
    titulo: 'Venta de refacciones',
    descripcion: 'Refacciones apartadas para entrega y revisión en taller.',
    imagen: '',
    enabled: true
  },
  {
    slot: 3,
    titulo: 'Servicio preventivo',
    descripcion: 'Cambio de aceite, filtro y verificación de funcionamiento.',
    imagen: '',
    enabled: true
  }
];

function unwrapSupabase(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is a development fallback only.
  }
}

function normalizeBannerPayload(banner, fallback) {
  return {
    titulo: sanitizeText(banner.titulo, 120) || fallback.titulo,
    subtitulo: sanitizeText(banner.subtitulo, 180) || fallback.subtitulo,
    descripcion: sanitizeText(banner.descripcion, 320) || fallback.descripcion,
    cta_label: sanitizeText(banner.cta_label, 40) || fallback.cta_label,
    cta_link: sanitizeText(banner.cta_link, 120) || fallback.cta_link,
    imagen: sanitizeText(banner.imagen, 500) || '',
    splash_image: sanitizeText(banner.splash_image, 500) || '',
    enabled: Boolean(banner.enabled ?? true)
  };
}

function normalizeProductPayload(product) {
  return {
    sku: sanitizeText(product.sku, 40),
    nombre: sanitizeText(product.nombre, 120),
    marca: sanitizeText(product.marca, 80),
    categoria: sanitizeText(product.categoria, 80),
    precio: normalizeMoney(product.precio),
    precioOriginal: normalizeMoney(product.precioOriginal),
    descuento: sanitizeText(product.descuento, 40) || null,
    imagen: sanitizeText(product.imagen, 500) || null,
    rating: Math.min(5, Math.max(0, Math.floor(Number(product.rating) || 5))),
    stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
    envioGratis: false
  };
}

function normalizeWorkShowcasePayload(item, index = 0) {
  return {
    slot: Math.max(1, Math.min(3, Math.floor(Number(item.slot ?? index + 1) || index + 1))),
    titulo: sanitizeText(item.titulo, 100),
    descripcion: sanitizeText(item.descripcion, 260),
    imagen: sanitizeText(item.imagen, 2500000) || '',
    enabled: Boolean(item.enabled ?? true)
  };
}

export function getDefaultBanner() {
  return { ...DEFAULT_BANNER };
}

export function getDefaultRepairPromo() {
  return { ...DEFAULT_REPAIR_PROMO };
}

export function getDefaultAvailability() {
  return DEFAULT_AVAILABILITY.map((day) => ({ ...day, slots: [...day.slots] }));
}

export function getDefaultWorkShowcase() {
  return DEFAULT_WORK_SHOWCASE.map((item) => ({ ...item }));
}

export async function listProducts() {
  const result = await supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false });

  return unwrapSupabase(result) ?? [];
}

export async function countProducts() {
  const result = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function createProduct(product) {
  const payload = normalizeProductPayload(product);
  if (!payload.sku || !payload.nombre || !payload.marca || !payload.categoria) {
    throw new Error('Datos de producto inválidos');
  }

  const result = await supabase.from('products').insert(payload).select('*').single();
  return unwrapSupabase(result);
}

export async function updateProduct(productId, product) {
  const payload = normalizeProductPayload(product);
  const result = await supabase.from('products').update(payload).eq('id', productId).select('*').single();
  return unwrapSupabase(result);
}

export async function updateProductStockAndPrice(productId, { stock, precio, precioOriginal }) {
  const payload = {
    stock: Math.max(0, Math.floor(Number(stock) || 0)),
    precio: normalizeMoney(precio),
    precioOriginal: normalizeMoney(precioOriginal)
  };

  const result = await supabase.from('products').update(payload).eq('id', productId).select('*').single();
  return unwrapSupabase(result);
}

export async function deleteProduct(productId) {
  const result = await supabase.from('products').delete().eq('id', productId);
  unwrapSupabase(result);
  return true;
}

export async function getActiveBanner() {
  const localBanner = readLocalJson(LOCAL_BANNER_KEY, DEFAULT_BANNER);

  try {
    const result = await supabase
      .from('admin_banner')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const remoteBanner = unwrapSupabase(result);
    return remoteBanner ? { ...localBanner, ...remoteBanner } : localBanner;
  } catch {
    return localBanner;
  }
}

export async function saveAdminBanner(banner) {
  const payload = normalizeBannerPayload(banner, DEFAULT_BANNER);

  try {
    await supabase.from('admin_banner').update({ enabled: false }).eq('enabled', true);
    const result = await supabase.from('admin_banner').insert(payload).select('*').single();
    const saved = unwrapSupabase(result);
    saveLocalJson(LOCAL_BANNER_KEY, saved ?? payload);
    return saved ?? payload;
  } catch {
    saveLocalJson(LOCAL_BANNER_KEY, payload);
    return payload;
  }
}

export function resetLocalBanner() {
  localStorage.removeItem(LOCAL_BANNER_KEY);
  return getDefaultBanner();
}

export async function getActiveRepairPromo() {
  const localPromo = readLocalJson(LOCAL_REPAIR_PROMO_KEY, DEFAULT_REPAIR_PROMO);

  try {
    const result = await supabase
      .from('repair_promotions')
      .select('*')
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const remotePromo = unwrapSupabase(result);
    return remotePromo ? { ...localPromo, ...remotePromo } : localPromo;
  } catch {
    return localPromo;
  }
}

export async function saveRepairPromo(promo) {
  const payload = normalizeBannerPayload(promo, DEFAULT_REPAIR_PROMO);

  try {
    await supabase.from('repair_promotions').update({ enabled: false }).eq('enabled', true);
    const result = await supabase.from('repair_promotions').insert(payload).select('*').single();
    const saved = unwrapSupabase(result);
    saveLocalJson(LOCAL_REPAIR_PROMO_KEY, saved ?? payload);
    return saved ?? payload;
  } catch {
    saveLocalJson(LOCAL_REPAIR_PROMO_KEY, payload);
    return payload;
  }
}

export function resetLocalRepairPromo() {
  localStorage.removeItem(LOCAL_REPAIR_PROMO_KEY);
  return getDefaultRepairPromo();
}

export async function listWorkShowcase(includeDisabled = false) {
  const localItems = readLocalJson(LOCAL_WORK_SHOWCASE_KEY, getDefaultWorkShowcase());

  try {
    let query = supabase
      .from('work_showcase')
      .select('*')
      .order('slot', { ascending: true })
      .limit(3);

    if (!includeDisabled) query = query.eq('enabled', true);

    const result = await query;

    const remoteItems = unwrapSupabase(result);
    return remoteItems?.length ? remoteItems : localItems;
  } catch {
    return localItems;
  }
}

export async function saveWorkShowcase(items) {
  const payload = (Array.isArray(items) ? items : [])
    .slice(0, 3)
    .map((item, index) => normalizeWorkShowcasePayload(item, index))
    .filter((item) => item.titulo && item.descripcion);

  if (payload.length !== 3) {
    throw new Error('Completa los 3 trabajos con título y descripción');
  }

  saveLocalJson(LOCAL_WORK_SHOWCASE_KEY, payload);

  const result = await supabase
    .from('work_showcase')
    .upsert(payload, { onConflict: 'slot' })
    .select('*');

  if (result.error?.message?.includes('work_showcase') || result.error?.code === 'PGRST205') {
    throw new Error('Falta crear la tabla de trabajos. Ejecuta src/app/work-showcase.sql en Supabase SQL Editor.');
  }

  return unwrapSupabase(result) ?? payload;
}

export async function createOrder(order) {
  const status = ORDER_STATUSES.includes(order.status) ? order.status : 'pending';
  const id = order.id || createClientUuid();
  const payload = {
    id,
    customer_name: sanitizePersonName(order.customer_name, 80),
    customer_email: sanitizeEmail(order.customer_email),
    notas: sanitizeLongMessage(order.notas, 500) || null,
    pickup_date: safeDateISO(order.pickup_date),
    total: normalizeMoney(order.total),
    items: Array.isArray(order.items) ? order.items : [],
    status
  };

  if (!payload.customer_name || !payload.customer_email || !payload.pickup_date) {
    throw new Error('Datos de orden inválidos');
  }

  const result = await supabase.from('orders').insert(payload);
  unwrapSupabase(result);
  return { ...payload, id };
}

export async function getOrder(orderId) {
  const result = await supabase.from('orders').select('*').eq('id', orderId).single();
  return unwrapSupabase(result);
}

export async function listOrders() {
  const result = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  return unwrapSupabase(result) ?? [];
}

export async function listOrdersByMonth(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const result = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  return unwrapSupabase(result) ?? [];
}

export async function updateOrderStatus(orderId, status) {
  if (!ORDER_STATUSES.includes(status)) throw new Error('Estado de pedido inválido');

  const result = await supabase.from('orders').update({ status }).eq('id', orderId).select('*').single();
  return unwrapSupabase(result);
}

export async function listAppointments() {
  const result = await supabase
    .from('appointments')
    .select('*')
    .order('fecha', { ascending: true })
    .order('hora', { ascending: true })
    .limit(500);

  return unwrapSupabase(result) ?? [];
}

export async function listBookedAppointmentsByDate(date) {
  const safeDate = safeDateISO(date);
  if (!safeDate) return [];

  const result = await supabase
    .from('appointments')
    .select('id, fecha, hora, status')
    .eq('fecha', safeDate)
    .in('status', ['scheduled', 'confirmed']);

  return unwrapSupabase(result) ?? [];
}

export async function createAppointment(appointment) {
  const id = appointment.id || createClientUuid();
  const payload = {
    id,
    customer_name: sanitizePersonName(appointment.customer_name, 80),
    customer_email: sanitizeEmail(appointment.customer_email),
    phone: sanitizePhone(appointment.phone),
    car: sanitizeVehicleText(appointment.car, 60),
    model: sanitizeVehicleText(appointment.model, 60),
    year: sanitizeVehicleYear(appointment.year),
    problem_description: sanitizeLongMessage(appointment.problem_description, 700),
    servicio: sanitizeVehicleText(appointment.servicio, 60),
    fecha: safeDateISO(appointment.fecha),
    hora: sanitizeText(appointment.hora, 10),
    status: 'scheduled'
  };

  if (!payload.customer_name || !payload.customer_email || !payload.phone || !payload.car || !payload.model || !payload.year || !payload.problem_description || !payload.servicio || !payload.fecha || !payload.hora) {
    throw new Error('Datos de cita inválidos');
  }

  const result = await supabase.from('appointments').insert(payload);
  unwrapSupabase(result);
  return { ...payload, id };
}

export async function updateAppointmentStatus(appointmentId, status) {
  if (!APPOINTMENT_STATUSES.includes(status)) {
    throw new Error('Estado de cita inválido');
  }

  const result = await supabase.from('appointments').update({ status }).eq('id', appointmentId).select('*').single();
  return unwrapSupabase(result);
}

export async function listAppointmentAvailability() {
  try {
    const result = await supabase
      .from('appointment_availability')
      .select('*')
      .order('weekday', { ascending: true });

    const remote = unwrapSupabase(result);
    return remote?.length ? remote : getDefaultAvailability();
  } catch {
    return getDefaultAvailability();
  }
}

export async function saveAppointmentAvailability(days) {
  const payload = days.map((day) => ({
    weekday: Math.max(0, Math.min(6, Math.floor(Number(day.weekday) || 0))),
    day_label: sanitizeText(day.day_label, 30),
    slots: Array.isArray(day.slots)
      ? day.slots.map((slot) => sanitizeText(slot, 10)).filter(Boolean)
      : String(day.slots ?? '').split(',').map((slot) => sanitizeText(slot, 10)).filter(Boolean),
    enabled: Boolean(day.enabled)
  }));

  const result = await supabase
    .from('appointment_availability')
    .upsert(payload, { onConflict: 'weekday' })
    .select('*');

  return unwrapSupabase(result) ?? payload;
}
