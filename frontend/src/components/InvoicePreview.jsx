import { useMemo } from 'react';
import { formatCurrency } from '../utils/helpers';

const SHOP_NAME = 'Multy Corner Kattankudy';
const SHOP_ADDRESS = 'Main Street Kattankudy -06';
const SHOP_CONTACT = '0771383333 / 0782036797';

function normalizePhoneNumber(phone) {
  if (!phone) return '';

  let number = String(phone).replace(/\D/g, '');

  if (number.startsWith('0')) {
    number = `94${number.slice(1)}`;
  } else if (number.length === 9) {
    number = `94${number}`;
  }

  return number;
}

function getQuantity(item) {
  return Number(item.quantity || 0);
}

function getOriginalPrice(item) {
  return Number(item.originalPrice || item.unitPrice || 0);
}

function getUnitPrice(item) {
  return Number(item.unitPrice || 0);
}

function getDiscountAmount(item) {
  return Number(item.discountAmount || 0);
}

function getLineOriginalTotal(item) {
  if (item.lineOriginalTotal != null) {
    return Number(item.lineOriginalTotal || 0);
  }

  return getQuantity(item) * getOriginalPrice(item);
}

function getLineDiscountTotal(item) {
  if (item.lineDiscountTotal != null) {
    return Number(item.lineDiscountTotal || 0);
  }

  return getQuantity(item) * getDiscountAmount(item);
}

function getLineTotal(item) {
  if (item.lineTotal != null) {
    return Number(item.lineTotal || 0);
  }

  return getQuantity(item) * getUnitPrice(item);
}

function getOriginalSubtotal(invoice) {
  if (invoice.originalSubtotal != null) {
    return Number(invoice.originalSubtotal || 0);
  }

  return invoice.items.reduce((sum, item) => sum + getLineOriginalTotal(item), 0);
}

function getTotalDiscount(invoice) {
  if (invoice.totalDiscount != null) {
    return Number(invoice.totalDiscount || 0);
  }

  return invoice.items.reduce((sum, item) => sum + getLineDiscountTotal(item), 0);
}

function getFinalTotal(invoice) {
  if (invoice.finalTotal != null) {
    return Number(invoice.finalTotal || 0);
  }

  if (invoice.subtotal != null) {
    return Number(invoice.subtotal || 0);
  }

  return Math.max(getOriginalSubtotal(invoice) - getTotalDiscount(invoice), 0);
}

function getDiscountLabel(item) {
  const discountType = item.discountType || 'none';
  const discountValue = Number(item.discountValue || 0);
  const discountAmount = getDiscountAmount(item);

  if (discountAmount <= 0 || discountType === 'none') {
    return '—';
  }

  if (discountType === 'percentage') {
    return `${discountValue}%`;
  }

  if (discountType === 'fixed') {
    return formatCurrency(discountValue);
  }

  return formatCurrency(discountAmount);
}

