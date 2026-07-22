import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getCustomerById,
  getCustomerSales,
  getCustomerPayments,
  subscribeCustomers,
} from '../services/customerService';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { PAYMENT_TYPES } from '../utils/constants';

export default function CustomerDetailsPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [c, s, p] = await Promise.all([
        getCustomerById(id),
        getCustomerSales(id),
        getCustomerPayments(id),
      ]);
      setCustomer(c);
      setSales(s);
      setPayments(p);
      setLoading(false);
    };
    load();

    const unsub = subscribeCustomers((list) => {
      const live = list.find((x) => x.id === id);
      if (live) setCustomer(live);
    });
    return unsub;
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!customer) return <p>Customer not found. <Link to="/customers">Back</Link></p>;

  const creditSales = sales.filter(
    (s) => s.paymentType === PAYMENT_TYPES.CREDIT || s.paymentType === PAYMENT_TYPES.PARTIAL
  );

  const saleColumns = [
    { key: 'saleDate', label: 'Date', render: (r) => formatDateTime(r.saleDate) },
    { key: 'subtotal', label: 'Total', render: (r) => formatCurrency(r.subtotal) },
    { key: 'paidAmount', label: 'Paid', render: (r) => formatCurrency(r.paidAmount) },
    { key: 'balance', label: 'Credit', render: (r) => formatCurrency(r.balance) },
    { key: 'paymentType', label: 'Type' },
  ];

  const paymentColumns = [
    { key: 'paymentDate', label: 'Date', render: (r) => formatDateTime(r.paymentDate) },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle="Customer profile and credit history"
        action={
          <Link to="/payments" className="btn btn-primary">
            Collect Payment
          </Link>
        }
      />

      <div className="customer-profile card">
        <div className="profile-grid">
          <div>
            <span className="label">Phone</span>
            <p>{customer.phone || '-'}</p>
          </div>
          <div>
            <span className="label">Address</span>
            <p>{customer.address || '-'}</p>
          </div>
          <div>
            <span className="label">Current Balance</span>
            <p className="debt-amount">{formatCurrency(customer.totalDebt)}</p>
          </div>
          <div>
            <span className="label">Notes</span>
            <p>{customer.notes || '-'}</p>
          </div>
        </div>
      </div>

      <section className="card">
        <h2>Credit Purchases</h2>
        <DataTable columns={saleColumns} data={creditSales} emptyMessage="No credit purchases" />
      </section>

      <section className="card">
        <h2>Payment History</h2>
        <DataTable columns={paymentColumns} data={payments} emptyMessage="No payments recorded" />
      </section>

      <section className="card">
        <h2>All Purchases</h2>
        <DataTable columns={saleColumns} data={sales} emptyMessage="No purchases" />
      </section>
    </div>
  );
}
