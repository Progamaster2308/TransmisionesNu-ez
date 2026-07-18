const COMPANY_NAME = 'Transmisiones Nunez';
const LOGO_URL = '/tnlogo.png';
const PDF_ENCODER = new TextEncoder();

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

function estimateTextWidth(value, size, font = 'F1') {
  const text = String(value || '');
  const average = font === 'F2' ? .57 : .52;
  return text.length * size * average;
}

function splitLongWord(word, maxWidth, size, font) {
  if (estimateTextWidth(word, size, font) <= maxWidth) return [word];
  const chunks = [];
  let current = '';

  Array.from(word).forEach((char) => {
    const next = `${current}${char}`;
    if (current && estimateTextWidth(next, size, font) > maxWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function wrapText(value, maxWidth, size = 7.2, font = 'F1') {
  const clean = String(value || '-').replace(/\s+/g, ' ').trim() || '-';
  const words = clean.split(' ').flatMap((word) => splitLongWord(word, maxWidth, size, font));
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (current && estimateTextWidth(next, size, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : ['-'];
}

function makeColumns(columns, width, margin) {
  return columns.map((column, index) => {
    const nextX = columns[index + 1]?.x ?? (width - margin);
    return {
      ...column,
      width: Math.max(28, nextX - column.x)
    };
  });
}

function measureRow(row, columns) {
  let maxLines = 1;
  const cells = columns.map((column) => {
    const rawValue = typeof column.value === 'function' ? column.value(row) : row[column.value];
    const size = column.size || 7.1;
    const font = column.bold ? 'F2' : 'F1';
    const lines = wrapText(rawValue, column.width - 12, size, font);
    maxLines = Math.max(maxLines, lines.length);
    return { ...column, rawValue, lines, size, font };
  });

  return {
    cells,
    height: Math.max(42, 18 + (maxLines * 10.4))
  };
}

async function getLogoImage() {
  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return null;

  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;
    const sourceBlob = await response.blob();
    const bitmap = await createImageBitmap(sourceBlob);
    const canvas = document.createElement('canvas');
    const maxWidth = 620;
    const scale = Math.min(1, maxWidth / bitmap.width);
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .92));
    if (!jpegBlob) return null;
    return {
      width: canvas.width,
      height: canvas.height,
      bytes: new Uint8Array(await jpegBlob.arrayBuffer())
    };
  } catch {
    return null;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function buildTablePdf({ title, subtitle, rows, columns, scopeLabel, totalLabel, footerLabel }) {
  const width = 842;
  const height = 595;
  const margin = 34;
  const headerTop = 516;
  const tableTop = 444;
  const headerHeight = 25;
  const bottomLimit = 56;
  const generatedAt = new Date();
  const safeRows = Array.isArray(rows) ? rows : [];
  const pdfColumns = makeColumns(columns, width, margin);
  const logo = await getLogoImage();
  const measuredRows = safeRows.map((row) => measureRow(row, pdfColumns));
  const pages = [];
  let currentRows = [];
  let usedHeight = 0;

  measuredRows.forEach((row) => {
    const available = tableTop - headerHeight - bottomLimit;
    if (currentRows.length && usedHeight + row.height > available) {
      pages.push(currentRows);
      currentRows = [];
      usedHeight = 0;
    }
    currentRows.push(row);
    usedHeight += row.height;
  });

  if (currentRows.length || !pages.length) pages.push(currentRows);

  const totalPages = pages.length;
  const pageContents = pages.map((chunk, pageIndex) => {
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
    const image = (name, x, y, w, h, opacity = '') => {
      if (!logo) return;
      commands.push('q');
      if (opacity) commands.push(`/${opacity} gs`);
      commands.push(`${w} 0 0 ${h} ${x} ${y} cm`, `/${name} Do`, 'Q');
    };

    rect(0, 0, width, height, '0.98 0.99 1.00');
    image('Im1', 210, 135, 420, 300, 'GSWatermark');

    rect(margin, headerTop, width - margin * 2, 52, '0.02 0.11 0.22', '0.16 0.52 0.78');
    if (logo) {
      image('Im1', margin + 14, headerTop + 8, 72, 36);
    } else {
      rect(margin + 14, headerTop + 10, 52, 28, '0.92 0.96 1.00');
      text(margin + 25, headerTop + 19, 'TN', 13, 'F2', '0.05 0.22 0.42');
    }
    text(margin + 98, headerTop + 32, COMPANY_NAME, 17, 'F2', '0.96 0.99 1.00');
    text(margin + 98, headerTop + 15, subtitle, 10, 'F1', '0.68 0.82 0.96');
    text(604, headerTop + 32, `Generado: ${generatedAt.toLocaleDateString('es-MX')}`, 8.5, 'F1', '0.92 0.97 1.00');
    text(604, headerTop + 16, scopeLabel, 8.5, 'F1', '0.76 0.88 0.98');
    text(margin, 490, title, 11, 'F2');
    text(690, 490, `Pagina ${pageIndex + 1} de ${totalPages}`, 8.5, 'F1', '0.35 0.45 0.58');

    rect(margin, tableTop, width - margin * 2, headerHeight, '0.04 0.14 0.26', '0.18 0.49 0.74');
    pdfColumns.forEach((column) => text(column.x + 6, tableTop + 9, column.label, 7.5, 'F2', '0.62 0.86 1.00'));

    if (!chunk.length) {
      rect(margin, tableTop - 46, width - margin * 2, 46, '1.00 1.00 1.00', '0.82 0.88 0.94');
      text(margin + 14, tableTop - 27, 'No hay datos para este filtro.', 10, 'F1', '0.35 0.45 0.58');
    }

    let yCursor = tableTop - headerHeight;
    chunk.forEach((row, index) => {
      const y = yCursor - row.height;
      rect(margin, y, width - margin * 2, row.height, index % 2 ? '0.94 0.97 1.00' : '1.00 1.00 1.00', '0.80 0.88 0.95');
      pdfColumns.slice(1).forEach((column) => line(column.x, y, column.x, y + row.height, '0.86 0.91 0.96', .45));

      row.cells.forEach((cell) => {
        cell.lines.forEach((lineText, lineIndex) => {
          text(cell.x + 6, y + row.height - 15 - (lineIndex * 10.2), lineText, cell.size, cell.font);
        });
      });
      yCursor = y;
    });

    line(margin, 38, width - margin, 38, '0.72 0.82 0.92', .8);
    text(margin, 22, `${COMPANY_NAME} - ${footerLabel}`, 8, 'F1', '0.35 0.45 0.58');
    text(620, 22, totalLabel, 8, 'F1', '0.35 0.45 0.58');
    return commands.join('\n');
  });

  const objects = [
    { body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { body: `<< /Type /Pages /Kids [${pageContents.map((_, index) => `${3 + index} 0 R`).join(' ')}] /Count ${pageContents.length} >>` }
  ];
  const contentStart = 3 + pageContents.length;
  const fontRegularId = contentStart + pageContents.length + (logo ? 1 : 0);
  const fontBoldId = fontRegularId + 1;
  const logoId = logo ? contentStart + pageContents.length : null;

  pageContents.forEach((_, index) => {
    const xObject = logo ? `/XObject << /Im1 ${logoId} 0 R >>` : '';
    const extGState = logo ? '/ExtGState << /GSWatermark << /ca 0.055 /CA 0.055 >> >>' : '';
    objects.push({
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> ${xObject} ${extGState} >> /Contents ${contentStart + index} 0 R >>`
    });
  });

  pageContents.forEach((content) => {
    objects.push({ body: `<< /Length ${PDF_ENCODER.encode(content).length} >>\nstream\n${content}\nendstream` });
  });

  if (logo) {
    objects.push({
      body: `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`,
      bytes: logo.bytes,
      tail: '\nendstream'
    });
  }

  objects.push({ body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' });
  objects.push({ body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>' });

  const parts = [];
  const offsets = [0];
  let cursor = 0;
  const appendString = (value) => {
    parts.push(value);
    cursor += PDF_ENCODER.encode(value).length;
  };
  const appendBytes = (value) => {
    parts.push(value);
    cursor += value.length;
  };

  appendString('%PDF-1.4\n');
  objects.forEach((object, index) => {
    offsets.push(cursor);
    appendString(`${index + 1} 0 obj\n${object.body}`);
    if (object.bytes) appendBytes(object.bytes);
    if (object.tail) appendString(object.tail);
    appendString('\nendobj\n');
  });

  const xref = cursor;
  appendString(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    appendString(`${String(offset).padStart(10, '0')} 00000 n \n`);
  });
  appendString(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob(parts, { type: 'application/pdf' });
}
