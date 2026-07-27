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
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="table-actions">
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
            ? 'Manage your shop inventory, stock, and product prices'
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
        placeholder="Search by name, brand, or shop..."
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