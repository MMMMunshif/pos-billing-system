import { getDb } from '../services/firebaseAdmin.js';
import { COLLECTIONS, serializeDoc } from '../utils/firestore.js';

export async function getDashboardSummary(req, res) {
  const db = getDb();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [productsSnap, customersSnap, salesSnap] = await Promise.all([
    db.collection(COLLECTIONS.PRODUCTS).get(),
    db.collection(COLLECTIONS.CUSTOMERS).get(),
    db.collection(COLLECTIONS.SALES).where('saleDate', '>=', todayStart).where('saleDate', '<', tomorrow).orderBy('saleDate', 'desc').get(),
  ]);

  let lowStockCount = 0;
  productsSnap.forEach((doc) => {
    const item = doc.data();
    if (Number(item.currentStock || 0) <= Number(item.minStockAlert || 0)) lowStockCount += 1;
  });
  let totalDebt = 0;
  customersSnap.forEach((doc) => { totalDebt += Number(doc.data().totalDebt || 0); });
  let totalSales = 0;
  let cashSales = 0;
  let creditSales = 0;
  salesSnap.forEach((doc) => {
    const sale = doc.data();
    totalSales += Number(sale.subtotal || 0);
    if (sale.paymentType === 'cash') cashSales += Number(sale.subtotal || 0);
    else creditSales += Number(sale.balance || 0);
  });

  res.json({
    success: true,
    data: {
      totalProducts: productsSnap.size,
      lowStockCount,
      totalDebt,
      today: { totalSales, cashSales, creditSales, count: salesSnap.size },
      recentSales: salesSnap.docs.slice(0, 20).map(serializeDoc),
    },
  });
}
