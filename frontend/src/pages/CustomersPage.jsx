import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import InvoicePreview from '../components/InvoicePreview';
import { subscribeCustomers, createCustomer } from '../services/customerService';
import { getSales, getSaleItems } from '../services/salesService';
import { useAuth } from '../context/authContext';
import { useToast } from '../context/toastContext';
import { formatCurrency } from '../utils/helpers';

const emptyForm = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

function createInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

function getArrayFromApiResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.sales)) return result.sales;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.sales)) return result.data.sales;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.data?.data)) return result.data.data;
  return [];
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function getSaleId(sale) {
  return sale.id || sale.saleId || sale._id || '';
}

function getCustomerPhone(customer) {
  return (
    customer?.phone ||
    customer?.phoneNumber ||
    customer?.contactNumber ||
    customer?.mobile ||
    customer?.whatsapp ||
    ''
  );
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

function getItemName(item) {
  return item.productName || item.name || item.itemName || 'Product';
}

function getItemQuantity(item) {
  return Number(item.quantity || item.qty || 0);
}

function getItemPrice(item) {
  return Number(item.unitPrice || item.sellingPrice || item.price || 0);
}

function getSaleAmount(sale) {
  return (
    Number(sale.subtotal) ||
    Number(sale.totalAmount) ||
    Number(sale.total) ||
    Number(sale.amount) ||
    0
  );
}

function getSalePaidAmount(sale) {
  return Number(sale.paidAmount || sale.paid || 0);
}

function saleBelongsToCustomer(sale, customer) {
  const saleCustomerId =
    sale.customerId || sale.customer?.id || sale.customer?.customerId || '';

  const saleCustomerName =
    sale.customerName || sale.customer?.name || sale.name || '';

  const saleCustomerPhone =
    sale.customerPhone ||
    sale.phone ||
    sale.customer?.phone ||
    sale.customer?.phoneNumber ||
    '';

  return (
    saleCustomerId === customer.id ||
    normalize(saleCustomerName) === normalize(customer.name) ||
    normalize(saleCustomerPhone) === normalize(getCustomerPhone(customer))
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerItems, setCustomerItems] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [invoice, setInvoice] = useState(null);

  const { userProfile } = useAuth();
  const { showToast } = useToast();

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    const unsubscribeCustomers = subscribeCustomers(setCustomers);

    return () => {
      if (typeof unsubscribeCustomers === 'function') {
        unsubscribeCustomers();
      }
    };
  }, []);

  useEffect(() => {
    async function loadSalesSummary() {
      try {
        const result = await getSales(500);
        setAllSales(getArrayFromApiResult(result));
      } catch (error) {
        console.error('Failed to load sales summary:', error);
      }
    }

    loadSalesSummary();
  }, []);

  const getCustomerSales = (customer) => {
    return allSales.filter((sale) => saleBelongsToCustomer(sale, customer));
  };

  const getCustomerTotalPurchase = (customer) => {
    return getCustomerSales(customer).reduce(
      (sum, sale) => sum + getSaleAmount(sale),
      0
    );
  };

  const getCustomerPaidAmount = (customer) => {
    const totalPurchase = getCustomerTotalPurchase(customer);
    const debt = Number(customer.totalDebt || 0);

    const salesPaid = getCustomerSales(customer).reduce(
      (sum, sale) => sum + getSalePaidAmount(sale),
      0
    );

    if (salesPaid > 0) return salesPaid;

    return Math.max(totalPurchase - debt, 0);
  };

  const getLastPaymentDate = (customer) => {
    const customerSales = getCustomerSales(customer)
      .filter((sale) => getSalePaidAmount(sale) > 0 || getSaleAmount(sale) > 0)
      .sort((a, b) => {
        const dateA = new Date(getSaleDate(a)).getTime() || 0;
        const dateB = new Date(getSaleDate(b)).getTime() || 0;
        return dateB - dateA;
      });

    return customerSales.length ? getSaleDate(customerSales[0]) : '-';
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return customers.filter((customer) => {
      const matchesSearch =
        !q ||
        customer.name?.toLowerCase().includes(q) ||
        getCustomerPhone(customer).toLowerCase().includes(q) ||
        customer.address?.toLowerCase().includes(q);

      const debt = Number(customer.totalDebt || 0);

      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'debt' && debt > 0) ||
        (filterType === 'noDebt' && debt <= 0);

      return matchesSearch && matchesFilter;
    });
  }, [customers, search, filterType]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createCustomer(form);
      showToast('Customer added');
      setForm(emptyForm);
      setShowForm(false);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadCustomerPurchases = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerItems([]);
    setPurchaseError('');
    setLoadingPurchases(true);

    try {
      const matchedSales = getCustomerSales(customer);
      const allItems = [];

      for (const sale of matchedSales) {
        const saleId = getSaleId(sale);
        let items = [];

        if (Array.isArray(sale.items) && sale.items.length) {
          items = sale.items;
        } else if (saleId) {
          try {
            const itemResult = await getSaleItems(saleId);
            items = getArrayFromApiResult(itemResult);
          } catch (itemError) {
            console.error('Could not load items for sale:', saleId, itemError);
          }
        }

        if (items.length) {
          items.forEach((item) => {
            const quantity = getItemQuantity(item);
            const unitPrice = getItemPrice(item);

            allItems.push({
              saleId,
              saleDate: getSaleDate(sale),
              paymentType: sale.paymentType || '',
              productName: getItemName(item),
              quantity,
              unitPrice,
              amount: quantity * unitPrice,
            });
          });
        } else {
          const amount = getSaleAmount(sale);

          if (amount > 0) {
            allItems.push({
              saleId,
              saleDate: getSaleDate(sale),
              paymentType: sale.paymentType || '',
              productName: 'Sale total',
              quantity: 1,
              unitPrice: amount,
              amount,
            });
          }
        }
      }

      setCustomerItems(allItems);

      if (!matchedSales.length) {
        setPurchaseError('No sales found for this customer.');
      } else if (!allItems.length) {
        setPurchaseError(
          'Sales found, but product item details are not available for this customer.'
        );
      }
    } catch (error) {
      console.error('Customer purchase load error:', error);
      setPurchaseError('Could not load customer purchase details.');
    } finally {
      setLoadingPurchases(false);
    }
  };

  const closePurchaseModal = () => {
    setSelectedCustomer(null);
    setCustomerItems([]);
    setPurchaseError('');
  };

  const purchaseTotal = customerItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const currentDebt = Number(selectedCustomer?.totalDebt || 0);
  const paidAmount = Math.max(purchaseTotal - currentDebt, 0);

  const handleGenerateInvoice = () => {
    if (!selectedCustomer) return;

    if (!customerItems.length) {
      showToast('No purchased product details found for invoice', 'error');
      return;
    }

    const invoiceData = {
      invoiceNo: createInvoiceNumber(),
      saleDate: new Date().toISOString().slice(0, 10),
      customerType: 'registered',
      customerName: selectedCustomer.name,
      customerPhone: getCustomerPhone(selectedCustomer),
      paymentType: 'Customer Purchase',
      items: customerItems.map((item) => ({
        productId: item.saleId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotal: purchaseTotal,
      paidAmount,
      balance: currentDebt,
    };

    setInvoice(invoiceData);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage customer debt, purchases, and invoices"
        action={
          isAdmin ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ Add Customer'}
            </button>
          ) : null
        }
      />

      {showForm && isAdmin && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <input
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      )}

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search customers..."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            filterType === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 ring-1 ring-slate-200'
          }`}
        >
          All Customers
        </button>

        <button
          type="button"
          onClick={() => setFilterType('debt')}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            filterType === 'debt'
              ? 'bg-red-600 text-white'
              : 'bg-white text-slate-700 ring-1 ring-slate-200'
          }`}
        >
          Debt Customers
        </button>

        <button
          type="button"
          onClick={() => setFilterType('noDebt')}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            filterType === 'noDebt'
              ? 'bg-green-600 text-white'
              : 'bg-white text-slate-700 ring-1 ring-slate-200'
          }`}
        >
          No Debt
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-sm font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-4">Name</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-4 py-4">Total Purchase</th>
                <th className="px-4 py-4">Paid Amount</th>
                <th className="px-4 py-4">Balance Debt</th>
                <th className="px-4 py-4">Last Payment Date</th>
                <th className="px-4 py-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length ? (
                filtered.map((customer) => {
                  const totalPurchase = getCustomerTotalPurchase(customer);
                  const customerPaid = getCustomerPaidAmount(customer);
                  const debt = Number(customer.totalDebt || 0);
                  const lastPaymentDate = getLastPaymentDate(customer);

                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-slate-100 text-sm hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {customer.name}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {getCustomerPhone(customer) || '-'}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {formatCurrency(totalPurchase)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-green-700">
                        {formatCurrency(customerPaid)}
                      </td>

                      <td
                        className={`px-4 py-4 font-bold ${
                          debt > 0 ? 'text-red-700' : 'text-green-700'
                        }`}
                      >
                        {formatCurrency(debt)}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {lastPaymentDate}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => loadCustomerPurchases(customer)}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Customer Purchase Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedCustomer.name} •{' '}
                  {getCustomerPhone(selectedCustomer) || 'No phone'}
                </p>
              </div>

              <button
                type="button"
                onClick={closePurchaseModal}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Customer
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {selectedCustomer.name}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Total Purchase
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {formatCurrency(purchaseTotal)}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase text-green-500">
                    Paid Amount
                  </p>
                  <p className="mt-2 font-bold text-green-700">
                    {formatCurrency(paidAmount)}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase text-red-400">
                    Balance Debt
                  </p>
                  <p className="mt-2 font-bold text-red-700">
                    {formatCurrency(currentDebt)}
                  </p>
                </div>
              </div>

              {purchaseError && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {purchaseError}
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-[120px_1fr_100px_160px_160px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                  <span>Date</span>
                  <span>Product</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Amount</span>
                </div>

                {loadingPurchases ? (
                  <div className="px-4 py-12 text-center text-sm text-slate-500">
                    Loading purchase details...
                  </div>
                ) : customerItems.length ? (
                  customerItems.map((item, index) => (
                    <div
                      key={`${item.saleId}-${index}`}
                      className="grid grid-cols-[120px_1fr_100px_160px_160px] border-b border-slate-100 px-4 py-3 text-sm"
                    >
                      <span className="text-slate-500">{item.saleDate}</span>
                      <span className="font-medium text-slate-800">
                        {item.productName}
                      </span>
                      <span className="text-right">{item.quantity}</span>
                      <span className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      <span className="text-right font-semibold">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-12 text-center text-sm text-slate-500">
                    No purchased product details found for this customer.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateInvoice}
                  disabled={!customerItems.length}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoice && (
        <InvoicePreview invoice={invoice} onClose={() => setInvoice(null)} />
      )}
    </div>
  );
}