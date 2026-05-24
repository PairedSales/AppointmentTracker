import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dbPath = path.resolve(process.cwd(), 'appraisals.db');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database file not found' }, { status: 404 });
    }

    const stat = fs.statSync(dbPath);
    const fileStream = fs.createReadStream(dbPath);

    return new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="appraisals.db"',
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (error: any) {
    console.error('Backup endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
