import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listProducts } from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';

import './ChatBotPage.css';

function normalize(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function buildBotAnswer(message, products) {
  const text = normalize(message);

  if (text.includes('mi pedido') || text.includes('estado pedido')) {
    return 'Por seguridad, el estado real del pedido se revisa desde el panel admin o con una verificación privada por correo/teléfono. Si tu pedido fue devuelto, el equipo te lo confirmará por el canal de atención.';
  }

  if (text.includes('devuelto') || text.includes('devolucion') || text.includes('cancelado')) {
    return 'Si tu pedido aparece como devuelto o cancelado, el admin lo marcó así por disponibilidad, datos incompletos o revisión interna. Puedes generar otro pedido o contactar por citas para seguimiento.';
  }

  if (text.includes('cita') || text.includes('agenda') || text.includes('reparacion') || text.includes('falla')) {
    return 'Para revisar una falla puedes ir a Citas, elegir un día y hora disponibles, y registrar auto, modelo, año, celular y descripción de la falla.';
  }

  const terms = text.split(/\s+/).filter((term) => term.length >= 3);
  const matches = products.filter((product) => {
    const haystack = normalize(`${product.nombre} ${product.marca} ${product.categoria} ${product.sku}`);
    return terms.some((term) => haystack.includes(term));
  }).slice(0, 4);

  if (matches.length > 0) {
    return `Encontré ${matches.length} posible(s) refacción(es): ${matches.map((item) => `${item.nombre} (${item.sku}) - stock ${item.stock ?? 0}`).join('; ')}. Puedes buscarlas directamente en Catálogo.`;
  }

  if (text.includes('hola') || text.includes('ayuda')) {
    return 'Puedo ayudarte a buscar refacciones del catálogo, explicar cómo generar un pedido o decirte cómo agendar una cita.';
  }

  return 'No encontré una coincidencia exacta. Intenta escribir marca, SKU, nombre de la pieza o el síntoma de la falla.';
}

export default function ChatBotPage() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hola, puedo ayudarte a buscar refacciones, entender pedidos o agendar una cita.' }
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
          Busca dentro del catálogo, resuelve dudas de pedidos y guía al usuario hacia citas.
          {productCount > 0 ? ` Catálogo cargado: ${productCount} productos.` : ' Configura Supabase para cargar productos reales.'}
        </p>

        <div className="chatQuickLinks">
          <Link to="/catalogo">Ver catálogo</Link>
          <Link to="/citas">Agendar cita</Link>
          <Link to="/carrito">Ver pedido</Link>
        </div>

        <div className="chatBox" aria-label="Conversación">
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={`bubble bubble--${item.role === 'bot' ? 'bot' : 'user'}`}>
              {item.text}
            </div>
          ))}
        </div>

        <form className="chatComposer" onSubmit={sendMessage}>
          <input
            className="chatInput"
            placeholder="Ej. busco filtro, transmisión, aceite, o mi pedido fue devuelto..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <button className="chatSend" type="submit">Enviar</button>
        </form>
      </div>
    </main>
  );
}
