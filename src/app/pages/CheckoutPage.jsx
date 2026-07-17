import { useMemo, useState } from 'react';

import { createOrder } from '../../shared/datastore/supabaseDataStore';
import { requestAdminEmailNotification } from '../providers/orderMailer';
import { useCart } from '../providers/useCart';
import { useToast } from '../providers/useToast';
import {
  addYearsISO,
  getTodayISO,
  safeDateISO,
  sanitizeEmail,
  sanitizeLongMessage,
  sanitizePersonName,
  sanitizePhone,
  sanitizeText,
  sanitizeVehicleText,
  sanitizeVehicleYear
} from '../providers/marketplaceStorage';

import './CheckoutPage.css';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const { showToast } = useToast();
  const minDate = getTodayISO();
  const maxDate = addYearsISO(1);

  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [notas, setNotas] = useState('');

  const canSubmit = useMemo(() => {
    return (
      items.length > 0 &&
      !!sanitizePersonName(customerName) &&
      !!sanitizeEmail(customerEmail) &&
      !!sanitizePhone(customerPhone) &&
      !!sanitizeVehicleText(vehicleMake) &&
      !!sanitizeVehicleText(vehicleModel) &&
      !!sanitizeVehicleYear(vehicleYear) &&
      !!safeDateISO(pickupDate)
    );
  }, [items.length, customerName, customerEmail, customerPhone, vehicleMake, vehicleModel, vehicleYear, pickupDate]);
  const estimatedTotal = useMemo(() => items.reduce((sum, item) => (
    sum + Number(item.precio || 0) * Math.max(1, Number(item.cantidad || 1))
  ), 0), [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmit) {
      showToast('Revisa tus datos.');
      return;
    }

    const name = sanitizePersonName(customerName, 80);
    const email = sanitizeEmail(customerEmail);
    const phone = sanitizePhone(customerPhone);
    const make = sanitizeVehicleText(vehicleMake, 60);
    const model = sanitizeVehicleText(vehicleModel, 60);
    const year = sanitizeVehicleYear(vehicleYear);
    const date = safeDateISO(pickupDate);
    const safeNotas = notas ? sanitizeLongMessage(notas, 500) : '';

    if (!date) {
      showToast('Selecciona una fecha válida entre hoy y máximo un año.');
      return;
    }

    if (!name || !email || !phone || !make || !model || !year) {
      showToast('Revisa nombre, correo, celular y referencia del vehículo.');
      return;
    }

    if (notas && !safeNotas) {
      showToast('Las observaciones tienen caracteres no permitidos.');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map((it) => {
        const cantidad = Math.max(1, Math.floor(Number(it.cantidad) || 1));
        const precioUnitario = Math.max(0, Math.floor(Number(it.precio) || 0));

        return {
          productId: it.id,
          sku: sanitizeText(it.sku, 40),
          nombre: sanitizeText(it.nombre, 120),
          cantidad,
          precioUnitario,
          precioLinea: precioUnitario * cantidad
        };
      });

      const customerReference = [
        `Celular: ${phone}`,
        `Vehículo: ${make} ${model} ${year}`,
        safeNotas ? `Observaciones: ${safeNotas}` : ''
      ].filter(Boolean).join('\n');

      const orderPayload = {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        vehicle_make: make,
        vehicle_model: model,
        vehicle_year: year,
        notas: customerReference,
        pickup_date: date,
        total: orderItems.reduce((sum, item) => sum + Number(item.precioLinea || 0), 0),
        items: orderItems,
        status: 'pending'
      };

      const data = await createOrder(orderPayload);

      if (data?.id) {
        localStorage.setItem('nu:lastOrderId', data.id);
        requestAdminEmailNotification({ ...orderPayload, id: data.id })
          .then(() => showToast('Correo enviado al admin.'))
          .catch((error) => {
            console.error(error);
            showToast(error?.message || 'Orden registrada, pero no se pudo enviar el correo al admin.');
          });
      }

      clearCart();
      showToast('Orden registrada. Notificando al vendedor...');
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
                    placeholder="Ej. Carlos Ramírez"
                    required
                    maxLength={80}
                    pattern="[A-Za-zÀ-ÿÑñ '-]{2,80}"
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
                    pattern="[a-zA-Z0-9]+@([a-zA-Z0-9]+\.)+[a-zA-Z]{2,}"
                  />
                </div>

                <div className="checkoutFieldGrid">
                  <div className="field">
                    <label>Número de celular</label>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      type="tel"
                      inputMode="numeric"
                      placeholder="Ej. 6624589031"
                      required
                      minLength={10}
                      maxLength={10}
                      pattern="[0-9]{10}"
                    />
                  </div>

                  <div className="field">
                    <label>Fecha solicitada</label>
                    <input
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      type="date"
                      min={minDate}
                      max={maxDate}
                      required
                    />
                  </div>
                </div>

                <div className="checkoutFieldGrid">
                  <div className="field">
                    <label>Auto</label>
                    <input
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      type="text"
                      placeholder="Ej. Toyota"
                      required
                      maxLength={60}
                      pattern="[A-Za-z0-9À-ÿÑñ .-]{2,60}"
                    />
                  </div>

                  <div className="field">
                    <label>Modelo</label>
                    <input
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      type="text"
                      placeholder="Ej. Tacoma"
                      required
                      maxLength={60}
                      pattern="[A-Za-z0-9À-ÿÑñ .-]{1,60}"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Año</label>
                  <input
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    type="text"
                    inputMode="numeric"
                    minLength={4}
                    maxLength={4}
                    pattern="[0-9]{4}"
                    placeholder="Ej. 2019"
                    required
                  />
                </div>

                <div className="field">
                  <label>Observaciones (opcional)</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={4}
                    placeholder="Ej. pickup por la tarde, revisar compatibilidad de transmisión..."
                    maxLength={500}
                  />
                </div>
              </section>

              <aside className="checkoutSide">
                <div className="orderBox">
                  <div className="orderBoxTitle">Resumen de consulta</div>
                  <div className="orderLine">Productos: {items.length}</div>
                  <div className="orderTotal">{formatCurrency(estimatedTotal)}</div>
                  <div className="orderSmall">
                    Total estimado. Se guardará la orden en el panel administrativo y se enviará el detalle al vendedor.
                  </div>
                  <div className="orderCustomerRef">
                    <strong>Cliente:</strong> {customerName || '-'}<br />
                    <strong>Celular:</strong> {customerPhone || '-'}<br />
                    <strong>Vehículo:</strong> {vehicleMake || '-'} {vehicleModel || ''} {vehicleYear || ''}
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
                      <div className="orderItemMeta">
                        x {it.cantidad} · {formatCurrency(Number(it.precio || 0) * Number(it.cantidad || 1))}
                      </div>
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
