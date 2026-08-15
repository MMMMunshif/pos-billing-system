import { apiRequest } from './apiClient';

export const addStockPurchase = (data) =>
  apiRequest('/stock-purchases', { method: 'POST', body: JSON.stringify(data) });

export const getStockPurchases = () => apiRequest('/stock-purchases');

export const getStockPurchasesByProduct = (productId) =>
  apiRequest(`/stock-purchases?productId=${encodeURIComponent(productId)}`);
