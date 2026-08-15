import { getDb, admin } from '../services/firebaseAdmin.js';
import { COLLECTIONS, numberValue, serializeDoc, trimText } from '../utils/firestore.js';
import { HttpError } from '../utils/httpError.js';

export async function listCustomers(req, res) {
  const snap = await getDb().collection(COLLECTIONS.CUSTOMERS).orderBy('name').get();
  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function getCustomer(req, res) {
  const snap = await getDb().collection(COLLECTIONS.CUSTOMERS).doc(req.params.id).get();
  if (!snap.exists) throw new HttpError(404, 'Customer not found');
  res.json({ success: true, data: serializeDoc(snap) });
}

export async function createCustomer(req, res) {
  const name = trimText(req.body.name);
  if (!name) throw new HttpError(400, 'Customer name is required');
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await getDb().collection(COLLECTIONS.CUSTOMERS).add({
    name,
    phone: trimText(req.body.phone),
    address: trimText(req.body.address),
    notes: trimText(req.body.notes),
    totalDebt: req.body.totalDebt === undefined ? 0 : numberValue(req.body.totalDebt, 'Total debt'),
    createdAt: now,
    updatedAt: now,
  });
  res.status(201).json({ success: true, data: { id: ref.id } });
}

export async function updateCustomer(req, res) {
  const ref = getDb().collection(COLLECTIONS.CUSTOMERS).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Customer not found');
  const name = trimText(req.body.name);
  if (!name) throw new HttpError(400, 'Customer name is required');
  await ref.update({
    name,
    phone: trimText(req.body.phone),
    address: trimText(req.body.address),
    notes: trimText(req.body.notes),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  res.json({ success: true, message: 'Customer updated' });
}

export async function deleteCustomer(req, res) {
  const ref = getDb().collection(COLLECTIONS.CUSTOMERS).doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Customer not found');
  if (Number(snap.data().totalDebt || 0) > 0) throw new HttpError(409, 'Cannot delete a customer who still has debt');
  await ref.delete();
  res.json({ success: true, message: 'Customer deleted' });
}

export async function getCustomerSales(req, res) {
  const snap = await getDb().collection(COLLECTIONS.SALES).where('customerId', '==', req.params.id).orderBy('saleDate', 'desc').get();
  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}

export async function getCustomerPayments(req, res) {
  const snap = await getDb().collection(COLLECTIONS.PAYMENTS).where('customerId', '==', req.params.id).orderBy('paymentDate', 'desc').get();
  res.json({ success: true, data: snap.docs.map(serializeDoc) });
}


export async function adjustCustomerDebt(req, res) {
  const db = getDb();
  const amountChange = Number(req.body.amountChange);
  if (!Number.isFinite(amountChange)) throw new HttpError(400, 'Amount change must be a valid number');
  const totalDebt = await db.runTransaction(async (tx) => {
    const ref = db.collection(COLLECTIONS.CUSTOMERS).doc(req.params.id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Customer not found');
    const debt = Math.max(0, Number(snap.data().totalDebt || 0) + amountChange);
    tx.update(ref, { totalDebt: debt, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return debt;
  });
  res.json({ success: true, data: { totalDebt } });
}
