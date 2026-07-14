import { ADMIN_EMAIL } from '../config/adminConfig';

const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
}

async function sendWithWeb3Forms(email) {
  if (!WEB3FORMS_ACCESS_KEY || typeof fetch !== 'function') return false;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), 12000) : null;

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: email.subject,
        from_name: 'Transmisiones Nunez',
        email: email.replyTo || ADMIN_EMAIL,
        replyto: email.replyTo || ADMIN_EMAIL,
        message: email.body,
        tipo: email.type,
        folio: email.fields?.Folio || '',
        cliente: email.fields?.Cliente || '',
        email_cliente: email.replyTo || ''
      }),
      signal: controller?.signal
    });

    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return data?.success === true;
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    if (timeout) globalThis.clearTimeout(timeout);
  }
}

async function sendWithFormSubmit(email) {
  if (typeof fetch !== 'function') return false;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), 8000) : null;

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        _subject: email.subject,
        _template: 'box',
        _captcha: 'false',
        ...email.fields
      }),
      signal: controller?.signal
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    if (timeout) globalThis.clearTimeout(timeout);
  }
}

function appendHiddenInput(form, name, value) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = String(value ?? '');
  form.appendChild(input);
}

async function sendWithClassicFormSubmit(email) {
  if (typeof document === 'undefined') return false;

  return new Promise((resolve) => {
    const iframeName = `formsubmit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://formsubmit.co/${ADMIN_EMAIL}`;
    form.target = iframeName;
    form.style.display = 'none';

    appendHiddenInput(form, '_subject', email.subject);
    appendHiddenInput(form, '_template', 'box');
    appendHiddenInput(form, '_captcha', 'false');
    appendHiddenInput(form, '_replyto', email.replyTo || ADMIN_EMAIL);
    appendHiddenInput(form, '_name', 'Transmisiones Nunez');
    Object.entries(email.fields || {}).forEach(([name, value]) => appendHiddenInput(form, name, value));

    let resolved = false;
    const finish = (ok) => {
      if (resolved) return;
      resolved = true;
      resolve(ok);
    };

    iframe.addEventListener('load', () => finish(true), { once: true });
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();

    globalThis.setTimeout(() => finish(true), 3500);
    globalThis.setTimeout(() => {
      form.remove();
      iframe.remove();
    }, 130000);
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function notifyAdmin(email) {
  const retryDelays = [0, 1200, 2500];

  for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt]) await wait(retryDelays[attempt]);

    try {
      const sentByWeb3Forms = await sendWithWeb3Forms(email);
      if (sentByWeb3Forms) return { ok: true, message: 'Correo enviado al admin.' };

      const sentByClassicForm = await sendWithClassicFormSubmit(email);
      if (sentByClassicForm) return { ok: true, message: 'Correo enviado al admin.' };

      const sent = await sendWithFormSubmit(email);
      if (sent) return { ok: true, message: 'Correo enviado al admin.' };
    } catch (error) {
      console.error(error);
    }
  }

  throw new Error('No se pudo enviar el correo al admin despues de varios intentos.');
}

function buildFallbackBody(fields) {
  return Object.entries(fields)
    .map(([label, value]) => `${label}: ${String(value ?? '')}`)
    .join('\n\n');
}

function buildOrderDetail(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const lineTotal = Number(item.precioLinea || 0);
      const price = lineTotal ? ` - ${formatCurrency(lineTotal)}` : '';
      return `${item.cantidad} x ${item.sku} - ${item.nombre}${price}`;
    })
    .join('\n');
}

function buildOrderEmail(order) {
  const detail = buildOrderDetail(order.items);

  const fields = {
    Empresa: 'Transmisiones Nunez',
    Origen: 'Panel web de catalogo, pedidos y citas',
    Aviso: 'Nueva orden de consulta',
    Folio: order.id,
    Cliente: order.customer_name,
    'Correo del cliente': order.customer_email,
    Celular: order.customer_phone || 'No registrado',
    Vehiculo: [order.vehicle_make, order.vehicle_model, order.vehicle_year].filter(Boolean).join(' ') || 'No registrado',
    'Fecha solicitada': order.pickup_date,
    Estado: order.status || 'pending',
    'Total estimado': formatCurrency(order.total || 0),
    Notas: order.notas || 'Sin notas',
    'Detalle del pedido': detail || 'Sin productos',
    'Accion sugerida': 'Responder manualmente al cliente desde el correo o celular registrado.'
  };

  return {
    subject: `Transmisiones Nunez | Nueva orden ${order.id}`,
    type: 'pedido',
    body: buildFallbackBody(fields),
    replyTo: order.customer_email,
    fields
  };
}

function buildAppointmentEmail(appointment) {
  const fields = {
    Empresa: 'Transmisiones Nunez',
    Origen: 'Panel web de catalogo, pedidos y citas',
    Aviso: 'Nueva cita de servicio',
    Folio: appointment.id,
    Cliente: appointment.customer_name,
    'Correo del cliente': appointment.customer_email,
    Celular: appointment.phone,
    Vehiculo: `${appointment.car} ${appointment.model} ${appointment.year}`,
    Servicio: appointment.servicio,
    Fecha: appointment.fecha,
    Hora: appointment.hora,
    Estado: appointment.status || 'scheduled',
    'Descripcion de la falla': appointment.problem_description || 'Sin descripcion',
    'Accion sugerida': 'Responder manualmente al cliente para confirmar horario o seguimiento.'
  };

  return {
    subject: `Transmisiones Nunez | Nueva cita ${appointment.fecha} ${appointment.hora}`,
    type: 'cita',
    body: buildFallbackBody(fields),
    replyTo: appointment.customer_email,
    fields
  };
}

export async function requestAdminEmailNotification(order) {
  if (!order?.id) throw new Error('Orden no encontrada');

  return notifyAdmin(buildOrderEmail(order));
}

export async function requestAppointmentEmailNotification(appointment) {
  if (!appointment?.id) throw new Error('Cita no encontrada');

  return notifyAdmin(buildAppointmentEmail(appointment));
}
