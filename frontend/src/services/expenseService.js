import { apiRequest, createPollingSubscription } from './apiClient';

export const getExpenses = (limitCount) =>
  apiRequest(limitCount ? `/expenses?limit=${limitCount}` : '/expenses');

export const subscribeExpenses = (callback, limitCount = 100) =>
  createPollingSubscription(() => getExpenses(limitCount), callback);

export const createExpense = (data) =>
  apiRequest('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateExpense = (id, data) =>
  apiRequest(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteExpense = (id) =>
  apiRequest(`/expenses/${id}`, {
    method: 'DELETE',
  });