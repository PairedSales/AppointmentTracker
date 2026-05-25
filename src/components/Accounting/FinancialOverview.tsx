'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FinancialOverview() {
  const [metrics, setMetrics] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/accounting/dashboard');
        const data = await res.json();
        setMetrics(data.metrics);
        setCharts(data.charts);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) return <div style={{ color: 'var(--text-secondary)' }}>Loading financial data...</div>;
  if (!metrics) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Billings YTD</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            ${metrics.totalBillingsYTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Collections YTD</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--success)', margin: 0 }}>
            ${metrics.totalCollectionsYTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Outstanding Receivables</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--warning)', margin: 0 }}>
            ${metrics.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Net Income YTD</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: metrics.netIncomeYTD >= 0 ? 'var(--text-primary)' : 'var(--danger)', margin: 0 }}>
            ${metrics.netIncomeYTD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: '300px', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Monthly Revenue (Collections)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts?.monthlyRevenue || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis 
              stroke="var(--text-secondary)" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
              formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
            />
            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
