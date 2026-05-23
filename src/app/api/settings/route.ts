/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import os from 'os';

// GET settings and system network info
export async function GET() {
  try {
    const db = await getDb();

    // Fetch notes and font size
    const notesRow = await db.get('SELECT value FROM settings WHERE key = ?', 'notes');
    const fontSizeRow = await db.get('SELECT value FROM settings WHERE key = ?', 'notes_font_size');
    const weeksInYearRow = await db.get('SELECT value FROM settings WHERE key = ?', 'weeks_in_year');

    // Get system network interfaces
    const hostname = os.hostname();
    const networkInterfaces = os.networkInterfaces();
    const ips: Array<{ name: string; address: string; isTailscale: boolean }> = [];

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      if (!interfaces) continue;
      for (const iface of interfaces) {
        // We only care about IPv4 and non-loopback addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          const address = iface.address;
          // Tailscale IPs always fall within the 100.64.0.0/10 block (100.64.x.y to 100.127.x.y)
          const isTailscale =
            address.startsWith('100.') &&
            (() => {
              const secondOctet = parseInt(address.split('.')[1], 10);
              return secondOctet >= 64 && secondOctet <= 127;
            })();

          // Also check by interface name (often contains tailscale)
          const isTailscaleName = name.toLowerCase().includes('tailscale') || name.toLowerCase().includes('zt');

          ips.push({
            name,
            address,
            isTailscale: isTailscale || isTailscaleName,
          });
        }
      }
    }

    return NextResponse.json({
      notes: notesRow ? notesRow.value : '',
      notes_font_size: fontSizeRow ? Number(fontSizeRow.value) : 16,
      weeks_in_year: weeksInYearRow ? Number(weeksInYearRow.value) : 52,
      hostname,
      ips,
    });
  } catch (error: any) {
    console.error('API GET settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST update settings
export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { notes, notes_font_size, weeks_in_year } = body;

    if (notes !== undefined) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('notes', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        notes
      );
    }

    if (notes_font_size !== undefined) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('notes_font_size', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        String(notes_font_size)
      );
    }

    if (weeks_in_year !== undefined) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('weeks_in_year', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        String(weeks_in_year)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API POST settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
