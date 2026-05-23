/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb, logHistory } from '@/lib/db';
import crypto from 'crypto';

// GET all appraisals (supports time-travel via 'timestamp' or single audit log via 'history' & 'id' or day changes via 'date')
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const timestamp = searchParams.get('timestamp');
    const history = searchParams.get('history');
    const id = searchParams.get('id');
    const dateParam = searchParams.get('date');

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
          color_category 
         FROM appraisals_history 
         WHERE valid_from <= ? AND (valid_to IS NULL OR valid_to > ?)`,
        dateStr,
        dateStr
      );
      return NextResponse.json({ appraisals, isHistorical: true });
    } else {
      // Query active table
      const appraisals = await db.all('SELECT * FROM appraisals');
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

    await db.run(
      `INSERT INTO appraisals (id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      finalId,
      address || '',
      type || '',
      inspection_date || '',
      inspection_time || '',
      due_date || '',
      stats || '',
      client || '',
      Number(fee) || 0,
      color_category || 'black'
    );

    // Write history
    await logHistory(db, finalId, 'INSERT');

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
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Appraisal ID is required' }, { status: 400 });
    }

    await db.run(
      `UPDATE appraisals
       SET address = ?,
           type = ?,
           inspection_date = ?,
           inspection_time = ?,
           due_date = ?,
           stats = ?,
           client = ?,
           fee = ?,
           color_category = ?
       WHERE id = ?`,
      address,
      type,
      inspection_date,
      inspection_time,
      due_date,
      stats,
      client,
      Number(fee),
      color_category,
      id
    );

    // Update history log
    await logHistory(db, id, 'UPDATE');

    const updated = await db.get('SELECT * FROM appraisals WHERE id = ?', id);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API PUT appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE an appraisal
export async function DELETE(request: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Appraisal ID is required' }, { status: 400 });
    }

    // Set valid_to of historical record to now
    await logHistory(db, id, 'DELETE');

    // Delete active record
    await db.run('DELETE FROM appraisals WHERE id = ?', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
