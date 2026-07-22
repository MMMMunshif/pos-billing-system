import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProductById, createProduct, updateProduct } from '../services/productService';
import { useToast } from '../context/toastContext';
import { SHOPS } from '../utils/constants';
import { getProductShop } from '../utils/productHelpers';

const emptyForm = {
  name: '',
  shop: '',
  brand: '',
  sellingPrice: '',
  currentStock: '',
  minStockAlert: '5',
  description: '',
};

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getProductById(id).then((product) => {
      if (product) {
        setForm({
          name: product.name || '',
          shop: getProductShop(product),
          brand: product.brand || '',
          sellingPrice: product.sellingPrice ?? '',
          currentStock: product.currentStock ?? '',
          minStockAlert: product.minStockAlert ?? '5',
          description: product.description || '',
        });
      }
      setLoading(false);
    });
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(id, form);
        showToast('Product updated');
      } else {
        await createProduct(form);
        showToast('Product created');
      }
      navigate('/products');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Product' : 'Add Product'} />

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Product Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Brand *</label>
            <input name="brand" value={form.brand} onChange={handleChange} required placeholder="e.g. Panasonic, Philips" />
          </div>
          <div className="form-group">
            <label>Purchased From Shop *</label>
            <input
              name="shop"
              list="shop-names"
              value={form.shop}
              onChange={handleChange}
              required
              placeholder="Which shop you buy this from"
            />
            <datalist id="shop-names">
              {SHOPS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="form-group">
            <label>Selling Price (LKR) *</label>
            <input name="sellingPrice" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Current Stock *</label>
            <input name="currentStock" type="number" min="0" value={form.currentStock} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Minimum Stock Alert *</label>
            <input name="minStockAlert" type="number" min="0" value={form.minStockAlert} onChange={handleChange} required />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea name="description" rows={3} value={form.description} onChange={handleChange} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/products')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
