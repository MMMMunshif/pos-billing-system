import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProductById, createProduct, updateProduct } from '../services/productService';
import { useToast } from '../context/toastContext';
import { SHOPS } from '../utils/constants';
import { getProductShop } from '../utils/productHelpers';
import { generateMckBarcode, normalizeBarcode } from '../utils/barcodeHelpers';

const emptyForm = {
  name: '',
  shop: '',
  brand: '',
  barcode: '',
  sellingPrice: '',
  currentStock: '',
  minStockAlert: '5',
  description: '',
};

const SHOP_NAME = 'MCK';
const SHOP_FULL_NAME = 'Multy Corner Kattankudy';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function printBarcodeSticker(form) {
  const barcode = normalizeBarcode(form.barcode);

  if (!barcode) {
    alert('Please generate barcode first.');
    return;
  }

  if (!form.name) {
    alert('Please enter product name first.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${SHOP_NAME} Barcode - ${escapeHtml(form.name)}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
          }

          .actions {
            margin-bottom: 16px;
          }

          .btn {
            border: none;
            border-radius: 10px;
            background: #2563eb;
            color: white;
            font-size: 14px;
            font-weight: 800;
            padding: 10px 16px;
            cursor: pointer;
          }

          .sheet {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
          }

          .sticker {
            width: 260px;
            min-height: 130px;
            background: white;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 10px;
            text-align: center;
            overflow: hidden;
          }

          .shop {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
          }

          .sub {
            margin: 2px 0 7px;
            font-size: 10px;
            font-weight: 700;
            color: #475569;
          }

          .product {
            margin: 0;
            font-size: 13px;
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .brand {
            margin: 2px 0 4px;
            font-size: 11px;
            color: #64748b;
          }

          svg {
            width: 100%;
            max-width: 230px;
            height: 58px;
          }

          .code {
            margin-top: 3px;
            font-size: 10px;
            letter-spacing: 1px;
            color: #334155;
          }

          @media print {
            body {
              background: white;
              padding: 0;
            }

            .actions {
              display: none;
            }

            .sticker {
              page-break-inside: avoid;
              break-inside: avoid;
              box-shadow: none;
            }

            @page {
              size: A4;
              margin: 10mm;
            }
          }
        </style>
      </head>

      <body>
        <div class="actions">
          <button class="btn" onclick="window.print()">Print Barcode Sticker</button>
        </div>

        <div class="sheet">
          <div class="sticker">
            <p class="shop">${SHOP_NAME}</p>
            <p class="sub">${SHOP_FULL_NAME}</p>
            <p class="product">${escapeHtml(form.name)}</p>
            <p class="brand">${escapeHtml(form.brand || '—')}</p>
            <svg id="barcode"></svg>
            <div class="code">${escapeHtml(barcode)}</div>
          </div>
        </div>

        <script>
          window.onload = function () {
            JsBarcode("#barcode", "${escapeHtml(barcode)}", {
              format: "CODE128",
              displayValue: false,
              height: 46,
              margin: 2,
              width: 1.7
            });

            setTimeout(function () {
              window.focus();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (!printWindow) {
    alert('Popup blocked. Please allow popups and try again.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) return;

    setForm((prev) => ({
      ...prev,
      barcode: generateMckBarcode(),
    }));
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;

    getProductById(id)
      .then((product) => {
        if (product) {
          setForm({
            name: product.name || '',
            shop: getProductShop(product),
            brand: product.brand || '',
            barcode: product.barcode || generateMckBarcode(),
            sellingPrice: product.sellingPrice ?? '',
            currentStock: product.currentStock ?? '',
            minStockAlert: product.minStockAlert ?? '5',
            description: product.description || '',
          });
        }
      })
      .catch((error) => {
        showToast(error.message || 'Could not load product', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isEdit, showToast]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: name === 'barcode' ? normalizeBarcode(value) : value,
    }));
  };

  const handleGenerateBarcode = () => {
    setForm((prev) => ({
      ...prev,
      barcode: generateMckBarcode(),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const barcode = normalizeBarcode(form.barcode || generateMckBarcode());

    const payload = {
      ...form,
      barcode,
      sellingPrice: Number(form.sellingPrice || 0),
      currentStock: Number(form.currentStock || 0),
      minStockAlert: Number(form.minStockAlert || 0),
    };

    setSaving(true);

    try {
      if (isEdit) {
        await updateProduct(id, payload);
        showToast('Product updated');
      } else {
        await createProduct(payload);
        showToast('Product created');
      }

      navigate('/products');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Product' : 'Add Product'}
        subtitle="Add product details with unique MCK barcode"
      />

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Product Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="e.g. Rice Cooker"
            />
          </div>

          <div className="form-group">
            <label>Brand *</label>
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              required
              placeholder="e.g. Panasonic, Philips"
            />
          </div>

          <div className="form-group">
            <label>Barcode *</label>

            <input
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              required
              placeholder="Auto generated barcode"
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGenerateBarcode}
              >
                Generate Barcode
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => printBarcodeSticker(form)}
              >
                Print Barcode
              </button>
            </div>

            <small style={{ color: '#64748b' }}>
              Generate barcode, save product, then print and paste sticker on the product.
            </small>
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
              {SHOPS.map((shop) => (
                <option key={shop} value={shop} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label>Selling Price (LKR) *</label>
            <input
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Current Stock *</label>
            <input
              name="currentStock"
              type="number"
              min="0"
              value={form.currentStock}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Minimum Stock Alert *</label>
            <input
              name="minStockAlert"
              type="number"
              min="0"
              value={form.minStockAlert}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="Optional product description"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/products')}
          >
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