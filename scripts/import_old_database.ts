import * as xlsx from 'xlsx';
import { db } from '../src/db/index';
import { clients, orders } from '../src/db/schema';
import crypto from 'crypto';

function formatDate(date: any): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date);
}

async function main() {
  console.log('Reading Excel file...');
  const workbook = xlsx.readFile('OldDatabase.xlsx', { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} records to process.`);

  const clientCache = new Map<string, string>();
  
  // Get existing clients to avoid duplicates
  const existingClients = await db.select().from(clients);
  for (const c of existingClients) {
    clientCache.set(c.name, c.id);
  }

  let imported = 0;
  for (const row of data as any[]) {
    // The user specifically requested:
    // "None of the orders will have a creation date because this field does not exist in my old database. 
    // Use effective date for creation date. If no effective date, use delivered date,"
    let creationDateRaw = row['Effective Date'] || row['Delivered Date'];
    if (!creationDateRaw) {
      creationDateRaw = new Date();
    }
    const createdAtStr = new Date(creationDateRaw).toISOString();
    const updatedAtStr = new Date().toISOString();

    const clientName = row['Client Name']?.toString().trim() || 'Unknown Client';
    let clientId = clientCache.get(clientName);
    
    if (!clientId) {
      clientId = crypto.randomUUID();
      await db.insert(clients).values({
        id: clientId,
        name: clientName,
        createdAt: createdAtStr,
        updatedAt: updatedAtStr,
      });
      clientCache.set(clientName, clientId);
    }

    const orderId = crypto.randomUUID();
    const address = row['Address']?.toString() || 'Unknown Address';
    const city = row['City']?.toString() || null;
    const type = row['Appraisal Type']?.toString() || 'Unknown';
    
    let fee = parseFloat(row['Fee Total']);
    if (isNaN(fee)) fee = 0;
    
    let appraisedValue = parseFloat(row['Appraised Value']);
    let salePrice = parseFloat(row['Sale Price']);

    const inspectionDateRaw = row['Inspection Date'];
    const effectiveDateRaw = row['Effective Date'];
    const deliveredDateRaw = row['Delivered Date'];
    
    const inspectionDate = formatDate(inspectionDateRaw);
    const effectiveDate = formatDate(effectiveDateRaw);
    const completedAt = deliveredDateRaw ? new Date(deliveredDateRaw).toISOString() : null;
    
    const status = completedAt ? 'COMPLETED' : 'CREATED';

    await db.insert(orders).values({
      id: orderId,
      clientId: clientId,
      lender: row['Lender Name']?.toString() || null,
      address,
      city,
      type,
      fee: Math.round(fee),
      appraisedValue: isNaN(appraisedValue) ? null : Math.round(appraisedValue),
      status,
      inspectionDate,
      effectiveDate,
      completedAt,
      lenderOrderNumber: row['Lender File Number']?.toString() || null,
      clientOrderNumber: row['Client File Number']?.toString() || null,
      fhaCaseNumber: row['FHA Case Number']?.toString() || null,
      contactName: row['Borrower Name']?.toString() || null,
      salePrice: isNaN(salePrice) ? null : Math.round(salePrice),
      createdAt: createdAtStr,
      updatedAt: updatedAtStr,
    });
    imported++;
  }

  console.log(`Successfully imported ${imported} records!`);
}

main().catch(console.error);
