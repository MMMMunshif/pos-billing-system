import { apiRequest, createPollingSubscription } from './apiClient';

export const getCustomers = () => apiRequest('/customers');
export const subscribeCustomers = (callback) => createPollingSubscription(getCustomers, callback);
export const getCustomerById = (id) => apiRequest(`/customers/${id}`);

export const createCustomer = async (data) => {
  const result = await apiRequest('/customers', { method: 'POST', body: JSON.stringify(data) });
  return result.id;
};

export const updateCustomer = (id, data) =>
  apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteCustomer = (id) => apiRequest(`/customers/${id}`, { method: 'DELETE' });

export const updateCustomerDebt = async (customerId, amountChange) => {
  const result = await apiRequest(`/customers/${customerId}/debt`, {
    method: 'PATCH',
    body: JSON.stringify({ amountChange }),
  });
  return result.totalDebt;
};

export const getCustomerSales = (customerId) => apiRequest(`/customers/${customerId}/sales`);
export const getCustomerPayments = (customerId) => apiRequest(`/customers/${customerId}/payments`);
