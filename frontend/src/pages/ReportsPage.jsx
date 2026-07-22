import { useEffect, useState } from 'react';
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
} from '../services/reportService';
import { formatCurrency, formatDateTime, toDateInputValue } from '../utils/helpers';
import { downloadProductStockPdf } from '../utils/pdfExport';
import { useToast } from '../context/toastContext';

const REPORT_TYPES = [
  { id: 'daily', label: 'Daily Sales' },
  { id: 'monthly', label: 'Monthly Sales' },
  { id: 'credit', label: 'Credit Sales' },
  { id: 'debt', label: 'Customer Debt' },
  { id: 'lowstock', label: 'Stock Alerts' },
  { id: 'stock', label: 'Product Stock' },
  { id: 'purchases', label: 'Purchase History' },
];

export default function ReportsPage() {
  const { showToast } = useToast();
  const [reportType, setReportType] = useState('daily');
  const [date, setDate] = useState(toDateInputValue());
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [shopFilter, setShopFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [shops, setShops] = useState([]);
  const [productNames, setProductNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    getUniqueShops().then(setShops).catch(() => setShops([]));
    getUniquePurchasedProducts().then(setProductNames).catch(() => setProductNames([]));
  }, []);

  const shopParam = shopFilter.trim();
  const productParam = productFilter.trim();

  const runReport = async () => {
    setLoading(true);
    try {
      switch (reportType) {
        case 'daily': {
          const r = await getDailySalesReport(date);
          setSummary({ total: r.totalSales, cash: r.cashSales, credit: r.creditSales, count: r.count });
          setRows(r.sales);
          break;
        }
        case 'monthly': {
          const [y, m] = month.split('-').map(Number);
          const r = await getMonthlySalesReport(y, m);
          setSummary({ total: r.totalSales, cash: r.cashSales, credit: r.creditSales, count: r.count });
          setRows(r.sales);
          break;
        }
        case 'credit': {
          const data = await getCreditSalesReport();
          setSummary({ count: data.length });
          setRows(data);
          break;
        }
        case 'debt': {
          const data = await getCustomerDebtReport();
          setSummary({ count: data.length });
          setRows(data);
          break;
        }
        case 'lowstock': {
          const data = await getLowStockReport(shopParam);
          setSummary({ count: data.length, alert: true });
          setRows(data);
          break;
        }
        case 'stock': {
          const data = await getProductStockReport(shopParam);
          setSummary({ count: data.length });
          setRows(data);
          break;
        }
        case 'purchases': {
          const data = await getPurchaseHistoryReport(shopParam, productParam);
          setSummary({ count: data.length });
          setRows(data);
          getUniqueShops().then(setShops);
          getUniquePurchasedProducts().then(setProductNames);
          break;
        }
        default:
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const salesColumns = [
    { key: 'saleDate', label: 'Date', render: (r) => formatDateTime(r.saleDate) },
    { key: 'customerName', label: 'Customer' },
    { key: 'subtotal', label: 'Total', render: (r) => formatCurrency(r.subtotal) },
    { key: 'paymentType', label: 'Payment' },
  ];

  const debtColumns = [
    { key: 'name', label: 'Customer' },
    { key: 'phone', label: 'Phone' },
    { key: 'totalDebt', label: 'Debt', render: (r) => formatCurrency(r.totalDebt) },
  ];

  const productColumns = [
    { key: 'name', label: 'Product' },
    { key: 'brand', label: 'Brand' },
    { key: 'shop', label: 'Purchased From' },
    { key: 'currentStock', label: 'Stock' },
    { key: 'minStockAlert', label: 'Min Alert' },
    { key: 'sellingPrice', label: 'Price', render: (r) => formatCurrency(r.sellingPrice) },
  ];

  const alertColumns = [
    ...productColumns,
    {
      key: 'alert',
      label: 'Alert',
      render: (r) => (
        <span className="badge badge-warning">
          {(r.currentStock || 0) <= (r.minStockAlert || 0) ? 'Low stock' : 'OK'}
        </span>
      ),
    },
  ];

  const purchaseColumns = [
    { key: 'purchaseDate', label: 'Date', render: (r) => formatDateTime(r.purchaseDate) },
    { key: 'productName', label: 'Product' },
    { key: 'brand', label: 'Brand' },
    { key: 'shop', label: 'Purchased From Shop' },
    { key: 'quantity', label: 'Qty' },
    { key: 'purchasePrice', label: 'Buy Price', render: (r) => formatCurrency(r.purchasePrice) },
    { key: 'sellingPrice', label: 'Sell Price', render: (r) => formatCurrency(r.sellingPrice) },
  ];

  const handleDownloadProductStockPdf = () => {
    if (reportType !== 'stock') return;

    if (!summary) {
      showToast('Generate the Product Stock report first', 'error');
      return;
    }

    downloadProductStockPdf(rows, { shopFilter: shopParam });
    showToast('Product stock PDF downloaded');
  };

  const showShopFilter = reportType === 'lowstock' || reportType === 'stock' || reportType === 'purchases';
  const showProductFilter = reportType === 'purchases';

  const columns =
    reportType === 'debt'
      ? debtColumns
      : reportType === 'purchases'
        ? purchaseColumns
        : reportType === 'lowstock'
          ? alertColumns
          : reportType === 'stock'
            ? productColumns
            : salesColumns;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Sales, stock alerts, purchases by shop, and more" />

      <div className="card report-controls">
        <div className="report-tabs">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`report-tab ${reportType === t.id ? 'active' : ''}`}
              onClick={() => {
                setReportType(t.id);
                setSummary(null);
                setRows([]);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="report-filters">
          {reportType === 'daily' && (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          {reportType === 'monthly' && (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          )}
          {showShopFilter && (
            <select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)}>
              <option value="">All shops</option>
              {shops.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {showProductFilter && (
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
              <option value="">All products</option>
              {productNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-primary" onClick={runReport}>
            Generate Report
          </button>
          {reportType === 'stock' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadProductStockPdf}
              disabled={loading || !summary}
            >
              Download Product Stock PDF
            </button>
          )}
        </div>
      </div>

      {loading && <LoadingSpinner message="Generating report..." />}

      {summary && !loading && (
        <>
          {(reportType === 'daily' || reportType === 'monthly') && (
            <div className="stats-grid stats-grid-compact">
              <div className="summary-pill">Total: {formatCurrency(summary.total)}</div>
              <div className="summary-pill">Cash: {formatCurrency(summary.cash)}</div>
              <div className="summary-pill">Credit: {formatCurrency(summary.credit)}</div>
              <div className="summary-pill">{summary.count} transactions</div>
            </div>
          )}
          {reportType === 'lowstock' && (
            <p className="report-count report-alert">
              ⚠️ {summary.count} product{summary.count === 1 ? '' : 's'} need restocking
              {shopParam ? ` from ${shopParam}` : ''}
            </p>
          )}
          {reportType !== 'daily' && reportType !== 'monthly' && reportType !== 'lowstock' && (
            <p className="report-count">
              {summary.count} records
              {shopParam ? ` · shop: ${shopParam}` : ''}
              {productParam ? ` · product: ${productParam}` : ''}
            </p>
          )}
          <div className="card">
            <DataTable columns={columns} data={rows} />
          </div>
        </>
      )}
    </div>
  );
}
