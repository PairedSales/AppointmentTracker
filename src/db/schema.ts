import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Clients
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
}));

// Orders (formerly appraisals)
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id),
  lender: text('lender'),
  address: text('address').notNull(),
  city: text('city'),
  type: text('type').notNull(), 
  dueDate: text('due_date'),
  inspectionDate: text('inspection_date'),
  inspectionTime: text('inspection_time'),
  effectiveDate: text('effective_date'),
  fee: integer('fee').notNull(),
  appraisedValue: integer('appraised_value'),
  colorCategory: text('color_category').notNull().default('black'),
  status: text('status').notNull().default('CREATED'), // CREATED, INSPECTED, COMPLETED, CANCELLED
  lenderOrderNumber: text('lender_order_number'),
  clientOrderNumber: text('client_order_number'),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  fhaCaseNumber: text('fha_case_number'),
  salePrice: integer('sale_price'),
  lat: real('lat'),
  lng: real('lng'),
  stats: text('stats'), 
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  inspectedAt: text('inspected_at'),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
}, (table) => ({
  clientIdIdx: index('idx_orders_client_id').on(table.clientId),
  statusIdx: index('idx_orders_status').on(table.status),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  appointments: many(appointments),
  invoices: many(invoices),
  auditLogs: many(auditLogs),
}));

// Appointments
export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  date: text('date'), // YYYY-MM-DD
  time: text('time'), // HH:MM
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orderIdIdx: index('idx_appointments_order_id').on(table.orderId),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  order: one(orders, {
    fields: [appointments.orderId],
    references: [orders.id],
  }),
}));

// Invoices
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  amount: real('amount').notNull(),
  status: text('status').notNull().default('DRAFT'), // DRAFT, SENT, PAID, OVERDUE, VOID
  issuedDate: text('issued_date'),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  orderIdIdx: index('idx_invoices_order_id').on(table.orderId),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  payments: many(payments),
}));

// Payments
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  amount: real('amount').notNull(),
  paymentDate: text('payment_date').notNull(),
  method: text('method'), // e.g. CREDIT_CARD, BANK_TRANSFER, CHECK
  reference: text('reference'), // Check number, transaction ID
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  invoiceIdIdx: index('idx_payments_invoice_id').on(table.invoiceId),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

// Expenses
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  category: text('category').notNull(),
  date: text('date').notNull(),
  description: text('description'),
  receiptUrl: text('receipt_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Ledger Entries
export const ledgerEntries = sqliteTable('ledger_entries', {
  id: text('id').primaryKey(),
  account: text('account').notNull(), 
  amount: real('amount').notNull(),
  type: text('type').notNull(), // DEBIT, CREDIT
  date: text('date').notNull(),
  description: text('description'),
  referenceType: text('reference_type'), // INVOICE, PAYMENT, EXPENSE
  referenceId: text('reference_id'),
  createdAt: text('created_at').notNull(),
});

// Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // ORDER, INVOICE, etc.
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), 
  changes: text('changes'), 
  previousValues: text('previous_values'), 
  newValues: text('new_values'), 
  timestamp: text('timestamp').notNull(),
}, (table) => ({
  entityIdx: index('idx_audit_logs_entity').on(table.entityType, table.entityId),
}));

// Settings
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Order History (SCD Type 2 for Time Machine)
export const orderHistory = sqliteTable('order_history', {
  historyId: integer('history_id').primaryKey({ autoIncrement: true }),
  orderId: text('order_id').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  type: text('type').notNull(),
  inspectionDate: text('inspection_date'),
  inspectionTime: text('inspection_time'),
  effectiveDate: text('effective_date'),
  dueDate: text('due_date'),
  stats: text('stats'),
  clientName: text('client_name'),
  lender: text('lender'),
  fee: integer('fee'),
  appraisedValue: integer('appraised_value'),
  lenderOrderNumber: text('lender_order_number'),
  clientOrderNumber: text('client_order_number'),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  fhaCaseNumber: text('fha_case_number'),
  salePrice: integer('sale_price'),
  colorCategory: text('color_category'),
  lat: real('lat'),
  lng: real('lng'),
  validFrom: text('valid_from').notNull(),
  validTo: text('valid_to'),
  actionType: text('action_type').notNull(),
  amountDue: real('amount_due'),
  amountPaid: real('amount_paid'),
  paidDate: text('paid_date'),
  payments: text('payments'),
});

