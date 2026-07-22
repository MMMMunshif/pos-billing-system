import { getSales } from './salesService';
import { getProducts } from './productService';
import { getCustomers } from './customerService';
import { getStockPurchases } from './stockService';
import { isDateInRange } from '../utils/helpers';
import { PAYMENT_TYPES } from '../utils/constants';
import { getProductShop, getProductBrand, getPurchaseShop } from '../utils/productHelpers';

export const filterSalesByRange = (sales, start, end) =>
  sales.filter((s) => isDateInRange(s.saleDate, start, end));

export const getDailySalesReport = async (date) => {
  const sales = await getSales();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return buildSalesReport(filterSalesByRange(sales, start, end));
};

export const getMonthlySalesReport = async (year, month) => {
  const sales = await getSales();
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return buildSalesReport(filterSalesByRange(sales, start, end));
};

const buildSalesReport = (sales) => {
  let totalSales = 0;
  let cashSales = 0;
  let creditSales = 0;

  sales.forEach((s) => {
    totalSales += s.subtotal || 0;
    if (s.paymentType === PAYMENT_TYPES.CASH) {
      cashSales += s.subtotal || 0;
    } else {
      creditSales += s.balance || s.subtotal || 0;
    }
  });

  return { sales, totalSales, cashSales, creditSales, count: sales.length };
};

export const getCreditSalesReport = async () => {
  const sales = await getSales();
  return sales.filter(
    (s) => s.paymentType === PAYMENT_TYPES.CREDIT || s.paymentType === PAYMENT_TYPES.PARTIAL
  );
};

export const getCustomerDebtReport = async () => {
  const customers = await getCustomers();
  return customers
    .filter((c) => (c.totalDebt || 0) > 0)
    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0));
};

const enrichProduct = (p) => ({
  ...p,
  shop: getProductShop(p) || '—',
  brand: getProductBrand(p) || '—',
});

const matchesShopFilter = (shopValue, filter) =>
  !filter || shopValue.toLowerCase() === filter.toLowerCase();

export const getLowStockReport = async (shopFilter = '') => {
  const products = await getProducts();
  return products
    .filter((p) => (p.currentStock || 0) <= (p.minStockAlert || 0))
    .map(enrichProduct)
    .filter((p) => matchesShopFilter(p.shop === '—' ? '' : p.shop, shopFilter));
};

export const getProductStockReport = async (shopFilter = '') => {
  const products = await getProducts();
  return products
    .map(enrichProduct)
    .filter((p) => matchesShopFilter(p.shop === '—' ? '' : p.shop, shopFilter))
    .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0));
};

const matchesProductFilter = (productName, filter) =>
  !filter || (productName || '').toLowerCase() === filter.toLowerCase();

export const getPurchaseHistoryReport = async (shopFilter = '', productFilter = '') => {
  const purchases = await getStockPurchases();
  return purchases
    .map((p) => ({
      ...p,
      shop: getPurchaseShop(p) || '—',
      brand: p.brand?.trim() || '—',
    }))
    .filter((p) => matchesShopFilter(p.shop === '—' ? '' : p.shop, shopFilter))
    .filter((p) => matchesProductFilter(p.productName, productFilter));
};

export const getUniqueShops = async () => {
  const [products, purchases] = await Promise.all([getProducts(), getStockPurchases()]);
  const names = new Set();
  products.forEach((p) => {
    const shop = getProductShop(p);
    if (shop) names.add(shop);
  });
  purchases.forEach((p) => {
    const shop = getPurchaseShop(p);
    if (shop) names.add(shop);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
};

export const getUniquePurchasedProducts = async () => {
  const purchases = await getStockPurchases();
  const names = new Set();
  purchases.forEach((p) => {
    const name = p.productName?.trim();
    if (name) names.add(name);
  });
  return [...names].sort((a, b) => a.localeCompare(b));
};
