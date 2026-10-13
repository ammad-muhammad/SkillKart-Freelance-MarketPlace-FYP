/**
 * Server-side export helper.
 * Generates CSV, Excel (XLSX), and PDF buffers for download.
 *
 * Usage:
 *   const { exportToCSV, exportToExcel, exportToPDF } = require('../utils/exportHelper');
 *   const buf = exportToCSV(data, columns);
 *   res.setHeader('Content-Type', 'text/csv');
 *   res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
 *   res.send(buf);
 *
 * @param {Array<object>} data    - Array of plain objects
 * @param {Array<{label: string, key: string}>} columns - Column definitions
 */

// ─── CSV ──────────────────────────────────────────────────────────────────────

const exportToCSV = (data, columns) => {
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns
      .map(c => {
        const val = row[c.key] ?? '';
        // Wrap in quotes and escape internal quotes
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  const csv = [headers, ...rows].join('\n');
  return Buffer.from(csv, 'utf8');
};

// ─── Excel ────────────────────────────────────────────────────────────────────

const exportToExcel = async (data, columns, sheetName = 'Export') => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Header row
  sheet.columns = columns.map(c => ({
    header: c.label,
    key: c.key,
    width: Math.max(c.label.length + 4, 16)
  }));

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };
  sheet.getRow(1).font = { color: { argb: 'FFF1F5F9' }, bold: true };

  // Data rows
  data.forEach(row => {
    const rowData = {};
    columns.forEach(c => {
      rowData[c.key] = row[c.key] ?? '';
    });
    sheet.addRow(rowData);
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  return await workbook.xlsx.writeBuffer();
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

const exportToPDF = (data, columns, title = 'Export') => {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    // Calculate column width
    const pageWidth = doc.page.width - 60;
    const colWidth = Math.floor(pageWidth / columns.length);

    // Header row
    const startX = 30;
    let y = doc.y;

    doc.fillColor('#1e293b').rect(startX, y, pageWidth, 20).fill();
    doc.fillColor('#f1f5f9').fontSize(9).font('Helvetica-Bold');
    columns.forEach((col, i) => {
      doc.text(col.label, startX + i * colWidth + 2, y + 5, { width: colWidth - 4, ellipsis: true });
    });

    y += 22;

    // Data rows
    doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
    data.forEach((row, idx) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 30;
      }

      if (idx % 2 === 0) {
        doc.fillColor('#f8fafc').rect(startX, y, pageWidth, 18).fill();
        doc.fillColor('#0f172a');
      }

      columns.forEach((col, i) => {
        const val = String(row[col.key] ?? '');
        doc.text(val, startX + i * colWidth + 2, y + 4, { width: colWidth - 4, ellipsis: true });
      });

      y += 20;
    });

    doc.end();
  });
};

// ─── Response helper ──────────────────────────────────────────────────────────

/**
 * Stream export buffer to HTTP response with correct headers.
 * @param {object} res       - Express response
 * @param {Buffer} buffer    - Export buffer
 * @param {'csv'|'excel'|'pdf'} format
 * @param {string} filename  - Base filename without extension
 */
const sendExportResponse = (res, buffer, format, filename = 'export') => {
  const ts = new Date().toISOString().split('T')[0];
  const name = `${filename}_${ts}`;

  const mimes = {
    csv:   { mime: 'text/csv',                                          ext: 'csv' },
    excel: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx' },
    pdf:   { mime: 'application/pdf',                                   ext: 'pdf' }
  };

  const { mime, ext } = mimes[format] || mimes.csv;

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${name}.${ext}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
};

module.exports = { exportToCSV, exportToExcel, exportToPDF, sendExportResponse };
