import { db } from '../db';
import { orders, clients, auditLogs, invoices, payments, orderHistory } from '../db/schema';
import { eq, desc, inArray, isNull, and } from 'drizzle-orm';
import crypto from 'crypto';
import { CreateOrderDTO, UpdateOrderDTO } from '../types';

export class OrderService {
  static async getOrders(statusFilter?: string) {
    let query = db.select({
      id: orders.id,
      address: orders.address,
      city: orders.city,
      type: orders.type,
      inspection_date: orders.inspectionDate,
      inspection_time: orders.inspectionTime,
      effective_date: orders.effectiveDate,
      due_date: orders.dueDate,
      fee: orders.fee,
      appraised_value: orders.appraisedValue,
      color_category: orders.colorCategory,
      status: orders.status,
      lender_order_number: orders.lenderOrderNumber,
      client_order_number: orders.clientOrderNumber,
      contact_name: orders.contactName,
      contact_phone: orders.contactPhone,
      fha_case_number: orders.fhaCaseNumber,
      sale_price: orders.salePrice,
      lat: orders.lat,
      lng: orders.lng,
      stats: orders.stats,
      client: clients.name,
      lender: orders.lender,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id));

    if (statusFilter) {
      const statuses = statusFilter.split(',');
      query = query.where(inArray(orders.status, statuses)) as any;
    } else {
      query = query.where(inArray(orders.status, ['CREATED', 'INSPECTED'])) as any;
    }

    const results = await query;
    
    const allInvoices = await db.select().from(invoices);
    const allPayments = await db.select().from(payments);

    return results.map(r => {
      const orderInvoices = allInvoices.filter(i => i.orderId === r.id);
      let amountDue = 0;
      let amountPaid = 0;
      let paidDate = null;
      let paymentMethods: string[] = [];

      for (const inv of orderInvoices) {
        amountDue += inv.amount;
        const invPayments = allPayments.filter(p => p.invoiceId === inv.id);
        for (const p of invPayments) {
          amountPaid += p.amount;
          paidDate = p.paymentDate;
          if (p.method) paymentMethods.push(p.method);
        }
      }

      return {
        ...r,
        amount_due: amountDue,
        amount_paid: amountPaid,
        paid_date: paidDate,
        payments: paymentMethods.length > 0 ? paymentMethods.join(', ') : null,
      };
    });
  }

  static async logHistory(orderId: string, actionType: 'INSERT' | 'UPDATE' | 'DELETE') {
    const nowStr = new Date().toISOString();
    
    // Invalidate current row
    await db.update(orderHistory)
      .set({ validTo: nowStr })
      .where(and(eq(orderHistory.orderId, orderId), isNull(orderHistory.validTo)));

    if (actionType !== 'DELETE') {
      const current = await this.getOrderById(orderId);
      if (current) {
        await db.insert(orderHistory).values({
          orderId: current.id,
          address: current.address,
          city: current.city,
          type: current.type,
          inspectionDate: current.inspection_date,
          inspectionTime: current.inspection_time,
          effectiveDate: current.effective_date,
          dueDate: current.due_date,
          stats: current.stats,
          clientName: current.client,
          lender: current.lender,
          fee: current.fee,
          appraisedValue: current.appraised_value,
          colorCategory: current.color_category,
          lenderOrderNumber: current.lender_order_number,
          clientOrderNumber: current.client_order_number,
          contactName: current.contact_name,
          contactPhone: current.contact_phone,
          fhaCaseNumber: current.fha_case_number,
          salePrice: current.sale_price,
          lat: current.lat,
          lng: current.lng,
          validFrom: nowStr,
          actionType: actionType,
          amountDue: current.amount_due,
          amountPaid: current.amount_paid,
          paidDate: current.paid_date,
          payments: current.payments,
        });
      }
    }
  }

