import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getCurrentUser } from '../controllers/authController.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustProductStock,
} from '../controllers/productController.js';

import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerSales,
  getCustomerPayments,
  adjustCustomerDebt,
} from '../controllers/customerController.js';

import {
  listStockPurchases,
  addStockPurchase,
} from '../controllers/stockController.js';

import {
  listSales,
  createSale,
  getSaleItems,
  cancelSale,
} from '../controllers/salesController.js';

import { recordPayment } from '../controllers/paymentController.js';

import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';

const router = Router();

router.use(verifyToken);

router.get('/auth/me', getCurrentUser);
router.get('/dashboard/summary', getDashboardSummary);

router.route('/products').get(listProducts).post(createProduct);
router.patch('/products/:id/stock', adjustProductStock);
router.route('/products/:id').get(getProduct).put(updateProduct).delete(deleteProduct);

router.route('/customers').get(listCustomers).post(createCustomer);
router.get('/customers/:id/sales', getCustomerSales);
router.get('/customers/:id/payments', getCustomerPayments);
router.patch('/customers/:id/debt', adjustCustomerDebt);
router.route('/customers/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

router.route('/stock-purchases').get(listStockPurchases).post(addStockPurchase);

router.route('/sales').get(listSales).post(createSale);
router.get('/sales/:id/items', getSaleItems);
router.patch('/sales/:id/cancel', cancelSale);

router.post('/payments', recordPayment);

router.route('/expenses').get(listExpenses).post(createExpense);
router.route('/expenses/:id').put(updateExpense).delete(deleteExpense);

export default router;