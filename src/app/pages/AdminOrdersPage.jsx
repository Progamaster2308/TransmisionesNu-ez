import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listOrders, listOrdersByMonth, updateOrderStatus } from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';
import { useToast } from '../providers/useToast';

import './AdminOrdersPage.css';

function escapePdfText(value) {
  return String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '');
}

function buildSimplePdf(title, rows) {
  const lines = [
    title,
    `Generado: ${new Date().toLocaleString()}`,
    '',
    'Pedido | Fecha | Dia | Hora | Usuario | Estado | Total',
    ...rows.map((order) => {
      const date = new Date(order.created_at);
      return [
        String(order.id).slice(0, 8),
        date.toLocaleDateString(),
        date.toLocaleDateString('es-MX', { weekday: 'long' }),
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        order.customer_name,
        order.status,
        `$${Number(order.total || 0).toLocaleString()}`
      ].join(' | ');
    })
  ];

  const content = [
    'BT',
    '/F1 10 Tf',
    '40 790 Td',
    ...lines.flatMap((line, index) => [
      index === 0 ? '/F1 16 Tf' : '/F1 9 Tf',
      `(${escapePdfText(line).slice(0, 150)}) Tj`,
      '0 -18 Td'
    ]),
    'ET'
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const data = await listOrders();
        if (mounted) setOrders(data);
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return orders;

    return orders.filter((order) => (
      order.customer_name?.toLowerCase().includes(q) ||
      order.customer_email?.toLowerCase().includes(q) ||
      order.status?.toLowerCase().includes(q) ||
      order.id?.toLowerCase().includes(q)
    ));
  }, [orders, query]);

  const setStatus = async (order, status) => {
    const orderId = order.id;
    setUpdatingOrderId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
      showToast('Pedido actualizado. Contacta al cliente manualmente con los datos registrados.');
    } catch (error) {
      console.error(error);
      showToast(error?.message ? `No se pudo actualizar el pedido: ${error.message}` : 'No se pudo actualizar el pedido');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const generateMonthlyReport = async () => {
    const [year, month] = reportMonth.split('-').map(Number);
    if (!year || !month) {
      showToast('Selecciona un mes válido');
      return;
    }

    setReporting(true);
    try {
      const data = await listOrdersByMonth(year, month - 1);
      const blob = buildSimplePdf(`Reporte de pedidos ${reportMonth}`, data);
      downloadBlob(blob, `reporte-pedidos-${reportMonth}.pdf`);
      showToast('Reporte PDF generado');
    } catch (error) {
      console.error(error);
      showToast('No se pudo generar el reporte');
    } finally {
      setReporting(false);
    }
  };

  return (
    <main className="adminOrdersPage">
      <section className="adminOrdersPanel">
        <div className="adminOrdersHeader">
          <div>
            <p>Panel administrativo</p>
            <h1>Pedidos recibidos</h1>
            <Link className="adminOrdersBack" to="/admin">Volver al admin</Link>
          </div>
          <div className="adminOrdersTools">
            <input
              value={query}
              onChange={(event) => setQuery(sanitizeText(event.target.value, 80))}
              placeholder="Buscar por cliente, correo, estado o id..."
            />
            <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
            <button type="button" onClick={generateMonthlyReport} disabled={reporting}>
              {reporting ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="adminOrdersEmpty">Cargando pedidos...</div>
        ) : filtered.length === 0 ? (
          <div className="adminOrdersEmpty">No hay pedidos registrados.</div>
        ) : (
          <div className="adminOrdersList">
            {filtered.map((order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              const created = order.created_at ? new Date(order.created_at) : null;

              return (
                <article className="adminOrderCard" key={order.id}>
                  <div className="adminOrderTop">
                    <div>
                      <span>{order.id}</span>
                      <h2>{order.customer_name}</h2>
                      <p>{order.customer_email}</p>
                    </div>
                    <strong className={`adminOrderStatus adminOrderStatus--${order.status}`}>{order.status}</strong>
                  </div>

                  <div className="adminOrderMeta">
                    <span>Creado: {created ? `${created.toLocaleDateString()} ${created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}</span>
                    <span>Fecha solicitada: {order.pickup_date}</span>
                    <span>Productos: {items.length}</span>
                    <span>Total: ${Number(order.total || 0).toLocaleString()} MXN</span>
                  </div>

                  {order.notas && <p className="adminOrderNotes">{order.notas}</p>}

                  <div className="adminOrderItems">
                    {items.map((item) => (
                      <div key={`${order.id}-${item.sku}`} className="adminOrderItem">
                        <span>{item.cantidad} x</span>
                        <strong>{item.nombre}</strong>
                        <small>{item.sku}</small>
                      </div>
                    ))}
                  </div>

                  <div className="adminOrderActions">
                    <button type="button" disabled={updatingOrderId === order.id} onClick={() => setStatus(order, 'confirmed')}>Confirmar</button>
                    <button type="button" disabled={updatingOrderId === order.id} onClick={() => setStatus(order, 'ready')}>Aprobar</button>
                    <button type="button" disabled={updatingOrderId === order.id} onClick={() => setStatus(order, 'returned')}>Devolver</button>
                    <button type="button" disabled={updatingOrderId === order.id} className="danger" onClick={() => setStatus(order, 'cancelled')}>Cancelar</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
