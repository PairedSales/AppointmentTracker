/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb, logHistory } from '@/lib/db';
import crypto from 'crypto';

const formatAddress = (val: string): string => {
  const s = val.trim().replace(/\s+/g, ' ');
  if (!s) return '';
  
  const suffixes = [
    'st', 'street', 'rd', 'road', 'dr', 'drive', 'wy', 'way', 'ave', 'avenue', 
    'ln', 'lane', 'blvd', 'boulevard', 'pl', 'place', 'ct', 'court', 'ter', 'terrace', 
    'cir', 'circle', 'hwy', 'highway', 'pkwy', 'parkway'
  ];
  
  const words = s.split(' ');
  let suffixIndex = -1;
  for (let i = 0; i < words.length; i++) {
    const wordClean = words[i].replace(/[.,]/g, '').toLowerCase();
    if (suffixes.includes(wordClean)) {
      suffixIndex = i;
      break;
    }
  }
  
  let street = '';
  let rest = '';
  
  if (suffixIndex !== -1) {
    street = words.slice(0, suffixIndex + 1).join(' ').replace(/,$/, '');
    rest = words.slice(suffixIndex + 1).join(' ');
  } else {
    const commaIdx = s.indexOf(',');
    if (commaIdx !== -1) {
      street = s.substring(0, commaIdx).trim();
      rest = s.substring(commaIdx + 1).trim();
    } else {
      if (words.length > 1) {
        street = words.slice(0, words.length - 1).join(' ');
        rest = words[words.length - 1];
      } else {
        street = s;
        rest = '';
      }
    }
  }
  
  rest = rest.trim().replace(/^,/, '').trim();
  let city = rest.replace(/(?:,\s*|\s+)(?:IL|Illinois|il|illinois)$/i, '').trim();
  city = city.replace(/,$/, '').trim();
  
  if (!city) {
    return `${street}, IL`;
  }
  
  return `${street}, ${city}, IL`;
};

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

    const formattedAddress = formatAddress(newAddress);

    // Apply color category and status rules for new clone (no inspection date/time)
    let colorCategory = 'blue';
    let stats = 'Unscheduled';
    const typeLower = (source.type || '').toLowerCase();

    if (typeLower.includes('hybrid')) {
      colorCategory = 'brown';
      stats = source.stats || ''; // Copy source stats for brown category
    }

    // Generate new UUID for the cloned appraisal
    const newId = crypto.randomUUID();

    // Insert cloned appraisal
    await db.run(
      `INSERT INTO appraisals (id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId,
      formattedAddress,
      source.type,
      '', // Blank inspection date for new clone
      '', // Blank inspection time for new clone
      newDueDate,
      stats,
      source.client,
      source.fee,
      colorCategory
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
