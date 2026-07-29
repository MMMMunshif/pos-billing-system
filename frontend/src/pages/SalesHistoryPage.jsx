import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import InvoicePreview from '../components/InvoicePreview';
import LoadingSpinner from '../components/LoadingSpinner';
import { getSales, getSaleItems, cancelSale } from '../services/salesService';
import { formatCurrency, formatDateTime } from '../utils/helpers';

function getArrayFromApiResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.sales)) return result.sales;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.sales)) return result.data.sales;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  return [];
}

function getSaleId(sale) {
  return sale.id || sale.saleId || sale._id || '';
}

function getSaleStatus(sale) {
  return String(sale.status || 'active').toLowerCase();
}

function isCancelledSale(sale) {
  return getSaleStatus(sale) === 'cancelled';
}

function getSaleDate(sale) {
  const value = sale.saleDate || sale.createdAt || sale.date || '';

  if (!value) return '-';
  if (typeof value === 'string') return value.slice(0, 10);

  if (value?.seconds) {
    return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function getCustomerName(sale) {
  return sale.customerName || sale.customer?.name || 'Walk-in Customer';
}

function getCustomerPhone(sale) {
  return (
    sale.customerPhone ||
    sale.phone ||
    sale.customer?.phone ||
    sale.customer?.phoneNumber ||
    ''
  );
}

function getSaleTotal(sale) {
  return (
    Number(sale.finalTotal) ||
    Number(sale.subtotal) ||
    Number(sale.totalAmount) ||
    Number(sale.total) ||
    Number(sale.amount) ||
    0
  );
}

function getOriginalSubtotal(sale, items) {
  if (sale.originalSubtotal != null) {
    return Number(sale.originalSubtotal || 0);
  }

  return items.reduce((sum, item) => {
    const qty = Number(item.quantity || item.qty || 0);
    const originalPrice = Number(
      item.originalPrice || item.unitPrice || item.price || 0
    );

    return sum + qty * originalPrice;
  }, 0);
}

function getTotalDiscount(sale, items) {
  if (sale.totalDiscount != null) {
    return Number(sale.totalDiscount || 0);
  }

  return items.reduce((sum, item) => {
    const qty = Number(item.quantity || item.qty || 0);
    const discountAmount = Number(item.discountAmount || 0);

    return sum + qty * discountAmount;
  }, 0);
}

function getPaidAmount(sale) {
  return Number(sale.paidAmount || sale.paid || 0);
}

function getBalance(sale) {
  if (sale.balance != null) return Number(sale.balance || 0);

  const total = getSaleTotal(sale);
  const paid = getPaidAmount(sale);

  return Math.max(total - paid, 0);
}

function createInvoiceNo(sale) {
  if (sale.invoiceNo) return sale.invoiceNo;

  const saleId = getSaleId(sale);
  if (saleId) return `INV-${saleId.slice(-6).toUpperCase()}`;

  return `INV-${Date.now().toString().slice(-6)}`;
}

function normalizeItem(item) {
  const quantity = Number(item.quantity || item.qty || 0);
  const unitPrice = Number(item.unitPrice || item.finalPrice || item.price || 0);
  const originalPrice = Number(
    item.originalPrice || item.sellingPrice || unitPrice
  );
  const discountAmount = Number(
    item.discountAmount || Math.max(originalPrice - unitPrice, 0)
  );

  return {
    productId: item.productId || item.id || '',
    productName: item.productName || item.name || item.itemName || 'Product',
    quantity,
    originalPrice,
    unitPrice,
    discountType: item.discountType || 'none',
    discountValue: Number(item.discountValue || 0),
    discountAmount,
    lineOriginalTotal: quantity * originalPrice,
    lineDiscountTotal: quantity * discountAmount,
    lineTotal: quantity * unitPrice,
  };
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [cancellingSaleId, setCancellingSaleId] = useState('');
  const [invoice, setInvoice] = useState(null);

  const loadSales = async () => {
    setLoading(true);

    try {
      const result = await getSales(500);
      setSales(getArrayFromApiResult(result));
    } catch (error) {
      console.error('Sales history load error:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    const q = search.toLowerCase().trim();

    return sales.filter((sale) => {
      const saleDate = getSaleDate(sale);
      const customerName = getCustomerName(sale).toLowerCase();
      const paymentType = String(sale.paymentType || '').toLowerCase();
      const invoiceNo = createInvoiceNo(sale).toLowerCase();
      const status = getSaleStatus(sale);

      const matchesSearch =
        !q ||
        customerName.includes(q) ||
        paymentType.includes(q) ||
        invoiceNo.includes(q) ||
        status.includes(q);

      const matchesDate = !dateFilter || saleDate === dateFilter;

      const matchesPayment =
        !paymentFilter ||
        String(sale.paymentType || '').toLowerCase() ===
          paymentFilter.toLowerCase();

      const matchesStatus =
        !statusFilter || status === statusFilter.toLowerCase();

      return matchesSearch && matchesDate && matchesPayment && matchesStatus;
    });
  }, [sales, search, dateFilter, paymentFilter, statusFilter]);

  const summary = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => {
        if (isCancelledSale(sale)) {
          acc.cancelledCount += 1;
          return acc;
        }

        acc.count += 1;
        acc.total += getSaleTotal(sale);
        acc.paid += getPaidAmount(sale);
        acc.balance += getBalance(sale);

        return acc;
      },
      { count: 0, cancelledCount: 0, total: 0, paid: 0, balance: 0 }
    );
  }, [filteredSales]);

  const handleViewInvoice = async (sale) => {
    setLoadingInvoice(true);

    try {
      const saleId = getSaleId(sale);
      let items = [];

      if (Array.isArray(sale.items) && sale.items.length) {
        items = sale.items.map(normalizeItem);
      } else if (saleId) {
        const result = await getSaleItems(saleId);
        items = getArrayFromApiResult(result).map(normalizeItem);
      }

      if (!items.length) {
        const total = getSaleTotal(sale);

        items = [
          {
            productId: saleId,
            productName: 'Sale total',
            quantity: 1,
            originalPrice: total,
            unitPrice: total,
            discountType: 'none',
            discountValue: 0,
            discountAmount: 0,
            lineOriginalTotal: total,
            lineDiscountTotal: 0,
            lineTotal: total,
          },
        ];
      }

      const originalSubtotal = getOriginalSubtotal(sale, items);
      const totalDiscount = getTotalDiscount(sale, items);
      const finalTotal =
        getSaleTotal(sale) || Math.max(originalSubtotal - totalDiscount, 0);
      const paidAmount = getPaidAmount(sale);
      const balance =
        sale.balance != null
          ? Number(sale.balance || 0)
          : Math.max(finalTotal - paidAmount, 0);

      setInvoice({
        invoiceNo: createInvoiceNo(sale),
        saleDate: getSaleDate(sale),
        customerType: sale.customerType || 'walk-in',
        customerName: getCustomerName(sale),
        customerPhone: getCustomerPhone(sale),
        paymentType: sale.paymentType || 'Cash',
        status: getSaleStatus(sale),
        cancelReason: sale.cancelReason || '',
        items,
        originalSubtotal,
        totalDiscount,
        subtotal: finalTotal,
        finalTotal,
        paidAmount,
        balance,
      });
    } catch (error) {
      console.error('Invoice load error:', error);
      alert('Could not load invoice details.');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleCancelSale = async (sale) => {
    const saleId = getSaleId(sale);

    if (!saleId) {
      alert('Sale ID not found.');
      return;
    }

    if (isCancelledSale(sale)) {
      alert('This sale is already cancelled.');
      return;
    }

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel invoice ${createInvoiceNo(
        sale
      )}?\n\nStock will be added back automatically.`
    );

    if (!confirmCancel) return;

    const reason = window.prompt(
      'Enter cancel reason:',
      'Wrong item selected'
    );

    if (!reason || !reason.trim()) {
      alert('Cancel reason is required.');
      return;
    }

    setCancellingSaleId(saleId);

    try {
      await cancelSale(saleId, reason.trim());

      setSales((prevSales) =>
        prevSales.map((item) =>
          getSaleId(item) === saleId
            ? {
                ...item,
                status: 'cancelled',
                cancelReason: reason.trim(),
              }
            : item
        )
      );

      alert('Sale cancelled successfully. Product stock restored.');
    } catch (error) {
      console.error('Cancel sale error:', error);
      alert(error.message || 'Could not cancel sale.');
    } finally {
      setCancellingSaleId('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales History"
        subtitle="View old sales, reprint invoices, resend bills, and cancel wrong sales"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-2xl bg-blue-600 p-5 text-white shadow-lg shadow-blue-600/20">
          <p className="text-sm text-blue-100">Active Sales</p>
          <p className="mt-2 text-2xl font-black">{summary.count}</p>
        </div>

        <div className="rounded-2xl bg-emerald-600 p-5 text-white shadow-lg shadow-emerald-600/20">
          <p className="text-sm text-emerald-100">Total Sales</p>
          <p className="mt-2 text-2xl font-black">
            {formatCurrency(summary.total)}
          </p>
        </div>

        <div className="rounded-2xl bg-purple-600 p-5 text-white shadow-lg shadow-purple-600/20">
          <p className="text-sm text-purple-100">Paid Amount</p>
          <p className="mt-2 text-2xl font-black">
            {formatCurrency(summary.paid)}
          </p>
        </div>

        <div className="rounded-2xl bg-orange-600 p-5 text-white shadow-lg shadow-orange-600/20">
          <p className="text-sm text-orange-100">Balance</p>
          <p className="mt-2 text-2xl font-black">
            {formatCurrency(summary.balance)}
          </p>
        </div>

        <div className="rounded-2xl bg-red-600 p-5 text-white shadow-lg shadow-red-600/20">
          <p className="text-sm text-red-100">Cancelled</p>
          <p className="mt-2 text-2xl font-black">
            {summary.cancelledCount}
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, invoice no, status..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Payment Type
            </label>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All Payments</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading sales history..." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="bg-slate-900 text-left text-sm font-bold text-white">
                  <th className="px-4 py-4">Invoice No</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Customer</th>
                  <th className="px-4 py-4">Payment</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Total</th>
                  <th className="px-4 py-4 text-right">Paid</th>
                  <th className="px-4 py-4 text-right">Balance</th>
                  <th className="px-4 py-4 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.length ? (
                  filteredSales.map((sale) => {
                    const saleId = getSaleId(sale);
                    const cancelled = isCancelledSale(sale);

                    return (
                      <tr
                        key={saleId}
                        className={`border-b border-slate-100 text-sm hover:bg-slate-50 ${
                          cancelled ? 'bg-red-50/50 text-slate-500' : ''
                        }`}
                      >
                        <td className="px-4 py-4 font-bold text-blue-700">
                          {createInvoiceNo(sale)}
                        </td>

                        <td className="px-4 py-4 text-slate-700">
                          {formatDateTime(
                            sale.saleDate || sale.createdAt || getSaleDate(sale)
                          )}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {getCustomerName(sale)}
                          {cancelled && sale.cancelReason && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              Reason: {sale.cancelReason}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {sale.paymentType || 'Cash'}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {cancelled ? (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                              Cancelled
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                              Active
                            </span>
                          )}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            cancelled ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {formatCurrency(getSaleTotal(sale))}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            cancelled
                              ? 'line-through text-slate-400'
                              : 'text-green-700'
                          }`}
                        >
                          {formatCurrency(getPaidAmount(sale))}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            cancelled
                              ? 'line-through text-slate-400'
                              : 'text-orange-700'
                          }`}
                        >
                          {formatCurrency(getBalance(sale))}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(sale)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                            >
                              View
                            </button>

                            {!cancelled && (
                              <button
                                type="button"
                                onClick={() => handleCancelSale(sale)}
                                disabled={cancellingSaleId === saleId}
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {cancellingSaleId === saleId
                                  ? 'Cancelling...'
                                  : 'Cancel'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No sales found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loadingInvoice && <LoadingSpinner message="Loading invoice..." />}

      {invoice && (
        <InvoicePreview invoice={invoice} onClose={() => setInvoice(null)} />
      )}
    </div>
  );
}