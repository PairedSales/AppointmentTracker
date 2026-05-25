import { NextResponse } from 'next/server';
import { OrderService } from '@/services/OrderService';
import { db } from '@/db';
import { orderHistory } from '@/db/schema';
import { geocodeAddress } from '@/lib/geocode';
import { eq, desc, and, isNull, lte, gt, like } from 'drizzle-orm';

// GET all appraisals (supports time-travel via 'timestamp' or single audit log via 'history' & 'id' or day changes via 'date')
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timestamp = searchParams.get('timestamp');
    const history = searchParams.get('history');
    const id = searchParams.get('id');
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status');

    if (dateParam) {
      // Query unique change timestamps that occurred on a specific date YYYY-MM-DD
      const changes = await db.selectDistinct({ validFrom: orderHistory.validFrom })
        .from(orderHistory)
        .where(like(orderHistory.validFrom, `${dateParam}%`))
        .orderBy(orderHistory.validFrom);
      
      return NextResponse.json({ changes: changes.map(c => ({ valid_from: c.validFrom })) });
    }

    if (history && id) {
      const auditLog = await db.select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, id))
        .orderBy(desc(orderHistory.historyId));
      
      // Map to old schema keys for UI compatibility
      const mapped = auditLog.map(h => ({
        history_id: h.historyId,
        appraisal_id: h.orderId,
        address: h.address,
        type: h.type,
        inspection_date: h.inspectionDate,
        inspection_time: h.inspectionTime,
        due_date: h.dueDate,
        stats: h.stats,
        client: h.clientName,
        lender: h.lender,
        fee: h.fee,
        color_category: h.colorCategory,
        lat: h.lat,
        lng: h.lng,
        valid_from: h.validFrom,
        valid_to: h.validTo,
        action_type: h.actionType,
        amount_due: h.amountDue,
        amount_paid: h.amountPaid,
        paid_date: h.paidDate,
        payments: h.payments
      }));
      return NextResponse.json({ history: mapped });
    }

    if (timestamp) {
      const dateStr = new Date(timestamp).toISOString();
      const historicalRecords = await db.select()
        .from(orderHistory)
        .where(
          and(
            lte(orderHistory.validFrom, dateStr),
            // valid_to is either null or > timestamp
            // we will fetch all matching validFrom and filter validTo in memory if Drizzle OR condition is verbose
          )
        );
      
      const filtered = historicalRecords.filter(h => !h.validTo || h.validTo > dateStr);
      
      const mapped = filtered.map(h => ({
        id: h.orderId,
        address: h.address,
        type: h.type,
        inspection_date: h.inspectionDate,
        inspection_time: h.inspectionTime,
        due_date: h.dueDate,
        stats: h.stats,
        client: h.clientName,
        lender: h.lender,
        fee: h.fee,
        color_category: h.colorCategory,
        lat: h.lat,
        lng: h.lng,
        amount_due: h.amountDue,
        amount_paid: h.amountPaid,
        paid_date: h.paidDate,
        payments: h.payments
      }));

      return NextResponse.json({ appraisals: mapped, isHistorical: true });
    } else {
      const appraisals = await OrderService.getOrders(statusParam || undefined);
      return NextResponse.json({ appraisals, isHistorical: false });
    }
  } catch (error: any) {
    console.error('API GET appraisals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new appraisal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Geocode address asynchronously
    if (body.address) {
      const coords = await geocodeAddress(body.address);
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }
    }

    const created = await OrderService.createOrder(body);
    return NextResponse.json(created);
  } catch (error: any) {
    console.error('API POST appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update an appraisal
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Appraisal ID is required' }, { status: 400 });
    }

    // Geocode if address changed
    if (body.address) {
      const current = await OrderService.getOrderById(body.id);
      if (current && current.address !== body.address) {
        const coords = await geocodeAddress(body.address);
        if (coords) {
          body.lat = coords.lat;
          body.lng = coords.lng;
        }
      }
    }

    const updated = await OrderService.updateOrder(body.id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API PUT appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE an appraisal (Soft delete -> CANCELLED)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Appraisal ID is required' }, { status: 400 });
    }

    await OrderService.softDeleteOrder(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
