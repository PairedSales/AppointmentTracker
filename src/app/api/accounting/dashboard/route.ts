import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, invoices, payments, expenses } from '@/db/schema';
import { eq, inArray, like } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const currentYear = new Date().getFullYear().toString();
    
    // Fetch all completed orders for the year to get Total Billings
    const completedOrders = await db.select().from(orders).where(inArray(orders.status, ['COMPLETED']));
    const thisYearOrders = completedOrders.filter(o => o.createdAt.startsWith(currentYear) || (o.completedAt && o.completedAt.startsWith(currentYear)));
    
    // Total Billings (sum of fees/invoices for completed orders this year)
    let totalBillingsYTD = 0;
    const allInvoices = await db.select().from(invoices);
    const invoiceIdsThisYear = new Set();
    
    for (const order of thisYearOrders) {
      const orderInvoices = allInvoices.filter(i => i.orderId === order.id);
      for (const inv of orderInvoices) {
        totalBillingsYTD += inv.amount;
        invoiceIdsThisYear.add(inv.id);
      }
    }

    // Total Collections YTD (sum of payments this year)
    const allPayments = await db.select().from(payments).where(like(payments.paymentDate, `${currentYear}%`));
    const totalCollectionsYTD = allPayments.reduce((sum, p) => sum + p.amount, 0);

    // Outstanding Receivables (Total unpaid across ALL time, not just this year)
    let totalOutstanding = 0;
    const allPaymentsAllTime = await db.select().from(payments);
    
    // Only count outstanding for COMPLETED orders
    const completedOrderIds = new Set(completedOrders.map(o => o.id));
    const validInvoices = allInvoices.filter(i => completedOrderIds.has(i.orderId));
    
    for (const inv of validInvoices) {
      const invPayments = allPaymentsAllTime.filter(p => p.invoiceId === inv.id);
      const paid = invPayments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = inv.amount - paid;
      if (outstanding > 0) {
        totalOutstanding += outstanding;
      }
    }

    // Expenses YTD
    const allExpenses = await db.select().from(expenses).where(like(expenses.date, `${currentYear}%`));
    const totalExpensesYTD = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Monthly data for charts
    const monthlyRevenue = Array(12).fill(0);
    allPayments.forEach(p => {
      const month = new Date(p.paymentDate).getMonth();
      monthlyRevenue[month] += p.amount;
    });

    return NextResponse.json({
      metrics: {
        totalBillingsYTD,
        totalCollectionsYTD,
        totalOutstanding,
        totalExpensesYTD,
        netIncomeYTD: totalCollectionsYTD - totalExpensesYTD,
      },
      charts: {
        monthlyRevenue: [
          { name: 'Jan', amount: monthlyRevenue[0] },
          { name: 'Feb', amount: monthlyRevenue[1] },
          { name: 'Mar', amount: monthlyRevenue[2] },
          { name: 'Apr', amount: monthlyRevenue[3] },
          { name: 'May', amount: monthlyRevenue[4] },
          { name: 'Jun', amount: monthlyRevenue[5] },
          { name: 'Jul', amount: monthlyRevenue[6] },
          { name: 'Aug', amount: monthlyRevenue[7] },
          { name: 'Sep', amount: monthlyRevenue[8] },
          { name: 'Oct', amount: monthlyRevenue[9] },
          { name: 'Nov', amount: monthlyRevenue[10] },
          { name: 'Dec', amount: monthlyRevenue[11] },
        ]
      }
    });
  } catch (error) {
    console.error('Failed to fetch accounting dashboard metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
