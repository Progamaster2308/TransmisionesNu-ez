import { useEffect, useMemo, useState } from 'react';

import { listAppointments, updateAppointmentStatus } from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';

import './AppointmentsPage.css';

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

    return rows.filter((r) => {
      const okDate = !dateFilter || r.fecha === dateFilter;
      const okQ = !q || (
        r.customer_name?.toLowerCase().includes(q) ||
        r.customer_email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.car?.toLowerCase().includes(q) ||
        r.model?.toLowerCase().includes(q) ||
        r.servicio?.toLowerCase().includes(q) ||
        r.hora?.toLowerCase().includes(q)
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
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="apWrap">
      <div className="apPanel">
        <div className="apHeader">
          <h2>Admin - Citas</h2>
          <p className="apSub">Consulta las citas por día y hora, revisa la falla reportada y actualiza el estado.</p>
        </div>

        <div className="adminTools adminTools--wide">
          <input
            className="adminSearch"
            placeholder="Filtrar por cliente, correo, celular, auto o servicio..."
            value={query}
            onChange={(e) => setQuery(sanitizeText(e.target.value, 80))}
          />
          <input
            className="adminSearch"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
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
                <table className="adminTable">
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
                    {appointments.map((r) => (
                      <tr key={r.id}>
                        <td><div className="adminDate">{r.hora}</div></td>
                        <td>
                          <div className="adminClientName">{r.customer_name}</div>
                          <div className="adminClientEmail">{r.customer_email}</div>
                          <div className="adminClientEmail">{r.phone}</div>
                        </td>
                        <td>
                          <div className="adminClientName">{r.car} {r.model}</div>
                          <div className="adminClientEmail">{r.year} - {r.servicio}</div>
                        </td>
                        <td className="adminProblem">{r.problem_description || r.notes || '-'}</td>
                        <td><span className={`statusPill statusPill--${r.status}`}>{r.status}</span></td>
                        <td>
                          <div className="adminActionsRow">
                            <button type="button" className="adminAction" onClick={() => updateStatus(r.id, 'confirmed')}>Confirmar</button>
                            <button type="button" className="adminAction" onClick={() => updateStatus(r.id, 'completed')}>Completar</button>
                            <button type="button" className="adminAction adminAction--cancel" onClick={() => updateStatus(r.id, 'cancelled')}>Cancelar</button>
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
