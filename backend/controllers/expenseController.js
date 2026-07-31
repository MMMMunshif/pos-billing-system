import { getDb, admin } from '../services/firebaseAdmin.js';
import {
  COLLECTIONS,
  numberValue,
  parseInputDate,
  serializeDoc,
  trimText,
} from '../utils/firestore.js';
import { HttpError } from '../utils/httpError.js';

const EXPENSE_CATEGORIES = new Set([
  'rent',
  'salary',
  'electricity',
  'transport',
  'food',
  'maintenance',
  'other',
]);

function normalizeCategory(value) {
  const category = trimText(value || 'other').toLowerCase();

  if (EXPENSE_CATEGORIES.has(category)) {
    return category;
  }

  return 'other';
}

function buildExpensePayload(body) {
  const title = trimText(body.title);
  const description = trimText(body.description);
  const category = normalizeCategory(body.category);
  const amount = numberValue(body.amount, 'Expense amount', { min: 0 });
  const expenseDate = parseInputDate(body.expenseDate, 'Expense date');
  const paymentMethod = trimText(body.paymentMethod || 'cash').toLowerCase();
  const notes = trimText(body.notes);

  if (!title) {
    throw new HttpError(400, 'Expense title is required');
  }

  if (amount <= 0) {
    throw new HttpError(400, 'Expense amount must be greater than 0');
  }

  return {
    title,
    description,
    category,
    amount,
    expenseDate,
    paymentMethod,
    notes,
  };
}

export async function listExpenses(req, res) {
  let query = getDb()
    .collection(COLLECTIONS.EXPENSES)
    .orderBy('expenseDate', 'desc');

  if (req.query.limit !== undefined) {
    const limit = Math.min(Math.max(Number(req.query.limit) || 1, 1), 5000);
    query = query.limit(limit);
  }

  const snap = await query.get();

  res.json({
    success: true,
    data: snap.docs.map(serializeDoc),
  });
}

export async function createExpense(req, res) {
  const db = getDb();
  const payload = buildExpensePayload(req.body);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await db.collection(COLLECTIONS.EXPENSES).add({
    ...payload,
    status: 'active',
    createdBy: req.user?.uid || 'system',
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json({
    success: true,
    message: 'Expense added successfully',
    data: {
      id: docRef.id,
      ...payload,
      status: 'active',
    },
  });
}

export async function updateExpense(req, res) {
  const db = getDb();
  const expenseId = req.params.id;
  const expenseRef = db.collection(COLLECTIONS.EXPENSES).doc(expenseId);
  const expenseSnap = await expenseRef.get();

  if (!expenseSnap.exists) {
    throw new HttpError(404, 'Expense not found');
  }

  const payload = buildExpensePayload(req.body);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await expenseRef.update({
    ...payload,
    updatedBy: req.user?.uid || 'system',
    updatedAt: now,
  });

  res.json({
    success: true,
    message: 'Expense updated successfully',
    data: {
      id: expenseId,
      ...payload,
    },
  });
}

export async function deleteExpense(req, res) {
  const db = getDb();
  const expenseId = req.params.id;
  const expenseRef = db.collection(COLLECTIONS.EXPENSES).doc(expenseId);
  const expenseSnap = await expenseRef.get();

  if (!expenseSnap.exists) {
    throw new HttpError(404, 'Expense not found');
  }

  await expenseRef.update({
    status: 'deleted',
    deletedBy: req.user?.uid || 'system',
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.json({
    success: true,
    message: 'Expense deleted successfully',
    data: {
      id: expenseId,
      status: 'deleted',
    },
  });
}