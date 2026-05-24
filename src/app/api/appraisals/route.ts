/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb, logHistory, logEvent } from '@/lib/db';
import crypto from 'crypto';
import { geocodeAddress } from '@/lib/geocode';

// GET all appraisals (supports time-travel via 'timestamp' or single audit log via 'history' & 'id' or day changes via 'date')
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const timestamp = searchParams.get('timestamp');
    const history = searchParams.get('history');
    const id = searchParams.get('id');
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status');

    if (dateParam) {
      // Query unique change timestamps that occurred on a specific date YYYY-MM-DD
      const changes = await db.all(
        `SELECT DISTINCT valid_from FROM appraisals_history 
         WHERE valid_from LIKE ? 
         ORDER BY valid_from ASC`,
        `${dateParam}%`
      );
      return NextResponse.json({ changes });
    }

    if (history && id) {
      // Query full history for a specific appraisal to show in details panel
      const auditLog = await db.all(
        `SELECT * FROM appraisals_history 
         WHERE appraisal_id = ? 
         ORDER BY history_id DESC`,
        id
      );
      return NextResponse.json({ history: auditLog });
    }

    if (timestamp) {
      // Query history for rows that were active at this exact point in time
      const dateStr = new Date(timestamp).toISOString();
      const appraisals = await db.all(
        `SELECT 
          appraisal_id as id, 
          address, 
          type, 
          inspection_date, 
          inspection_time, 
          due_date, 
          stats, 
          client, 
          fee, 
          color_category,
          lat,
          lng
         FROM appraisals_history 
         WHERE valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)`,
        dateStr,
        dateStr
      );
      return NextResponse.json({ appraisals, isHistorical: true });
    } else {
      let appraisals;
      if (statusParam) {
        // e.g. status=COMPLETED
        const statuses = statusParam.split(',');
        const placeholders = statuses.map(() => '?').join(',');
        appraisals = await db.all(`SELECT * FROM appraisals WHERE status IN (${placeholders})`, ...statuses);
      } else {
        // Default: active orders
        appraisals = await db.all("SELECT * FROM appraisals WHERE status NOT IN ('COMPLETED', 'CANCELLED')");
      }
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
    const db = await getDb();
    const body = await request.json();
    const {
      id,
      address,
      type,
      inspection_date,
      inspection_time,
      due_date,
      stats,
      client,
      fee,
      color_category,
    } = body;

    const finalId = id || crypto.randomUUID();
    
    // Geocode address asynchronously but await before insert so we have coordinates immediately if possible
    let lat = null;
    let lng = null;
    if (address) {
      const coords = await geocodeAddress(address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    const nowStr = new Date().toISOString();

    await db.run(
      `INSERT INTO appraisals (id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category, lat, lng, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?, ?)`,
      finalId,
      address || '',
      type || '',
      inspection_date || '',
      inspection_time || '',
      due_date || '',
      stats || '',
      client || '',
      Number(fee) || 0,
      color_category || 'black',
      lat,
      lng,
      nowStr,
      nowStr
    );

    // Write history
    await logHistory(db, finalId, 'INSERT');
    await logEvent(db, finalId, 'ORDER_CREATED');

    const created = await db.get('SELECT * FROM appraisals WHERE id = ?', finalId);
    return NextResponse.json(created);
  } catch (error: any) {
    console.error('API POST appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update an appraisal
export async function PUT(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const {
      id,
      address,
      type,
      inspection_date,
      inspection_time,
      due_date,
      stats,
      client,
      fee,
      color_category,
      status, // Optional, can be provided to transition status
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appraisal ID is required' }, { status: 400 });
    }

    const current = await db.get('SELECT * FROM appraisals WHERE id = ?', id);
    if (!current) {
      return NextResponse.json({ error: 'Appraisal not found' }, { status: 404 });
    }

    // Check if address changed
    let lat = current.lat;
    let lng = current.lng;
    
    if (address !== undefined && current.address !== address) {
      const coords = await geocodeAddress(address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    const nowStr = new Date().toISOString();
    let newStatus = status !== undefined ? status : current.status;
    let inspectedAt = current.inspected_at;
    let completedAt = current.completed_at;

    if (newStatus === 'INSPECTED' && current.status !== 'INSPECTED') {
      inspectedAt = nowStr;
    }
    if (newStatus === 'COMPLETED' && current.status !== 'COMPLETED') {
      completedAt = nowStr;
    }

    await db.run(
      `UPDATE appraisals
       SET address = COALESCE(?, address),
           type = COALESCE(?, type),
           inspection_date = COALESCE(?, inspection_date),
           inspection_time = COALESCE(?, inspection_time),
           due_date = COALESCE(?, due_date),
           stats = COALESCE(?, stats),
           client = COALESCE(?, client),
           fee = COALESCE(?, fee),
           color_category = COALESCE(?, color_category),
           lat = ?,
           lng = ?,
           status = ?,
           updated_at = ?,
           inspected_at = ?,
           completed_at = ?
       WHERE id = ?`,
      address,
      type,
      inspection_date,
      inspection_time,
      due_date,
      stats,
      client,
      fee !== undefined ? Number(fee) : undefined,
      color_category,
      lat,
      lng,
      newStatus,
      nowStr,
      inspectedAt,
      completedAt,
      id
    );

    // Compute diffs
    const updated = await db.get('SELECT * FROM appraisals WHERE id = ?', id);
    const changedFields = [];
    const previousValues: any = {};
    const newValues: any = {};
    
    for (const key of Object.keys(updated)) {
      if (key === 'color_category' || key === 'updated_at') continue; // Ignore these for audit
      if (current[key] !== updated[key]) {
        changedFields.push(key);
        previousValues[key] = current[key];
        newValues[key] = updated[key];
      }
    }

    // Determine event type
    let eventType: 'ORDER_UPDATED' | 'ORDER_COMPLETED' | 'ORDER_CANCELLED' | 'ORDER_INSPECTED' = 'ORDER_UPDATED';
    if (newStatus === 'COMPLETED' && current.status !== 'COMPLETED') eventType = 'ORDER_COMPLETED';
    else if (newStatus === 'INSPECTED' && current.status !== 'INSPECTED') eventType = 'ORDER_INSPECTED';
    
    // Update history logs
    await logHistory(db, id, 'UPDATE');
    if (changedFields.length > 0 || eventType !== 'ORDER_UPDATED') {
      await logEvent(db, id, eventType, changedFields, previousValues, newValues);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API PUT appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE an appraisal (Soft delete -> CANCELLED)
export async function DELETE(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Appraisal ID is required' }, { status: 400 });
    }

    const current = await db.get('SELECT * FROM appraisals WHERE id = ?', id);
    if (!current) {
      return NextResponse.json({ error: 'Appraisal not found' }, { status: 404 });
    }

    const nowStr = new Date().toISOString();

    // Soft delete by updating status
    await db.run(
      `UPDATE appraisals 
       SET status = 'CANCELLED', cancelled_at = ?, updated_at = ? 
       WHERE id = ?`,
       nowStr,
       nowStr,
       id
    );

    // Log the cancellation event
    await logHistory(db, id, 'DELETE');
    await logEvent(db, id, 'ORDER_CANCELLED', ['status'], { status: current.status }, { status: 'CANCELLED' });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
