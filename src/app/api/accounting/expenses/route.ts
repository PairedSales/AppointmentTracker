import { NextResponse } from 'next/server';
import { db } from '@/db';
import { expenses, ledgerEntries } from '@/db/schema';
import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.date));
    return NextResponse.json(allExpenses);
  } catch (error) {
    console.error('API GET expenses error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    await db.insert(expenses).values({
      id,
      amount: Number(body.amount),
      category: body.category || 'General',
      date: body.date || nowStr.split('T')[0],
      description: body.description || '',
      receiptUrl: body.receiptUrl || null,
      createdAt: nowStr,
      updatedAt: nowStr,
    });

    // Also insert into ledger
    await db.insert(ledgerEntries).values({
      id: crypto.randomUUID(),
      account: 'Cash',
      amount: Number(body.amount),
      type: 'CREDIT', // Cash out
      date: body.date || nowStr.split('T')[0],
      description: `Expense: ${body.category} - ${body.description}`,
      referenceType: 'EXPENSE',
      referenceId: id,
      createdAt: nowStr,
    });

    const created = await db.select().from(expenses).where(eq(expenses.id, id));
    return NextResponse.json(created[0]);
  } catch (error: any) {
    console.error('API POST expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await db.delete(expenses).where(eq(expenses.id, id));
    await db.delete(ledgerEntries).where(eq(ledgerEntries.referenceId, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API DELETE expense error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
