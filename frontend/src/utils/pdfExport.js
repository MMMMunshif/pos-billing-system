const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 40;
const TOP_Y = 800;
const ROW_HEIGHT = 18;
const BOTTOM_Y = 50;

const toSafeText = (value) =>
  String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapePdfText = (value) =>
  toSafeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const truncate = (value, maxLength) => {
  const text = toSafeText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const text = (value, x, y, size = 10, font = 'F1') =>
  `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;

const line = (x1, y1, x2, y2) => `0.5 w ${x1} ${y1} m ${x2} ${y2} l S`;

const rectFill = (x, y, width, height) => `${x} ${y} ${width} ${height} re f`;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatGeneratedAt = () =>
  new Intl.DateTimeFormat('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

function buildProductStockPages(rows, options = {}) {
  const shopLabel = options.shopFilter ? `Shop: ${options.shopFilter}` : 'Shop: All shops';
  const pages = [];
  let commands = [];
  let y = TOP_Y;
  let pageNo = 0;

  const columns = [
    { title: 'Product', x: 40, width: 105, key: 'name', max: 18 },
    { title: 'Brand', x: 150, width: 75, key: 'brand', max: 13 },
    { title: 'Purchased From', x: 230, width: 120, key: 'shop', max: 20 },
    { title: 'Stock', x: 355, width: 50, key: 'currentStock', max: 8 },
    { title: 'Min Alert', x: 410, width: 60, key: 'minStockAlert', max: 8 },
    { title: 'Price', x: 475, width: 80, key: 'sellingPrice', max: 14 },
  ];

  const addHeader = () => {
    pageNo += 1;
    y = TOP_Y;
    commands = [];
    commands.push('0 0 0 rg');
    commands.push(text('Fancy Item Shop', MARGIN_X, y, 16, 'F2'));
    y -= 22;
    commands.push(text('Product Stock Report', MARGIN_X, y, 14, 'F2'));
    y -= 18;
    commands.push(text(`${shopLabel}    |    Generated: ${formatGeneratedAt()}`, MARGIN_X, y, 9, 'F1'));
    y -= 12;
    commands.push(line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y));
    y -= 22;

    commands.push('0.93 0.96 1 rg');
    commands.push(rectFill(MARGIN_X, y - 5, PAGE_WIDTH - MARGIN_X * 2, 18));
    commands.push('0 0 0 rg');

    columns.forEach((col) => {
      commands.push(text(col.title, col.x, y, 9, 'F2'));
    });
    y -= 14;
    commands.push(line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y));
    y -= 16;
  };

  const finishPage = () => {
    commands.push(line(MARGIN_X, 38, PAGE_WIDTH - MARGIN_X, 38));
    commands.push(text(`Page ${pageNo}`, PAGE_WIDTH - 85, 24, 8, 'F1'));
    pages.push(commands.join('\n'));
  };

  addHeader();

  if (!rows.length) {
    commands.push(text('No product stock records found.', MARGIN_X, y, 10, 'F1'));
  }

  rows.forEach((row) => {
    if (y < BOTTOM_Y + ROW_HEIGHT) {
      finishPage();
      addHeader();
    }

    const values = {
      name: truncate(row.name, 18),
      brand: truncate(row.brand || '-', 13),
      shop: truncate(row.shop || '-', 20),
      currentStock: String(row.currentStock ?? 0),
      minStockAlert: String(row.minStockAlert ?? 0),
      sellingPrice: formatCurrency(row.sellingPrice),
    };

    columns.forEach((col) => {
      commands.push(text(values[col.key], col.x, y, 9, 'F3'));
    });
    y -= ROW_HEIGHT;
    commands.push(line(MARGIN_X, y + 7, PAGE_WIDTH - MARGIN_X, y + 7));
  });

  y -= 10;
  const totalStock = rows.reduce((sum, row) => sum + Number(row.currentStock || 0), 0);
  commands.push(text(`Total records: ${rows.length}    |    Total stock quantity: ${totalStock}`, MARGIN_X, y, 10, 'F2'));
  finishPage();

  return pages;
}

function createPdfBlob(pageContents) {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontRegularId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const fontMonoId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  const pageIds = [];
  pageContents.forEach((content) => {
    const stream = `q\n${content}\nQ`;
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadProductStockPdf(rows, options = {}) {
  const pageContents = buildProductStockPages(rows, options);
  const blob = createPdfBlob(pageContents);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `product-stock-report-${date}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
