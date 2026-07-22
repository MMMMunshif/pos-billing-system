import { apiRequest, createPollingSubscription } from './apiClient';

export const getProducts = () => apiRequest('/products');
export const subscribeProducts = (callback) => createPollingSubscription(getProducts, callback);
export const getProductById = (id) => apiRequest(`/products/${id}`);

export const findProductByName = async (name) => {
  const normalized = String(name || '').trim().toLowerCase();
  const products = await getProducts();
  return products.find((product) => String(product.name || '').trim().toLowerCase() === normalized) || null;
};

export const createProduct = async (data) => {
  const result = await apiRequest('/products', { method: 'POST', body: JSON.stringify(data) });
  return result.id;
};

export const updateProduct = (id, data) =>
  apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteProduct = (id) => apiRequest(`/products/${id}`, { method: 'DELETE' });

export const adjustStock = async (productId, quantityChange) => {
  const result = await apiRequest(`/products/${productId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ quantityChange }),
  });
  return result.currentStock;
};

export const getLowStockProducts = (products) =>
  products.filter((product) => Number(product.currentStock || 0) <= Number(product.minStockAlert || 0));
