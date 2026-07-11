import { useEffect, useMemo, useState } from 'react';

import {
  createAppointment,
  listAppointmentAvailability,
  listBookedAppointmentsByDate
} from '../../shared/datastore/supabaseDataStore';
import { safeDateISO, sanitizeEmail, sanitizeText } from '../providers/marketplaceStorage';
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

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    if (!selectedDate) return;
    let mounted = true;

    (async () => {
      setLoadingSlots(true);
      try {
        const data = await listBookedAppointmentsByDate(selectedDate);
        if (mounted) setBooked(data);
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
        if (mounted) setBooked([]);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    })();

    return () => {
      mounted = false;
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

  const submit = async (e) => {
    e.preventDefault();

    const name = sanitizeText(customerName, 80);
    const email = sanitizeEmail(customerEmail);
    const date = safeDateISO(selectedDate);
    const servicio = sanitizeText(service, 60);
    const safePhone = sanitizeText(phone, 24);
    const safeCar = sanitizeText(car, 80);
    const safeModel = sanitizeText(model, 80);
    const safeYear = Math.floor(Number(year) || 0);
    const safeProblem = sanitizeText(problemDescription, 700);

    if (!name || !email || !safePhone || !safeCar || !safeModel || !safeYear || !safeProblem || !date || !timeSlot || !availableSlots.includes(timeSlot)) {
      showToast('Completa todos los datos de la cita.');
      return;
    }

    setLoadingSlots(true);
    try {
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

      try {
        await requestAppointmentEmailNotification(appointment);
      } catch (error) {
        console.error(error);
      }

      showToast('Cita agendada. Admin la revisará.');
      setTimeSlot('');
      setBooked(await listBookedAppointmentsByDate(date));
    } catch (err) {
      console.error(err);
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
              <select value={service} onChange={(e) => setService(e.target.value)}>
                <option value="Diagnóstico">Diagnóstico</option>
                <option value="Reparación">Reparación</option>
                <option value="Refacciones">Refacciones</option>
              </select>
            </div>

            <div className="field">
              <label>Fecha</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required />
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
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} type="text" placeholder="Ej. María López" required maxLength={80} />
              </div>
              <div className="field">
                <label>Correo electrónico</label>
                <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} type="email" placeholder="correo@ejemplo.com" required maxLength={160} />
              </div>
              <div className="field">
                <label>Número de celular</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Ej. 6621234567" required maxLength={24} />
              </div>
              <div className="field">
                <label>Auto</label>
                <input value={car} onChange={(e) => setCar(e.target.value)} type="text" placeholder="Ej. Nissan" required maxLength={80} />
              </div>
              <div className="field">
                <label>Modelo</label>
                <input value={model} onChange={(e) => setModel(e.target.value)} type="text" placeholder="Ej. Sentra" required maxLength={80} />
              </div>
              <div className="field">
                <label>Año</label>
                <input value={year} onChange={(e) => setYear(e.target.value)} type="number" min="1900" max="2100" placeholder="Ej. 2018" required />
              </div>
            </div>

            <div className="field">
              <label>Descripción de la falla</label>
              <textarea value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} rows={5} placeholder="Describe ruidos, cambios, fugas o síntomas que presenta el vehículo." required maxLength={700} />
            </div>
          </section>

          <aside className="apSide">
            <div className="apSummary">
              <div className="apSummaryTitle">Confirmación</div>
              <div className="apSummaryLine"><strong>Fecha:</strong> {selectedDate || '-'}</div>
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
