import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getDailySalesReport,
  getMonthlySalesReport,
  getCreditSalesReport,
  getCustomerDebtReport,
  getLowStockReport,
  getProductStockReport,
  getPurchaseHistoryReport,
  getUniqueShops,
  getUniquePurchasedProducts,
  getDailyProfitReport,
  getMonthlyProfitReport,
} from '../services/reportService';
import { getSaleItems } from '../services/salesService';
import {
  formatCurrency,
  formatDateTime,
  toDateInputValue,
} from '../utils/helpers';
import {
  downloadProductStockPdf,
  downloadProfitReportPdf,
} from '../utils/pdfExport';
import { useToast } from '../context/toastContext';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Sales', icon: '📅' },
  { id: 'monthly', label: 'Monthly Sales', icon: '📆' },
  { id: 'profit', label: 'Profit Report', icon: '📈' },
  { id: 'best', label: 'Best Selling', icon: '🏆' },
  { id: 'lowstock', label: 'Low Stock', icon: '⚠️' },
  { id: 'debt', label: 'Customer Debt', icon: '👥' },
  { id: 'stock', label: 'Product Stock', icon: '📦' },
  { id: 'credit', label: 'Credit Sales', icon: '💳' },
  { id: 'purchases', label: 'Purchase History', icon: '🛍️' },
];

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.sales)) return value.sales;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.data?.sales)) return value.data.sales;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
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

