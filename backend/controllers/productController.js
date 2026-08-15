import { getDb, admin } from '../services/firebaseAdmin.js';
import {
  COLLECTIONS,
  numberValue,
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

const normalizeBarcode = (value) =>
  String(value || '').trim().toUpperCase();

const generateMckBarcode = () => {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timePart = String(Date.now()).slice(-6);
  const randomPart = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, '0');

  return `MCK${year}${month}${day}${timePart}${randomPart}`;
};

const normalizeDiscountType = (value) => {
  const type = String(value || 'none').trim().toLowerCase();

  if (['none', 'percentage', 'fixed'].includes(type)) {
    return type;
  }

  return 'none';
};

const calculateDiscountDetails = (sellingPrice, discountType, discountValue) => {
  const price = Number(sellingPrice || 0);
  const type = normalizeDiscountType(discountType);
  const value = Number(discountValue || 0);

  let discountAmount = 0;

  if (type === 'percentage') {
    if (value < 0 || value > 100) {
      throw new HttpError(400, 'Percentage discount must be between 0 and 100');
    }

    discountAmount = (price * value) / 100;
  } else if (type === 'fixed') {
    if (value < 0) {
      throw new HttpError(400, 'Fixed discount cannot be negative');
    }

    if (value > price) {
      throw new HttpError(400, 'Fixed discount cannot be more than selling price');
    }

    discountAmount = value;
  }

  if (type === 'none') {
    discountAmount = 0;
  }

  const finalPrice = Math.max(price - discountAmount, 0);

  return {
    discountType: type,
    discountValue: type === 'none' ? 0 : value,
    discountAmount,
    finalPrice,
  };
};

const productPayload = (data, { partial = false } = {}) => {
  const payload = {};
  const name = trimText(data.name);

  if (!partial || data.name !== undefined) {
    if (!name) throw new HttpError(400, 'Product name is required');
    payload.name = name;
    payload.nameLower = normalizeKey(name);
  }

  if (!partial || data.shop !== undefined) {
    payload.shop = trimText(data.shop);
    payload.shopLower = normalizeKey(data.shop);
  }

  if (!partial || data.brand !== undefined) {
    payload.brand = trimText(data.brand);
    payload.brandLower = normalizeKey(data.brand);
  }

  if (!partial || data.barcode !== undefined) {
    const barcode = normalizeBarcode(data.barcode || generateMckBarcode());

    if (!barcode) {
      throw new HttpError(400, 'Barcode is required');
    }

    payload.barcode = barcode;
    payload.barcodeLower = barcode.toLowerCase();
  }

  if (!partial || data.sellingPrice !== undefined) {
    payload.sellingPrice = numberValue(data.sellingPrice, 'Selling price');
    payload.priceKey = Number(payload.sellingPrice || 0);
  }

  if (!partial || data.discountType !== undefined) {
    payload.discountType = normalizeDiscountType(data.discountType);
  }

  if (!partial || data.discountValue !== undefined) {
    const discountValue = Number(data.discountValue || 0);

    if (Number.isNaN(discountValue) || discountValue < 0) {
      throw new HttpError(400, 'Discount value must be a valid positive number');
    }

    payload.discountValue = discountValue;
  }

  if (!partial || data.currentStock !== undefined) {
    payload.currentStock = numberValue(data.currentStock, 'Current stock', {
      integer: true,
    });
  }

  if (!partial || data.minStockAlert !== undefined) {
    payload.minStockAlert = numberValue(data.minStockAlert, 'Minimum stock alert', {
      integer: true,
    });
  }

  if (!partial || data.description !== undefined) {
    payload.description = trimText(data.description);
  }

  return payload;
};

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

