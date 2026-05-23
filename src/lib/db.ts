import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

// Locate database file in the project root
const dbPath = path.resolve(process.cwd(), 'appraisals.db');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Open the database
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // Initialize tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS appraisals (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      type TEXT NOT NULL,
      inspection_date TEXT, -- YYYY-MM-DD
      inspection_time TEXT, -- HH:MM (in 24h format, or stored as HH:MM AM/PM)
      due_date TEXT NOT NULL, -- YYYY-MM-DD
      stats TEXT,
      client TEXT NOT NULL,
      fee INTEGER NOT NULL,  -- stored in dollars
      color_category TEXT NOT NULL DEFAULT 'black' -- 'black', 'blue', 'purple', 'brown', 'gold'
    );
  `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS appraisals_history (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      appraisal_id TEXT NOT NULL,
      address TEXT NOT NULL,
      type TEXT NOT NULL,
      inspection_date TEXT,
      inspection_time TEXT,
      due_date TEXT,
      stats TEXT,
      client TEXT,
      fee INTEGER,
      color_category TEXT,
      valid_from TEXT NOT NULL, -- ISO8601 Timestamp of change (e.g. 2026-05-23T20:51:00Z)
      valid_to TEXT,             -- ISO8601 Timestamp when replaced/deleted (NULL = current)
      action_type TEXT NOT NULL  -- 'INSERT', 'UPDATE', 'DELETE'
    );
  `);

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default settings if empty
  const notesCount = await dbInstance.get('SELECT COUNT(*) as count FROM settings WHERE key = ?', 'notes');
  if (notesCount.count === 0) {
    await dbInstance.run('INSERT INTO settings (key, value) VALUES (?, ?)', 'notes', 'Update Websites\n\nPICS OF EVERYTHING FOR BPL Mortgage, LLC');
    await dbInstance.run('INSERT INTO settings (key, value) VALUES (?, ?)', 'notes_font_size', '16');
  }
  const weeksCount = await dbInstance.get('SELECT COUNT(*) as count FROM settings WHERE key = ?', 'weeks_in_year');
  if (weeksCount.count === 0) {
    await dbInstance.run('INSERT INTO settings (key, value) VALUES (?, ?)', 'weeks_in_year', '52');
  }

  // Seed default appraisals if empty
  const appraisalsCount = await dbInstance.get('SELECT COUNT(*) as count FROM appraisals');
  if (appraisalsCount.count === 0) {
    const defaultAppraisals = [
      {
        id: '1',
        address: '1414 Harrison St Algonquin, IL',
        type: '1004 Purchase',
        inspection_date: '',
        inspection_time: '',
        due_date: '2026-05-20',
        stats: '',
        client: 'Compass',
        fee: 400,
        color_category: 'brown',
      },
      {
        id: '2',
        address: '702 Maple Ln Geneva, IL',
        type: 'Hybrid',
        inspection_date: '',
        inspection_time: '',
        due_date: '2026-05-22',
        stats: '',
        client: 'Class',
        fee: 275,
        color_category: 'brown',
      },
      {
        id: '3',
        address: '430 Judson St Bensenville, IL',
        type: '1004 Purchase',
        inspection_date: '',
        inspection_time: '',
        due_date: '2026-05-22',
        stats: '',
        client: 'Class',
        fee: 500,
        color_category: 'brown',
      },
      {
        id: '4',
        address: '399 Sislow Ln Vernon Hills, IL',
        type: '1004 Purchase',
        inspection_date: '2026-05-21',
        inspection_time: '04:30 AM',
        due_date: '2026-05-26',
        stats: 'Email',
        client: 'Rocket',
        fee: 365,
        color_category: 'black',
      },
      {
        id: '5',
        address: '8829 S Harper Ave Chicago, IL',
        type: '1025 Refi',
        inspection_date: '',
        inspection_time: '',
        due_date: '',
        stats: 'Hold',
        client: 'Class',
        fee: 500,
        color_category: 'gold',
      },
      {
        id: '6',
        address: '27W050 Sycamore Ln, Winfield, IL 60190',
        type: '1004 Purchase',
        inspection_date: '2026-05-22',
        inspection_time: '03:30 AM',
        due_date: '2026-05-26',
        stats: '',
        client: 'Rocket',
        fee: 360,
        color_category: 'black',
      },
      {
        id: '7',
        address: '1212 McDaniels Ave Highland Park, IL 60035',
        type: '1004 Refi',
        inspection_date: '',
        inspection_time: '',
        due_date: '2026-05-29',
        stats: '',
        client: 'Heartland',
        fee: 400,
        color_category: 'blue',
      },
      {
        id: '8',
        address: '731 S Roosevelt Ave Arlington Heights',
        type: 'Hybrid',
        inspection_date: '',
        inspection_time: '',
        due_date: '2026-05-26',
        stats: '',
        client: 'Class',
        fee: 275,
        color_category: 'brown',
      },
      {
        id: '9',
        address: '5029 S Dorchester Ave Chicago, IL',
        type: '1004 Purchase',
        inspection_date: '2026-05-26',
        inspection_time: '04:30 PM',
        due_date: '2026-05-27',
        stats: '',
        client: 'Rocket',
        fee: 370,
        color_category: 'black',
      },
    ];

    const nowStr = new Date().toISOString();

    for (const app of defaultAppraisals) {
      await dbInstance.run(
        `INSERT INTO appraisals (id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        app.id,
        app.address,
        app.type,
        app.inspection_date,
        app.inspection_time,
        app.due_date,
        app.stats,
        app.client,
        app.fee,
        app.color_category
      );

      // Insert first history record for each
      await dbInstance.run(
        `INSERT INTO appraisals_history (appraisal_id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category, valid_from, valid_to, action_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'INSERT')`,
        app.id,
        app.address,
        app.type,
        app.inspection_date,
        app.inspection_time,
        app.due_date,
        app.stats,
        app.client,
        app.fee,
        app.color_category,
        nowStr
      );
    }
  }

  return dbInstance;
}

// Log changes to the history table
export async function logHistory(
  db: Database,
  appraisalId: string,
  actionType: 'INSERT' | 'UPDATE' | 'DELETE'
) {
  const nowStr = new Date().toISOString();

  // Find the active row in history and set its valid_to
  await db.run(
    `UPDATE appraisals_history
     SET valid_to = ?
     WHERE appraisal_id = ? AND valid_to IS NULL`,
    nowStr,
    appraisalId
  );

  if (actionType !== 'DELETE') {
    // Get the current details of the appraisal
    const current = await db.get('SELECT * FROM appraisals WHERE id = ?', appraisalId);
    if (current) {
      // Insert new version
      await db.run(
        `INSERT INTO appraisals_history (appraisal_id, address, type, inspection_date, inspection_time, due_date, stats, client, fee, color_category, valid_from, valid_to, action_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
        current.id,
        current.address,
        current.type,
        current.inspection_date,
        current.inspection_time,
        current.due_date,
        current.stats,
        current.client,
        current.fee,
        current.color_category,
        nowStr,
        actionType
      );
    }
  }
}
