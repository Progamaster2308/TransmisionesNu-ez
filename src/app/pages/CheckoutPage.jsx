import { useMemo, useState } from 'react';

import { createOrder } from '../../shared/datastore/supabaseDataStore';
import { requestAdminEmailNotification } from '../providers/orderMailer';
import { useCart } from '../providers/useCart';
import { useToast } from '../providers/useToast';
import { safeDateISO, sanitizeEmail, sanitizeText } from '../providers/marketplaceStorage';

import './CheckoutPage.css';

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [notas, setNotas] = useState('');

  const canSubmit = useMemo(() => {
    return items.length > 0 && customerName.trim().length >= 2 && !!sanitizeEmail(customerEmail) && !!safeDateISO(pickupDate);
  }, [items.length, customerName, customerEmail, pickupDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      showToast('Revisa tus datos.');
      return;
    }

    const name = sanitizeText(customerName, 80);
    const email = sanitizeEmail(customerEmail);
    const date = safeDateISO(pickupDate);
    const safeNotas = sanitizeText(notas, 500);

    if (!name || !email || !date) {
      showToast('Datos inválidos.');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map((it) => {
        const cantidad = Math.max(1, Math.floor(Number(it.cantidad) || 1));

        return {
          productId: it.id,
          sku: sanitizeText(it.sku, 40),
          nombre: sanitizeText(it.nombre, 120),
          cantidad
        };
      });

      const orderPayload = {
        customer_name: name,
        customer_email: email,
        notas: safeNotas || null,
        pickup_date: date,
        total: 0,
        items: orderItems,
        status: 'pending'
      };

      const data = await createOrder(orderPayload);

      try {
        if (data?.id) {
          localStorage.setItem('nu:lastOrderId', data.id);
          await requestAdminEmailNotification({ ...orderPayload, id: data.id });
        }
      } catch (error) {
        console.error(error);
      }

      clearCart();
      showToast('Orden registrada y preparada para el vendedor.');
    } catch (err) {
      console.error(err);
      showToast(err?.message ? `Error: ${err.message}` : 'No se pudo registrar la orden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="checkoutWrap">
      <div className="checkoutPanel">
        <div className="checkoutHeader">
          <h2>Generar orden de consulta</h2>
          <div className="checkoutHint">El vendedor recibe el detalle para confirmar disponibilidad y seguimiento.</div>
        </div>

        {items.length === 0 ? (
          <div className="checkoutEmpty">Tu pedido está vacío.</div>
        ) : (
          <form onSubmit={handleSubmit} className="checkoutForm">
            <div className="checkoutGrid">
              <section className="checkoutCol">
                <div className="field">
                  <label>Nombre completo</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    required
                    maxLength={80}
                  />
                </div>

                <div className="field">
                  <label>Correo electrónico</label>
                  <input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    type="email"
                    placeholder="correo@ejemplo.com"
                    required
                    maxLength={160}
                  />
                </div>

                <div className="field">
                  <label>Fecha solicitada</label>
                  <input
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    type="date"
                    required
                  />
                </div>

                <div className="field">
                  <label>Observaciones (opcional)</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={4}
                    placeholder="Ej. modelo del vehículo, transmisión, horario preferido, dudas..."
                    maxLength={500}
                  />
                </div>
              </section>

              <aside className="checkoutSide">
                <div className="orderBox">
                  <div className="orderBoxTitle">Resumen de consulta</div>
                  <div className="orderLine">Productos: {items.length}</div>
                  <div className="orderSmall">
                    Se guardará la orden en el panel administrativo y se preparará un correo al vendedor con el detalle.
                  </div>

                  <button className="checkoutSubmit" disabled={!canSubmit || loading} type="submit">
                    {loading ? 'Registrando...' : 'Registrar orden'}
                  </button>
                </div>

                <div className="orderItems">
                  <div className="orderBoxTitle">Detalle</div>
                  {items.map((it) => (
                    <div key={it.id} className="orderItemRow">
                      <div className="orderItemName">{it.nombre}</div>
                      <div className="orderItemMeta">x {it.cantidad}</div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
