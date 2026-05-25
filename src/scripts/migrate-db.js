const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'appraisals.db');
const db = new Database(dbPath);

console.log('Starting migration...');

const columnsToAdd = [
  'effective_date text',
  'lender_order_number text',
  'client_order_number text',
  'appraised_value integer',
  'contact_name text',
  'contact_phone text',
  'city text',
  'fha_case_number text',
  'sale_price integer'
];

for (const col of columnsToAdd) {
  try {
    db.prepare(`ALTER TABLE orders ADD COLUMN ${col}`).run();
    console.log(`Added column ${col} to orders`);
  } catch (e) {
    console.log(`Column ${col} may already exist in orders or error:`, e.message);
  }
  
  try {
    db.prepare(`ALTER TABLE order_history ADD COLUMN ${col}`).run();
    console.log(`Added column ${col} to order_history`);
  } catch (e) {
    console.log(`Column ${col} may already exist in order_history or error:`, e.message);
  }
}

// Data Migration for active orders:
const orders = db.prepare(`SELECT id, address FROM orders WHERE status NOT IN ('COMPLETED', 'CANCELLED')`).all();
console.log(`Found ${orders.length} active orders to migrate address for.`);

let updateCount = 0;
for (const order of orders) {
  let addressStr = order.address || '';
  let address = addressStr;
  let city = '';
  
  const commaIndex = addressStr.indexOf(',');
  if (commaIndex !== -1) {
    address = addressStr.substring(0, commaIndex).trim();
    let secondary = addressStr.substring(commaIndex + 1).trim();
    let parts = secondary.split(',');
    city = parts[0].trim();
    city = city.replace(/il\b/i, '').replace(/illinois\b/i, '').trim();
    city = city.replace(/\b\d{5}\b/, '').trim();
  } else {
    const suffixes = [
      'st', 'street', 'ln', 'lane', 'ave', 'avenue', 'rd', 'road', 
      'blvd', 'boulevard', 'dr', 'drive', 'pl', 'place', 'ct', 'court', 
      'way', 'ter', 'terrace', 'cir', 'circle', 'hwy', 'highway', 'pkwy', 'parkway'
    ];
    const words = addressStr.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const normalizedWord = words[i].toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
      if (suffixes.includes(normalizedWord)) {
        address = words.slice(0, i + 1).join(' ');
        city = words.slice(i + 1).join(' ').trim();
        city = city.replace(/il\b/i, '').replace(/illinois\b/i, '').trim();
        city = city.replace(/\b\d{5}\b/, '').trim();
        break;
      }
    }
  }
  
  db.prepare('UPDATE orders SET address = ?, city = ? WHERE id = ?').run(address, city, order.id);
  updateCount++;
}

console.log(`Successfully split address/city for ${updateCount} active orders.`);
console.log('Migration complete.');
