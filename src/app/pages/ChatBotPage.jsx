import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listProducts } from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';

import './ChatBotPage.css';

function normalize(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
}

function buildBotAnswer(message, products) {
  const text = normalize(message);

  if (includesAny(text, ['hola', 'buenas', 'buen dia', 'ayuda', 'que puedes hacer', 'informacion'])) {
    return 'Hola. Puedo ayudarte con busqueda de refacciones por nombre, marca, categoria o SKU; explicar como armar un pedido; orientar sobre citas de diagnostico; y resolver dudas generales de disponibilidad, precios, ubicacion, entregas y seguimiento.';
  }

  if (includesAny(text, ['horario', 'abren', 'cierran', 'hora de atencion', 'atencion'])) {
    return 'Los horarios disponibles para servicio se muestran al agendar cita. Entra a Agendar cita, elige el dia y revisa las horas habilitadas antes de registrar tus datos.';
  }

  if (includesAny(text, ['ubicacion', 'direccion', 'donde estan', 'donde queda', 'maps', 'mapa', 'llegar'])) {
    return 'Puedes abrir la ubicacion desde la seccion del inicio o usar el boton de Google Maps. Si vas por refacciones, lo mejor es generar el pedido antes para que el equipo revise disponibilidad.';
  }

  if (includesAny(text, ['envio', 'domicilio', 'entrega', 'mandan', 'paqueteria'])) {
    return 'Por ahora el catalogo sirve para apartar o consultar refacciones. No se manejan entregas a domicilio desde la pagina; la compra y entrega se revisan directamente en el taller.';
  }

  if (includesAny(text, ['pago', 'pagar', 'anticipo', 'factura', 'transferencia', 'tarjeta', 'efectivo'])) {
    return 'La pagina genera el pedido para revision, pero el pago, anticipo o factura se confirman directamente con el taller. Si necesitas factura o metodo de pago especifico, agregalo al seguimiento del pedido.';
  }

  if (includesAny(text, ['garantia', 'garantias', 'cambio', 'cambiar pieza', 'pieza mala', 'defecto'])) {
    return 'La garantia o cambio depende de la pieza, condicion y revision del taller. Conserva el detalle del pedido y consulta con el equipo para validar si aplica cambio, revision o seguimiento.';
  }

  if (includesAny(text, ['mi pedido', 'estado pedido', 'seguimiento', 'orden', 'estatus', 'confirmado', 'pendiente'])) {
    return 'Por seguridad, el estado real del pedido se confirma con el taller o desde el panel admin. Si ya generaste un pedido, revisa que tus datos esten correctos y espera la confirmacion del vendedor.';
  }

  if (includesAny(text, ['devuelto', 'devolucion', 'cancelado', 'rechazado', 'sin stock', 'no disponible'])) {
    return 'Si tu pedido aparece devuelto, cancelado o sin disponibilidad, puede deberse a stock, datos incompletos o revision interna. Puedes buscar una pieza alternativa en catalogo o generar otro pedido con datos completos.';
  }

  if (includesAny(text, ['comprar', 'pedido', 'carrito', 'apartado', 'agregar', 'cotizar', 'cotizacion'])) {
    return 'Para generar un pedido: entra al catalogo, busca la refaccion, presiona Agregar al pedido, revisa el carrito y completa tus datos. El pedido queda como solicitud para que el vendedor confirme disponibilidad y seguimiento.';
  }

  if (includesAny(text, ['cita', 'agenda', 'agendar', 'reparacion', 'diagnostico', 'falla', 'ruido', 'fuga', 'patina', 'golpea', 'cambio', 'transmision'])) {
    return 'Para revisar una falla, agenda una cita con servicio, fecha y hora disponibles. Agrega auto, modelo, ano, celular y una descripcion clara: ruido, fuga, jaloneo, golpe al cambiar, patinaje o testigo encendido.';
  }

  if (includesAny(text, ['precio', 'cuesta', 'costo', 'vale', 'stock', 'disponible', 'existencia'])) {
    return 'Puedo revisar coincidencias del catalogo si escribes nombre, marca, categoria o SKU. El precio y stock visibles son una referencia de catalogo; el taller confirma disponibilidad final al revisar tu pedido.';
  }

  const stopWords = new Set(['busco', 'buscar', 'quiero', 'necesito', 'tienen', 'tendra', 'para', 'una', 'uno', 'del', 'los', 'las', 'con', 'que', 'hay', 'me']);
  const terms = text
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9-]/g, ''))
    .filter((term) => term.length >= 3 && !stopWords.has(term));
  const matches = products.filter((product) => {
    const haystack = normalize(`${product.nombre} ${product.marca} ${product.categoria} ${product.sku}`);
    return terms.some((term) => haystack.includes(term));
  }).slice(0, 4);

  if (matches.length > 0) {
    return `Encontre ${matches.length} posible(s) refaccion(es): ${matches.map((item) => `${item.nombre} (${item.sku}) - ${formatCurrency(item.precio)} - stock ${item.stock ?? 0}`).join('; ')}. Puedes buscarlas en Catalogo y agregarlas al pedido para confirmacion.`;
  }

  if (terms.length > 0) {
    const categories = [...new Set(products.map((product) => product.categoria).filter(Boolean))].slice(0, 5);
    return `No encontre una coincidencia exacta con "${message}". Prueba con SKU, marca, nombre de pieza o categoria${categories.length ? ` como: ${categories.join(', ')}` : ''}. Si es una falla del vehiculo, describe el sintoma y te oriento hacia cita.`;
  }

  return 'Puedo ayudarte si escribes algo como: busco reten, precio de filtro, quiero agendar diagnostico, mi pedido fue devuelto, donde estan ubicados o como genero un pedido.';
}

export default function ChatBotPage() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hola. Puedo buscar refacciones, explicar pedidos, orientar sobre citas y responder dudas de ubicacion, entregas o disponibilidad.' }
  ]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await listProducts();
        if (mounted) setProducts(data);
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const productCount = useMemo(() => products.length, [products]);

  const sendMessage = (event) => {
    event.preventDefault();
    const safeMessage = sanitizeText(message, 220);
    if (!safeMessage) return;

    setMessages((current) => [...current, { role: 'user', text: safeMessage }]);
    setMessage('');
    const answer = buildBotAnswer(safeMessage, products);
    setMessages((current) => [...current, { role: 'bot', text: answer }]);
  };

  return (
    <main className="chatWrap">
      <div className="chatPanel">
        <h2>Asistente de refacciones</h2>
        <p className="chatSub">
          Busca dentro del catalogo, resuelve dudas de pedidos y guia al usuario hacia citas.
          {productCount > 0 ? ` Catalogo cargado: ${productCount} productos.` : ' Configura Supabase para cargar productos reales.'}
        </p>

        <div className="chatQuickLinks">
          <Link to="/catalogo">Ver catalogo</Link>
          <Link to="/citas">Agendar cita</Link>
          <Link to="/carrito">Ver pedido</Link>
        </div>

        <div className="chatBox" aria-label="Conversacion">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`bubble bubble--${item.role === 'bot' ? 'bot' : 'user'}`}>
              {item.text}
            </div>
          ))}
        </div>

        <form className="chatComposer" onSubmit={sendMessage}>
          <input
            className="chatInput"
            placeholder="Ej. busco filtro, precio de reten, quiero cita, ubicacion o mi pedido fue devuelto..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button className="chatSend" type="submit">Enviar</button>
        </form>
      </div>
    </main>
  );
}
