import { getDb, admin } from '../services/firebaseAdmin.js';
import {
  COLLECTIONS,
  numberValue,
  parseInputDate,
  serializeDoc,
  trimText,
} from '../utils/firestore.js';
import { HttpError } from '../utils/httpError.js';

const PAYMENT_TYPES = new Set(['cash', 'credit', 'partial']);
const CUSTOMER_TYPES = new Set(['walk-in', 'registered']);

function normalizeDiscountType(value) {
  const type = trimText(value || 'none').toLowerCase();

  if (['none', 'percentage', 'fixed'].includes(type)) {
    return type;
  }

  return 'none';
}

function calculateBalance(total, paidAmount) {
  return Math.max(Number(total || 0) - Number(paidAmount || 0), 0);
}

function getProductPurchasePrice(product) {
  return Number(
    product.avgPurchasePrice ??
      product.lastPurchasePrice ??
      product.purchasePrice ??
      0
  );
}

export async function listSales(req, res) {
  let query = getDb()
    .collection(COLLECTIONS.SALES)
    .orderBy('saleDate', 'desc');

  if (req.query.limit !== undefined) {
    const limit = Math.min(Math.max(Number(req.query.limit) || 1, 1), 5000);
    query = query.limit(limit);
  }

  const snap = await query.get();

  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function getSaleItems(req, res) {
  const snap = await getDb()
    .collection(COLLECTIONS.SALE_ITEMS)
    .where('saleId', '==', req.params.id)
    .get();

  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function createSale(req, res) {
  const db = getDb();
  const sale = req.body.sale || req.body;
  const rawItems = Array.isArray(req.body.items) ? req.body.items : [];

  if (!rawItems.length) {
    throw new HttpError(400, 'At least one sale item is required');
  }

  const customerType = trimText(sale.customerType || 'walk-in').toLowerCase();
  const paymentTypeInput = trimText(sale.paymentType || 'cash').toLowerCase();

  if (!CUSTOMER_TYPES.has(customerType)) {
    throw new HttpError(400, 'Invalid customer type');
  }

  if (!PAYMENT_TYPES.has(paymentTypeInput)) {
    throw new HttpError(400, 'Invalid payment type');
  }

  const customerId =
    customerType === 'registered' ? trimText(sale.customerId) : '';

  if (customerType === 'registered' && !customerId) {
    throw new HttpError(400, 'Registered customer is required');
  }

  if (customerType === 'walk-in' && paymentTypeInput !== 'cash') {
    throw new HttpError(400, 'Credit sales require a registered customer');
  }

  const saleDate = parseInputDate(sale.saleDate, 'Sale date');

  const merged = new Map();

  rawItems.forEach((item) => {
    const productId = trimText(item.productId);

    if (!productId) {
      throw new HttpError(400, 'Every sale item must have a product');
    }

    const quantity = numberValue(item.quantity, 'Quantity', {
      min: 1,
      integer: true,
    });

    const unitPrice = numberValue(item.unitPrice, 'Unit price');
    const originalPrice = Number(item.originalPrice || item.unitPrice || 0);
    const discountType = normalizeDiscountType(item.discountType);
    const discountValue = Number(item.discountValue || 0);
    const discountAmount = Number(item.discountAmount || 0);

    const existing = merged.get(productId);

    if (existing && existing.unitPrice !== unitPrice) {
      throw new HttpError(
        400,
        'Duplicate product rows must use the same unit price'
      );
    }

    merged.set(productId, {
      productId,
      quantity: (existing?.quantity || 0) + quantity,
      originalPrice,
      unitPrice,
      discountType,
      discountValue,
      discountAmount,
    });
  });

  const items = [...merged.values()];

  const result = await db.runTransaction(async (tx) => {
    let customerRef = null;
    let customer = null;

    if (customerId) {
      customerRef = db.collection(COLLECTIONS.CUSTOMERS).doc(customerId);
      const customerSnap = await tx.get(customerRef);

      if (!customerSnap.exists) {
        throw new HttpError(404, 'Customer not found');
      }

      customer = customerSnap.data();
    }

    const resolvedItems = [];

    for (const item of items) {
      const productRef = db.collection(COLLECTIONS.PRODUCTS).doc(item.productId);
      const productSnap = await tx.get(productRef);

      if (!productSnap.exists) {
        throw new HttpError(404, `Product not found: ${item.productId}`);
      }

      const product = productSnap.data();
      const available = Number(product.currentStock || 0);

      if (available < item.quantity) {
        throw new HttpError(
          409,
          `Insufficient stock for ${product.name}. Available: ${available}`
        );
      }

      const purchasePrice = getProductPurchasePrice(product);

      resolvedItems.push({
        ...item,
        productRef,
        productName: product.name,
        purchasePrice,
        available,
      });
    }

    const originalSubtotal = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.originalPrice,
      0
    );

    const totalDiscount = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.discountAmount,
      0
    );

    const subtotal = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const totalCost = resolvedItems.reduce(
      (sum, item) => sum + item.quantity * Number(item.purchasePrice || 0),
      0
    );

    const grossProfit = subtotal - totalCost;

    let paidAmount =
      paymentTypeInput === 'cash'
        ? subtotal
        : numberValue(sale.paidAmount || 0, 'Paid amount');

    if (paidAmount > subtotal) {
      throw new HttpError(400, 'Paid amount cannot exceed sale total');
    }

    let paymentType = paymentTypeInput;
    const balance = calculateBalance(subtotal, paidAmount);

    if (paymentType === 'partial' && balance === 0) paymentType = 'cash';
    if (paymentType === 'credit' && paidAmount > 0) paymentType = 'partial';
    if (paymentType === 'partial' && paidAmount <= 0) paymentType = 'credit';

    const saleRef = db.collection(COLLECTIONS.SALES).doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.set(saleRef, {
      customerType,
      customerId: customerId || null,
      customerName: customer?.name || 'Walk-in',
      customerPhone:
        customer?.phone ||
        customer?.phoneNumber ||
        customer?.contactNumber ||
        customer?.mobile ||
        customer?.whatsapp ||
        '',
      paymentType,

      originalSubtotal,
      totalDiscount,
      subtotal,
      finalTotal: subtotal,

      totalCost,
      grossProfit,

      paidAmount,
      balance,

      status: 'active',
      saleDate,
      createdBy: req.user?.uid || 'system',
      createdAt: now,
      updatedAt: now,
    });

    resolvedItems.forEach((item) => {
      const lineOriginalTotal = item.quantity * item.originalPrice;
      const lineDiscountTotal = item.quantity * item.discountAmount;
      const lineCostTotal = item.quantity * item.purchasePrice;
      const lineTotal = item.quantity * item.unitPrice;
      const lineProfit = lineTotal - lineCostTotal;

      tx.update(item.productRef, {
        currentStock: item.available - item.quantity,
        updatedAt: now,
      });

      const itemRef = db.collection(COLLECTIONS.SALE_ITEMS).doc();

      tx.set(itemRef, {
        saleId: saleRef.id,
        productId: item.productId,
        productName: item.productName,

        quantity: item.quantity,

        originalPrice: item.originalPrice,
        unitPrice: item.unitPrice,
        purchasePrice: item.purchasePrice,

        discountType: item.discountType,
        discountValue: item.discountValue,
        discountAmount: item.discountAmount,

        lineOriginalTotal,
        lineDiscountTotal,
        lineCostTotal,
        lineTotal,
        lineProfit,

        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    });

    if (customerRef && balance > 0) {
      tx.update(customerRef, {
        totalDebt: Number(customer.totalDebt || 0) + balance,
        updatedAt: now,
      });
    }

    return {
      saleId: saleRef.id,
      originalSubtotal,
      totalDiscount,
      subtotal,
      finalTotal: subtotal,
      totalCost,
      grossProfit,
      paidAmount,
      balance,
      paymentType,
      status: 'active',
    };
  });

  res.status(201).json({ success: true, data: result });
}

export async function cancelSale(req, res) {
  const db = getDb();
  const saleId = req.params.id;
  const reason = trimText(req.body.reason || 'Sale cancelled');

  if (!reason) {
    throw new HttpError(400, 'Cancel reason is required');
  }

  const result = await db.runTransaction(async (tx) => {
    const saleRef = db.collection(COLLECTIONS.SALES).doc(saleId);
    const saleSnap = await tx.get(saleRef);

    if (!saleSnap.exists) {
      throw new HttpError(404, 'Sale not found');
    }

    const sale = saleSnap.data();

    if (sale.status === 'cancelled') {
      throw new HttpError(409, 'Sale is already cancelled');
    }

    const itemsQuery = db
      .collection(COLLECTIONS.SALE_ITEMS)
      .where('saleId', '==', saleId);

    const itemsSnap = await tx.get(itemsQuery);

    if (itemsSnap.empty) {
      throw new HttpError(404, 'Sale items not found');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();

      const productRef = db
        .collection(COLLECTIONS.PRODUCTS)
        .doc(item.productId);

      const productSnap = await tx.get(productRef);

      if (productSnap.exists) {
        const product = productSnap.data();
        const currentStock = Number(product.currentStock || 0);
        const returnQuantity = Number(item.quantity || 0);

        tx.update(productRef, {
          currentStock: currentStock + returnQuantity,
          updatedAt: now,
        });
      }

      tx.update(itemDoc.ref, {
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
      });
    }

    if (sale.customerId && Number(sale.balance || 0) > 0) {
      const customerRef = db
        .collection(COLLECTIONS.CUSTOMERS)
        .doc(sale.customerId);

      const customerSnap = await tx.get(customerRef);

      if (customerSnap.exists) {
        const customer = customerSnap.data();
        const currentDebt = Number(customer.totalDebt || 0);
        const saleBalance = Number(sale.balance || 0);

        tx.update(customerRef, {
          totalDebt: Math.max(currentDebt - saleBalance, 0),
          updatedAt: now,
        });
      }
    }

    tx.update(saleRef, {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: now,
      cancelledBy: req.user?.uid || 'system',
      updatedAt: now,
    });

    return {
      saleId,
      status: 'cancelled',
      reason,
      restoredItems: itemsSnap.docs.length,
    };
  });

  res.json({
    success: true,
    message: 'Sale cancelled and stock restored successfully',
    data: result,
  });
}