import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function StaffDashboard() {
  return (
    <div>
      <PageHeader
        title="Staff Dashboard"
        subtitle="Quick access for sales, products, and customer billing"
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-bold text-slate-900">New Sale</h3>
          <p className="mt-2 text-sm text-slate-500">
            Record customer sales and generate invoice.
          </p>
          <Link to="/sales" className="btn btn-primary mt-4">
            Go to Sales
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-slate-900">View Products</h3>
          <p className="mt-2 text-sm text-slate-500">
            Check available products and selling prices.
          </p>
          <Link to="/products" className="btn btn-primary mt-4">
            View Products
          </Link>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-slate-900">Customers</h3>
          <p className="mt-2 text-sm text-slate-500">
            View customer details and generate customer invoices.
          </p>
          <Link to="/customers" className="btn btn-primary mt-4">
            View Customers
          </Link>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="text-lg font-bold text-slate-900">Staff Access</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            ✅ Can make sales
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            ✅ Can view products
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
            ✅ Can view customers
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            ❌ Cannot access reports, payments, or stock management
          </div>
        </div>
      </div>
    </div>
  );
}