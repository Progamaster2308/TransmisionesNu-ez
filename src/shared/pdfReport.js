const COMPANY_NAME = 'Transmisiones Nunez';

function pdfText(value) {
  return String(value ?? '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/[\\()]/g, '\\$&');
}

export function formatReportDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function splitLongWord(word, maxChars) {
  if (word.length <= maxChars) return [word];
  const chunks = [];
  for (let index = 0; index < word.length; index += maxChars) {
    chunks.push(word.slice(index, index + maxChars));
  }
  return chunks;
}

function wrapText(value, maxChars, maxLines = 3) {
  const words = String(value || '-')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .flatMap((word) => splitLongWord(word, Math.max(4, maxChars)));
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
  if (!lines.length) return ['-'];
  if (lines.length <= maxLines) return lines;

  const clipped = lines.slice(0, maxLines);
  clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(0, maxChars - 3))}...`;
  return clipped;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildTablePdf({ title, subtitle, rows, columns, scopeLabel, totalLabel, footerLabel }) {
  const width = 842;
  const height = 595;
  const margin = 36;
  const headerTop = 516;
  const tableTop = 456;
  const headerHeight = 24;
  const rowHeight = 52;
  const rowsPerPage = 7;
  const generatedAt = new Date();
  const safeRows = Array.isArray(rows) ? rows : [];
  const pages = [];
  const totalPages = Math.max(1, Math.ceil(safeRows.length / rowsPerPage));

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const chunk = safeRows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    const commands = [];
    const text = (x, y, value, size = 8.2, font = 'F1', color = '0.05 0.10 0.18') => {
      commands.push('BT', `${color} rg`, `/${font} ${size} Tf`, `${x} ${y} Td`, `(${pdfText(value)}) Tj`, 'ET');
    };
    const rect = (x, y, w, h, color, stroke = '') => {
      commands.push(`${color} rg`, `${x} ${y} ${w} ${h} re f`);
      if (stroke) commands.push(`${stroke} RG`, `${x} ${y} ${w} ${h} re S`);
    };
    const line = (x1, y1, x2, y2, color = '0.78 0.86 0.94', size = .7) => {
      commands.push(`${color} RG`, `${size} w`, `${x1} ${y1} m`, `${x2} ${y2} l`, 'S');
    };

    rect(0, 0, width, height, '0.98 0.99 1.00');
    text(262, 286, 'TN', 124, 'F2', '0.90 0.95 1.00');
    text(190, 248, 'TRANSMISIONES NUNEZ', 36, 'F2', '0.91 0.96 1.00');
    rect(margin, headerTop, width - margin * 2, 48, '0.02 0.10 0.20', '0.18 0.49 0.74');
    rect(margin + 14, headerTop + 12, 50, 24, '0.92 0.96 1.00');
    text(margin + 25, headerTop + 20, 'TN', 13, 'F2', '0.05 0.22 0.42');
    text(margin + 78, headerTop + 30, COMPANY_NAME, 17, 'F2', '0.96 0.99 1.00');
    text(margin + 78, headerTop + 15, subtitle, 10, 'F1', '0.68 0.82 0.96');
    text(610, headerTop + 30, `Generado: ${generatedAt.toLocaleDateString('es-MX')}`, 8.5, 'F1', '0.92 0.97 1.00');
    text(610, headerTop + 15, scopeLabel, 8.5, 'F1', '0.76 0.88 0.98');
    text(margin, 492, title, 11, 'F2');
    text(690, 492, `Pagina ${pageIndex + 1} de ${totalPages}`, 8.5, 'F1', '0.35 0.45 0.58');

    rect(margin, tableTop, width - margin * 2, headerHeight, '0.04 0.13 0.24', '0.18 0.49 0.74');
    columns.forEach((column) => text(column.x + 7, tableTop + 8, column.label, 7.6, 'F2', '0.62 0.86 1.00'));

    if (!chunk.length) {
      rect(margin, tableTop - rowHeight, width - margin * 2, rowHeight, '1.00 1.00 1.00', '0.82 0.88 0.94');
      text(margin + 14, tableTop - 27, 'No hay datos para este filtro.', 10, 'F1', '0.35 0.45 0.58');
    }

    chunk.forEach((row, index) => {
      const y = tableTop - ((index + 1) * rowHeight);
      rect(margin, y, width - margin * 2, rowHeight, index % 2 ? '0.95 0.98 1.00' : '1.00 1.00 1.00', '0.82 0.88 0.94');
      columns.slice(1).forEach((column) => line(column.x, y, column.x, y + rowHeight, '0.86 0.91 0.96', .45));

      columns.forEach((column) => {
        const rawValue = typeof column.value === 'function' ? column.value(row) : row[column.value];
        wrapText(rawValue, column.chars, column.lines || 3).forEach((lineText, lineIndex) => {
          text(column.x + 7, y + rowHeight - 14 - (lineIndex * 10.5), lineText, column.size || 7.3, column.bold ? 'F2' : 'F1');
        });
      });
    });

    line(margin, 38, width - margin, 38, '0.72 0.82 0.92', .8);
    text(margin, 22, `${COMPANY_NAME} - ${footerLabel}`, 8, 'F1', '0.35 0.45 0.58');
    text(620, 22, totalLabel, 8, 'F1', '0.35 0.45 0.58');
    pages.push(commands.join('\n'));
  }

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
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
