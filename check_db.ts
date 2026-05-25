import Database from 'better-sqlite3';

const db = new Database('appraisals.db');
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  console.log('Orders count:', count);
  const sample = db.prepare('SELECT * FROM orders LIMIT 2').all();
  console.log('Sample orders:', sample);
} catch (e) {
  console.error(e);
}
