import { ADMIN_EMAIL } from '../config/adminConfig';

async function sendWithFormSubmit(email) {
  if (typeof fetch !== 'function') return false;

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
    })
  });

  return response.ok;
}

function buildFallbackBody(fields) {
  return Object.entries(fields)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n\n');
}

function getSafeRecipient(email) {
  const value = String(email ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
}

function getOrderStatusCopy(status) {
  const copies = {
    confirmed: {
      label: 'confirmado',
      message: 'Tu pedido fue confirmado por nuestro equipo. Revisaremos disponibilidad y daremos seguimiento a tu solicitud.'
    },
    ready: {
      label: 'aprobado / listo',
      message: 'Tu pedido fue aprobado y marcado como listo. Puedes contactarnos para coordinar el siguiente paso.'
    },
    returned: {
      label: 'devuelto',
      message: 'Tu pedido fue marcado como devuelto. Si tienes dudas, responde este correo para revisar alternativas o ajustes.'
    },
    cancelled: {
      label: 'cancelado',
      message: 'Tu pedido fue cancelado. Si necesitas una revisión adicional o generar una nueva solicitud, estamos para apoyarte.'
    }
  };

  return copies[status] || {
    label: status || 'actualizado',
    message: 'Tu pedido recibió una actualización por parte de nuestro equipo.'
  };
}

function buildOrderEmail(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const detail = items
    .map((item) => `${item.cantidad} x ${item.sku} - ${item.nombre}`)
    .join('\n');

  const fields = {
    Empresa: 'Transmisiones Núñez',
    Aviso: 'Nueva orden de consulta',
    Folio: order.id,
    Cliente: order.customer_name,
    'Correo del cliente': order.customer_email,
    'Fecha solicitada': order.pickup_date,
    Estado: order.status || 'pending',
    Notas: order.notas || 'Sin notas',
    'Detalle del pedido': detail || 'Sin productos',
    'Acción sugerida': 'Revisar disponibilidad y contactar al cliente desde el panel administrativo.'
  };

  return {
    subject: `Transmisiones Núñez | Nueva orden ${order.id}`,
    body: buildFallbackBody(fields),
    fields
  };
}

function buildAppointmentEmail(appointment) {
  const fields = {
    Empresa: 'Transmisiones Núñez',
    Aviso: 'Nueva cita de servicio',
    Folio: appointment.id,
    Cliente: appointment.customer_name,
    'Correo del cliente': appointment.customer_email,
    Celular: appointment.phone,
    Vehículo: `${appointment.car} ${appointment.model} ${appointment.year}`,
    Servicio: appointment.servicio,
    Fecha: appointment.fecha,
    Hora: appointment.hora,
    Estado: appointment.status || 'scheduled',
    'Descripción de la falla': appointment.problem_description || 'Sin descripción',
    'Acción sugerida': 'Confirmar horario y preparar diagnóstico en el panel administrativo.'
  };

  return {
    subject: `Transmisiones Núñez | Nueva cita ${appointment.fecha} ${appointment.hora}`,
    body: buildFallbackBody(fields),
    fields
  };
}

function buildCustomerOrderStatusEmail(order) {
  const statusCopy = getOrderStatusCopy(order.status);
  const items = Array.isArray(order.items) ? order.items : [];
  const detail = items
    .map((item) => `- ${item.cantidad} x ${item.sku} - ${item.nombre}`)
    .join('\n');

  const body = [
    `Hola ${order.customer_name || 'cliente'},`,
    '',
    `Te contactamos de Transmisiones Núñez para notificarte que tu pedido ${order.id} fue ${statusCopy.label}.`,
    '',
    statusCopy.message,
    '',
    'Detalle del pedido:',
    detail || '- Sin productos registrados',
    '',
    order.pickup_date ? `Fecha solicitada: ${order.pickup_date}` : '',
    order.notas ? `Notas registradas: ${order.notas}` : '',
    '',
    `Para cualquier duda puedes responder a este correo o escribirnos a ${ADMIN_EMAIL}.`,
    '',
    'Atentamente,',
    'Transmisiones Núñez'
  ].filter(Boolean).join('\n');

  return {
    recipient: getSafeRecipient(order.customer_email),
    subject: `Transmisiones Núñez | Pedido ${statusCopy.label}`,
    body
  };
}

function openAdminMail(email) {
  if (typeof window !== 'undefined') {
    const mailto = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.location.href = mailto;
  }
}

function openCustomerMail(email) {
  if (typeof window !== 'undefined') {
    const recipient = getSafeRecipient(email.recipient);
    if (!recipient) return false;

    const params = new URLSearchParams({
      cc: ADMIN_EMAIL,
      subject: email.subject,
      body: email.body
    });
    const link = document.createElement('a');
    link.href = `mailto:${recipient}?${params.toString()}`;
    link.rel = 'noreferrer';
    link.click();
    return true;
  }

  return false;
}

async function notifyAdmin(email) {
  try {
    const sent = await sendWithFormSubmit(email);
    if (sent) return { ok: true, message: 'Correo enviado al admin.' };
  } catch (error) {
    console.error(error);
  }

  openAdminMail(email);
  return { ok: true, message: 'Correo preparado para el admin.' };
}

export async function requestAdminEmailNotification(order) {
  if (!order?.id) throw new Error('Orden no encontrada');

  return notifyAdmin(buildOrderEmail(order));
}

export async function requestAppointmentEmailNotification(appointment) {
  if (!appointment?.id) throw new Error('Cita no encontrada');

  return notifyAdmin(buildAppointmentEmail(appointment));
}

export function requestCustomerOrderStatusNotification(order) {
  if (!order?.id) throw new Error('Orden no encontrada');

  const opened = openCustomerMail(buildCustomerOrderStatusEmail(order));
  return {
    ok: opened,
    message: opened
      ? 'Correo preparado para notificar al cliente.'
      : 'El pedido se actualizó, pero el correo del cliente no es válido.'
  };
}
