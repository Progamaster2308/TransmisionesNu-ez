import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listAppointments, updateAppointmentStatus } from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';

import './AppointmentsPage.css';

const STATUS_LABELS = {
  scheduled: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

export default function AdminAppointmentsPage() {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const data = await listAppointments();
        if (mounted) setRows(data);
      } catch (error) {
        if (!isSupabaseConfigError(error)) console.error(error);
        if (mounted) setRows([]);
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

    return rows.filter((row) => {
      const okDate = !dateFilter || row.fecha === dateFilter;
      const okQ = !q || (
        row.customer_name?.toLowerCase().includes(q) ||
        row.customer_email?.toLowerCase().includes(q) ||
        row.phone?.toLowerCase().includes(q) ||
        row.car?.toLowerCase().includes(q) ||
        row.model?.toLowerCase().includes(q) ||
        row.servicio?.toLowerCase().includes(q) ||
        row.hora?.toLowerCase().includes(q)
      );
      return okDate && okQ;
    });
  }, [dateFilter, rows, query]);

  const grouped = useMemo(() => {
    return filtered.reduce((acc, appointment) => {
      const key = appointment.fecha || 'Sin fecha';
      if (!acc[key]) acc[key] = [];
      acc[key].push(appointment);
      return acc;
    }, {});
  }, [filtered]);

  const updateStatus = async (id, status) => {
    try {
      const updated = await updateAppointmentStatus(id, status);
      setRows((prev) => prev.map((row) => (row.id === id ? updated : row)));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="apWrap">
      <div className="apPanel">
        <div className="apHeader">
          <div className="apHeaderTop">
            <h2>Admin - Citas</h2>
            <Link className="adminBackLink" to="/admin">Volver al admin</Link>
          </div>
          <p className="apSub">Consulta las citas por día y hora, revisa la falla reportada y actualiza el estado.</p>
        </div>

        <div className="adminTools adminTools--wide">
          <input
            className="adminSearch"
            placeholder="Filtrar por cliente, correo, celular, auto o servicio..."
            value={query}
            onChange={(event) => setQuery(sanitizeText(event.target.value, 80))}
          />
          <input
            className="adminSearch"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
          <button className="adminAction" type="button" onClick={() => setDateFilter('')}>
            Ver todas
          </button>
          <div className="adminCount">{filtered.length} resultados</div>
        </div>

        {loading ? (
          <div className="adminLoading">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="adminEmpty">No hay citas.</div>
        ) : (
          Object.entries(grouped).map(([fecha, appointments]) => (
            <section className="adminDayGroup" key={fecha}>
              <h3>{fecha}</h3>
              <div className="adminTableWrap">
                <table className="adminTable adminTable--appointments">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Vehículo</th>
                      <th>Falla</th>
                      <th>Status</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((row) => (
                      <tr key={row.id}>
                        <td className="adminCell adminCell--time"><div className="adminDate">{row.hora}</div></td>
                        <td className="adminCell adminCell--client">
                          <div className="adminClientName">{row.customer_name}</div>
                          <div className="adminClientEmail">{row.customer_email}</div>
                          <div className="adminClientEmail">{row.phone}</div>
                        </td>
                        <td className="adminCell adminCell--vehicle">
                          <div className="adminClientName">{row.car} {row.model}</div>
                          <div className="adminClientEmail">{row.year} - {row.servicio}</div>
                        </td>
                        <td className="adminCell adminProblem">{row.problem_description || row.notes || '-'}</td>
                        <td className="adminCell adminCell--status">
                          <span className={`statusPill statusPill--${row.status}`}>{STATUS_LABELS[row.status] || row.status}</span>
                        </td>
                        <td className="adminCell adminCell--actions">
                          <div className="adminActionsRow">
                            <button type="button" className="adminAction" onClick={() => updateStatus(row.id, 'confirmed')}>Confirmar</button>
                            <button type="button" className="adminAction" onClick={() => updateStatus(row.id, 'completed')}>Completar</button>
                            <button type="button" className="adminAction adminAction--cancel" onClick={() => updateStatus(row.id, 'cancelled')}>Cancelar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