async function findDuplicateProduct(db, currentProductId, name, brand, shop, sellingPrice) {
  const snap = await db.collection(COLLECTIONS.PRODUCTS).get();
  const nameKey = normalizeKey(name);
  const brandKey = normalizeKey(brand);
  const shopKey = normalizeKey(shop);
  const priceKey = Number(sellingPrice || 0);

  return snap.docs.find((doc) => {
    if (doc.id === currentProductId) return false;

    const data = doc.data();

    return (
      normalizeKey(data.name) === nameKey &&
      normalizeKey(data.brand) === brandKey &&
      normalizeKey(data.shop) === shopKey &&
      Number(data.sellingPrice || 0) === priceKey
    );
  });
}

async function findDuplicateBarcode(db, currentProductId, barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) return null;

  const snap = await db.collection(COLLECTIONS.PRODUCTS).get();

  return snap.docs.find((doc) => {
    if (doc.id === currentProductId) return false;

    const data = doc.data();

    return normalizeBarcode(data.barcode) === normalizedBarcode;
  });
}

async function findDuplicateBarcodeInTransaction(tx, productsRef, currentProductId, barcode) {
  const normalizedBarcode = normalizeBarcode(barcode);

  if (!normalizedBarcode) return null;

  const snap = await tx.get(productsRef);

  return snap.docs.find((doc) => {
    if (doc.id === currentProductId) return false;

    const data = doc.data();

    return normalizeBarcode(data.barcode) === normalizedBarcode;
  });
}

