import { apiRequest, createPollingSubscription } from './apiClient';

export const getSales = (limitCount) =>
  apiRequest(limitCount ? `/sales?limit=${limitCount}` : '/sales');

export const subscribeSales = (callback, limitCount = 50) =>
  createPollingSubscription(() => getSales(limitCount), callback);

export const createSale = async (saleData, items) => {
  const result = await apiRequest('/sales', {
    method: 'POST',
    body: JSON.stringify({ sale: saleData, items }),
  });
  return result.saleId;
};

export const getSaleItems = (saleId) => apiRequest(`/sales/${saleId}/items`);
