import { NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import os from 'os';
import { eq } from 'drizzle-orm';

// GET settings and system network info
export async function GET() {
  try {
    const allSettings = await db.select().from(settings);
    const getSetting = (k: string) => allSettings.find(s => s.key === k)?.value;

    const notes = getSetting('notes');
    const fontSize = getSetting('notes_font_size');
    const weeksInYear = getSetting('weeks_in_year');
    const homeAddress = getSetting('home_address');
    const homeLat = getSetting('home_lat');
    const homeLng = getSetting('home_lng');

    const hostname = os.hostname();
    const networkInterfaces = os.networkInterfaces();
    const ips: Array<{ name: string; address: string; isTailscale: boolean }> = [];

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      if (!interfaces) continue;
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const address = iface.address;
          const isTailscale =
            address.startsWith('100.') &&
            (() => {
              const secondOctet = parseInt(address.split('.')[1], 10);
              return secondOctet >= 64 && secondOctet <= 127;
            })();

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
      notes: notes !== undefined ? notes : '',
      notes_font_size: fontSize !== undefined ? Number(fontSize) : 16,
      weeks_in_year: weeksInYear !== undefined ? Number(weeksInYear) : 52,
      home_address: homeAddress !== undefined ? homeAddress : '1724 Locust Pl Schaumburg, IL 60173',
      home_lat: homeLat !== undefined ? Number(homeLat) : 42.0494,
      home_lng: homeLng !== undefined ? Number(homeLng) : -88.0436,
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
    const body = await request.json();
    const { notes, notes_font_size, weeks_in_year, home_address, home_lat, home_lng } = body;

    const upsertSetting = async (key: string, value: string) => {
      await db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    };

    if (notes !== undefined) await upsertSetting('notes', String(notes));
    if (notes_font_size !== undefined) await upsertSetting('notes_font_size', String(notes_font_size));
    if (weeks_in_year !== undefined) await upsertSetting('weeks_in_year', String(weeks_in_year));
    if (home_address !== undefined) await upsertSetting('home_address', String(home_address));
    if (home_lat !== undefined) await upsertSetting('home_lat', String(home_lat));
    if (home_lng !== undefined) await upsertSetting('home_lng', String(home_lng));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API POST settings error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
