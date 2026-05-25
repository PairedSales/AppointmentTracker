import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../appraisals.db');
const db = new Database(dbPath);

console.log('Seeding 10,000 records...');

const insertClient = db.prepare(`
  INSERT OR IGNORE INTO clients (id, name, email, created_at, updated_at) 
  VALUES (?, ?, ?, ?, ?)
`);

const insertOrder = db.prepare(`
  INSERT INTO orders (
    id, client_id, address, city, type, fee, status, color_category, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

db.transaction(() => {
  insertClient.run('client-1', 'Simulated Client', 'sim@client.com', new Date().toISOString(), new Date().toISOString());

  // Insert 2000 active
  for (let i = 0; i < 2000; i++) {
    insertOrder.run(
      `active-${i}`,
      'client-1',
      `123 Active St ${i}`,
      'SimCity',
      '1004',
      500,
      'CREATED',
      'black',
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  // Insert 10000 completed
  for (let i = 0; i < 10000; i++) {
    insertOrder.run(
      `completed-${i}`,
      'client-1',
      `456 Completed St ${i}`,
      'SimCity',
      '1004',
      500,
      'COMPLETED',
      'black',
      new Date().toISOString(),
      new Date().toISOString()
    );
  }
})();

console.log('Seeding complete.');
