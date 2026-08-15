import { getSales, getSaleItems } from './salesService';
import { getProducts } from './productService';
import { getCustomers } from './customerService';
import { getStockPurchases } from './stockService';
import { getExpenses } from './expenseService';
import { isDateInRange } from '../utils/helpers';
import { PAYMENT_TYPES } from '../utils/constants';
import {
  getProductShop,
  getProductBrand,
  getPurchaseShop,
} from '../utils/productHelpers';

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.sales)) return value.sales;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.expenses)) return value.expenses;
  if (Array.isArray(value?.data?.sales)) return value.data.sales;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data?.expenses)) return value.data.expenses;
  return [];
}

function getSaleId(sale) {
  return sale.id || sale.saleId || sale._id || '';
}

function getSaleStatus(sale) {
  return String(sale.status || 'active').toLowerCase();
}

function isCancelledSale(sale) {
  return getSaleStatus(sale) === 'cancelled';
}

function isActiveSale(sale) {
  return !isCancelledSale(sale);
}

function getExpenseStatus(expense) {
  return String(expense.status || 'active').toLowerCase();
}

function isActiveExpense(expense) {
  return getExpenseStatus(expense) !== 'deleted';
}

function getSaleTotal(sale) {
  return (
    Number(sale.finalTotal) ||
    Number(sale.subtotal) ||
    Number(sale.totalAmount) ||
    Number(sale.total) ||
    Number(sale.amount) ||
    0
  );
}

function getSalePaid(sale) {
  return Number(sale.paidAmount || sale.paid || 0);
}

function getSaleBalance(sale) {
  if (sale.balance != null) {
    return Number(sale.balance || 0);
  }

  return Math.max(getSaleTotal(sale) - getSalePaid(sale), 0);
}

function getItemQty(item) {
  return Number(item.quantity || item.qty || 0);
}

function getItemRevenue(item) {
  if (item.lineTotal != null) return Number(item.lineTotal || 0);

  const qty = getItemQty(item);
  const unitPrice = Number(item.unitPrice || item.finalPrice || item.price || 0);

  return qty * unitPrice;
}

function getItemCost(item) {
  if (item.lineCostTotal != null) return Number(item.lineCostTotal || 0);

  const qty = getItemQty(item);
  const purchasePrice = Number(item.purchasePrice || item.costPrice || 0);

  return qty * purchasePrice;
}

function getItemDiscount(item) {
  if (item.lineDiscountTotal != null) return Number(item.lineDiscountTotal || 0);

  const qty = getItemQty(item);
  const discountAmount = Number(item.discountAmount || 0);

  return qty * discountAmount;
}

function getProductNameFromItem(item) {
  return item.productName || item.name || item.itemName || 'Product';
}

function getExpenseCategoryLabel(category) {
  const labels = {
    rent: 'Rent',
    salary: 'Salary',
    electricity: 'Electricity',
    transport: 'Transport',
    food: 'Food',
    maintenance: 'Maintenance',
    other: 'Other',
  };

  return labels[category] || 'Other';
}

export const filterSalesByRange = (sales, start, end) =>
  sales.filter((sale) => isDateInRange(sale.saleDate, start, end));

export const filterExpensesByRange = (expenses, start, end) =>
  expenses.filter((expense) => isDateInRange(expense.expenseDate, start, end));

export const getDailySalesReport = async (date) => {
  const salesResult = await getSales(5000);
  const sales = safeArray(salesResult);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return buildSalesReport(filterSalesByRange(sales, start, end));
};

export const getMonthlySalesReport = async (year, month) => {
  const salesResult = await getSales(5000);
  const sales = safeArray(salesResult);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return buildSalesReport(filterSalesByRange(sales, start, end));
};

const buildSalesReport = (sales) => {
  const activeSales = sales.filter(isActiveSale);
  const cancelledSales = sales.filter(isCancelledSale);

  let totalSales = 0;
  let cashSales = 0;
  let creditSales = 0;
  let paidAmount = 0;
  let balanceAmount = 0;

  activeSales.forEach((sale) => {
    const total = getSaleTotal(sale);
    const paid = getSalePaid(sale);
    const balance = getSaleBalance(sale);
    const paymentType = String(sale.paymentType || '').toLowerCase();

    totalSales += total;
    paidAmount += paid;
    balanceAmount += balance;

    if (paymentType === PAYMENT_TYPES.CASH || paymentType === 'cash') {
      cashSales += total;
    } else {
      creditSales += balance;
    }
  });

  const cancelledTotal = cancelledSales.reduce(
    (sum, sale) => sum + getSaleTotal(sale),
    0
  );

  return {
    sales: activeSales,
    activeSales,
    cancelledSales,

    totalSales,
    cashSales,
    creditSales,
    paidAmount,
    balanceAmount,

    count: activeSales.length,
    activeCount: activeSales.length,

    cancelledCount: cancelledSales.length,
    cancelledTotal,
  };
};

