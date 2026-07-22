import { apiRequest } from './apiClient';

export const recordPayment = (data) =>
  apiRequest('/payments', { method: 'POST', body: JSON.stringify(data) });
