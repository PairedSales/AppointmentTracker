'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AppDatePicker } from '../Pickers';

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/accounting/expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, category, date, description }),
      });
      
      if (res.ok) {
        setAmount('');
        setCategory('');
        setDate('');
        setDescription('');
        fetchExpenses();
      }
    } catch (err) {
      console.error('Failed to add expense:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const res = await fetch(`/api/accounting/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
      
      {/* Add Expense Form */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1rem' }}>Log New Expense</h3>
        <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label>Amount ($)</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="form-input" placeholder="e.g. 150.00" />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label>Category</label>
            <select required value={category} onChange={e => setCategory(e.target.value)} className="form-input">
              <option value="" disabled>Select...</option>
              <option value="Software">Software & Subscriptions</option>
              <option value="MLS Fees">MLS / Association Fees</option>
              <option value="Travel">Auto & Travel</option>
              <option value="Office">Office Supplies</option>
              <option value="Marketing">Marketing</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label>Date</label>
            <div style={{ height: '38px' }}>
              <AppDatePicker
                value={date}
                onChange={setDate}
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
            <label>Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="form-input" placeholder="e.g. Annual MLS Dues" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      {/* Expense Ledger */}
      <div className="table-container" style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table className="appraisals-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading expenses...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No expenses logged.</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td>{exp.category}</td>
                  <td>{exp.description}</td>
                  <td style={{ textAlign: 'right' }}>${exp.amount.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      title="Delete Expense"
                      className="action-icon-btn"
                      style={{ color: 'var(--danger)', margin: '0 auto' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
