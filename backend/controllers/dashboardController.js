import { getDb } from '../services/firebaseAdmin.js';
import { COLLECTIONS, serializeDoc } from '../utils/firestore.js';

function isCancelledSale(sale) {
  return String(sale.status || 'active').toLowerCase() === 'cancelled';
}

function getSaleTotal(sale) {
  return (
    Number(sale.finalTotal) ||
    Number(sale.subtotal) ||
    Number(sale.totalAmount) ||
    Number(sale.total) ||
    0
  );
}

export async function getDashboardSummary(req, res) {
  const db = getDb();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [productsSnap, customersSnap, salesSnap] = await Promise.all([
    db.collection(COLLECTIONS.PRODUCTS).get(),
    db.collection(COLLECTIONS.CUSTOMERS).get(),
    db
      .collection(COLLECTIONS.SALES)
      .where('saleDate', '>=', todayStart)
      .where('saleDate', '<', tomorrow)
      .orderBy('saleDate', 'desc')
      .get(),
  ]);

  let lowStockCount = 0;

  productsSnap.forEach((doc) => {
    const item = doc.data();

    if (Number(item.currentStock || 0) <= Number(item.minStockAlert || 0)) {
      lowStockCount += 1;
    }
  });

  let totalDebt = 0;

  customersSnap.forEach((doc) => {
    totalDebt += Number(doc.data().totalDebt || 0);
  });

  let totalSales = 0;
  let cashSales = 0;
  let creditSales = 0;
  let activeSalesCount = 0;

  let cancelledSales = 0;
  let cancelledSalesCount = 0;

  const activeRecentSales = [];
  const cancelledRecentSales = [];

  salesSnap.forEach((doc) => {
    const sale = doc.data();
    const serializedSale = serializeDoc(doc);
    const saleTotal = getSaleTotal(sale);

    if (isCancelledSale(sale)) {
      cancelledSales += saleTotal;
      cancelledSalesCount += 1;

      if (cancelledRecentSales.length < 10) {
        cancelledRecentSales.push(serializedSale);
      }

      return;
    }

    activeSalesCount += 1;
    totalSales += saleTotal;

    if (sale.paymentType === 'cash') {
      cashSales += saleTotal;
    } else {
      creditSales += Number(sale.balance || 0);
    }

    if (activeRecentSales.length < 20) {
      activeRecentSales.push(serializedSale);
    }
  });

  res.json({
    success: true,
    data: {
      totalProducts: productsSnap.size,
      lowStockCount,
      totalDebt,

      today: {
        totalSales,
        cashSales,
        creditSales,
        count: activeSalesCount,
        activeCount: activeSalesCount,
        cancelledSales,
        cancelledCount: cancelledSalesCount,
      },

      recentSales: activeRecentSales,
      cancelledRecentSales,
    },
  });
}