function isActiveSale(sale) {
  return !isCancelledSale(sale);
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

function getSalePaid(sale) {
  return Number(sale.paidAmount || sale.paid || 0);
}

function getSaleBalance(sale) {
  if (sale.balance != null) return Number(sale.balance || 0);

  const total = getSaleTotal(sale);
  const paid = getSalePaid(sale);

  return Math.max(total - paid, 0);
}

function getProductName(item) {
  return item.productName || item.name || item.itemName || 'Product';
}

function getItemQty(item) {
  return Number(item.quantity || item.qty || 0);
}

function getItemPrice(item) {
  return Number(
    item.unitPrice ||
      item.finalPrice ||
      item.sellingPrice ||
      item.price ||
      0
  );
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function calculateSalesSummary(sales) {
  return sales.reduce(
    (acc, sale) => {
      const total = getSaleTotal(sale);
      const paid = getSalePaid(sale);
      const balance = getSaleBalance(sale);
      const paymentType = String(sale.paymentType || 'cash').toLowerCase();

      acc.total += total;
      acc.paid += paid;
      acc.balance += balance;
      acc.count += 1;

      if (paymentType === 'cash') {
        acc.cash += total;
      } else {
        acc.credit += balance;
      }

      return acc;
    },
    {
      total: 0,
      paid: 0,
      balance: 0,
      cash: 0,
      credit: 0,
      count: 0,
    }
  );
}

function calculateCancelledSummary(sales) {
  return sales.reduce(
    (acc, sale) => {
      acc.count += 1;
      acc.total += getSaleTotal(sale);
      return acc;
    },
    { count: 0, total: 0 }
  );
}

function getStockStatus(product) {
  const stock = Number(product.currentStock || 0);
  const min = Number(product.minStockAlert || 0);

  if (stock <= 0) {
    return {
      label: 'Out of Stock',
      className:
        'rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700',
    };
  }

  if (stock <= min) {
    return {
      label: 'Low Stock',
      className:
        'rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700',
    };
  }

  return {
    label: 'Available',
    className:
      'rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700',
  };
}

function StatCard({ title, value, subtitle, icon, tone = 'blue' }) {
  const toneClasses = {
    blue: 'from-blue-600 to-blue-700 shadow-blue-600/20',
    green: 'from-emerald-600 to-emerald-700 shadow-emerald-600/20',
    red: 'from-red-600 to-red-700 shadow-red-600/20',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
    slate: 'from-slate-700 to-slate-900 shadow-slate-700/20',
    purple: 'from-purple-600 to-purple-700 shadow-purple-600/20',
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${
        toneClasses[tone] || toneClasses.blue
      } p-5 text-white shadow-lg`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-white/70">{subtitle}</p>}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({
  title,
  subtitle,
  data,
  labelKey,
  valueKey,
  valuePrefix = '',
  valueSuffix = '',
}) {
  const maxValue = Math.max(
    ...data.map((item) => Number(item[valueKey] || 0)),
    1
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="space-y-3">
        {data.length ? (
          data.map((item, index) => {
            const value = Number(item[valueKey] || 0);
            const width = Math.max((value / maxValue) * 100, value > 0 ? 8 : 0);

            return (
              <div key={`${item[labelKey]}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-slate-700">
                    {item[labelKey]}
                  </span>
                  <span className="font-bold text-slate-900">
                    {valuePrefix}
                    {value.toLocaleString()}
                    {valueSuffix}
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            No chart data available
          </p>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { showToast } = useToast();

  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(toDateInputValue());
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [profitPeriod, setProfitPeriod] = useState('monthly');
  const [shopFilter, setShopFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const [shops, setShops] = useState([]);
  const [productNames, setProductNames] = useState([]);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    getUniqueShops().then(setShops).catch(() => setShops([]));

    getUniquePurchasedProducts()
      .then(setProductNames)
      .catch(() => setProductNames([]));
  }, []);

  const shopParam = shopFilter.trim();
  const productParam = productFilter.trim();

  const loadBestSellingProducts = async () => {
    const [year, selectedMonth] = month.split('-').map(Number);
    const monthlyReport = await getMonthlySalesReport(year, selectedMonth);
    const sales = safeArray(monthlyReport.sales || monthlyReport);

    const activeSales = sales.filter(isActiveSale);
    const cancelledSales = sales.filter(isCancelledSale);

    const productMap = {};

    for (const sale of activeSales) {
      const saleId = getSaleId(sale);
      let items = safeArray(sale.items);

      if (!items.length && saleId) {
        try {
          const itemResult = await getSaleItems(saleId);
          items = safeArray(itemResult);
        } catch (error) {
          console.error('Could not load sale items:', saleId, error);
        }
      }

      items.forEach((item) => {
        const productName = getProductName(item);
        const quantity = getItemQty(item);
        const unitPrice = getItemPrice(item);
        const key = productName.toLowerCase();

        if (!productMap[key]) {
          productMap[key] = {
            productName,
            totalQty: 0,
            totalRevenue: 0,
            salesCount: 0,
          };
        }

        productMap[key].totalQty += quantity;
        productMap[key].totalRevenue += quantity * unitPrice;
        productMap[key].salesCount += 1;
      });
    }

    const bestRows = Object.values(productMap).sort(
      (a, b) => b.totalQty - a.totalQty || b.totalRevenue - a.totalRevenue
    );

    const totalQty = bestRows.reduce((sum, item) => sum + item.totalQty, 0);
    const totalRevenue = bestRows.reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );
    const cancelledSummary = calculateCancelledSummary(cancelledSales);

    setRows(bestRows);
    setSummary({
      count: bestRows.length,
      totalQty,
      totalRevenue,
      month,
      cancelledCount: cancelledSummary.count,
      cancelledTotal: cancelledSummary.total,
    });
  };

  const runReport = async () => {
    setLoading(true);
    setSummary(null);
    setRows([]);

    try {
      switch (reportType) {
        case 'daily': {
          const report = await getDailySalesReport(date);
          const sales = safeArray(report.sales || report);

          const activeSales = sales.filter(isActiveSale);
          const cancelledSales = sales.filter(isCancelledSale);

          const activeSummary = calculateSalesSummary(activeSales);
          const cancelledSummary = calculateCancelledSummary(cancelledSales);

          setSummary({
            ...activeSummary,
            cancelledCount: cancelledSummary.count,
            cancelledTotal: cancelledSummary.total,
          });

          setRows(activeSales);
          break;
        }

        case 'monthly': {
          const [year, selectedMonth] = month.split('-').map(Number);
          const report = await getMonthlySalesReport(year, selectedMonth);
          const sales = safeArray(report.sales || report);

          const activeSales = sales.filter(isActiveSale);
          const cancelledSales = sales.filter(isCancelledSale);

          const activeSummary = calculateSalesSummary(activeSales);
          const cancelledSummary = calculateCancelledSummary(cancelledSales);

          setSummary({
            ...activeSummary,
            cancelledCount: cancelledSummary.count,
            cancelledTotal: cancelledSummary.total,
          });

          setRows(activeSales);
          break;
        }

        case 'profit': {
          let report;

          if (profitPeriod === 'daily') {
            report = await getDailyProfitReport(date);
          } else {
            const [year, selectedMonth] = month.split('-').map(Number);
            report = await getMonthlyProfitReport(year, selectedMonth);
          }

          setSummary(report);
          setRows(safeArray(report.rows));
          break;
        }

        case 'best': {
          await loadBestSellingProducts();
          break;
        }

        case 'credit': {
          const allCreditSales = safeArray(await getCreditSalesReport());

          const activeCreditSales = allCreditSales
            .filter(isActiveSale)
            .filter((sale) => getSaleBalance(sale) > 0);

          const cancelledSales = allCreditSales.filter(isCancelledSale);

          const totalCredit = activeCreditSales.reduce(
            (sum, sale) => sum + getSaleBalance(sale),
            0
          );

          const cancelledSummary = calculateCancelledSummary(cancelledSales);

          setSummary({
            count: activeCreditSales.length,
            totalCredit,
            cancelledCount: cancelledSummary.count,
            cancelledTotal: cancelledSummary.total,
          });

          setRows(activeCreditSales);
          break;
        }

        case 'debt': {
          const data = safeArray(await getCustomerDebtReport());

          const totalDebt = data.reduce(
            (sum, customer) => sum + Number(customer.totalDebt || 0),
            0
          );

          setSummary({
            count: data.length,
            totalDebt,
          });

          setRows(data);
          break;
        }

        case 'lowstock': {
          const data = safeArray(await getLowStockReport(shopParam));

          const outOfStock = data.filter(
            (product) => Number(product.currentStock || 0) <= 0
          ).length;

          setSummary({
            count: data.length,
            outOfStock,
            lowStock: data.length - outOfStock,
          });

          setRows(data);
          break;
        }

        case 'stock': {
          const data = safeArray(await getProductStockReport(shopParam));

          const totalStock = data.reduce(
            (sum, product) => sum + Number(product.currentStock || 0),
            0
          );

          const totalValue = data.reduce(
            (sum, product) =>
              sum +
              Number(product.currentStock || 0) *
                Number(product.sellingPrice || 0),
            0
          );

          setSummary({
            count: data.length,
            totalStock,
            totalValue,
          });

          setRows(data);
          break;
        }

        case 'purchases': {
          const data = safeArray(
            await getPurchaseHistoryReport(shopParam, productParam)
          );

          const totalQty = data.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          );

          const totalPurchaseValue = data.reduce(
            (sum, item) =>
              sum +
              Number(item.quantity || 0) * Number(item.purchasePrice || 0),
            0
          );

          setSummary({
            count: data.length,
            totalQty,
            totalPurchaseValue,
          });

          setRows(data);

          getUniqueShops().then(setShops).catch(() => {});
          getUniquePurchasedProducts().then(setProductNames).catch(() => {});
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('Report error:', error);
      showToast(error.message || 'Could not generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const salesColumns = [
    {
      key: 'saleDate',
      label: 'Date',
      render: (row) => formatDateTime(row.saleDate || row.createdAt || row.date),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row) => row.customerName || 'Walk-in',
    },
    {
      key: 'subtotal',
      label: 'Total',
      render: (row) => formatCurrency(getSaleTotal(row)),
    },
    {
      key: 'paidAmount',
      label: 'Paid',
      render: (row) => formatCurrency(getSalePaid(row)),
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (row) => formatCurrency(getSaleBalance(row)),
    },
    {
      key: 'paymentType',
      label: 'Payment',
      render: (row) => row.paymentType || 'cash',
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
          {getSaleStatus(row)}
        </span>
      ),
    },
  ];

  const profitColumns = [
    { key: 'productName', label: 'Product' },
    {
      key: 'quantity',
      label: 'Sold Qty',
      render: (row) => Number(row.quantity || 0),
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row) => formatCurrency(row.revenue),
    },
    {
      key: 'cost',
      label: 'Cost',
      render: (row) => formatCurrency(row.cost),
    },
    {
      key: 'discount',
      label: 'Discount',
      render: (row) => formatCurrency(row.discount),
    },
    {
      key: 'profit',
      label: 'Gross Profit',
      render: (row) => (
        <span
          className={
            Number(row.profit || 0) >= 0
              ? 'font-bold text-green-700'
              : 'font-bold text-red-700'
          }
        >
          {formatCurrency(row.profit)}
        </span>
      ),
    },
    {
      key: 'profitMargin',
      label: 'Margin',
      render: (row) => formatPercent(row.profitMargin),
    },
  ];

  const bestColumns = [
    { key: 'productName', label: 'Product' },
    { key: 'totalQty', label: 'Sold Qty' },
    {
      key: 'totalRevenue',
      label: 'Revenue',
      render: (row) => formatCurrency(row.totalRevenue),
    },
    { key: 'salesCount', label: 'Sales Count' },
  ];

  const debtColumns = [
    { key: 'name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'totalPurchase',
      label: 'Total Purchase',
      render: (row) => formatCurrency(row.totalPurchase || row.totalSales || 0),
    },
    {
      key: 'paidAmount',
      label: 'Paid Amount',
      render: (row) => formatCurrency(row.paidAmount || row.totalPaid || 0),
    },
    {
      key: 'totalDebt',
      label: 'Balance Debt',
      render: (row) => (
        <span className="font-bold text-red-700">
          {formatCurrency(row.totalDebt)}
        </span>
      ),
    },
  ];

  const productColumns = [
    { key: 'name', label: 'Product' },
    { key: 'brand', label: 'Brand' },
    { key: 'shop', label: 'Purchased From' },
    {
      key: 'currentStock',
      label: 'Stock',
      render: (row) => <span className="font-bold">{row.currentStock || 0}</span>,
    },
    { key: 'minStockAlert', label: 'Min Alert' },
    {
      key: 'sellingPrice',
      label: 'Price',
      render: (row) => formatCurrency(row.sellingPrice),
    },
    {
      key: 'stockStatus',
      label: 'Status',
      render: (row) => {
        const status = getStockStatus(row);

        return <span className={status.className}>{status.label}</span>;
      },
    },
  ];

  const purchaseColumns = [
    {
      key: 'purchaseDate',
      label: 'Date',
      render: (row) => formatDateTime(row.purchaseDate),
    },
    { key: 'productName', label: 'Product' },
    { key: 'brand', label: 'Brand' },
    { key: 'shop', label: 'Purchased From Shop' },
    { key: 'quantity', label: 'Qty' },
    {
      key: 'purchasePrice',
      label: 'Buy Price',
      render: (row) => formatCurrency(row.purchasePrice),
    },
    {
      key: 'sellingPrice',
      label: 'Sell Price',
      render: (row) => formatCurrency(row.sellingPrice),
    },
  ];

  const columns =
    reportType === 'profit'
      ? profitColumns
      : reportType === 'best'
        ? bestColumns
        : reportType === 'debt'
          ? debtColumns
          : reportType === 'purchases'
            ? purchaseColumns
            : reportType === 'lowstock' || reportType === 'stock'
              ? productColumns
              : salesColumns;

  const showShopFilter =
    reportType === 'lowstock' ||
    reportType === 'stock' ||
    reportType === 'purchases';

  const showProductFilter = reportType === 'purchases';

  const showProfitPeriodFilter = reportType === 'profit';

  const showDateFilter =
    reportType === 'daily' ||
    (reportType === 'profit' && profitPeriod === 'daily');

  const showMonthFilter =
    reportType === 'monthly' ||
    reportType === 'best' ||
    (reportType === 'profit' && profitPeriod === 'monthly');

  const handleDownloadProductStockPdf = () => {
    if (reportType !== 'stock') {
      showToast('Select Product Stock report first', 'error');
      return;
    }

    if (!summary) {
      showToast('Generate the Product Stock report first', 'error');
      return;
    }

    downloadProductStockPdf(rows, { shopFilter: shopParam });
    showToast('Product stock PDF downloaded');
  };

  const handleDownloadProfitPdf = () => {
    if (reportType !== 'profit') {
      showToast('Select Profit Report first', 'error');
      return;
    }

    if (!summary) {
      showToast('Generate the Profit Report first', 'error');
      return;
    }

    const periodLabel =
      profitPeriod === 'daily'
        ? `Daily Profit - ${date}`
        : `Monthly Profit - ${month}`;

    downloadProfitReportPdf(rows, summary, { periodLabel });
    showToast('Profit report PDF opened. Choose Save as PDF.');
  };

  const paymentChartData = useMemo(() => {
    if (!summary || (reportType !== 'daily' && reportType !== 'monthly')) {
      return [];
    }

    return [
      { name: 'Cash Sales', value: Number(summary.cash || 0) },
      { name: 'Credit Sales', value: Number(summary.credit || 0) },
    ];
  }, [summary, reportType]);

  const bestChartData = useMemo(() => {
    if (reportType !== 'best') return [];

    return rows.slice(0, 6).map((row) => ({
      name: row.productName,
      value: row.totalQty,
    }));
  }, [rows, reportType]);

  const profitChartData = useMemo(() => {
    if (reportType !== 'profit') return [];

    return rows.slice(0, 6).map((row) => ({
      name: row.productName,
      value: Number(row.profit || 0),
    }));
  }, [rows, reportType]);

  const stockChartData = useMemo(() => {
    if (reportType !== 'lowstock' && reportType !== 'stock') return [];

    return rows.slice(0, 6).map((row) => ({
      name: row.name,
      value: Number(row.currentStock || 0),
    }));
  }, [rows, reportType]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Professional admin reports for sales, profit, expenses, net profit, stock, customers, purchases, and cancelled sale tracking"
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {REPORT_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setReportType(type.id);
              setSummary(null);
              setRows([]);
            }}
            className={`rounded-2xl border p-4 text-left transition ${
              reportType === type.id
                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{type.icon}</span>
              <span className="font-bold">{type.label}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {showProfitPeriodFilter && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Profit Period
              </label>
              <select
                value={profitPeriod}
                onChange={(event) => setProfitPeriod(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="daily">Daily Profit</option>
                <option value="monthly">Monthly Profit</option>
              </select>
            </div>
          )}

          {showDateFilter && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Report Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
          )}

          {showMonthFilter && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Report Month
              </label>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>
          )}

          {showShopFilter && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Shop Filter
              </label>
              <select
                value={shopFilter}
                onChange={(event) => setShopFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">All shops</option>
                {shops.map((shop) => (
                  <option key={shop} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showProductFilter && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Product Filter
              </label>
              <select
                value={productFilter}
                onChange={(event) => setProductFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">All products</option>
                {productNames.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end gap-3">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={runReport}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {reportType === 'stock' && (
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={handleDownloadProductStockPdf}
                disabled={loading || !summary}
              >
                Download Product Stock PDF
              </button>
            </div>
          )}

          {reportType === 'profit' && (
            <div className="flex items-end">
              <button
                type="button"
                className="btn btn-secondary w-full"
                onClick={handleDownloadProfitPdf}
                disabled={loading || !summary}
              >
                Download Profit PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {loading && <LoadingSpinner message="Generating report..." />}

      {summary && !loading && (
        <>
          {(reportType === 'daily' || reportType === 'monthly') && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  title="Active Sales"
                  value={formatCurrency(summary.total)}
                  subtitle="Cancelled sales ignored"
                  icon="💰"
                  tone="blue"
                />
                <StatCard
                  title="Cash Sales"
                  value={formatCurrency(summary.cash)}
                  subtitle="Active cash sales"
                  icon="💵"
                  tone="green"
                />
                <StatCard
                  title="Credit Balance"
                  value={formatCurrency(summary.credit)}
                  subtitle="Active credit / partial balance"
                  icon="💳"
                  tone="orange"
                />
                <StatCard
                  title="Transactions"
                  value={summary.count}
                  subtitle="Active sale records"
                  icon="🧾"
                  tone="purple"
                />
                <StatCard
                  title="Cancelled"
                  value={summary.cancelledCount || 0}
                  subtitle={formatCurrency(summary.cancelledTotal || 0)}
                  icon="❌"
                  tone="red"
                />
              </div>

              <div className="mb-6">
                <SimpleBarChart
                  title="Cash vs Credit Sales"
                  subtitle="Only active sales are included"
                  data={paymentChartData}
                  labelKey="name"
                  valueKey="value"
                />
              </div>
            </>
          )}

          {reportType === 'profit' && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  title="Revenue"
                  value={formatCurrency(summary.totalRevenue)}
                  subtitle="Final sales revenue"
                  icon="💰"
                  tone="blue"
                />
                <StatCard
                  title="Cost"
                  value={formatCurrency(summary.totalCost)}
                  subtitle="Purchase cost"
                  icon="🛒"
                  tone="orange"
                />
                <StatCard
                  title="Expenses"
                  value={formatCurrency(summary.totalExpenses)}
                  subtitle={`${summary.expenseCount || 0} expense records`}
                  icon="💸"
                  tone="red"
                />
                <StatCard
                  title="Gross Profit"
                  value={formatCurrency(summary.grossProfit)}
                  subtitle={`Gross margin: ${formatPercent(
                    summary.grossProfitMargin || summary.profitMargin
                  )}`}
                  icon="📈"
                  tone={Number(summary.grossProfit || 0) >= 0 ? 'green' : 'red'}
                />
                <StatCard
                  title="Net Profit"
                  value={formatCurrency(summary.netProfit)}
                  subtitle={`Net margin: ${formatPercent(summary.netProfitMargin)}`}
                  icon="✅"
                  tone={Number(summary.netProfit || 0) >= 0 ? 'green' : 'red'}
                />
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard
                  title="Active Sales"
                  value={summary.activeSalesCount || 0}
                  subtitle="Cancelled ignored"
                  icon="🧾"
                  tone="slate"
                />
                <StatCard
                  title="Sold Quantity"
                  value={summary.totalQuantity || 0}
                  subtitle="Total sold items"
                  icon="📦"
                  tone="blue"
                />
                <StatCard
                  title="Cancelled Sales"
                  value={summary.cancelledCount || 0}
                  subtitle={formatCurrency(summary.cancelledTotal || 0)}
                  icon="❌"
                  tone="red"
                />
                <StatCard
                  title="Report Period"
                  value={profitPeriod === 'daily' ? 'Daily' : 'Monthly'}
                  subtitle={
                    profitPeriod === 'daily'
                      ? `Date: ${date}`
                      : `Month: ${month}`
                  }
                  icon="📊"
                  tone="purple"
                />
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-bold text-slate-900">
                  Net Profit Calculation
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <p className="font-bold text-blue-700">Revenue</p>
                    <p className="mt-1 text-lg font-black text-blue-900">
                      {formatCurrency(summary.totalRevenue)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-4">
                    <p className="font-bold text-orange-700">Purchase Cost</p>
                    <p className="mt-1 text-lg font-black text-orange-900">
                      - {formatCurrency(summary.totalCost)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="font-bold text-red-700">Expenses</p>
                    <p className="mt-1 text-lg font-black text-red-900">
                      - {formatCurrency(summary.totalExpenses)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="font-bold text-green-700">Net Profit</p>
                    <p className="mt-1 text-lg font-black text-green-900">
                      {formatCurrency(summary.netProfit)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <SimpleBarChart
                  title="Top Product Profit"
                  subtitle="Top products by gross profit"
                  data={profitChartData}
                  labelKey="name"
                  valueKey="value"
                  valuePrefix="LKR "
                />
              </div>

              {summary.expenseRows?.length > 0 && (
                <div className="card mb-6">
                  <h3 className="mb-4 text-lg font-extrabold text-slate-900">
                    Expense Summary
                  </h3>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-4 py-3 text-left text-sm">
                            Category
                          </th>
                          <th className="px-4 py-3 text-right text-sm">
                            Records
                          </th>
                          <th className="px-4 py-3 text-right text-sm">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {summary.expenseRows.map((expense) => (
                          <tr
                            key={expense.category}
                            className="border-b border-slate-200 even:bg-slate-50"
                          >
                            <td className="px-4 py-3 text-sm font-bold">
                              {expense.categoryLabel}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              {expense.count}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-extrabold text-red-700">
                              {formatCurrency(expense.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {rows.length === 0 && (
                <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                  Profit rows are empty. Create a new sale after updating backend
                  profit fields. Old sales may not have purchase cost/profit
                  fields.
                </div>
              )}
            </>
          )}

          {reportType === 'best' && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard
                  title="Products Sold"
                  value={summary.count}
                  subtitle="Unique products"
                  icon="🏆"
                  tone="blue"
                />
                <StatCard
                  title="Total Quantity"
                  value={summary.totalQty}
                  subtitle="Active sales only"
                  icon="📦"
                  tone="green"
                />
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(summary.totalRevenue)}
                  subtitle={`Month: ${summary.month}`}
                  icon="💰"
                  tone="purple"
                />
                <StatCard
                  title="Cancelled Sales"
                  value={summary.cancelledCount || 0}
                  subtitle={formatCurrency(summary.cancelledTotal || 0)}
                  icon="❌"
                  tone="red"
                />
              </div>

              <div className="mb-6">
                <SimpleBarChart
                  title="Top Best Selling Products"
                  subtitle="Cancelled sales are ignored"
                  data={bestChartData}
                  labelKey="name"
                  valueKey="value"
                  valueSuffix=" qty"
                />
              </div>
            </>
          )}

          {reportType === 'debt' && (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard
                title="Debt Customers"
                value={summary.count}
                subtitle="Customers with debt"
                icon="👥"
                tone="red"
              />
              <StatCard
                title="Total Balance Debt"
                value={formatCurrency(summary.totalDebt)}
                subtitle="Amount to collect"
                icon="⚠️"
                tone="orange"
              />
            </div>
          )}

          {reportType === 'lowstock' && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  title="Products Need Restock"
                  value={summary.count}
                  subtitle={shopParam ? `Shop: ${shopParam}` : 'All shops'}
                  icon="⚠️"
                  tone="orange"
                />
                <StatCard
                  title="Low Stock"
                  value={summary.lowStock}
                  subtitle="Stock below minimum"
                  icon="📉"
                  tone="blue"
                />
                <StatCard
                  title="Out of Stock"
                  value={summary.outOfStock}
                  subtitle="No stock available"
                  icon="❌"
                  tone="red"
                />
              </div>

              <div className="mb-6">
                <SimpleBarChart
                  title="Current Stock Level"
                  subtitle="First few low-stock products"
                  data={stockChartData}
                  labelKey="name"
                  valueKey="value"
                  valueSuffix=" stock"
                />
              </div>
            </>
          )}

          {reportType === 'stock' && (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard
                  title="Total Products"
                  value={summary.count}
                  subtitle={shopParam ? `Shop: ${shopParam}` : 'All shops'}
                  icon="📦"
                  tone="blue"
                />
                <StatCard
                  title="Total Stock Qty"
                  value={summary.totalStock}
                  subtitle="Available item quantity"
                  icon="🏪"
                  tone="green"
                />
                <StatCard
                  title="Stock Value"
                  value={formatCurrency(summary.totalValue)}
                  subtitle="Based on selling price"
                  icon="💰"
                  tone="purple"
                />
              </div>

              <div className="mb-6">
                <SimpleBarChart
                  title="Product Stock Level"
                  subtitle="First few products by current stock"
                  data={stockChartData}
                  labelKey="name"
                  valueKey="value"
                  valueSuffix=" stock"
                />
              </div>
            </>
          )}

          {reportType === 'credit' && (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                title="Credit Sales"
                value={summary.count}
                subtitle="Active credit sale records"
                icon="💳"
                tone="orange"
              />
              <StatCard
                title="Credit Balance"
                value={formatCurrency(summary.totalCredit)}
                subtitle="Pending amount"
                icon="⚠️"
                tone="red"
              />
              <StatCard
                title="Cancelled Credit"
                value={summary.cancelledCount || 0}
                subtitle={formatCurrency(summary.cancelledTotal || 0)}
                icon="❌"
                tone="slate"
              />
            </div>
          )}

          {reportType === 'purchases' && (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                title="Purchase Records"
                value={summary.count}
                subtitle="Stock purchase entries"
                icon="🛍️"
                tone="blue"
              />
              <StatCard
                title="Purchased Qty"
                value={summary.totalQty}
                subtitle="Total quantity"
                icon="📦"
                tone="green"
              />
              <StatCard
                title="Purchase Value"
                value={formatCurrency(summary.totalPurchaseValue)}
                subtitle="Based on buy price"
                icon="💰"
                tone="purple"
              />
            </div>
          )}

          <div className="card">
            <DataTable
              columns={columns}
              data={rows}
              emptyMessage="No records found"
            />
          </div>
        </>
      )}
    </div>
  );
}