function getInvoiceHtml(invoice) {
  const originalSubtotal = getOriginalSubtotal(invoice);
  const totalDiscount = getTotalDiscount(invoice);
  const finalTotal = getFinalTotal(invoice);

  const itemRows = invoice.items
    .map((item, index) => {
      const quantity = getQuantity(item);
      const originalPrice = getOriginalPrice(item);
      const unitPrice = getUnitPrice(item);
      const lineTotal = getLineTotal(item);
      const discountLabel = getDiscountLabel(item);

      return `
        <tr>
          <td>${index + 1}</td>
          <td class="item-name">${item.productName}</td>
          <td class="right">${quantity}</td>
          <td class="right">${formatCurrency(originalPrice)}</td>
          <td class="right discount">${discountLabel}</td>
          <td class="right">${formatCurrency(unitPrice)}</td>
          <td class="right strong">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${invoice.invoiceNo}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, Helvetica, sans-serif;
            background: #f1f5f9;
            color: #0f172a;
          }

          .invoice-page {
            max-width: 940px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
          }

          .top-band {
            height: 12px;
            background: linear-gradient(90deg, #dc2626, #f97316, #2563eb);
          }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 28px 34px 22px;
            border-bottom: 2px solid #e2e8f0;
          }

          .shop-name {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            color: #111827;
          }

          .shop-info {
            margin-top: 6px;
            font-size: 13px;
            color: #475569;
            line-height: 1.6;
          }

          .invoice-title {
            text-align: right;
          }

          .invoice-title h2 {
            margin: 0;
            font-size: 28px;
            color: #dc2626;
            letter-spacing: 1px;
          }

          .invoice-meta {
            margin-top: 8px;
            font-size: 13px;
            color: #475569;
            line-height: 1.7;
          }

          .section {
            padding: 24px 34px;
          }

          .bill-box {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 18px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }

          .label {
            font-size: 12px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .customer-name {
            margin-top: 8px;
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }

          .small {
            margin-top: 6px;
            font-size: 13px;
            color: #475569;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
            overflow: hidden;
            border-radius: 14px;
          }

          thead th {
            background: #dc2626;
            color: #ffffff;
            padding: 13px 10px;
            font-size: 12px;
            text-align: left;
          }

          tbody td {
            padding: 13px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            color: #0f172a;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .item-name {
            font-weight: 700;
          }

          .right {
            text-align: right;
          }

          .strong {
            font-weight: 800;
          }

          .discount {
            color: #16a34a;
            font-weight: 800;
          }

          .summary-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 24px;
          }

          .summary {
            width: 380px;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid #e2e8f0;
            background: #ffffff;
          }

          .summary-row:last-child {
            border-bottom: none;
          }

          .discount-row {
            background: #f0fdf4;
            color: #15803d;
            font-weight: 800;
          }

          .summary-total {
            background: #111827;
            color: #ffffff;
            font-size: 17px;
            font-weight: 800;
          }

          .balance-row {
            background: #fff7ed;
            color: #c2410c;
            font-weight: 800;
          }

          .footer {
            margin-top: 28px;
            padding: 18px;
            border-radius: 14px;
            text-align: center;
            background: #f8fafc;
            color: #475569;
            font-size: 13px;
          }

          .thank {
            font-size: 15px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 5px;
          }

          @media print {
            body {
              padding: 0;
              background: #ffffff;
            }

            .invoice-page {
              box-shadow: none;
              border-radius: 0;
              border: none;
              max-width: none;
            }

            .top-band,
            thead th,
            .summary-total,
            .balance-row,
            .discount-row {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>

      <body>
        <div class="invoice-page">
          <div class="top-band"></div>

          <div class="header">
            <div>
              <h1 class="shop-name">${SHOP_NAME}</h1>
              <div class="shop-info">
                ${SHOP_ADDRESS}<br />
                Contact: ${SHOP_CONTACT}
              </div>
            </div>

            <div class="invoice-title">
              <h2>INVOICE</h2>
              <div class="invoice-meta">
                <b>${invoice.invoiceNo}</b><br />
                ${invoice.saleDate}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="bill-box">
              <div>
                <div class="label">Bill To</div>
                <div class="customer-name">
                  ${invoice.customerName || 'Walk-in Customer'}
                </div>
                ${
                  invoice.customerPhone
                    ? `<div class="small">Phone: ${invoice.customerPhone}</div>`
                    : ''
                }
              </div>

              <div style="text-align: right;">
                <div class="label">Payment Type</div>
                <div class="small">
                  <b>${invoice.paymentType}</b>
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 45px;">#</th>
                  <th>Item Name</th>
                  <th class="right" style="width: 65px;">Qty</th>
                  <th class="right" style="width: 120px;">Price</th>
                  <th class="right" style="width: 105px;">Discount</th>
                  <th class="right" style="width: 120px;">Final Price</th>
                  <th class="right" style="width: 130px;">Amount</th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <div class="summary-wrap">
              <div class="summary">
                <div class="summary-row">
                  <span>Original Subtotal</span>
                  <b>${formatCurrency(originalSubtotal)}</b>
                </div>

                <div class="summary-row discount-row">
                  <span>Total Discount</span>
                  <b>- ${formatCurrency(totalDiscount)}</b>
                </div>

                <div class="summary-row">
                  <span>Paid Amount</span>
                  <b>${formatCurrency(invoice.paidAmount)}</b>
                </div>

                <div class="summary-row balance-row">
                  <span>Balance</span>
                  <b>${formatCurrency(invoice.balance)}</b>
                </div>

                <div class="summary-row summary-total">
                  <span>Total</span>
                  <span>${formatCurrency(finalTotal)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="thank">Thank you for shopping with us.</div>
              <div>Generated by Multy Corner Kattankudy Billing System</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export default function InvoicePreview({ invoice, onClose }) {
  const originalSubtotal = getOriginalSubtotal(invoice);
  const totalDiscount = getTotalDiscount(invoice);
  const finalTotal = getFinalTotal(invoice);

  const whatsappMessage = useMemo(() => {
    if (!invoice) return '';

    const itemLines = invoice.items
      .map((item, index) => {
        const quantity = getQuantity(item);
        const originalPrice = getOriginalPrice(item);
        const unitPrice = getUnitPrice(item);
        const lineTotal = getLineTotal(item);
        const discountLabel = getDiscountLabel(item);

        return `${index + 1}. ${item.productName}
Qty: ${quantity}
Price: ${formatCurrency(originalPrice)}
Discount: ${discountLabel}
Final Price: ${formatCurrency(unitPrice)}
Amount: ${formatCurrency(lineTotal)}`;
      })
      .join('\n\n');

    return `${SHOP_NAME}
${SHOP_ADDRESS}
Contact: ${SHOP_CONTACT}

Invoice No: ${invoice.invoiceNo}
Date: ${invoice.saleDate}
Customer: ${invoice.customerName || 'Walk-in Customer'}

Items:
${itemLines}

Original Subtotal: ${formatCurrency(originalSubtotal)}
Total Discount: - ${formatCurrency(totalDiscount)}
Total: ${formatCurrency(finalTotal)}
Paid: ${formatCurrency(invoice.paidAmount)}
Balance: ${formatCurrency(invoice.balance)}
Payment Type: ${invoice.paymentType}

Thank you for shopping with us.`;
  }, [invoice, originalSubtotal, totalDiscount, finalTotal]);

  if (!invoice) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=950');

    if (!printWindow) {
      alert('Popup blocked. Please allow popups and try again.');
      return;
    }

    printWindow.document.write(getInvoiceHtml(invoice));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const handleWhatsApp = () => {
    const phone = normalizePhoneNumber(invoice.customerPhone);

    if (!phone) {
      alert(
        'Customer phone number not found. Please select a registered customer with phone number.'
      );
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    window.open(url, '_blank');
  };

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(whatsappMessage);
    alert('Invoice message copied.');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 py-6">
     <div className="relative z-[10000] max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex justify-end px-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-3 bg-gradient-to-r from-red-600 via-orange-500 to-blue-600"></div>

            <div className="flex justify-between gap-6 border-b border-slate-200 p-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {SHOP_NAME}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{SHOP_ADDRESS}</p>
                <p className="text-sm text-slate-500">Contact: {SHOP_CONTACT}</p>
              </div>

              <div className="text-right">
                <h2 className="text-2xl font-extrabold tracking-wide text-red-600">
                  INVOICE
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {invoice.invoiceNo}
                </p>
                <p className="text-sm text-slate-500">{invoice.saleDate}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Bill To
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-slate-900">
                    {invoice.customerName || 'Walk-in Customer'}
                  </p>
                  {invoice.customerPhone && (
                    <p className="text-sm text-slate-500">
                      Phone: {invoice.customerPhone}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Payment Type
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {invoice.paymentType}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-red-600 text-white">
                      <th className="px-3 py-3 text-left text-sm">#</th>
                      <th className="px-3 py-3 text-left text-sm">Item Name</th>
                      <th className="px-3 py-3 text-right text-sm">Qty</th>
                      <th className="px-3 py-3 text-right text-sm">Price</th>
                      <th className="px-3 py-3 text-right text-sm">Discount</th>
                      <th className="px-3 py-3 text-right text-sm">Final Price</th>
                      <th className="px-3 py-3 text-right text-sm">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoice.items.map((item, index) => {
                      const quantity = getQuantity(item);
                      const originalPrice = getOriginalPrice(item);
                      const unitPrice = getUnitPrice(item);
                      const lineTotal = getLineTotal(item);
                      const discountLabel = getDiscountLabel(item);

                      return (
                        <tr
                          key={index}
                          className="border-b border-slate-200 even:bg-slate-50"
                        >
                          <td className="px-3 py-3 text-sm">{index + 1}</td>
                          <td className="px-3 py-3 text-sm font-semibold">
                            {item.productName}
                          </td>
                          <td className="px-3 py-3 text-right text-sm">
                            {quantity}
                          </td>
                          <td className="px-3 py-3 text-right text-sm">
                            {formatCurrency(originalPrice)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-bold text-green-700">
                            {discountLabel}
                          </td>
                          <td className="px-3 py-3 text-right text-sm">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="px-3 py-3 text-right text-sm font-bold">
                            {formatCurrency(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 ml-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex justify-between border-b border-slate-200 px-4 py-3 text-sm">
                  <span>Original Subtotal</span>
                  <span className="font-bold">
                    {formatCurrency(originalSubtotal)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <span className="font-bold">Total Discount</span>
                  <span className="font-extrabold">
                    - {formatCurrency(totalDiscount)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 px-4 py-3 text-sm">
                  <span>Paid Amount</span>
                  <span className="font-bold">
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  <span className="font-bold">Balance</span>
                  <span className="font-extrabold">
                    {formatCurrency(invoice.balance)}
                  </span>
                </div>

                <div className="flex justify-between bg-slate-900 px-4 py-4 text-white">
                  <span className="font-extrabold">Total</span>
                  <span className="font-extrabold">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                <p className="font-bold text-slate-900">
                  Thank you for shopping with us.
                </p>
                <p>Generated by Multy Corner Kattankudy Billing System</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Copy Bill Text
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              Send WhatsApp
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}