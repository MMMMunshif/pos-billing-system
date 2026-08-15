import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { subscribeProducts, deleteProduct } from '../services/productService';
import { useToast } from '../context/toastContext';
import { useAuth } from '../context/authContext';
import { formatCurrency } from '../utils/helpers';
import { getProductShop, getProductBrand } from '../utils/productHelpers';

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

function getStockStatus(product) {
  const stock = Number(product.currentStock || 0);
  const minAlert = Number(product.minStockAlert || 0);

  if (stock <= 0) {
    return {
      label: 'Out of Stock',
      className:
        'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700',
    };
  }

  if (stock <= minAlert) {
    return {
      label: 'Low Stock',
      className:
        'inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700',
    };
  }

  return {
    label: 'Available',
    className:
      'inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700',
  };
}

function printBarcodeSticker(product) {
  const barcode = String(product.barcode || '').trim();

  if (!barcode) {
    alert('This product does not have a barcode. Please edit product and generate barcode first.');
    return;
  }

  const productName = product.name || 'Product';
  const brand = getProductBrand(product) || '—';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${SHOP_NAME} Barcode - ${escapeHtml(productName)}</title>
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
            <p class="product">${escapeHtml(productName)}</p>
            <p class="brand">${escapeHtml(brand)}</p>
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
    alert('Popup blocked. Please allow popups for this website and try again.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { showToast } = useToast();
  const { userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'admin';
  const isStaff = userProfile?.role === 'staff';

  useEffect(() => {
    const unsubscribe = subscribeProducts(setProducts);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return products.filter(
      (product) =>
        product.name?.toLowerCase().includes(q) ||
        product.barcode?.toLowerCase().includes(q) ||
        getProductShop(product).toLowerCase().includes(q) ||
        getProductBrand(product).toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (!isAdmin) {
      showToast('Staff cannot delete products', 'error');
      setDeleteTarget(null);
      return;
    }

    try {
      await deleteProduct(deleteTarget.id);
      showToast('Product deleted');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const staffColumns = [
    {
      key: 'name',
      label: 'Product Name',
    },
    {
      key: 'brand',
      label: 'Brand',
      render: (row) => getProductBrand(row) || '—',
    },
    {
      key: 'sellingPrice',
      label: 'Selling Price',
      render: (row) => formatCurrency(row.sellingPrice),
    },
    {
      key: 'currentStock',
      label: 'Available Stock',
      render: (row) => (
        <span className="font-bold text-slate-900">
          {Number(row.currentStock || 0)}
        </span>
      ),
    },
    {
      key: 'stockStatus',
      label: 'Stock Status',
      render: (row) => {
        const status = getStockStatus(row);
        return <span className={status.className}>{status.label}</span>;
      },
    },
  ];

  const adminColumns = [
    {
      key: 'name',
      label: 'Product',
    },
    {
      key: 'barcode',
      label: 'Barcode',
      render: (row) => (
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
          {row.barcode || 'No barcode'}
        </span>
      ),
    },
    {
      key: 'brand',
      label: 'Brand',
      render: (row) => getProductBrand(row) || '—',
    },
    {
      key: 'shop',
      label: 'Purchased From',
      render: (row) => getProductShop(row) || '—',
    },
    {
      key: 'lastPurchasePrice',
      label: 'Purchase Price',
      render: (row) =>
        row.lastPurchasePrice != null
          ? formatCurrency(row.lastPurchasePrice)
          : '—',
    },
    {
      key: 'sellingPrice',
      label: 'Selling Price',
      render: (row) => formatCurrency(row.sellingPrice),
    },
    {
      key: 'currentStock',
      label: 'Stock',
    },
    {
      key: 'minStockAlert',
      label: 'Min Alert',
    },
    {
      key: 'stockStatus',
      label: 'Status',
      render: (row) => {
        const status = getStockStatus(row);
        return <span className={status.className}>{status.label}</span>;
      },
    },
    {
      key: 'generateBarcode',
      label: 'Generate Barcode',
      render: (row) => (
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => printBarcodeSticker(row)}
          disabled={!row.barcode}
          title={!row.barcode ? 'Edit product and generate barcode first' : 'Print barcode'}
        >
          Barcode
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div
          className="table-actions"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'nowrap',
          }}
        >
          <Link
            to={`/products/edit/${row.id}`}
            className="btn btn-sm btn-secondary"
          >
            Edit
          </Link>

          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const columns = isStaff ? staffColumns : adminColumns;

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={
          isAdmin
            ? 'Manage your shop inventory, stock, barcode, and product prices'
            : 'View product selling price, available stock, and stock status'
        }
        action={
          isAdmin ? (
            <Link to="/products/new" className="btn btn-primary">
              + Add Product
            </Link>
          ) : null
        }
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by name, barcode, brand, or shop..."
      />

      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No products found"
        />
      </div>

      {isAdmin && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}