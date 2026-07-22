import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { subscribeCustomers } from '../services/customerService';
import { recordPayment } from '../services/paymentService';
import { useToast } from '../context/toastContext';
import { formatCurrency, toDateInputValue } from '../utils/helpers';

export default function PaymentPage() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(toDateInputValue());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => subscribeCustomers(setCustomers), []);

  const selected = customers.find((c) => c.id === customerId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { remaining } = await recordPayment({ customerId, amount, paymentDate, notes });
      showToast(`Payment recorded. Remaining balance: ${formatCurrency(remaining)}`);
      setAmount('');
      setNotes('');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Collect Payment" subtitle="Record customer debt payments" />

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select customer</option>
              {customers
                .filter((c) => (c.totalDebt || 0) > 0)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Debt: {formatCurrency(c.totalDebt)}
                  </option>
                ))}
            </select>
          </div>
          {selected && (
            <div className="form-group">
              <label>Current Debt</label>
              <input type="text" value={formatCurrency(selected.totalDebt)} disabled />
            </div>
          )}
          <div className="form-group">
            <label>Payment Amount (LKR) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={selected?.totalDebt || undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Payment Date *</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {selected && amount && (
          <p className="remaining-balance">
            Remaining after payment:{' '}
            <strong>{formatCurrency(Math.max(0, (selected.totalDebt || 0) - Number(amount)))}</strong>
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !customerId}>
            {saving ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
