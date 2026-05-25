import { NextResponse } from 'next/server';
import { OrderService } from '@/services/OrderService';

export async function GET() {
  try {
    // We want to return all completed orders, since those are the ones that represent accounts receivable / revenue
    const completedOrders = await OrderService.getOrders('COMPLETED');
    
    // We also want to include any non-completed orders that have payments or invoices (just in case they were billed early)
    // For simplicity, we just return the completed ones and sort them by completed date or due date
    const sorted = completedOrders.sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return b.due_date.localeCompare(a.due_date);
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('API GET ledger error:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }
}
