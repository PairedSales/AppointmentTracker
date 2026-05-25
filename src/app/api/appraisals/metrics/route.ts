import { NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, orders } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const events = await db.select({
      event_id: auditLogs.id,
      event_type: auditLogs.action,
      timestamp: auditLogs.timestamp,
      address: orders.address,
      type: orders.type,
    })
    .from(auditLogs)
    .leftJoin(orders, eq(auditLogs.entityId, orders.id))
    .where(like(auditLogs.timestamp, `${dateParam}%`));

    const metrics = {
      created: events.filter(e => e.event_type === 'ORDER_CREATED'),
      inspected: events.filter(e => e.event_type === 'ORDER_INSPECTED' || e.event_type === 'ORDER_UPDATED'),
      completed: events.filter(e => e.event_type === 'ORDER_COMPLETED'),
      cancelled: events.filter(e => e.event_type === 'ORDER_CANCELLED'),
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API GET metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
