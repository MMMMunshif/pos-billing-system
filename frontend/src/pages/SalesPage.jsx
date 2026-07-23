import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import InvoicePreview from '../components/InvoicePreview';
import { subscribeProducts } from '../services/productService';
import { subscribeCustomers } from '../services/customerService';
import { createSale } from '../services/salesService';
import { useAuth } from '../context/authContext';
import { useToast } from '../context/toastContext';
import { CUSTOMER_TYPES, PAYMENT_TYPES } from '../utils/constants';
import { formatCurrency, toDateInputValue, calcBalance } from '../utils/helpers';

const emptyItem = {
  productId: '',
  productName: '',
  quantity: 1,
  unitPrice: '',
};

const IconBox = ({ children, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    rose: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100',
    slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ${
        colors[color] || colors.blue
      }`}
    >
      {children}
    </span>
  );
};

function createInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
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

export default function SalesPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerType, setCustomerType] = useState(CUSTOMER_TYPES.WALK_IN);
  const [customerId, setCustomerId] = useState('');
  const [paymentType, setPaymentType] = useState(PAYMENT_TYPES.CASH);
  const [paidAmount, setPaidAmount] = useState('');
  const [saleDate, setSaleDate] = useState(toDateInputValue());
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [lastInvoice, setLastInvoice] = useState(null);

  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribeProducts = subscribeProducts(setProducts);
    const unsubscribeCustomers = subscribeCustomers(setCustomers);

    return () => {
      unsubscribeProducts();
      unsubscribeCustomers();
    };
  }, []);

  useEffect(() => {
    try {
      const savedInvoice = localStorage.getItem('lastInvoice');

      if (savedInvoice) {
        setLastInvoice(JSON.parse(savedInvoice));
      }
    } catch (error) {
      console.error('Failed to load last invoice:', error);
      localStorage.removeItem('lastInvoice');
    }
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return sum + quantity * unitPrice;
  }, 0);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  const currentPaidAmount =
    paymentType === PAYMENT_TYPES.CASH ? subtotal : Number(paidAmount) || 0;

  const balance = calcBalance(subtotal, currentPaidAmount);

  const updateItem = (index, field, value) => {
    setItems((prevItems) => {
      const nextItems = [...prevItems];

      nextItems[index] = {
        ...nextItems[index],
        [field]: value,
      };

      if (field === 'productId') {
        const product = products.find((p) => p.id === value);

        if (product) {
          nextItems[index].productName = product.name;
          nextItems[index].unitPrice = product.sellingPrice;
        }
      }

      return nextItems;
    });
  };

  const addItemRow = () => {
    setItems((prevItems) => [...prevItems, { ...emptyItem }]);
  };

  const removeItemRow = (index) => {
    setItems((prevItems) => prevItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validItems = items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }));

    if (!validItems.length) {
      showToast('Add at least one product', 'error');
      return;
    }

    if (!user?.uid) {
      showToast('Login user not found. Please login again.', 'error');
      return;
    }

    if (customerType === CUSTOMER_TYPES.REGISTERED && !customerId) {
      showToast('Select a registered customer', 'error');
      return;
    }

    if (
      (paymentType === PAYMENT_TYPES.CREDIT ||
        paymentType === PAYMENT_TYPES.PARTIAL) &&
      customerType === CUSTOMER_TYPES.WALK_IN
    ) {
      showToast('Credit sales require a registered customer', 'error');
      return;
    }

    const actualPaidAmount =
      paymentType === PAYMENT_TYPES.CASH ? subtotal : Number(paidAmount) || 0;

    const finalBalance = calcBalance(subtotal, actualPaidAmount);

    setSaving(true);

    try {
      await createSale(
        {
          customerType,
          customerId:
            customerType === CUSTOMER_TYPES.REGISTERED ? customerId : null,
          customerName:
            customerType === CUSTOMER_TYPES.REGISTERED
              ? selectedCustomer?.name
              : 'Walk-in',
          paymentType,
          paidAmount: actualPaidAmount,
          saleDate,
        },
        validItems,
        user.uid
      );

      const invoiceData = {
        invoiceNo: createInvoiceNumber(),
        saleDate,
        customerType,
        customerName:
          customerType === CUSTOMER_TYPES.REGISTERED
            ? selectedCustomer?.name
            : 'Walk-in Customer',
        customerPhone:
          customerType === CUSTOMER_TYPES.REGISTERED
            ? getCustomerPhone(selectedCustomer)
            : '',
        paymentType,
        items: validItems,
        subtotal,
        paidAmount: actualPaidAmount,
        balance: finalBalance,
      };

      setInvoice(invoiceData);
      setLastInvoice(invoiceData);
      localStorage.setItem('lastInvoice', JSON.stringify(invoiceData));

      showToast('Sale recorded successfully');

      setItems([{ ...emptyItem }]);
      setPaidAmount('');
      setCustomerId('');
      setPaymentType(PAYMENT_TYPES.CASH);
      setCustomerType(CUSTOMER_TYPES.WALK_IN);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <PageHeader
        title="New Sale"
        subtitle="Record a sale, generate invoice, print, and send bill through WhatsApp"
      />

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white px-6 py-5">
                <IconBox color="blue">🛒</IconBox>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Sale Details
                  </h2>
                  <p className="text-sm text-slate-500">
                    Select customer, sale date, and payment type
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Customer Type
                  </label>
                  <select
                    value={customerType}
                    onChange={(event) => {
                      setCustomerType(event.target.value);
                      setCustomerId('');
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value={CUSTOMER_TYPES.WALK_IN}>Walk-in Customer</option>
                    <option value={CUSTOMER_TYPES.REGISTERED}>
                      Registered Customer
                    </option>
                  </select>
                </div>

                {customerType === CUSTOMER_TYPES.REGISTERED && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Customer
                    </label>
                    <select
                      value={customerId}
                      onChange={(event) => setCustomerId(event.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} — Debt:{' '}
                          {formatCurrency(customer.totalDebt)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-400">
                      Registered customer phone number will be used for WhatsApp bill.
                    </p>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Sale Date
                  </label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(event) => setSaleDate(event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Payment Type
                  </label>
                  <select
                    value={paymentType}
                    onChange={(event) => setPaymentType(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value={PAYMENT_TYPES.CASH}>Cash</option>
                    <option value={PAYMENT_TYPES.CREDIT}>Credit</option>
                    <option value={PAYMENT_TYPES.PARTIAL}>Partial Payment</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
              <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <IconBox color="blue">📦</IconBox>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Sale Items
                    </h2>
                    <p className="text-sm text-slate-500">
                      Add products and quantities for this sale
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 active:bg-blue-800"
                >
                  <span className="text-base leading-none">+</span> Add Item
                </button>
              </div>

              <div className="p-6">
                <div className="hidden grid-cols-[1fr_90px_140px_140px_44px] gap-3 px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span className="text-right">Line Total</span>
                  <span />
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const lineTotal =
                      (Number(item.quantity) || 0) *
                      (Number(item.unitPrice) || 0);

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-slate-300 hover:bg-slate-50 md:grid-cols-[1fr_90px_140px_140px_44px] md:items-center"
                      >
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(event) =>
                              updateItem(index, 'productId', event.target.value)
                            }
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} | {product.brand || 'No brand'} |{' '}
                                {formatCurrency(product.sellingPrice)} | Stock:{' '}
                                {product.currentStock}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, 'quantity', event.target.value)
                            }
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItem(index, 'unitPrice', event.target.value)
                            }
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">
                            Line Total
                          </label>
                          <div className="rounded-xl bg-white px-3 py-2.5 text-right text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                              aria-label="Remove item"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="sticky top-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
              <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white px-6 py-5">
                <IconBox color="green">🧾</IconBox>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Sale Summary
                  </h2>
                  <p className="text-sm text-slate-500">
                    Review before complete
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Total Items</span>
                    <span className="font-medium text-slate-700">
                      {items.length}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>Customer</span>
                    <span className="text-right font-medium text-slate-700">
                      {customerType === CUSTOMER_TYPES.REGISTERED
                        ? selectedCustomer?.name || 'Not selected'
                        : 'Walk-in'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>Payment</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {paymentType}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/25">
                  <p className="text-sm font-medium text-blue-100">Subtotal</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {formatCurrency(subtotal)}
                  </p>
                </div>

                {paymentType !== PAYMENT_TYPES.CASH && (
                  <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-amber-800">
                        Paid Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={subtotal}
                        value={paidAmount}
                        onChange={(event) => setPaidAmount(event.target.value)}
                        className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-amber-100">
                      <span className="text-sm font-medium text-amber-700">
                        Balance Credit
                      </span>
                      <span className="text-sm font-bold text-amber-800">
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || subtotal <= 0}
                  className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {saving ? 'Processing Sale…' : 'Complete Sale'}
                </button>

                {lastInvoice && (
                  <button
                    type="button"
                    onClick={() => setInvoice(lastInvoice)}
                    className="w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                  >
                    View Last Invoice
                  </button>
                )}

                <p className="text-center text-xs text-slate-400">
                  Stock will be updated automatically and invoice will be generated.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </form>

      {invoice && (
        <InvoicePreview invoice={invoice} onClose={() => setInvoice(null)} />
      )}
    </div>
  );
}