import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import { subscribeProducts, getLowStockProducts } from '../services/productService';
import { subscribeSales } from '../services/salesService';
import { subscribeCustomers } from '../services/customerService';
import { formatCurrency, formatDateTime, formatTodayLabel, isToday } from '../utils/helpers';
import { PAYMENT_TYPES } from '../utils/constants';
import { getProductShop, getProductBrand } from '../utils/productHelpers';

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  /** Changes at midnight so today-only stats reset without refresh. */
  const [todayKey, setTodayKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const unsubs = [
      subscribeProducts(setProducts),
      subscribeSales(setSales, 200),
      subscribeCustomers(setCustomers),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    const checkDay = () => {
      const key = format(new Date(), 'yyyy-MM-dd');
      setTodayKey((prev) => (prev !== key ? key : prev));
    };
    checkDay();
    const id = setInterval(checkDay, 60_000);
    return () => clearInterval(id);
  }, []);

  const todaySales = useMemo(() => {
    const ref = new Date(`${todayKey}T12:00:00`);
    return sales.filter((s) => isToday(s.saleDate, ref));
  }, [sales, todayKey]);

  const todayStats = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let creditSales = 0;

    todaySales.forEach((s) => {
      totalSales += s.subtotal || 0;
      if (s.paymentType === PAYMENT_TYPES.CASH) {
        cashSales += s.subtotal || 0;
      } else {
        creditSales += s.balance || 0;
      }
    });

    return { totalSales, cashSales, creditSales, count: todaySales.length };
  }, [todaySales]);

  const totalDebt = useMemo(
    () => customers.reduce((sum, c) => sum + (c.totalDebt || 0), 0),
    [customers]
  );

  const lowStock = useMemo(() => getLowStockProducts(products), [products]);
  const todayLabel = useMemo(() => formatTodayLabel(new Date(`${todayKey}T12:00:00`)), [todayKey]);
  const recentSales = todaySales.slice(0, 20);

  const columns = [
    { key: 'saleDate', label: 'Date', render: (r) => formatDateTime(r.saleDate) },
    { key: 'customerName', label: 'Customer' },
    { key: 'subtotal', label: 'Amount', render: (r) => formatCurrency(r.subtotal) },
    { key: 'paymentType', label: 'Payment' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Today only · ${todayLabel}`} />

      <div className="stats-grid">
        <StatCard label="Today Total Sales" value={formatCurrency(todayStats.totalSales)} variant="primary" icon="💰" />
        <StatCard label="Today Cash Sales" value={formatCurrency(todayStats.cashSales)} variant="success" icon="💵" />
        <StatCard label="Today Credit Sales" value={formatCurrency(todayStats.creditSales)} variant="warning" icon="📝" />
        <StatCard label="Total Customer Debt" value={formatCurrency(totalDebt)} variant="danger" icon="⚠️" />
        <StatCard label="Low Stock Items" value={lowStock.length} variant="warning" icon="📉" />
        <StatCard label="Total Products" value={products.length} variant="default" icon="📦" />
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <h2>Today&apos;s Transactions</h2>
          <p className="card-meta">
            {todayStats.count === 0
              ? 'No sales yet today — totals show LKR 0 until you record a sale.'
              : `${todayStats.count} sale${todayStats.count === 1 ? '' : 's'} on ${todayLabel}`}
          </p>
          <DataTable columns={columns} data={recentSales} emptyMessage="No sales today" />
        </section>

        <section className="card">
          <h2>Low Stock Alert</h2>
          {lowStock.length === 0 ? (
            <p className="empty-message">All products are well stocked.</p>
          ) : (
            <ul className="low-stock-list">
              {lowStock.slice(0, 10).map((p) => (
                <li key={p.id}>
                  <span>
                    {p.name}
                    {(getProductBrand(p) || getProductShop(p)) && (
                      <small className="card-meta">
                        {' '}
                        · {getProductBrand(p) || '—'} · {getProductShop(p) || 'No shop'}
                      </small>
                    )}
                  </span>
                  <span className="badge badge-warning">
                    {p.currentStock} / min {p.minStockAlert}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
