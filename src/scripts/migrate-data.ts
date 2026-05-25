import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from '../db/schema';
import crypto from 'crypto';

async function migrate() {
  const oldDbPath = path.resolve(process.cwd(), 'appraisals.db');
  const newDbPath = path.resolve(process.cwd(), 'new_appraisals.db');

  const oldDb = new Database(oldDbPath);
  const newSqlite = new Database(newDbPath);
  const newDb = drizzle(newSqlite, { schema });

  console.log('Reading legacy data...');
  const legacyAppraisals = oldDb.prepare('SELECT * FROM appraisals').all() as any[];
  const legacyHistory = oldDb.prepare('SELECT * FROM appraisals_history').all() as any[];
  const legacySettings = oldDb.prepare('SELECT * FROM settings').all() as any[];

  console.log(`Found ${legacyAppraisals.length} appraisals, ${legacyHistory.length} history records, ${legacySettings.length} settings.`);

  // 1. Migrate settings
  console.log('Migrating settings...');
  for (const s of legacySettings) {
    await newDb.insert(schema.settings).values({
      key: s.key,
      value: s.value
    }).onConflictDoNothing();
  }

  // 2. Extract and migrate Clients
  console.log('Extracting clients...');
  const clientNames = [...new Set(legacyAppraisals.map(a => a.client).filter(Boolean))];
  const clientMap = new Map<string, string>(); // name -> id

  for (const name of clientNames) {
    const id = crypto.randomUUID();
    clientMap.set(name, id);
    await newDb.insert(schema.clients).values({
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Migrate Orders and create Invoices
  console.log('Migrating orders and invoices...');
  for (const app of legacyAppraisals) {
    const clientId = clientMap.get(app.client);
    if (!clientId) continue; // Should not happen

    const orderId = app.id;
    
    // Some legacy records might be completely broken, fallbacks:
    const nowStr = new Date().toISOString();
    const createdAt = app.created_at || nowStr;

    await newDb.insert(schema.orders).values({
      id: orderId,
      clientId: clientId,
      address: app.address || 'Unknown',
      type: app.type || 'Unknown',
      dueDate: app.due_date || null,
      fee: app.fee || 0,
      colorCategory: app.color_category || 'black',
      status: app.status || 'CREATED',
      lat: app.lat || null,
      lng: app.lng || null,
      stats: app.stats || null,
      createdAt: createdAt,
      updatedAt: app.updated_at || createdAt,
      inspectedAt: app.inspected_at || null,
      completedAt: app.completed_at || null,
      cancelledAt: app.cancelled_at || null,
    });

    // Create Invoice for the order if it has a fee
    const invoiceId = crypto.randomUUID();
    let invoiceStatus = 'DRAFT';
    if (app.amount_paid >= (app.amount_due || app.fee)) {
      invoiceStatus = 'PAID';
    } else if (app.amount_paid > 0) {
      invoiceStatus = 'DRAFT'; // Partial payment doesn't exist as status, leave as draft or maybe SENT
    }

    if (app.fee > 0 || app.amount_due > 0) {
      await newDb.insert(schema.invoices).values({
        id: invoiceId,
        orderId: orderId,
        amount: app.amount_due || app.fee || 0,
        status: invoiceStatus,
        createdAt: createdAt,
        updatedAt: app.updated_at || createdAt,
      });

      // If paid, create a payment record
      if (app.amount_paid > 0) {
        await newDb.insert(schema.payments).values({
          id: crypto.randomUUID(),
          invoiceId: invoiceId,
          amount: app.amount_paid,
          paymentDate: app.paid_date || createdAt,
          createdAt: createdAt,
          updatedAt: app.updated_at || createdAt,
        });
      }
    }
  }

  // 4. Migrate History to Audit Logs
  console.log('Migrating history to audit logs...');
  for (const hist of legacyHistory) {
    await newDb.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      entityType: 'ORDER',
      entityId: hist.appraisal_id,
      action: hist.action_type || 'UPDATE',
      changes: JSON.stringify({ note: 'Legacy history record' }),
      timestamp: hist.valid_from || new Date().toISOString(),
    });
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
