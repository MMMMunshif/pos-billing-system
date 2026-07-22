import { HttpError } from './httpError.js';

export const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  STOCK_PURCHASES: 'stockPurchases',
  SALES: 'sales',
  SALE_ITEMS: 'saleItems',
  CUSTOMERS: 'customers',
  PAYMENTS: 'payments',
  SUPPLIERS: 'suppliers',
};

export const trimText = (value) => String(value ?? '').trim();

export const numberValue = (value, field, { min = 0, integer = false } = {}) => {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || (integer && !Number.isInteger(result))) {
    const type = integer ? 'whole number' : 'number';
    throw new HttpError(400, `${field} must be a valid ${type} greater than or equal to ${min}`);
  }
  return result;
};

export const parseInputDate = (value, field = 'date') => {
  if (!value) throw new HttpError(400, `${field} is required`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `${field} is invalid`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) date.setHours(12, 0, 0, 0);
  return date;
};

const serializeValue = (value) => {
  if (value == null) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
  }
  return value;
};

export const serializeDoc = (doc) => ({ id: doc.id, ...serializeValue(doc.data()) });
export const serializeData = (data) => serializeValue(data);