export const getCreditSalesReport = async () => {
  const salesResult = await getSales(5000);
  const sales = safeArray(salesResult);

  return sales
    .filter(isActiveSale)
    .filter(
      (sale) =>
        sale.paymentType === PAYMENT_TYPES.CREDIT ||
        sale.paymentType === PAYMENT_TYPES.PARTIAL ||
        sale.paymentType === 'credit' ||
        sale.paymentType === 'partial'
    )
    .filter((sale) => getSaleBalance(sale) > 0);
};

export const getCustomerDebtReport = async () => {
  const customers = await getCustomers();

  return customers
    .filter((customer) => (customer.totalDebt || 0) > 0)
    .sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0));
};

const enrichProduct = (product) => ({
  ...product,
  shop: getProductShop(product) || '—',
  brand: getProductBrand(product) || '—',
});

const matchesShopFilter = (shopValue, filter) =>
  !filter || shopValue.toLowerCase() === filter.toLowerCase();

export const getLowStockReport = async (shopFilter = '') => {
  const products = await getProducts();

  return products
    .filter((product) => {
      const stock = Number(product.currentStock || 0);
      const minAlert = Number(product.minStockAlert || 0);

      return stock <= minAlert;
    })
    .map(enrichProduct)
    .filter((product) =>
      matchesShopFilter(product.shop === '—' ? '' : product.shop, shopFilter)
    );
};

export const getProductStockReport = async (shopFilter = '') => {
  const products = await getProducts();

  return products
    .map(enrichProduct)
    .filter((product) =>
      matchesShopFilter(product.shop === '—' ? '' : product.shop, shopFilter)
    )
    .sort((a, b) => (a.currentStock || 0) - (b.currentStock || 0));
};

const matchesProductFilter = (productName, filter) =>
  !filter || (productName || '').toLowerCase() === filter.toLowerCase();

export const getPurchaseHistoryReport = async (
  shopFilter = '',
  productFilter = ''
) => {
  const purchases = await getStockPurchases();

  return purchases
    .map((purchase) => ({
      ...purchase,
      shop: getPurchaseShop(purchase) || '—',
      brand: purchase.brand?.trim() || '—',
    }))
    .filter((purchase) =>
      matchesShopFilter(purchase.shop === '—' ? '' : purchase.shop, shopFilter)
    )
    .filter((purchase) =>
      matchesProductFilter(purchase.productName, productFilter)
    );
};

export const getUniqueShops = async () => {
  const [products, purchases] = await Promise.all([
    getProducts(),
    getStockPurchases(),
  ]);

  const names = new Set();

  products.forEach((product) => {
    const shop = getProductShop(product);

    if (shop) {
      names.add(shop);
    }
  });

  purchases.forEach((purchase) => {
    const shop = getPurchaseShop(purchase);

    if (shop) {
      names.add(shop);
    }
  });

  return [...names].sort((a, b) => a.localeCompare(b));
};

export const getUniquePurchasedProducts = async () => {
  const purchases = await getStockPurchases();
  const names = new Set();

  purchases.forEach((purchase) => {
    const name = purchase.productName?.trim();

    if (name) {
      names.add(name);
    }
  });

  return [...names].sort((a, b) => a.localeCompare(b));
};

/* ---------------- PROFIT + EXPENSE + NET PROFIT REPORT ---------------- */

async function loadSaleItemsForProfit(sale) {
  if (Array.isArray(sale.items) && sale.items.length) {
    return sale.items;
  }

  const saleId = getSaleId(sale);

  if (!saleId) {
    return [];
  }

  try {
    const result = await getSaleItems(saleId);
    return safeArray(result);
  } catch (error) {
    console.error('Could not load sale items for profit:', saleId, error);
    return [];
  }
}

