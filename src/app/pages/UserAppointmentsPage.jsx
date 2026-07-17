import { useEffect, useMemo, useState } from 'react';

import {
  createAppointment,
  listAppointmentAvailability,
  listBookedAppointmentsByDate
} from '../../shared/datastore/supabaseDataStore';
import {
  addYearsISO,
  getTodayISO,
  safeDateISO,
  sanitizeEmail,
  sanitizeLongMessage,
  sanitizePersonName,
  sanitizePhone,
  sanitizeVehicleText,
  sanitizeVehicleYear
} from '../providers/marketplaceStorage';
import { requestAppointmentEmailNotification } from '../providers/orderMailer';
import { isSupabaseConfigError } from '../providers/supabaseClient';
import { useToast } from '../providers/useToast';

import './AppointmentsPage.css';

function getDateWeekday(date) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).getDay();
}

export default function UserAppointmentsPage() {
  const { showToast } = useToast();
  const minDate = getTodayISO();
  const maxDate = addYearsISO(1);

  const [selectedDate, setSelectedDate] = useState(minDate);
  const [service, setService] = useState('Diagnóstico');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [car, setCar] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [booked, setBooked] = useState([]);

  const refreshBookedSlots = async (date) => {
    const latestBooked = await listBookedAppointmentsByDate(date);
    setBooked(latestBooked);
    setTimeSlot((current) => (
      latestBooked.some((item) => item.hora === current) ? '' : current
    ));
    return latestBooked;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await listAppointmentAvailability();
        if (mounted) setAvailability(data);
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!safeDateISO(selectedDate)) return;
    let mounted = true;

    const loadBookedSlots = async ({ showLoading = false } = {}) => {
      if (showLoading) setLoadingSlots(true);
      try {
        const data = await listBookedAppointmentsByDate(selectedDate);
        if (mounted) {
          setBooked(data);
          setTimeSlot((current) => (
            data.some((item) => item.hora === current) ? '' : current
          ));
        }
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
        if (mounted) setBooked([]);
      } finally {
        if (showLoading && mounted) setLoadingSlots(false);
      }
    };

    loadBookedSlots({ showLoading: true });

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        loadBookedSlots();
      }
    };
    const intervalId = window.setInterval(refreshIfVisible, 12000);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [selectedDate]);

  const dayAvailability = useMemo(() => {
    const weekday = getDateWeekday(selectedDate);
    return availability.find((day) => Number(day.weekday) === weekday);
  }, [availability, selectedDate]);

  const availableSlots = useMemo(() => {
    if (!dayAvailability?.enabled) return [];
    const bookedSlots = new Set(booked.map((item) => item.hora));
    return (dayAvailability.slots ?? []).filter((slot) => !bookedSlots.has(slot));
  }, [booked, dayAvailability]);

  const submit = async (event) => {
    event.preventDefault();

    const name = sanitizePersonName(customerName, 80);
    const email = sanitizeEmail(customerEmail);
    const date = safeDateISO(selectedDate);
    const servicio = sanitizeVehicleText(service, 60);
    const safePhone = sanitizePhone(phone);
    const safeCar = sanitizeVehicleText(car, 60);
    const safeModel = sanitizeVehicleText(model, 60);
    const safeYear = sanitizeVehicleYear(year);
    const safeProblem = sanitizeLongMessage(problemDescription, 700);

    if (!date) {
      showToast('Selecciona una fecha válida entre hoy y máximo un año.');
      return;
    }

    if (!name || !email || !safePhone || !safeCar || !safeModel || !safeYear || !safeProblem || !servicio) {
      showToast('Revisa nombre, correo, celular y datos del vehículo.');
      return;
    }

    if (!timeSlot || !availableSlots.includes(timeSlot)) {
      showToast('Selecciona un horario disponible.');
      return;
    }

    setLoadingSlots(true);
    try {
      const latestBooked = await refreshBookedSlots(date);
      if (latestBooked.some((item) => item.hora === timeSlot)) {
        setTimeSlot('');
        showToast('Ese horario ya no está disponible. Selecciona otra hora.');
        return;
      }

      const appointment = await createAppointment({
        customer_name: name,
        customer_email: email,
        phone: safePhone,
        car: safeCar,
        model: safeModel,
        year: safeYear,
        problem_description: safeProblem,
        servicio,
        fecha: date,
        hora: timeSlot
      });

      requestAppointmentEmailNotification(appointment)
        .then(() => showToast('Correo enviado al admin.'))
        .catch((error) => {
          console.error(error);
          showToast(error?.message || 'Cita agendada, pero no se pudo enviar el correo al admin.');
        });

      showToast('Cita agendada. Admin la revisará.');
      setTimeSlot('');
      await refreshBookedSlots(date);
    } catch (err) {
      console.error(err);
      if (err?.message?.includes('horario acaba de ocuparse')) {
        setTimeSlot('');
        await refreshBookedSlots(date);
      }
      showToast(err?.message ? `Error: ${err.message}` : 'No se pudo agendar.');
    } finally {
      setLoadingSlots(false);
    }
  };

  return (
    <main className="apWrap">
      <div className="apPanel">
        <div className="apHeader">
          <h2>Agendar cita</h2>
          <p className="apSub">Selecciona un día disponible y registra los datos de tu vehículo para preparar la revisión.</p>
        </div>

        <form className="apGrid" onSubmit={submit}>
          <section className="apCol">
            <div className="field">
              <label>Servicio</label>
              <select value={service} onChange={(event) => setService(event.target.value)}>
                <option value="Diagnóstico">Diagnóstico</option>
                <option value="Reparación">Reparación</option>
                <option value="Refacciones">Refacciones</option>
              </select>
            </div>

            <div className="field">
              <label>Fecha</label>
              <input type="date" value={selectedDate} min={minDate} max={maxDate} onChange={(event) => setSelectedDate(event.target.value)} required />
            </div>

            <div className="timesBox">
              <div className="timesTitle">Horas disponibles</div>
              {!dayAvailability?.enabled && <div className="timesHint">Este día no está habilitado por administración.</div>}
              <div className="timesGrid">
                {availableSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot}
                    className={`timeBtn ${timeSlot === slot ? 'timeBtn--active' : ''}`}
                    disabled={loadingSlots}
                    onClick={() => setTimeSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {dayAvailability?.enabled && availableSlots.length === 0 && !loadingSlots && (
                <div className="timesHint">No quedan horarios libres para este día.</div>
              )}
              {loadingSlots && <div className="timesHint">Cargando disponibilidad...</div>}
            </div>

            <div className="appointmentFields">
              <div className="field">
                <label>Nombre completo</label>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} type="text" placeholder="Ej. Andrea Salazar" required maxLength={80} pattern="[A-Za-zÀ-ÿÑñ '-]{2,80}" />
              </div>
              <div className="field">
                <label>Correo electrónico</label>
                <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} type="email" placeholder="correo@ejemplo.com" required maxLength={160} pattern="[a-zA-Z0-9]+@([a-zA-Z0-9]+\.)+[a-zA-Z]{2,}" />
              </div>
              <div className="field">
                <label>Número de celular</label>
                <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" inputMode="numeric" placeholder="Ej. 6627841930" required minLength={10} maxLength={10} pattern="[0-9]{10}" />
              </div>
              <div className="field">
                <label>Auto</label>
                <input value={car} onChange={(event) => setCar(event.target.value)} type="text" placeholder="Ej. Honda" required maxLength={60} pattern="[A-Za-z0-9À-ÿÑñ .-]{2,60}" />
              </div>
              <div className="field">
                <label>Modelo</label>
                <input value={model} onChange={(event) => setModel(event.target.value)} type="text" placeholder="Ej. CR-V" required maxLength={60} pattern="[A-Za-z0-9À-ÿÑñ .-]{1,60}" />
              </div>
              <div className="field">
                <label>Año</label>
                <input
                  value={year}
                  onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  type="text"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="Ej. 2020"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Descripción de la falla</label>
              <textarea value={problemDescription} onChange={(event) => setProblemDescription(event.target.value)} rows={5} placeholder="Describe ruidos, cambios, fugas o síntomas que presenta el vehículo." required minLength={10} maxLength={700} />
            </div>
          </section>

          <aside className="apSide">
            <div className="apSummary">
              <div className="apSummaryTitle">Confirmación</div>
              <div className="apSummaryLine"><strong>Fecha:</strong> {safeDateISO(selectedDate) || '-'}</div>
              <div className="apSummaryLine"><strong>Hora:</strong> {timeSlot || 'Selecciona una'}</div>
              <div className="apSummaryLine"><strong>Servicio:</strong> {service}</div>
              <div className="apSummaryLine"><strong>Vehículo:</strong> {car || '-'} {model || ''} {year || ''}</div>

              <button className="apSubmit" disabled={!timeSlot || !availableSlots.includes(timeSlot) || loadingSlots} type="submit">
                {loadingSlots ? 'Agendando...' : 'Agendar cita'}
              </button>

              <div className="apLegal">* Tu cita queda como scheduled hasta confirmación del admin.</div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
