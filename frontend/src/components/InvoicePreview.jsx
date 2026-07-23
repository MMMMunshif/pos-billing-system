import { useMemo, useRef } from 'react';
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

export default function InvoicePreview({ invoice, onClose }) {
  const invoiceRef = useRef(null);

  const whatsappMessage = useMemo(() => {
    if (!invoice) return '';

    const itemLines = invoice.items
      .map(
        (item, index) =>
          `${index + 1}. ${item.productName} - ${item.quantity} x ${formatCurrency(
            item.unitPrice
          )} = ${formatCurrency(item.quantity * item.unitPrice)}`
      )
      .join('\n');

    return `${SHOP_NAME}
${SHOP_ADDRESS}
Contact: ${SHOP_CONTACT}

Invoice No: ${invoice.invoiceNo}
Date: ${invoice.saleDate}
Customer: ${invoice.customerName || 'Walk-in Customer'}

Items:
${itemLines}

Subtotal: ${formatCurrency(invoice.subtotal)}
Paid: ${formatCurrency(invoice.paidAmount)}
Balance: ${formatCurrency(invoice.balance)}
Payment Type: ${invoice.paymentType}

Thank you for shopping with us.`;
  }, [invoice]);

  if (!invoice) return null;

  const handlePrint = () => {
    const printContent = invoiceRef.current.innerHTML;

    const printWindow = window.open('', '_blank', 'width=800,height=900');

    printWindow.document.write(`
      <html>
        <head>
          <title>${invoice.invoiceNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #111827;
            }

            .invoice-box {
              max-width: 760px;
              margin: auto;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 24px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #111827;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }

            .shop-title {
              font-size: 24px;
              font-weight: bold;
              margin: 0;
            }

            .muted {
              color: #64748b;
              font-size: 13px;
              margin: 4px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
            }

            th {
              background: #111827;
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 13px;
            }

            td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }

            .right {
              text-align: right;
            }

            .summary {
              margin-top: 18px;
              width: 300px;
              margin-left: auto;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .total {
              font-weight: bold;
              font-size: 18px;
            }

            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 13px;
              color: #64748b;
            }

            @media print {
              body {
                padding: 0;
              }

              .invoice-box {
                border: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
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
          <div ref={invoiceRef}>
            <div className="invoice-box rounded-2xl border border-slate-200 p-6">
              <div className="header flex justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="shop-title text-2xl font-bold text-slate-900">
                    {SHOP_NAME}
                  </h1>
                  <p className="muted text-sm text-slate-500">{SHOP_ADDRESS}</p>
                  <p className="muted text-sm text-slate-500">
                    Contact: {SHOP_CONTACT}
                  </p>
                </div>

                <div className="text-right">
                  <h2 className="text-xl font-bold text-slate-900">INVOICE</h2>
                  <p className="text-sm text-slate-500">{invoice.invoiceNo}</p>
                  <p className="text-sm text-slate-500">{invoice.saleDate}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Bill To:</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {invoice.customerName || 'Walk-in Customer'}
                  </p>
                  {invoice.customerPhone && (
                    <p className="text-sm text-slate-500">
                      Phone: {invoice.customerPhone}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-sm text-slate-500">
                    Payment Type: <b>{invoice.paymentType}</b>
                  </p>
                </div>
              </div>

              <table className="mt-6 w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-3 py-3 text-left text-sm">#</th>
                    <th className="px-3 py-3 text-left text-sm">Item Name</th>
                    <th className="px-3 py-3 text-right text-sm">Qty</th>
                    <th className="px-3 py-3 text-right text-sm">Unit Price</th>
                    <th className="px-3 py-3 text-right text-sm">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      <td className="px-3 py-3 text-sm">{index + 1}</td>
                      <td className="px-3 py-3 text-sm">{item.productName}</td>
                      <td className="px-3 py-3 text-right text-sm">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-3 text-right text-sm">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 ml-auto w-full max-w-sm space-y-2">
                <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
                  <span>Subtotal</span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
                  <span>Paid Amount</span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.paidAmount)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-200 py-2 text-sm">
                  <span>Balance</span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.balance)}
                  </span>
                </div>

                <div className="flex justify-between rounded-xl bg-slate-900 px-4 py-3 text-white">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
              </div>

              <p className="mt-8 text-center text-sm text-slate-500">
                Thank you for shopping with us.
              </p>
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