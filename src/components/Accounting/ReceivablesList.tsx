'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { splitDateLabel } from '../../lib/utils';

export default function ReceivablesList() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/accounting/ledger');
      const data = await res.json();
      setLedger(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleMarkPaid = async (app: any) => {
    const amountDue = app.amount_due ?? app.fee;
    const amountPaid = app.amount_paid ?? 0;
    const remaining = amountDue - amountPaid;
    if (remaining <= 0) return; // Already fully paid

    const todayStr = new Date().toISOString().split('T')[0];
    const newPayment = { amount: remaining, date: todayStr };
    
    let paymentsArr = [];
    if (app.payments) {
      try { paymentsArr = JSON.parse(app.payments); } catch (e) {}
    }
    paymentsArr.push(newPayment);

    const payload = {
      id: app.id,
      amount_paid: amountPaid + remaining,
      paid_date: todayStr,
      payments: JSON.stringify(paymentsArr)
    };

    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchLedger(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  };

  const filteredLedger = ledger.filter(app => {
    const q = searchQuery.toLowerCase();
    return app.address.toLowerCase().includes(q) || app.client.toLowerCase().includes(q) || (app.lender && app.lender.toLowerCase().includes(q));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Receivables Ledger</h2>
        <div className="search-container" style={{ width: '250px' }}>
          <Search className="search-icon w-4 h-4" />
          <input
            type="text"
            className="search-input"
            placeholder="Search address, client, or lender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container" style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table className="appraisals-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Due</th>
              <th style={{ width: '250px' }}>Address</th>
              <th>Client</th>
              <th>Lender</th>
              <th style={{ textAlign: 'right' }}>Amount Due</th>
              <th style={{ textAlign: 'center' }}>Paid Date</th>
              <th style={{ textAlign: 'right' }}>Amount Paid</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading ledger...</td></tr>
            ) : filteredLedger.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No ledger entries found.</td></tr>
            ) : (
              filteredLedger.map((app) => {
                const amountDue = app.amount_due ?? app.fee;
                const amountPaid = app.amount_paid ?? 0;
                const isPaid = amountPaid >= amountDue;
                
                return (
                  <tr key={app.id} style={{ opacity: isPaid ? 0.7 : 1 }}>
                    <td className="due-date-cell">
                      <div className="badge-due">
                        {app.due_date ? splitDateLabel(app.due_date).dateVal : '-'}
                      </div>
                    </td>
                    <td>{app.address}</td>
                    <td>{app.client}</td>
                    <td>{app.lender || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: isPaid ? 'normal' : 'bold' }}>${amountDue}</td>
                    <td style={{ textAlign: 'center' }}>{app.paid_date ? splitDateLabel(app.paid_date).dateVal : '-'}</td>
                    <td style={{ textAlign: 'right', color: isPaid ? 'var(--success)' : 'inherit' }}>${amountPaid}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleMarkPaid(app)}
                        disabled={isPaid}
                        title={isPaid ? "Fully Paid" : "Mark Paid"}
                        className="action-icon-btn"
                        style={{ opacity: isPaid ? 0.3 : 1, margin: '0 auto' }}
                      >
                        💲
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
