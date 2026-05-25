'use client';

import React, { useState } from 'react';
import FinancialOverview from './FinancialOverview';
import ReceivablesList from './ReceivablesList';
import ExpenseTracker from './ExpenseTracker';

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'receivables' | 'expenses'>('overview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Accounting Nav Header */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        borderBottom: '1px solid var(--border-color)', 
        paddingBottom: '0.75rem', 
        marginBottom: '1.25rem' 
      }}>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          Financial Overview
        </button>
        <button 
          onClick={() => setActiveTab('receivables')}
          className={`btn ${activeTab === 'receivables' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          Receivables Ledger
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
        >
          Expense Tracker
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', paddingRight: '0.5rem' }}>
        {activeTab === 'overview' && <FinancialOverview />}
        {activeTab === 'receivables' && <ReceivablesList />}
        {activeTab === 'expenses' && <ExpenseTracker />}
      </div>
    </div>
  );
}
