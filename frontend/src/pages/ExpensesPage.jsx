import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from '../services/expenseService';
import {
  formatCurrency,
  formatDateTime,
  toDateInputValue,
} from '../utils/helpers';
import { useToast } from '../context/toastContext';

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'salary', label: 'Salary' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  title: '',
  description: '',
  category: 'other',
  amount: '',
  expenseDate: toDateInputValue(),
  paymentMethod: 'cash',
  notes: '',
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.expenses)) return value.expenses;
  if (Array.isArray(value?.data?.expenses)) return value.data.expenses;
  return [];
}

function getExpenseStatus(expense) {
  return String(expense.status || 'active').toLowerCase();
}

function isActiveExpense(expense) {
  return getExpenseStatus(expense) !== 'deleted';
}

function getExpenseCategoryLabel(category) {
  const match = EXPENSE_CATEGORIES.find((item) => item.value === category);
  return match?.label || 'Other';
}

function getPaymentMethodLabel(method) {
  const match = PAYMENT_METHODS.find((item) => item.value === method);
  return match?.label || 'Cash';
}

function getCategoryBadgeClass(category) {
  const classes = {
    rent: 'bg-blue-100 text-blue-700',
    salary: 'bg-purple-100 text-purple-700',
    electricity: 'bg-yellow-100 text-yellow-700',
    transport: 'bg-orange-100 text-orange-700',
    food: 'bg-green-100 text-green-700',
    maintenance: 'bg-slate-100 text-slate-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return classes[category] || classes.other;
}

function StatCard({ title, value, subtitle, icon, tone = 'blue' }) {
  const toneClasses = {
    blue: 'from-blue-600 to-blue-700 shadow-blue-600/20',
    green: 'from-emerald-600 to-emerald-700 shadow-emerald-600/20',
    red: 'from-red-600 to-red-700 shadow-red-600/20',
    orange: 'from-orange-500 to-orange-600 shadow-orange-500/20',
    purple: 'from-purple-600 to-purple-700 shadow-purple-600/20',
    slate: 'from-slate-700 to-slate-900 shadow-slate-700/20',
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

export default function ExpensesPage() {
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [monthFilter, setMonthFilter] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const result = await getExpenses(5000);
      const data = safeArray(result).filter(isActiveExpense);
      setExpenses(data);
    } catch (error) {
      console.error('Expense load error:', error);
      showToast(error.message || 'Could not load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.expenseDate);
      const expenseMonth = Number.isNaN(expenseDate.getTime())
        ? ''
        : expenseDate.toISOString().slice(0, 7);

      const matchesMonth = !monthFilter || expenseMonth === monthFilter;
      const matchesCategory =
        !categoryFilter || expense.category === categoryFilter;

      const matchesSearch =
        !search ||
        String(expense.title || '').toLowerCase().includes(search) ||
        String(expense.description || '').toLowerCase().includes(search) ||
        String(expense.notes || '').toLowerCase().includes(search);

      return matchesMonth && matchesCategory && matchesSearch;
    });
  }, [expenses, monthFilter, categoryFilter, searchTerm]);

  const summary = useMemo(() => {
    const totalExpense = filteredExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const categoryTotals = {};

    filteredExpenses.forEach((expense) => {
      const category = expense.category || 'other';

      categoryTotals[category] =
        Number(categoryTotals[category] || 0) + Number(expense.amount || 0);
    });

    const highestCategory = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      count: filteredExpenses.length,
      totalExpense,
      highestCategory: highestCategory?.[0] || '',
      highestCategoryAmount: highestCategory?.[1] || 0,
    };
  }, [filteredExpenses]);

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      showToast('Expense title is required', 'error');
      return;
    }

    if (Number(form.amount || 0) <= 0) {
      showToast('Expense amount must be greater than 0', 'error');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        amount: Number(form.amount || 0),
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      };

      if (editingId) {
        await updateExpense(editingId, payload);
        showToast('Expense updated successfully');
      } else {
        await createExpense(payload);
        showToast('Expense added successfully');
      }

      resetForm();
      await loadExpenses();
    } catch (error) {
      console.error('Expense save error:', error);
      showToast(error.message || 'Could not save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);

    setForm({
      title: expense.title || '',
      description: expense.description || '',
      category: expense.category || 'other',
      amount: expense.amount || '',
      expenseDate: expense.expenseDate
        ? toDateInputValue(expense.expenseDate)
        : toDateInputValue(),
      paymentMethod: expense.paymentMethod || 'cash',
      notes: expense.notes || '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (expense) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this expense?\n\n${expense.title}`
    );

    if (!confirmed) return;

    try {
      await deleteExpense(expense.id);
      showToast('Expense deleted successfully');
      await loadExpenses();
    } catch (error) {
      console.error('Expense delete error:', error);
      showToast(error.message || 'Could not delete expense', 'error');
    }
  };

  const columns = [
    {
      key: 'expenseDate',
      label: 'Date',
      render: (row) => formatDateTime(row.expenseDate),
    },
    {
      key: 'title',
      label: 'Expense',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900">{row.title}</p>
          {row.description && (
            <p className="text-xs text-slate-500">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryBadgeClass(
            row.category
          )}`}
        >
          {getExpenseCategoryLabel(row.category)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Payment',
      render: (row) => getPaymentMethodLabel(row.paymentMethod),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span className="font-extrabold text-red-700">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Add and manage shop expenses for accurate net profit calculation"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Expenses"
          value={formatCurrency(summary.totalExpense)}
          subtitle={monthFilter ? `Month: ${monthFilter}` : 'All months'}
          icon="💸"
          tone="red"
        />

        <StatCard
          title="Expense Records"
          value={summary.count}
          subtitle="Filtered records"
          icon="🧾"
          tone="blue"
        />

        <StatCard
          title="Highest Category"
          value={
            summary.highestCategory
              ? getExpenseCategoryLabel(summary.highestCategory)
              : '—'
          }
          subtitle={formatCurrency(summary.highestCategoryAmount)}
          icon="📊"
          tone="orange"
        />
      </div>

      <div className="card mb-6">
        <h2 className="mb-4 text-lg font-extrabold text-slate-900">
          {editingId ? 'Edit Expense' : 'Add New Expense'}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Expense Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              placeholder="Example: Electricity bill"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category
            </label>
            <select
              value={form.category}
              onChange={(event) => updateForm('category', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => updateForm('amount', event.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Expense Date
            </label>
            <input
              type="date"
              value={form.expenseDate}
              onChange={(event) => updateForm('expenseDate', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Payment Method
            </label>
            <select
              value={form.paymentMethod}
              onChange={(event) => updateForm('paymentMethod', event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="Short description"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(event) => updateForm('notes', event.target.value)}
              placeholder="Optional notes"
              rows="3"
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div className="flex gap-3 md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Expense'
                  : 'Add Expense'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Month Filter
            </label>
            <input
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category Filter
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            >
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Search
            </label>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title, description, notes..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading expenses..." />
      ) : (
        <div className="card">
          <DataTable
            columns={columns}
            data={filteredExpenses}
            emptyMessage="No expense records found"
          />
        </div>
      )}
    </div>
  );
}