function buildExpenseSummary(expenses) {
  const activeExpenses = expenses.filter(isActiveExpense);

  const categoryMap = {};
  let totalExpenses = 0;

  activeExpenses.forEach((expense) => {
    const category = expense.category || 'other';
    const amount = Number(expense.amount || 0);

    totalExpenses += amount;

    if (!categoryMap[category]) {
      categoryMap[category] = {
        category,
        categoryLabel: getExpenseCategoryLabel(category),
        amount: 0,
        count: 0,
      };
    }

    categoryMap[category].amount += amount;
    categoryMap[category].count += 1;
  });

  const expenseRows = Object.values(categoryMap).sort(
    (a, b) => b.amount - a.amount
  );

  return {
    expenses: activeExpenses,
    expenseRows,
    totalExpenses,
    expenseCount: activeExpenses.length,
  };
}

async function buildProfitReport(sales, expenses = []) {
  const activeSales = sales.filter(isActiveSale);
  const cancelledSales = sales.filter(isCancelledSale);
  const expenseSummary = buildExpenseSummary(expenses);

  const productMap = {};

  let totalRevenue = 0;
  let totalCost = 0;
  let totalDiscount = 0;
  let grossProfit = 0;
  let totalQuantity = 0;

  for (const sale of activeSales) {
    const items = await loadSaleItemsForProfit(sale);

    let saleRevenue = Number(sale.finalTotal || sale.subtotal || 0);
    let saleCost = Number(sale.totalCost || 0);
    let saleDiscount = Number(sale.totalDiscount || 0);
    let saleProfit = Number(sale.grossProfit || 0);

    if (items.length) {
      saleRevenue = 0;
      saleCost = 0;
      saleDiscount = 0;
      saleProfit = 0;

      items.forEach((item) => {
        const productName = getProductNameFromItem(item);
        const quantity = getItemQty(item);
        const revenue = getItemRevenue(item);
        const cost = getItemCost(item);
        const discount = getItemDiscount(item);
        const profit =
          item.lineProfit != null ? Number(item.lineProfit || 0) : revenue - cost;

        const key = productName.toLowerCase();

        if (!productMap[key]) {
          productMap[key] = {
            productName,
            quantity: 0,
            revenue: 0,
            cost: 0,
            discount: 0,
            profit: 0,
          };
        }

        productMap[key].quantity += quantity;
        productMap[key].revenue += revenue;
        productMap[key].cost += cost;
        productMap[key].discount += discount;
        productMap[key].profit += profit;

        saleRevenue += revenue;
        saleCost += cost;
        saleDiscount += discount;
        saleProfit += profit;
        totalQuantity += quantity;
      });
    }

    totalRevenue += saleRevenue;
    totalCost += saleCost;
    totalDiscount += saleDiscount;
    grossProfit += saleProfit;
  }

  const totalExpenses = expenseSummary.totalExpenses;
  const netProfit = grossProfit - totalExpenses;

  const grossProfitMargin =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const netProfitMargin =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const cancelledTotal = cancelledSales.reduce(
    (sum, sale) => sum + getSaleTotal(sale),
    0
  );

  const productRows = Object.values(productMap)
    .map((item) => ({
      ...item,
      profitMargin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);

  return {
    sales: activeSales,
    rows: productRows,

    expenses: expenseSummary.expenses,
    expenseRows: expenseSummary.expenseRows,

    totalRevenue,
    totalCost,
    totalDiscount,
    grossProfit,
    totalExpenses,
    netProfit,

    profitMargin: grossProfitMargin,
    grossProfitMargin,
    netProfitMargin,

    totalQuantity,

    activeSalesCount: activeSales.length,
    expenseCount: expenseSummary.expenseCount,

    cancelledCount: cancelledSales.length,
    cancelledTotal,
  };
}

export const getDailyProfitReport = async (date) => {
  const [salesResult, expensesResult] = await Promise.all([
    getSales(5000),
    getExpenses(5000),
  ]);

  const sales = safeArray(salesResult);
  const expenses = safeArray(expensesResult);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return buildProfitReport(
    filterSalesByRange(sales, start, end),
    filterExpensesByRange(expenses, start, end)
  );
};

export const getMonthlyProfitReport = async (year, month) => {
  const [salesResult, expensesResult] = await Promise.all([
    getSales(5000),
    getExpenses(5000),
  ]);

  const sales = safeArray(salesResult);
  const expenses = safeArray(expensesResult);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return buildProfitReport(
    filterSalesByRange(sales, start, end),
    filterExpensesByRange(expenses, start, end)
  );
};