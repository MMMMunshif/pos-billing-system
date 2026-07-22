import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import DataTable from '../components/DataTable';
import { subscribeCustomers, createCustomer } from '../services/customerService';
import { useToast } from '../context/toastContext';
import { formatCurrency } from '../utils/helpers';

const emptyForm = { name: '', phone: '', address: '', notes: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => subscribeCustomers(setCustomers), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createCustomer(form);
      showToast('Customer added');
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'totalDebt', label: 'Debt', render: (r) => formatCurrency(r.totalDebt) },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage registered customers and credit"
        action={
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Customer'}
          </button>
        }
      />

      {showForm && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      )}

      <SearchBar value={search} onChange={setSearch} placeholder="Search customers..." />

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No customers found"
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
        />
      </div>
    </div>
  );
}
