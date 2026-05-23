/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb, logHistory } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { id, newAddress, newDueDate } = body;

    if (!id || !newAddress || !newDueDate) {
      return NextResponse.json(
        { error: 'Source appraisal ID, new address, and new due date are required.' },
        { status: 400 }
      );
    }

    // Retrieve source appraisal
    const source = await db.get('SELECT * FROM appraisals WHERE id = ?', id);
    if (!source) {
      return NextResponse.json({ error: 'Source appraisal not found' }, { status: 404 });
    }

    // Generate new UUID for the cloned appraisal
    const newId = crypto.randomUUID();

    // Insert cloned appraisal, copying Type, Client, Fee, Color Category, and Stats,
    // and using the user-provided new address and due date. Inspection dates are left blank.
    await db.run(
      `INSERT INTO appraisals (id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId,
      newAddress,
      source.type,
      '', // Blank inspection date for new clone
      '', // Blank inspection time for new clone
      newDueDate,
      source.stats, // Copy stats/labels
      source.client,
      source.fee,
      source.color_category
    );

    // Write history
    await logHistory(db, newId, 'INSERT');

    const created = await db.get('SELECT * FROM appraisals WHERE id = ?', newId);
    return NextResponse.json(created);
  } catch (error: any) {
    console.error('API POST clone appraisal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
