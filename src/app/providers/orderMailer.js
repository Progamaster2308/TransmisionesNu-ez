function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
}

function encodeFormData(values) {
  const data = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    data.append(key, String(value ?? ''));
  });
  return data.toString();
}

async function sendWithNetlifyForms(email) {
  if (typeof fetch !== 'function') return false;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? globalThis.setTimeout(() => controller.abort(), 12000) : null;

  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: encodeFormData({
        'form-name': 'tn-admin-notifications',
        subject: email.subject,
        reply_to: email.replyTo || '',
        message: email.body,
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
      const sent = await sendWithNetlifyForms(email);
      if (sent) return { ok: true, message: 'Notificacion guardada en Netlify Forms.' };
    } catch (error) {
      console.error(error);
    }
  }

  throw new Error('No se pudo guardar la notificacion en Netlify Forms despues de varios intentos.');
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