  static async createOrder(data: CreateOrderDTO) {
    let clientId: string | undefined = undefined;
    if (!clientId && data.client) {
      const existingClient = await db.select().from(clients).where(eq(clients.name, data.client));
      if (existingClient.length > 0) {
        clientId = existingClient[0].id;
      } else {
        clientId = crypto.randomUUID();
        await db.insert(clients).values({
          id: clientId,
          name: data.client,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const nowStr = new Date().toISOString();
    const orderId = data.id || crypto.randomUUID();

    if (!clientId) throw new Error('Client ID is required');

    await db.insert(orders).values({
      id: orderId,
      clientId: clientId as string,
      lender: data.lender || null,
      address: data.address || '',
      city: data.city || null,
      type: data.type || '',
      inspectionDate: data.inspection_date || null,
      inspectionTime: data.inspection_time || null,
      effectiveDate: data.effective_date || null,
      dueDate: data.due_date || null,
      fee: data.fee || 0,
      appraisedValue: data.appraised_value || null,
      colorCategory: data.color_category || 'black',
      status: 'CREATED',
      lenderOrderNumber: data.lender_order_number || null,
      clientOrderNumber: data.client_order_number || null,
      contactName: data.contact_name || null,
      contactPhone: data.contact_phone || null,
      fhaCaseNumber: data.fha_case_number || null,
      salePrice: data.sale_price || null,
      lat: data.lat || null,
      lng: data.lng || null,
      stats: data.stats || null,
      createdAt: nowStr,
      updatedAt: nowStr,
    });

    const amountDue = data.amount_due ?? data.fee ?? 0;
    if (amountDue > 0) {
      await db.insert(invoices).values({
        id: crypto.randomUUID(),
        orderId,
        amount: amountDue,
        status: 'DRAFT',
        createdAt: nowStr,
        updatedAt: nowStr,
      });
    }

    await this.logHistory(orderId, 'INSERT');

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      entityType: 'ORDER',
      entityId: orderId,
      action: 'ORDER_CREATED',
      timestamp: nowStr,
    });

    return await this.getOrderById(orderId);
  }

  static async getOrderById(id: string) {
    const results = await db.select({
      id: orders.id,
      address: orders.address,
      city: orders.city,
      type: orders.type,
      inspection_date: orders.inspectionDate,
      inspection_time: orders.inspectionTime,
      effective_date: orders.effectiveDate,
      due_date: orders.dueDate,
      fee: orders.fee,
      appraised_value: orders.appraisedValue,
      color_category: orders.colorCategory,
      status: orders.status,
      lender_order_number: orders.lenderOrderNumber,
      client_order_number: orders.clientOrderNumber,
      contact_name: orders.contactName,
      contact_phone: orders.contactPhone,
      fha_case_number: orders.fhaCaseNumber,
      sale_price: orders.salePrice,
      lat: orders.lat,
      lng: orders.lng,
      stats: orders.stats,
      client: clients.name,
      lender: orders.lender,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(eq(orders.id, id));

    const r = results[0];
    if (!r) return null;

    const orderInvoices = await db.select().from(invoices).where(eq(invoices.orderId, r.id));
    const invIds = orderInvoices.map(i => i.id);
    const orderPayments = invIds.length > 0 ? await db.select().from(payments).where(inArray(payments.invoiceId, invIds)) : [];

    let amountDue = 0;
    let amountPaid = 0;
    let paidDate = null;
    let paymentMethods: string[] = [];

    for (const inv of orderInvoices) {
      amountDue += inv.amount;
      const invPayments = orderPayments.filter(p => p.invoiceId === inv.id);
      for (const p of invPayments) {
        amountPaid += p.amount;
        paidDate = p.paymentDate;
        if (p.method) paymentMethods.push(p.method);
      }
    }

    return {
      ...r,
      amount_due: amountDue,
      amount_paid: amountPaid,
      paid_date: paidDate,
      payments: paymentMethods.length > 0 ? paymentMethods.join(', ') : null,
    };
  }

  static async updateOrder(id: string, data: UpdateOrderDTO) {
    const current = await this.getOrderById(id);
    if (!current) throw new Error('Order not found');

    const nowStr = new Date().toISOString();
    
    let clientId;
    if (data.client && data.client !== current.client) {
      const existingClient = await db.select().from(clients).where(eq(clients.name, data.client));
      if (existingClient.length > 0) {
        clientId = existingClient[0].id;
      } else {
        clientId = crypto.randomUUID();
        await db.insert(clients).values({
          id: clientId,
          name: data.client,
          createdAt: nowStr,
          updatedAt: nowStr,
        });
      }
    }

    const updates: any = { updatedAt: nowStr };
    if (clientId !== undefined) updates.clientId = clientId;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.type !== undefined) updates.type = data.type;
    if (data.inspection_date !== undefined) updates.inspectionDate = data.inspection_date;
    if (data.inspection_time !== undefined) updates.inspectionTime = data.inspection_time;
    if (data.effective_date !== undefined) updates.effectiveDate = data.effective_date;
    if (data.due_date !== undefined) updates.dueDate = data.due_date;
    if (data.fee !== undefined) updates.fee = data.fee;
    if (data.appraised_value !== undefined) updates.appraisedValue = data.appraised_value;
    if (data.color_category !== undefined) updates.colorCategory = data.color_category;
    if (data.status !== undefined) updates.status = data.status;
    if (data.lender_order_number !== undefined) updates.lenderOrderNumber = data.lender_order_number;
    if (data.client_order_number !== undefined) updates.clientOrderNumber = data.client_order_number;
    if (data.contact_name !== undefined) updates.contactName = data.contact_name;
    if (data.contact_phone !== undefined) updates.contactPhone = data.contact_phone;
    if (data.fha_case_number !== undefined) updates.fhaCaseNumber = data.fha_case_number;
    if (data.sale_price !== undefined) updates.salePrice = data.sale_price;
    if (data.lat !== undefined) updates.lat = data.lat;
    if (data.lng !== undefined) updates.lng = data.lng;
    if (data.stats !== undefined) updates.stats = data.stats;
    if (data.lender !== undefined) updates.lender = data.lender;

    if (data.status === 'INSPECTED' && current.status !== 'INSPECTED') updates.inspectedAt = nowStr;
    if (data.status === 'COMPLETED' && current.status !== 'COMPLETED') updates.completedAt = nowStr;

    await db.update(orders).set(updates).where(eq(orders.id, id));

    if (data.amount_due !== undefined || data.amount_paid !== undefined || data.paid_date !== undefined || data.payments !== undefined) {
      const amountDue = data.amount_due ?? current.amount_due;
      const amountPaid = data.amount_paid ?? current.amount_paid;
      const paidDate = data.paid_date ?? current.paid_date;
      const paymentsNotes = data.payments ?? current.payments;

      const orderInvoices = await db.select().from(invoices).where(eq(invoices.orderId, id));
      let inv = orderInvoices[0];
      
      if (!inv) {
        inv = {
          id: crypto.randomUUID(),
          orderId: id,
          amount: amountDue,
          status: amountPaid >= amountDue ? 'PAID' : 'DRAFT',
          createdAt: nowStr,
          updatedAt: nowStr,
        } as any;
        await db.insert(invoices).values(inv);
      } else {
        await db.update(invoices)
          .set({ amount: amountDue, status: amountPaid >= amountDue ? 'PAID' : 'DRAFT', updatedAt: nowStr })
          .where(eq(invoices.id, inv.id));
      }

      const invPayments = await db.select().from(payments).where(eq(payments.invoiceId, inv.id));
      const currentPaid = invPayments.reduce((acc, p) => acc + p.amount, 0);

      if (amountPaid !== currentPaid || paidDate !== current.paid_date || paymentsNotes !== current.payments) {
        await db.delete(payments).where(eq(payments.invoiceId, inv.id));
        if (amountPaid > 0) {
           await db.insert(payments).values({
             id: crypto.randomUUID(),
             invoiceId: inv.id,
             amount: amountPaid,
             paymentDate: paidDate || nowStr,
             method: paymentsNotes || null,
             createdAt: nowStr,
             updatedAt: nowStr,
           });
        }
      }
    }

    let eventType = 'ORDER_UPDATED';
    if (data.status === 'COMPLETED' && current.status !== 'COMPLETED') eventType = 'ORDER_COMPLETED';
    else if (data.status === 'INSPECTED' && current.status !== 'INSPECTED') eventType = 'ORDER_INSPECTED';
    else if (data.status === 'CANCELLED' && current.status !== 'CANCELLED') eventType = 'ORDER_CANCELLED';

    await this.logHistory(id, 'UPDATE');

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      entityType: 'ORDER',
      entityId: id,
      action: eventType,
      timestamp: nowStr,
    });

    return await this.getOrderById(id);
  }

  static async softDeleteOrder(id: string) {
    const nowStr = new Date().toISOString();
    await db.update(orders).set({ status: 'CANCELLED', cancelledAt: nowStr, updatedAt: nowStr }).where(eq(orders.id, id));
    
    await this.logHistory(id, 'DELETE');
    
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      entityType: 'ORDER',
      entityId: id,
      action: 'ORDER_CANCELLED',
      timestamp: nowStr,
    });
  }
}
