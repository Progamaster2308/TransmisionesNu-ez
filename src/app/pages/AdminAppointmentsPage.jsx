import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listAppointments, updateAppointmentStatus } from '../../shared/datastore/supabaseDataStore';
import { sanitizeText } from '../providers/marketplaceStorage';
import { isSupabaseConfigError } from '../providers/supabaseClient';
import { useToast } from '../providers/useToast';

import './AppointmentsPage.css';

const STATUS_LABELS = {
  scheduled: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

const COMPANY_NAME = 'Transmisiones Nu\u00f1ez';

function encodePdfText(value) {
  const replacements = {
    '\u00e1': '\\341',
    '\u00e9': '\\351',
    '\u00ed': '\\355',
    '\u00f3': '\\363',
    '\u00fa': '\\372',
    '\u00c1': '\\301',
    '\u00c9': '\\311',
    '\u00cd': '\\315',
    '\u00d3': '\\323',
    '\u00da': '\\332',
    '\u00f1': '\\361',
    '\u00d1': '\\321',
    '\u00fc': '\\374',
    '\u00dc': '\\334'
  };

  return String(value ?? '')
    .replace(/[\\()]/g, '\\$&')
    .replace(/[^\x20-\x7E]/g, (char) => replacements[char] || '');
}

function formatReportDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function wrapText(value, maxChars, maxLines = 2) {
  const words = String(value || '-').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(0, maxChars - 3))}...`;
    return clipped;
  }

  return lines.length ? lines : ['-'];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildAppointmentsPdf(rows, scopeLabel) {
  const width = 842;
  const height = 595;
  const margin = 36;
  const rowHeight = 36;
  const rowsPerPage = 10;
  const generatedAt = new Date();
  const pages = [];
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const sourceRows = rows.length ? rows : [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const chunk = sourceRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    const commands = [];
    const text = (x, y, value, size = 9, font = 'F1', color = '0.05 0.10 0.18') => {
      commands.push('BT', `${color} rg`, `/${font} ${size} Tf`, `${x} ${y} Td`, `(${encodePdfText(value)}) Tj`, 'ET');
    };
    const rect = (x, y, w, h, color, stroke = '') => {
      commands.push(`${color} rg`, `${x} ${y} ${w} ${h} re f`);
      if (stroke) commands.push(`${stroke} RG`, `${x} ${y} ${w} ${h} re S`);
    };
    const line = (x1, y1, x2, y2, color = '0.78 0.86 0.94', size = .8) => {
      commands.push(`${color} RG`, `${size} w`, `${x1} ${y1} m`, `${x2} ${y2} l`, 'S');
    };

    rect(0, 0, width, height, '0.98 0.99 1.00');
    text(262, 286, 'TN', 124, 'F2', '0.90 0.95 1.00');
    text(196, 248, 'TRANSMISIONES NUNEZ', 38, 'F2', '0.91 0.96 1.00');
    rect(margin, 516, width - margin * 2, 48, '0.02 0.10 0.20', '0.18 0.49 0.74');
    rect(margin + 14, 528, 50, 24, '0.92 0.96 1.00');
    text(margin + 25, 536, 'TN', 13, 'F2', '0.05 0.22 0.42');
    text(margin + 78, 544, COMPANY_NAME, 18, 'F2', '0.96 0.99 1.00');
    text(margin + 78, 528, 'Historial de citas', 10, 'F1', '0.68 0.82 0.96');
    text(610, 544, `Generado: ${generatedAt.toLocaleDateString('es-MX')}`, 9, 'F1', '0.92 0.97 1.00');
    text(610, 528, scopeLabel, 9, 'F1', '0.76 0.88 0.98');
    text(margin, 492, `Total de citas: ${rows.length}`, 10, 'F2');
    text(690, 492, `Pagina ${pageIndex + 1} de ${totalPages}`, 9, 'F1', '0.35 0.45 0.58');

    const columns = [
      { label: 'Fecha', x: margin, w: 64, chars: 10 },
      { label: 'Hora', x: margin + 64, w: 48, chars: 6 },
      { label: 'Cliente', x: margin + 112, w: 150, chars: 22 },
      { label: 'Vehiculo', x: margin + 262, w: 132, chars: 18 },
      { label: 'Falla reportada', x: margin + 394, w: 220, chars: 32 },
      { label: 'Estado', x: margin + 614, w: 92, chars: 12 },
      { label: 'Celular', x: margin + 706, w: 64, chars: 10 }
    ];
    const tableTop = 462;

    rect(margin, tableTop, width - margin * 2, 24, '0.04 0.13 0.24', '0.18 0.49 0.74');
    columns.forEach((column) => text(column.x + 7, tableTop + 8, column.label, 8, 'F2', '0.62 0.86 1.00'));

    if (!chunk.length) {
      rect(margin, tableTop - rowHeight, width - margin * 2, rowHeight, '1.00 1.00 1.00', '0.82 0.88 0.94');
      text(margin + 14, tableTop - 22, 'No hay citas para este filtro.', 10, 'F1', '0.35 0.45 0.58');
    }

    chunk.forEach((row, index) => {
      const y = tableTop - ((index + 1) * rowHeight);
      rect(margin, y, width - margin * 2, rowHeight, index % 2 ? '0.96 0.98 1.00' : '1.00 1.00 1.00', '0.82 0.88 0.94');
      columns.slice(1).forEach((column) => line(column.x, y, column.x, y + rowHeight, '0.86 0.91 0.96', .5));

      const values = [
        formatReportDate(row.fecha),
        row.hora || '-',
        `${row.customer_name || '-'} | ${row.customer_email || '-'}`,
        `${row.car || '-'} ${row.model || ''} ${row.year || ''} | ${row.servicio || '-'}`,
        row.problem_description || row.notes || '-',
        STATUS_LABELS[row.status] || row.status || '-',
        row.phone || '-'
      ];

      columns.forEach((column, columnIndex) => {
        wrapText(values[columnIndex], column.chars, columnIndex === 4 ? 2 : 2).forEach((lineText, lineIndex) => {
          text(column.x + 7, y + rowHeight - 14 - (lineIndex * 11), lineText, 7.6, columnIndex === 0 ? 'F2' : 'F1');
        });
      });
    });

    line(margin, 38, width - margin, 38, '0.72 0.82 0.92', .8);
    text(margin, 22, `${COMPANY_NAME} - Reporte administrativo`, 8, 'F1', '0.35 0.45 0.58');
    pages.push(commands.join('\n'));
  }

  const objects = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index} 0 R`).join(' ')}] /Count ${pages.length} >>`
  ];
  const contentStart = 3 + pages.length;
  pages.forEach((_, index) => {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${contentStart + pages.length} 0 R /F2 ${contentStart + pages.length + 1} 0 R >> >> /Contents ${contentStart + index} 0 R >>`);
  });
  pages.forEach((content) => {
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

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

export default function AdminAppointmentsPage() {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const { showToast } = useToast();

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
      showToast('Cita actualizada');
    } catch (error) {
      console.error(error);
      showToast('No se pudo actualizar la cita');
    }
  };

  const generateAppointmentsReport = () => {
    setReporting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const scopeLabel = dateFilter ? `Fecha filtrada: ${formatReportDate(dateFilter)}` : `Historial al ${formatReportDate(today)}`;
      const blob = buildAppointmentsPdf(filtered, scopeLabel);
      downloadBlob(blob, `transmisiones-nunez-historial-citas-${today}.pdf`);
      showToast('Reporte de citas generado');
    } catch (error) {
      console.error(error);
      showToast('No se pudo generar el reporte');
    } finally {
      setReporting(false);
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
          <button className="adminAction adminAction--report" type="button" onClick={generateAppointmentsReport} disabled={reporting}>
            {reporting ? 'Generando...' : 'Generar reporte'}
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
