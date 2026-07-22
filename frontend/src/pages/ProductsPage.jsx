import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { subscribeProducts, deleteProduct } from '../services/productService';
import { useToast } from '../context/toastContext';
import { formatCurrency } from '../utils/helpers';
import { getProductShop, getProductBrand } from '../utils/productHelpers';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showToast } = useToast();

  useEffect(() => subscribeProducts(setProducts), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        getProductShop(p).toLowerCase().includes(q) ||
        getProductBrand(p).toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      showToast('Product deleted');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setDeleteTarget(null);
  };

  const columns = [
    { key: 'name', label: 'Product' },
    { key: 'brand', label: 'Brand', render: (r) => getProductBrand(r) || '—' },
    { key: 'shop', label: 'Purchased From', render: (r) => getProductShop(r) || '—' },
    {
      key: 'lastPurchasePrice',
      label: 'Last Buy Price',
      render: (r) =>
        r.lastPurchasePrice != null ? formatCurrency(r.lastPurchasePrice) : '—',
    },
    { key: 'sellingPrice', label: 'Price', render: (r) => formatCurrency(r.sellingPrice) },
    { key: 'currentStock', label: 'Stock' },
    { key: 'minStockAlert', label: 'Min Alert' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="table-actions">
          <Link to={`/products/edit/${row.id}`} className="btn btn-sm btn-secondary">
            Edit
          </Link>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(row)}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage your shop inventory"
        action={
          <Link to="/products/new" className="btn btn-primary">
            + Add Product
          </Link>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, brand, or shop..." />

      <div className="card">
        <DataTable columns={columns} data={filtered} emptyMessage="No products found" />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
