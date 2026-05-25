import Database from 'better-sqlite3';
import path from 'path';

const oldDbPath = path.resolve(process.cwd(), 'appraisals.db.bak');
const newDbPath = path.resolve(process.cwd(), 'appraisals.db');

const oldDb = new Database(oldDbPath);
const newDb = new Database(newDbPath);

const oldHistory = oldDb.prepare('SELECT * FROM appraisals_history').all() as any[];
const insert = newDb.prepare(`
  INSERT INTO order_history (order_id, address, type, inspection_date, inspection_time, due_date, stats, client_name, fee, color_category, lat, lng, valid_from, valid_to, action_type, amount_due, amount_paid, paid_date, payments)
  VALUES (@appraisal_id, @address, @type, @inspection_date, @inspection_time, @due_date, @stats, @client, @fee, @color_category, @lat, @lng, @valid_from, @valid_to, @action_type, @amount_due, @amount_paid, @paid_date, @payments)
`);

newDb.transaction(() => {
  for (const h of oldHistory) {
    insert.run(h);
  }
})();
console.log('History migrated!');
