import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Query events for the given day (YYYY-MM-DD)
    // We join with appraisals to get the address and type, using the current appraisals table
    // (since address rarely changes, or we could join history, but appraisals is simpler)
    const events = await db.all(
      `SELECT e.event_id, e.event_type, e.timestamp, a.address, a.type
       FROM appraisal_events e
       LEFT JOIN appraisals a ON e.appraisal_id = a.id
       WHERE e.timestamp LIKE ?
       ORDER BY e.timestamp ASC`,
      `${dateParam}%`
    );

    const metrics = {
      created: events.filter(e => e.event_type === 'ORDER_CREATED'),
      inspected: events.filter(e => e.event_type === 'ORDER_INSPECTED' || e.event_type === 'ORDER_UPDATED' /* Need to determine if status changed to INSPECTED, wait event_type handles it */),
      completed: events.filter(e => e.event_type === 'ORDER_COMPLETED'),
      cancelled: events.filter(e => e.event_type === 'ORDER_CANCELLED'),
    };

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API GET metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