export async function listProducts(req, res) {
  const snap = await getDb()
    .collection(COLLECTIONS.PRODUCTS)
    .orderBy('name')
    .get();

  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function getProduct(req, res) {
  const snap = await getDb()
    .collection(COLLECTIONS.PRODUCTS)
    .doc(req.params.id)
    .get();

  if (!snap.exists) throw new HttpError(404, 'Product not found');

  res.json({ success: true, data: serializeDoc(snap) });
}

export async function createProduct(req, res) {
  const db = getDb();
  const payload = productPayload(req.body);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const discountDetails = calculateDiscountDetails(
    payload.sellingPrice,
    payload.discountType || 'none',
    payload.discountValue || 0
  );

  const result = await db.runTransaction(async (tx) => {
    const productsRef = db.collection(COLLECTIONS.PRODUCTS);

    const existingDoc = await findMatchingProduct(
      tx,
      productsRef,
      payload.name,
      payload.brand,
      payload.shop,
      payload.sellingPrice
    );

    if (existingDoc) {
      const existingData = existingDoc.data();
      const oldStock = Number(existingData.currentStock || 0);
      const newStock = Number(payload.currentStock || 0);

      const finalBarcode =
        existingData.barcode || payload.barcode || generateMckBarcode();

      tx.update(existingDoc.ref, {
        name: payload.name,
        nameLower: normalizeKey(payload.name),

        shop: payload.shop,
        shopLower: normalizeKey(payload.shop),

        brand: payload.brand,
        brandLower: normalizeKey(payload.brand),

        barcode: normalizeBarcode(finalBarcode),
        barcodeLower: normalizeBarcode(finalBarcode).toLowerCase(),

        sellingPrice: payload.sellingPrice,
        priceKey: Number(payload.sellingPrice || 0),

        discountType: discountDetails.discountType,
        discountValue: discountDetails.discountValue,
        discountAmount: discountDetails.discountAmount,
        finalPrice: discountDetails.finalPrice,

        currentStock: oldStock + newStock,
        minStockAlert: payload.minStockAlert || existingData.minStockAlert || 5,
        description: payload.description || existingData.description || '',
        updatedAt: now,
      });

      return { id: existingDoc.id, merged: true };
    }

    const duplicateBarcode = await findDuplicateBarcodeInTransaction(
      tx,
      productsRef,
      null,
      payload.barcode
    );

    if (duplicateBarcode) {
      throw new HttpError(409, 'A product with this barcode already exists');
    }

    const finalBarcode = payload.barcode || generateMckBarcode();
    const newRef = productsRef.doc();

    tx.set(newRef, {
      ...payload,

      barcode: normalizeBarcode(finalBarcode),
      barcodeLower: normalizeBarcode(finalBarcode).toLowerCase(),

      nameLower: normalizeKey(payload.name),
      brandLower: normalizeKey(payload.brand),
      shopLower: normalizeKey(payload.shop),
      priceKey: Number(payload.sellingPrice || 0),

      discountType: discountDetails.discountType,
      discountValue: discountDetails.discountValue,
      discountAmount: discountDetails.discountAmount,
      finalPrice: discountDetails.finalPrice,

      createdAt: now,
      updatedAt: now,
    });

    return { id: newRef.id, merged: false };
  });

  res.status(201).json({
    success: true,
    message: result.merged
      ? 'Existing product stock updated successfully'
      : 'Product created successfully',
    data: result,
  });
}

export async function updateProduct(req, res) {
  const db = getDb();
  const ref = db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id);

  const existing = await ref.get();

  if (!existing.exists) {
    throw new HttpError(404, 'Product not found');
  }

  const existingData = existing.data();
  const payload = productPayload(req.body, { partial: true });

  const finalName = payload.name ?? existingData.name;
  const finalBrand = payload.brand ?? existingData.brand;
  const finalShop = payload.shop ?? existingData.shop;
  const finalSellingPrice = payload.sellingPrice ?? existingData.sellingPrice;
  const finalBarcode =
    payload.barcode ?? existingData.barcode ?? generateMckBarcode();

  const finalDiscountType =
    payload.discountType ?? existingData.discountType ?? 'none';

  const finalDiscountValue =
    payload.discountValue ?? existingData.discountValue ?? 0;

  const discountDetails = calculateDiscountDetails(
    finalSellingPrice,
    finalDiscountType,
    finalDiscountValue
  );

  const duplicateProduct = await findDuplicateProduct(
    db,
    req.params.id,
    finalName,
    finalBrand,
    finalShop,
    finalSellingPrice
  );

  if (duplicateProduct) {
    throw new HttpError(
      409,
      'A product with the same name, brand, purchased from, and selling price already exists'
    );
  }

  const duplicateBarcode = await findDuplicateBarcode(
    db,
    req.params.id,
    finalBarcode
  );

  if (duplicateBarcode) {
    throw new HttpError(409, 'A product with this barcode already exists');
  }

  await ref.update({
    ...payload,

    barcode: normalizeBarcode(finalBarcode),
    barcodeLower: normalizeBarcode(finalBarcode).toLowerCase(),

    nameLower: normalizeKey(finalName),
    brandLower: normalizeKey(finalBrand),
    shopLower: normalizeKey(finalShop),

    priceKey: Number(finalSellingPrice || 0),

    discountType: discountDetails.discountType,
    discountValue: discountDetails.discountValue,
    discountAmount: discountDetails.discountAmount,
    finalPrice: discountDetails.finalPrice,

    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.json({ success: true, message: 'Product updated' });
}

export async function deleteProduct(req, res) {
  const ref = getDb().collection(COLLECTIONS.PRODUCTS).doc(req.params.id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpError(404, 'Product not found');
  }

  await ref.delete();

  res.json({ success: true, message: 'Product deleted' });
}

export async function adjustProductStock(req, res) {
  const db = getDb();

  const change = numberValue(req.body.quantityChange, 'Quantity change', {
    min: -1000000000,
    integer: true,
  });

  const newStock = await db.runTransaction(async (tx) => {
    const ref = db.collection(COLLECTIONS.PRODUCTS).doc(req.params.id);
    const snap = await tx.get(ref);

    if (!snap.exists) {
      throw new HttpError(404, 'Product not found');
    }

    const stock = Number(snap.data().currentStock || 0) + change;

    if (stock < 0) {
      throw new HttpError(409, 'Insufficient stock');
    }

    tx.update(ref, {
      currentStock: stock,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return stock;
  });

  res.json({ success: true, data: { currentStock: newStock } });
}