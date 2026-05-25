import { useState, useCallback, useMemo } from 'react';
import { Appraisal, HistoryAction } from '../types';
import { removeUnscheduled, convertTo24Hour } from '../lib/utils';

export function useAppraisals(
  pushAction: (action: HistoryAction) => void,
  clearSelection: () => void,
  selectedRowIds: string[],
  weeksInYear: number
) {
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistorical, setIsHistorical] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'completed' | 'time-machine' | 'accounting'>('active');

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'inspection' | 'none'>('none');

  const YTD_BASELINE = 165360;

  const filteredAppraisals = useMemo(() => {
    return appraisals
      .filter(app => {
        if (colorFilter !== 'all' && app.color_category !== colorFilter) {
          return false;
        }
        if (viewMode === 'completed' && cityFilter) {
          if (!app.city || !app.city.toLowerCase().includes(cityFilter.toLowerCase())) {
            return false;
          }
        }
        const q = searchQuery.toLowerCase();
        return (
          app.address.toLowerCase().includes(q) ||
          (app.city || '').toLowerCase().includes(q) ||
          app.type.toLowerCase().includes(q) ||
          (app.client || '').toLowerCase().includes(q) ||
          (app.stats || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'due_date') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        }
        if (sortBy === 'inspection') {
          if (!a.inspection_date) return 1;
          if (!b.inspection_date) return -1;
          
          const dateCompare = a.inspection_date.localeCompare(b.inspection_date);
          if (dateCompare !== 0) return dateCompare;
          
          const timeA = convertTo24Hour(a.inspection_time);
          const timeB = convertTo24Hour(b.inspection_time);
          return timeA.localeCompare(timeB);
        }
        return 0;
      });
  }, [appraisals, colorFilter, cityFilter, searchQuery, sortBy, viewMode]);

  const activeCount = filteredAppraisals.length;
  const activeFeeSum = filteredAppraisals.reduce((sum, item) => sum + item.fee, 0);
  const ytdFeeSum = YTD_BASELINE + activeFeeSum;
  const projectedFeeSum = activeFeeSum * weeksInYear;

  const fetchAppraisals = useCallback(async (timestamp?: string, forceMode?: 'active' | 'completed' | 'time-machine') => {
    setIsLoading(true);
    const mode = forceMode || viewMode;
    try {
      let url = '/api/appraisals';
      if (timestamp) {
         url = `/api/appraisals?timestamp=${encodeURIComponent(timestamp)}`;
      } else if (mode === 'completed') {
         url = '/api/appraisals?status=COMPLETED,CANCELLED';
      } else if (mode === 'time-machine') {
         if (!timestamp) {
           setAppraisals([]);
           setIsLoading(false);
           return;
         }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.appraisals) {
        setAppraisals(data.appraisals);
      }
    } catch (err) {
      console.error('Failed to fetch appraisals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  const handlePaintRowsColor = useCallback(async (color: string) => {
    if (isHistorical || selectedRowIds.length === 0) return;
    
    const beforeAppraisals: Appraisal[] = [];
    const afterAppraisals: Appraisal[] = [];
    
    for (const id of selectedRowIds) {
      const target = appraisals.find(a => a.id === id);
      if (target) {
        let updatedStats = target.stats || '';
        if (color === 'blue') {
          updatedStats = 'Unscheduled';
        } else if (color === 'black') {
          updatedStats = removeUnscheduled(updatedStats);
        }
        
        if (target.color_category !== color || target.stats !== updatedStats) {
          beforeAppraisals.push({ ...target });
          afterAppraisals.push({ ...target, color_category: color, stats: updatedStats });
        }
      }
    }
    
    if (afterAppraisals.length === 0) return;
    
    try {
      await Promise.all(afterAppraisals.map(app => 
        fetch('/api/appraisals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app)
        })
      ));
      
      pushAction({
        type: 'UPDATE',
        appraisals: afterAppraisals,
        beforeAppraisals
      });
      
      setAppraisals(prev => prev.map(a => {
        const match = afterAppraisals.find(x => x.id === a.id);
        return match ? match : a;
      }));
    } catch (err) {
      console.error('Failed to paint selected rows:', err);
    }
  }, [isHistorical, selectedRowIds, appraisals, pushAction]);

  const handleDeleteAppraisal = useCallback(async (id: string) => {
    if (isHistorical) return;
    
    const appraisalToDelete = appraisals.find(a => a.id === id);
    if (!appraisalToDelete) return;
    
    try {
      const res = await fetch(`/api/appraisals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        pushAction({ type: 'DELETE', appraisals: [appraisalToDelete] });
        clearSelection();
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to delete appraisal:', err);
    }
  }, [isHistorical, appraisals, pushAction, clearSelection, fetchAppraisals]);

  const handleBulkDelete = useCallback(async () => {
    if (isHistorical || selectedRowIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedRowIds.length} selected appointments?`)) return;
    
    const toDelete = appraisals.filter(a => selectedRowIds.includes(a.id));
    
    try {
      await Promise.all(selectedRowIds.map(id => 
        fetch(`/api/appraisals?id=${id}`, { method: 'DELETE' })
      ));
      
      pushAction({ type: 'DELETE', appraisals: toDelete });
      clearSelection();
      fetchAppraisals();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  }, [isHistorical, selectedRowIds, appraisals, pushAction, clearSelection, fetchAppraisals]);

  const handleMarkInspected = useCallback(async (app: Appraisal) => {
    if (isHistorical) return;
    if ((app.stats || '').toLowerCase().includes('unscheduled')) return;
    
    let updatedStats = app.stats || '';
    if (!(updatedStats || '').toLowerCase().includes('inspected')) {
      updatedStats = updatedStats ? `${updatedStats} Inspected`.trim() : 'Inspected';
    }
    
    const beforeAppraisal = { ...app };
    const afterAppraisal = {
      ...app,
      inspection_date: '',
      inspection_time: '',
      stats: updatedStats
    };
    
    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(afterAppraisal),
      });
      if (res.ok) {
        pushAction({
          type: 'UPDATE',
          appraisals: [afterAppraisal],
          beforeAppraisals: [beforeAppraisal]
        });
        setAppraisals(prev => prev.map(a => a.id === app.id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to mark inspected:', err);
    }
  }, [isHistorical, pushAction]);

  const handleMarkCompleted = useCallback(async (app: Appraisal) => {
    if (isHistorical) return;
    
    const beforeAppraisal = { ...app };
    const afterAppraisal = {
      ...app,
      status: 'COMPLETED' as any
    };
    
    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(afterAppraisal),
      });
      if (res.ok) {
        pushAction({
          type: 'UPDATE',
          appraisals: [afterAppraisal],
          beforeAppraisals: [beforeAppraisal]
        });
        setAppraisals(prev => prev.map(a => a.id === app.id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to mark completed:', err);
    }
  }, [isHistorical, pushAction]);

  const handleMarkPaid = useCallback(async (app: Appraisal) => {
    if (isHistorical) return;
    
    const amountDue = app.amount_due ?? app.fee;
    const amountPaid = app.amount_paid ?? 0;
    const remaining = amountDue - amountPaid;
    if (remaining <= 0) return; 

    const todayStr = new Date().toISOString().split('T')[0];
    const newPayment = { amount: remaining, date: todayStr };
    
    let paymentsArr = [];
    if (app.payments) {
      try {
        paymentsArr = JSON.parse(app.payments);
      } catch (e) {}
    }
    paymentsArr.push(newPayment);

    const newAmountPaid = amountPaid + remaining;

    const beforeAppraisal = { ...app };
    const afterAppraisal = {
      ...app,
      amount_paid: newAmountPaid,
      paid_date: todayStr,
      payments: JSON.stringify(paymentsArr)
    };

    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(afterAppraisal),
      });
      if (res.ok) {
        pushAction({
          type: 'UPDATE',
          appraisals: [afterAppraisal],
          beforeAppraisals: [beforeAppraisal]
        });
        setAppraisals(prev => prev.map(a => a.id === app.id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  }, [isHistorical, pushAction]);

  const handleBulkMarkPaid = useCallback(async () => {
    if (isHistorical || selectedRowIds.length === 0) return;
    if (!confirm(`Are you sure you want to mark ${selectedRowIds.length} orders as paid?`)) return;

    const beforeAppraisals: Appraisal[] = [];
    const afterAppraisals: Appraisal[] = [];

    for (const id of selectedRowIds) {
      const app = appraisals.find(a => a.id === id);
      if (!app) continue;
      
      const amountDue = app.amount_due ?? app.fee;
      const amountPaid = app.amount_paid ?? 0;
      const remaining = amountDue - amountPaid;
      if (remaining <= 0) continue; 

      const todayStr = new Date().toISOString().split('T')[0];
      const newPayment = { amount: remaining, date: todayStr };
      
      let paymentsArr = [];
      if (app.payments) {
        try {
          paymentsArr = JSON.parse(app.payments);
        } catch (e) {}
      }
      paymentsArr.push(newPayment);

      const afterApp = {
        ...app,
        amount_paid: amountPaid + remaining,
        paid_date: todayStr,
        payments: JSON.stringify(paymentsArr)
      };

      beforeAppraisals.push({ ...app });
      afterAppraisals.push(afterApp);
    }

    if (afterAppraisals.length === 0) {
       clearSelection();
       return;
    }

    try {
      await Promise.all(afterAppraisals.map(app => 
        fetch('/api/appraisals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(app)
        })
      ));
      
      pushAction({
        type: 'UPDATE',
        appraisals: afterAppraisals,
        beforeAppraisals
      });
      
      setAppraisals(prev => prev.map(a => {
        const match = afterAppraisals.find(x => x.id === a.id);
        return match ? match : a;
      }));

      clearSelection();
    } catch (err) {
      console.error('Failed to bulk mark paid:', err);
    }
  }, [isHistorical, selectedRowIds, appraisals, pushAction, clearSelection]);

  return {
    appraisals, setAppraisals,
    isLoading, setIsLoading,
    isHistorical, setIsHistorical,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    cityFilter, setCityFilter,
    colorFilter, setColorFilter,
    sortBy, setSortBy,
    filteredAppraisals,
    activeCount,
    activeFeeSum,
    ytdFeeSum,
    projectedFeeSum,
    fetchAppraisals,
    handlePaintRowsColor,
    handleDeleteAppraisal,
    handleBulkDelete,
    handleMarkInspected,
    handleMarkCompleted,
    handleMarkPaid,
    handleBulkMarkPaid
  };
}
