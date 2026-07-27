const SHOP_NAME = 'MCK';
const SHOP_FULL_NAME = 'Multy Corner Kattankudy';
const SHOP_ADDRESS = 'Main Street Kattankudy -06';
const SHOP_CONTACT = '0771383333 / 0782036797';

function formatCurrency(value) {
  const amount = Number(value || 0);

  return `LKR ${amount.toLocaleString('en-US')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getProductShop(product) {
  return (
    product.shop ||
    product.purchasedFrom ||
    product.supplier ||
    product.purchaseShop ||
    '—'
  );
}

function getProductBrand(product) {
  return product.brand || product.productBrand || '—';
}

function getStockStatus(product) {
  const stock = Number(product.currentStock || 0);
  const minAlert = Number(product.minStockAlert || 0);

  if (stock <= 0) return 'Out of Stock';
  if (stock <= minAlert) return 'Low Stock';
  return 'Available';
}

export function downloadProductStockPdf(products = [], options = {}) {
  const shopFilter = options.shopFilter || '';
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.currentStock || 0),
    0
  );

  const totalValue = products.reduce(
    (sum, product) =>
      sum +
      Number(product.currentStock || 0) * Number(product.sellingPrice || 0),
    0
  );

  const rowsHtml = products.length
    ? products
        .map(
          (product, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(product.name || '—')}</td>
              <td>${escapeHtml(getProductBrand(product))}</td>
              <td>${escapeHtml(getProductShop(product))}</td>
              <td class="right">${Number(product.currentStock || 0)}</td>
              <td class="right">${Number(product.minStockAlert || 0)}</td>
              <td class="right">${formatCurrency(product.sellingPrice)}</td>
              <td>${escapeHtml(getStockStatus(product))}</td>
            </tr>
          `
        )
        .join('')
    : `
        <tr>
          <td colspan="8" class="empty">No product stock records found</td>
        </tr>
      `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${SHOP_NAME} Product Stock Report</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 32px;
            background: #f1f5f9;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
          }

          .page {
            max-width: 1100px;
            margin: 0 auto;
            background: white;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 15px 45px rgba(15, 23, 42, 0.12);
          }

          .top-band {
            height: 12px;
            background: linear-gradient(90deg, #2563eb, #0f172a, #16a34a);
          }

          .header {
            padding: 28px 34px 20px;
            border-bottom: 1px solid #e2e8f0;
          }

          .shop-title {
            margin: 0;
            font-size: 34px;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #0f172a;
          }

          .shop-subtitle {
            margin: 6px 0 0;
            font-size: 16px;
            font-weight: 700;
            color: #2563eb;
          }

          .shop-details {
            margin: 8px 0 0;
            font-size: 13px;
            color: #475569;
            line-height: 1.5;
          }

          .report-title {
            margin-top: 22px;
            display: inline-block;
            border-radius: 999px;
            background: #eff6ff;
            color: #1d4ed8;
            padding: 10px 18px;
            font-size: 18px;
            font-weight: 900;
          }

          .meta {
            margin-top: 14px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .meta-card {
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 12px 14px;
            background: #f8fafc;
          }

          .meta-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 800;
          }

          .meta-value {
            margin-top: 5px;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }

          .content {
            padding: 26px 34px 30px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          thead th {
            background: #0f172a;
            color: white;
            padding: 13px 10px;
            text-align: left;
            font-weight: 800;
            border: 1px solid #0f172a;
          }

          tbody td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .right {
            text-align: right;
            font-weight: 700;
          }

          .empty {
            text-align: center;
            padding: 30px;
            color: #64748b;
          }

          .summary {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .summary-card {
            border-radius: 16px;
            padding: 16px;
            color: white;
          }

          .blue {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
          }

          .green {
            background: linear-gradient(135deg, #059669, #047857);
          }

          .purple {
            background: linear-gradient(135deg, #9333ea, #7e22ce);
          }

          .summary-label {
            font-size: 12px;
            opacity: 0.85;
            font-weight: 700;
          }

          .summary-value {
            margin-top: 8px;
            font-size: 22px;
            font-weight: 900;
          }

          .footer {
            margin-top: 26px;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .page {
              box-shadow: none;
              border-radius: 0;
            }

            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>

      <body>
        <div class="page">
          <div class="top-band"></div>

          <div class="header">
            <h1 class="shop-title">${SHOP_NAME}</h1>
            <p class="shop-subtitle">${SHOP_FULL_NAME}</p>
            <p class="shop-details">
              ${SHOP_ADDRESS}<br />
              Contact: ${SHOP_CONTACT}
            </p>

            <div class="report-title">Product Stock Report</div>

            <div class="meta">
              <div class="meta-card">
                <div class="meta-label">Shop Filter</div>
                <div class="meta-value">${escapeHtml(shopFilter || 'All shops')}</div>
              </div>

              <div class="meta-card">
                <div class="meta-label">Generated At</div>
                <div class="meta-value">${generatedAt}</div>
              </div>

              <div class="meta-card">
                <div class="meta-label">Report Type</div>
                <div class="meta-value">Product Stock</div>
              </div>
            </div>
          </div>

          <div class="content">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Purchased From</th>
                  <th>Stock</th>
                  <th>Min Alert</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-card blue">
                <div class="summary-label">Total Records</div>
                <div class="summary-value">${products.length}</div>
              </div>

              <div class="summary-card green">
                <div class="summary-label">Total Stock Quantity</div>
                <div class="summary-value">${totalStock}</div>
              </div>

              <div class="summary-card purple">
                <div class="summary-label">Stock Value</div>
                <div class="summary-value">${formatCurrency(totalValue)}</div>
              </div>
            </div>

            <div class="footer">
              Generated by ${SHOP_NAME} Billing System • ${SHOP_FULL_NAME}
            </div>
          </div>
        </div>

        <script>
          window.onload = function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 700);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    alert('Popup blocked. Please allow popups for this website and try again.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}