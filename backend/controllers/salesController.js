import { getDb, admin } from '../services/firebaseAdmin.js';
import { COLLECTIONS, numberValue, parseInputDate, serializeDoc, trimText } from '../utils/firestore.js';
import { HttpError } from '../utils/httpError.js';

const PAYMENT_TYPES = new Set(['cash', 'credit', 'partial']);
const CUSTOMER_TYPES = new Set(['walk-in', 'registered']);

export async function listSales(req, res) {
  let query = getDb().collection(COLLECTIONS.SALES).orderBy('saleDate', 'desc');
  if (req.query.limit !== undefined) {
    const limit = Math.min(Math.max(Number(req.query.limit) || 1, 1), 5000);
    query = query.limit(limit);
  }
  const snap = await query.get();
  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function getSaleItems(req, res) {
  const snap = await getDb().collection(COLLECTIONS.SALE_ITEMS).where('saleId', '==', req.params.id).get();
  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function createSale(req, res) {
  const db = getDb();
  const sale = req.body.sale || req.body;
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
  if (!rawItems.length) throw new HttpError(400, 'At least one sale item is required');

  const customerType = trimText(sale.customerType || 'walk-in').toLowerCase();
  const paymentTypeInput = trimText(sale.paymentType || 'cash').toLowerCase();
  if (!CUSTOMER_TYPES.has(customerType)) throw new HttpError(400, 'Invalid customer type');
  if (!PAYMENT_TYPES.has(paymentTypeInput)) throw new HttpError(400, 'Invalid payment type');
  const customerId = customerType === 'registered' ? trimText(sale.customerId) : '';
  if (customerType === 'registered' && !customerId) throw new HttpError(400, 'Registered customer is required');
  if (customerType === 'walk-in' && paymentTypeInput !== 'cash') throw new HttpError(400, 'Credit sales require a registered customer');
  const saleDate = parseInputDate(sale.saleDate, 'Sale date');

  const merged = new Map();
  rawItems.forEach((item) => {
    const productId = trimText(item.productId);
    if (!productId) throw new HttpError(400, 'Every sale item must have a product');
    const quantity = numberValue(item.quantity, 'Quantity', { min: 1, integer: true });
    const unitPrice = numberValue(item.unitPrice, 'Unit price');
    const existing = merged.get(productId);
    if (existing && existing.unitPrice !== unitPrice) throw new HttpError(400, 'Duplicate product rows must use the same unit price');
    merged.set(productId, { productId, quantity: (existing?.quantity || 0) + quantity, unitPrice });
  });
  const items = [...merged.values()];

  const result = await db.runTransaction(async (tx) => {
    let customerRef = null;
    let customer = null;
    if (customerId) {
      customerRef = db.collection(COLLECTIONS.CUSTOMERS).doc(customerId);
      const customerSnap = await tx.get(customerRef);
      if (!customerSnap.exists) throw new HttpError(404, 'Customer not found');
      customer = customerSnap.data();
    }

    const resolvedItems = [];
    for (const item of items) {
      const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) throw new HttpError(404, `Product not found: ${item.productId}`);
      const product = productSnap.data();
      const available = Number(product.currentStock || 0);
      if (available < item.quantity) {
        throw new HttpError(409, `Insufficient stock for ${product.name}. Available: ${available}`);
      }
      resolvedItems.push({ ...item, productRef, productName: product.name, available });
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    let paidAmount = paymentTypeInput === 'cash' ? subtotal : numberValue(sale.paidAmount || 0, 'Paid amount');
    if (paidAmount > subtotal) throw new HttpError(400, 'Paid amount cannot exceed sale total');
    let paymentType = paymentTypeInput;
    const balance = Math.max(0, subtotal - paidAmount);
    if (paymentType === 'partial' && balance === 0) paymentType = 'cash';
    if (paymentType === 'credit' && paidAmount > 0) paymentType = 'partial';
    if (paymentType === 'partial' && paidAmount <= 0) paymentType = 'credit';

    const saleRef = db.collection(COLLECTIONS.SALES).doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(saleRef, {
      customerType,
      customerId: customerId || null,
      customerName: customer?.name || 'Walk-in',
      paymentType,
      subtotal,
      paidAmount,
      balance,
      saleDate,
      createdBy: req.user.uid,
      createdAt: now,
    });

    resolvedItems.forEach((item) => {
      tx.update(item.productRef, { currentStock: item.available - item.quantity, updatedAt: now });
      const itemRef = db.collection(COLLECTIONS.SALE_ITEMS).doc();
      tx.set(itemRef, {
        saleId: saleRef.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        createdAt: now,
      });
    });

    if (customerRef && balance > 0) {
      tx.update(customerRef, {
        totalDebt: Number(customer.totalDebt || 0) + balance,
        updatedAt: now,
      });
    }
    return { saleId: saleRef.id, subtotal, paidAmount, balance, paymentType };
  });

  res.status(201).json({ success: true, data: result });
}
