import { getDb, admin } from '../services/firebaseAdmin.js';
import { COLLECTIONS, numberValue, parseInputDate, trimText } from '../utils/firestore.js';
import { HttpError } from '../utils/httpError.js';

export async function recordPayment(req, res) {
  const db = getDb();
  const customerId = trimText(req.body.customerId);
  if (!customerId) throw new HttpError(400, 'Customer is required');
  const amount = numberValue(req.body.amount, 'Payment amount', { min: 0.01 });
  const paymentDate = parseInputDate(req.body.paymentDate, 'Payment date');

  const result = await db.runTransaction(async (tx) => {
    const customerRef = db.collection(COLLECTIONS.CUSTOMERS).doc(customerId);
    const customerSnap = await tx.get(customerRef);
    if (!customerSnap.exists) throw new HttpError(404, 'Customer not found');
    const customer = customerSnap.data();
    const debt = Number(customer.totalDebt || 0);
    if (amount > debt) throw new HttpError(400, `Payment exceeds debt. Current debt: ${debt}`);
    const remaining = Math.max(0, debt - amount);
    const now = admin.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(COLLECTIONS.PAYMENTS).doc();
    tx.set(paymentRef, {
      customerId,
      customerName: customer.name,
      amount,
      paymentDate,
      notes: trimText(req.body.notes),
      createdBy: req.user.uid,
      createdAt: now,
    });
    tx.update(customerRef, { totalDebt: remaining, updatedAt: now });
    return { paymentId: paymentRef.id, remaining };
  });

  res.status(201).json({ success: true, data: result });
}
