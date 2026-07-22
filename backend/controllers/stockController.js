import { getDb, admin } from '../services/firebaseAdmin.js';
import {
  COLLECTIONS,
  numberValue,
  parseInputDate,
  serializeDoc,
  trimText,
} from '../utils/firestore.js';
import { HttpError } from '../utils/httpError.js';

const normalizeKey = (value) =>
  trimText(value)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function findMatchingProduct(tx, productsRef, name, brand, shop, sellingPrice) {
  const snap = await tx.get(productsRef);
  const nameKey = normalizeKey(name);
  const brandKey = normalizeKey(brand);
  const shopKey = normalizeKey(shop);
  const priceKey = Number(sellingPrice || 0);

  return snap.docs.find((doc) => {
    const data = doc.data();
    return (
      normalizeKey(data.name) === nameKey &&
      normalizeKey(data.brand) === brandKey &&
      normalizeKey(data.shop) === shopKey &&
      Number(data.sellingPrice || 0) === priceKey
    );
  });
}

export async function listStockPurchases(req, res) {
  let query = getDb().collection(COLLECTIONS.STOCK_PURCHASES);
  if (req.query.productId) query = query.where('productId', '==', req.query.productId);
  const snap = await query.orderBy('purchaseDate', 'desc').get();
  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function addStockPurchase(req, res) {
  const db = getDb();
  const productName = trimText(req.body.productName);
  const shop = trimText(req.body.shop || req.body.supplierName);
  const brand = trimText(req.body.brand);

  if (!productName) throw new HttpError(400, 'Product name is required');
  if (!shop) throw new HttpError(400, 'Purchased-from shop is required');
  if (!brand) throw new HttpError(400, 'Brand is required');

  const quantity = numberValue(req.body.quantity, 'Quantity', { min: 1, integer: true });
  const purchasePrice = numberValue(req.body.purchasePrice, 'Purchase price');
  const sellingPrice = numberValue(req.body.sellingPrice, 'Selling price');
  const minStockAlert =
    req.body.minStockAlert === undefined
      ? 5
      : numberValue(req.body.minStockAlert, 'Minimum stock alert', { integer: true });
  const purchaseDate = parseInputDate(req.body.purchaseDate, 'Purchase date');

  const result = await db.runTransaction(async (tx) => {
    const productsRef = db.collection(COLLECTIONS.PRODUCTS);
    const existingDoc = await findMatchingProduct(
      tx,
      productsRef,
      productName,
      brand,
      shop,
      sellingPrice
    );

    let productRef;
    let previous = null;

    if (existingDoc) {
      productRef = existingDoc.ref;
      previous = existingDoc.data();
    } else {
      productRef = productsRef.doc();
    }

    const previousStock = Number(previous?.currentStock || 0);
    const previousAverage = Number(previous?.avgPurchasePrice ?? previous?.lastPurchasePrice ?? 0);
    const newStock = previousStock + quantity;
    const newAverage =
      newStock > 0
        ? (previousStock * previousAverage + quantity * purchasePrice) / newStock
        : purchasePrice;
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (previous) {
      tx.update(productRef, {
        name: productName,
        nameLower: normalizeKey(productName),
        shop,
        shopLower: normalizeKey(shop),
        brand,
        brandLower: normalizeKey(brand),
        sellingPrice,
        priceKey: Number(sellingPrice || 0),
        currentStock: newStock,
        minStockAlert: previous.minStockAlert || minStockAlert,
        lastPurchasePrice: purchasePrice,
        lastPurchaseDate: purchaseDate,
        avgPurchasePrice: newAverage,
        updatedAt: now,
      });
    } else {
      tx.set(productRef, {
        name: productName,
        nameLower: normalizeKey(productName),
        shop,
        shopLower: normalizeKey(shop),
        brand,
        brandLower: normalizeKey(brand),
        sellingPrice,
        priceKey: Number(sellingPrice || 0),
        currentStock: quantity,
        minStockAlert,
        description: trimText(req.body.notes),
        lastPurchasePrice: purchasePrice,
        lastPurchaseDate: purchaseDate,
        avgPurchasePrice: purchasePrice,
        createdAt: now,
        updatedAt: now,
      });
    }

    const purchaseRef = db.collection(COLLECTIONS.STOCK_PURCHASES).doc();
    tx.set(purchaseRef, {
      productId: productRef.id,
      productName,
      shop,
      supplierName: shop,
      brand,
      purchasePrice,
      sellingPrice,
      quantity,
      purchaseDate,
      notes: trimText(req.body.notes),
      createdBy: req.user.uid,
      createdAt: now,
    });

    const supplierRef = db.collection(COLLECTIONS.SUPPLIERS).doc();
    tx.set(supplierRef, {
      name: shop,
      productId: productRef.id,
      purchaseId: purchaseRef.id,
      createdAt: now,
    });

    return { productId: productRef.id, purchaseId: purchaseRef.id, merged: Boolean(previous) };
  });

  res.status(201).json({
    success: true,
    message: result.merged
      ? 'Existing product stock updated successfully'
      : 'New product created successfully',
    data: result,
  });
}
