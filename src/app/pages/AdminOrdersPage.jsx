import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listOrders, listOrdersByMonth, updateOrderStatus } from '../../shared/datastore/supabaseDataStore';
import { buildTablePdf, downloadBlob, formatReportDate } from '../../shared/pdfReport';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';
import { useToast } from '../providers/useToast';

import './AdminOrdersPage.css';

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
      const blob = buildTablePdf({
        title: `Total de pedidos: ${data.length}`,
        subtitle: 'Historial de pedidos',
        rows: data,
        scopeLabel: `Mes: ${reportMonth}`,
        totalLabel: `${data.length} pedidos`,
        footerLabel: 'Reporte administrativo de pedidos',
        columns: [
          { label: 'Pedido', x: 36, chars: 9, lines: 1, bold: true, value: (order) => String(order.id || '-').slice(0, 8) },
          { label: 'Creado', x: 96, chars: 10, lines: 1, value: (order) => formatReportDate(String(order.created_at || '').slice(0, 10)) },
          { label: 'Cliente', x: 174, chars: 23, lines: 3, value: (order) => `${order.customer_name || '-'} | ${order.customer_email || '-'}` },
          { label: 'Fecha sol.', x: 350, chars: 10, lines: 1, value: (order) => formatReportDate(order.pickup_date) },
          {
            label: 'Productos',
            x: 424,
            chars: 29,
            lines: 3,
            value: (order) => {
              const items = Array.isArray(order.items) ? order.items : [];
              return items.length
                ? items.map((item) => `${item.cantidad || 1}x ${item.nombre || item.sku || 'Producto'}`).join('; ')
                : '-';
            }
          },
          { label: 'Notas', x: 610, chars: 17, lines: 3, value: (order) => order.notas || '-' },
          { label: 'Estado', x: 724, chars: 10, lines: 1, value: (order) => order.status || '-' },
          { label: 'Total', x: 768, chars: 9, lines: 1, value: (order) => `$${Number(order.total || 0).toLocaleString()}` }
        ]
      });
      downloadBlob(blob, `transmisiones-nunez-historial-pedidos-${reportMonth}.pdf`);
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
