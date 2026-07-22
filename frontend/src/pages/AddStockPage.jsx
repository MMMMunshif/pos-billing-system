import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { subscribeProducts } from '../services/productService';
import { addStockPurchase } from '../services/stockService';
import { useToast } from '../context/toastContext';
import { SHOPS } from '../utils/constants';
import { getProductShop, getProductBrand } from '../utils/productHelpers';
import { toDateInputValue } from '../utils/helpers';

const emptyForm = {
  productName: '',
  shop: '',
  brand: '',
  purchasePrice: '',
  sellingPrice: '',
  quantity: '',
  purchaseDate: toDateInputValue(),
  notes: '',
};

export default function AddStockPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => subscribeProducts(setProducts), []);

  const handleProductSelect = (e) => {
    const name = e.target.value;
    const product = products.find((p) => p.name === name);
    setForm((prev) => ({
      ...prev,
      productName: name,
      sellingPrice: product ? product.sellingPrice : prev.sellingPrice,
      shop: product ? getProductShop(product) : prev.shop,
      brand: product ? getProductBrand(product) : prev.brand,
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await addStockPurchase(form);
      showToast(
        result.productId
          ? 'Stock added successfully. Purchase record saved.'
          : 'Stock purchase saved.'
      );
      setForm({ ...emptyForm, purchaseDate: toDateInputValue() });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Stock"
        subtitle="Record a purchase — shop name and brand are saved with each product."
      />

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Product Name *</label>
            <input
              name="productName"
              list="product-names"
              value={form.productName}
              onChange={handleChange}
              onBlur={handleProductSelect}
              required
              placeholder="Type or select product"
            />
            <datalist id="product-names">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Brand *</label>
            <input name="brand" value={form.brand} onChange={handleChange} required placeholder="Product brand" />
          </div>
          <div className="form-group">
            <label>Purchased From Shop *</label>
            <input
              name="shop"
              list="shop-names"
              value={form.shop}
              onChange={handleChange}
              required
              placeholder="Which shop you bought from"
            />
            <datalist id="shop-names">
              {SHOPS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Purchase Price (LKR) *</label>
            <input name="purchasePrice" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Selling Price (LKR) *</label>
            <input name="sellingPrice" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Purchase Date *</label>
            <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea name="notes" rows={3} value={form.notes} onChange={handleChange} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add Stock'}
          </button>
        </div>
      </form>
    </div>
  );
}
