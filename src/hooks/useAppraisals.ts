import { useState, useCallback, useMemo, useDeferredValue, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Appraisal, HistoryAction } from '../types';
import { removeUnscheduled, convertTo24Hour } from '../lib/utils';

export function useAppraisals(
  pushAction: (action: HistoryAction) => void,
  isHistorical: boolean,
  weeksInYear: number
) {
  const queryClient = useQueryClient();
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'completed' | 'time-machine' | 'accounting'>('active');

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [cityFilter, setCityFilter] = useState('');
  const deferredCityFilter = useDeferredValue(cityFilter);

  const [colorFilter, setColorFilter] = useState<string>('all');
  const deferredColorFilter = useDeferredValue(colorFilter);

  const [sortBy, setSortBy] = useState<'due_date' | 'inspection' | 'none'>('none');
  const deferredSortBy = useDeferredValue(sortBy);

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedRowIds([]);
    setLastSelectedId(null);
  }, []);

  const YTD_BASELINE = 165360;

  // React Query for fetching based on viewMode
  const { data: queryData, isLoading: isQueryLoading } = useQuery({
    queryKey: ['appraisals', viewMode],
    queryFn: async () => {
      let url = '/api/appraisals';
      if (viewMode === 'completed') {
         url = '/api/appraisals?status=COMPLETED,CANCELLED';
      }
      const res = await fetch(url);
      const data = await res.json();
      return data.appraisals || [];
    },
    enabled: !isHistorical && (viewMode === 'active' || viewMode === 'completed'),
    staleTime: 5 * 60 * 1000,
  });

  // Sync query data to local state for optimistic updates
  // Note: This triggers a re-render when queryData changes, but it shouldn't cause a cascade
  // if page.tsx stops using a duplicate viewModeState.
  useEffect(() => {
    if (queryData && !isHistorical) {
      setAppraisals(queryData);
    }
  }, [queryData, isHistorical, viewMode]);

  const filteredAppraisals = useMemo(() => {
    const result = appraisals
      .filter(app => {
        if (deferredColorFilter !== 'all' && app.color_category !== deferredColorFilter) {
          return false;
        }
        if (viewMode === 'completed' && deferredCityFilter) {
          if (!app.city || !app.city.toLowerCase().includes(deferredCityFilter.toLowerCase())) {
            return false;
          }
        }
        const q = deferredSearchQuery.toLowerCase();
        if (!q) return true;
        return (
          app.address.toLowerCase().includes(q) ||
          (app.city || '').toLowerCase().includes(q) ||
          app.type.toLowerCase().includes(q) ||
          (app.client || '').toLowerCase().includes(q) ||
          (app.lender || '').toLowerCase().includes(q) ||
          (app.stats || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (deferredSortBy === 'due_date') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0;
        }
        if (deferredSortBy === 'inspection') {
          if (!a.inspection_date) return 1;
          if (!b.inspection_date) return -1;
          
          if (a.inspection_date < b.inspection_date) return -1;
          if (a.inspection_date > b.inspection_date) return 1;
          
          const timeA = convertTo24Hour(a.inspection_time);
          const timeB = convertTo24Hour(b.inspection_time);
          return timeA < timeB ? -1 : timeA > timeB ? 1 : 0;
        }
        return 0;
      });
      
    return result;
  }, [appraisals, deferredColorFilter, deferredCityFilter, deferredSearchQuery, deferredSortBy, viewMode]);

  const activeCount = filteredAppraisals.length;
  const activeFeeSum = filteredAppraisals.reduce((sum, item) => sum + item.fee, 0);
  const ytdFeeSum = YTD_BASELINE + activeFeeSum;
  const projectedFeeSum = activeFeeSum * weeksInYear;

  const handleRowClick = useCallback((id: string, e: React.MouseEvent) => {
    if (isHistorical) return;

    const currentFilteredIds = filteredAppraisals.map(a => a.id);
    
    if (e.shiftKey) {
      if (lastSelectedId && currentFilteredIds.includes(lastSelectedId)) {
        const anchorIdx = currentFilteredIds.indexOf(lastSelectedId);
        const clickedIdx = currentFilteredIds.indexOf(id);
        
        if (anchorIdx !== -1 && clickedIdx !== -1) {
          const start = Math.min(anchorIdx, clickedIdx);
          const end = Math.max(anchorIdx, clickedIdx);
          const rangeIds = currentFilteredIds.slice(start, end + 1);
          
          if (e.ctrlKey || e.metaKey) {
            setSelectedRowIds(prev => {
              const unique = new Set([...prev, ...rangeIds]);
              return Array.from(unique);
            });
          } else {
            setSelectedRowIds(rangeIds);
          }
        }
      } else {
        if (e.ctrlKey || e.metaKey) {
          setSelectedRowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        } else {
          setSelectedRowIds([id]);
        }
        setLastSelectedId(id);
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRowIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(x => x !== id);
        } else {
          return [...prev, id];
        }
      });
      setLastSelectedId(id);
    } else {
      if (selectedRowIds.includes(id)) {
        setSelectedRowIds(prev => prev.filter(x => x !== id));
        if (lastSelectedId === id) {
          setLastSelectedId(null);
        }
      } else {
        setSelectedRowIds([id]);
        setLastSelectedId(id);
      }
    }
  }, [isHistorical, filteredAppraisals, lastSelectedId]);

  // We only manually fetch for time-machine or forced re-fetches
  const fetchAppraisals = useCallback(async (timestamp?: string, forceMode?: 'active' | 'completed' | 'time-machine') => {
    const mode = forceMode || viewMode;
    if (timestamp || mode === 'time-machine') {
      let url = '/api/appraisals';
      if (timestamp) {
         url = `/api/appraisals?timestamp=${encodeURIComponent(timestamp)}`;
      } else {
         setAppraisals([]);
         return;
      }
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.appraisals) setAppraisals(data.appraisals);
      } catch (err) {
        console.error('Failed to fetch historical appraisals:', err);
      }
    } else {
      // Force invalidate query for active/completed
      queryClient.invalidateQueries({ queryKey: ['appraisals', mode] });
    }
  }, [viewMode, queryClient]);

  // Helper to update both local state and react-query cache
  const updateAppraisalsState = useCallback((newAppraisals: Appraisal[] | ((prev: Appraisal[]) => Appraisal[])) => {
    setAppraisals(prev => {
      const updated = typeof newAppraisals === 'function' ? newAppraisals(prev) : newAppraisals;
      // Sync back to query cache so background refetches don't wipe it out
      if (!isHistorical && (viewMode === 'active' || viewMode === 'completed')) {
        queryClient.setQueryData(['appraisals', viewMode], updated);
      }
      return updated;
    });
  }, [isHistorical, viewMode, queryClient]);

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
      
      updateAppraisalsState(prev => prev.map(a => {
        const match = afterAppraisals.find(x => x.id === a.id);
        return match ? match : a;
      }));
    } catch (err) {
      console.error('Failed to paint selected rows:', err);
    }
  }, [isHistorical, selectedRowIds, appraisals, pushAction, updateAppraisalsState]);

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
        updateAppraisalsState(prev => prev.map(a => a.id === app.id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to mark inspected:', err);
    }
  }, [isHistorical, pushAction, updateAppraisalsState]);

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
        updateAppraisalsState(prev => prev.map(a => a.id === app.id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to mark completed:', err);
    }
  }, [isHistorical, pushAction, updateAppraisalsState]);

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
        updateAppraisalsState(prev => prev.map(a => a.id === app.id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to mark paid:', err);
    }
  }, [isHistorical, pushAction, updateAppraisalsState]);

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
      
      updateAppraisalsState(prev => prev.map(a => {
        const match = afterAppraisals.find(x => x.id === a.id);
        return match ? match : a;
      }));

      clearSelection();
    } catch (err) {
      console.error('Failed to bulk mark paid:', err);
    }
  }, [isHistorical, selectedRowIds, appraisals, pushAction, clearSelection, updateAppraisalsState]);

  return {
    appraisals,
    setAppraisals: updateAppraisalsState,
    isLoading: isQueryLoading,
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
    handleBulkMarkPaid,
    selectedRowIds,
    setSelectedRowIds,
    lastSelectedId,
    setLastSelectedId,
    clearSelection,
    handleRowClick
  };
}
