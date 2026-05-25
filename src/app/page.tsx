/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Search, Sliders, Info, X } from 'lucide-react';
import dynamic from 'next/dynamic';

import { Appraisal } from '../types';
import { autoFormatAddress, removeUnscheduled, getSnapshotTimestamp } from '../lib/utils';

// Hooks
import { useSettings } from '../hooks/useSettings';
import { useSelection } from '../hooks/useSelection';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useAppraisals } from '../hooks/useAppraisals';

// Components
import { DashboardHeader } from '../components/DashboardHeader';
import AppraisalTable from '../components/AppraisalTable';
import { CalendarPicker } from '../components/CalendarPicker';
import { AddAppraisalModal } from '../components/modals/AddAppraisalModal';
import { EditAppraisalModal } from '../components/modals/EditAppraisalModal';
import { CloneAppraisalModal } from '../components/modals/CloneAppraisalModal';

// Dynamic Components
const MapOverlay = dynamic(() => import('../components/MapOverlay'), { ssr: false });
const AccountingDashboard = dynamic(() => import('../components/Accounting/AccountingDashboard'), { ssr: false });

export default function Dashboard() {
  // Settings Hook
  const {
    notes, setNotes, notesFontSize, handleFontSizeChange, weeksInYear, handleWeeksInYearChange,
    homeAddress, setFormHomeAddress, homeLat, homeLng, showFontControls, setShowFontControls,
    isOptionsOpen, setIsOptionsOpen, formHomeAddress, fetchSettings, handleNotesChange, checkSelection
  } = useSettings();

  // Core Appraisals Hook Setup
  const [appraisalsList, setAppraisalsList] = useState<Appraisal[]>([]); // To pass down if needed directly, but handled inside useAppraisals
  
  const [viewModeState, setViewModeState] = useState<'active' | 'completed' | 'time-machine' | 'accounting'>('active');
  const [isHistoricalState, setIsHistoricalState] = useState(false);
  const [travelDate, setTravelDate] = useState('');
  const [isTimeTravelOpen, setIsTimeTravelOpen] = useState(false);
  const [daySliderValue, setDaySliderValue] = useState(0);
  const [dailyMetrics, setDailyMetrics] = useState<any>(null);

  // Filter Appraisals (from hook or managed here if we must break loops)
  // Let's rely on the custom hooks.
  const fetchAppraisalsRef = useRef<any>(null);

  const {
    selectedRowIds, setSelectedRowIds, lastSelectedId, setLastSelectedId, clearSelection, handleRowClick
  } = useSelection(isHistoricalState, appraisalsList); // Note: we need appraisalsList for shift-click, we will feed it.



  const { undoStack, redoStack, pushAction, undo, redo } = useUndoRedo(isHistoricalState, (...args: any[]) => fetchAppraisalsRef.current?.(...args), clearSelection);

  const {
    appraisals, setAppraisals,
    isLoading: isLoadingState, setIsLoading: setIsLoadingState,
    isHistorical, setIsHistorical,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    cityFilter, setCityFilter,
    colorFilter, setColorFilter,
    sortBy, setSortBy,
    filteredAppraisals,
    activeCount, activeFeeSum, ytdFeeSum, projectedFeeSum,
    fetchAppraisals, handlePaintRowsColor, handleDeleteAppraisal, handleBulkDelete,
    handleMarkInspected, handleMarkCompleted, handleMarkPaid, handleBulkMarkPaid
  } = useAppraisals(pushAction, clearSelection, selectedRowIds, weeksInYear);

  // Sync state between hooks and page wrapper
  useEffect(() => {
    setViewMode(viewModeState);
  }, [viewModeState, setViewMode]);

  useEffect(() => {
    fetchAppraisalsRef.current = fetchAppraisals;
  }, [fetchAppraisals]);

  useEffect(() => {
    setIsHistorical(isHistoricalState);
  }, [isHistoricalState]);

  useEffect(() => {
    setAppraisalsList(filteredAppraisals);
  }, [filteredAppraisals]);

  // Modals & Temp States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [targetAppraisal, setTargetAppraisal] = useState<Appraisal | null>(null);

  // Inline Editing cell state
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Appraisal } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const touchTimeoutRef = useRef<any>(null);
  const touchActiveRef = useRef(false);

  // Handlers for Modals
  const openEditModal = (appraisal: Appraisal) => {
    setTargetAppraisal(appraisal);
    setIsEditModalOpen(true);
  };

  const openCloneModal = (appraisal: Appraisal) => {
    setTargetAppraisal(appraisal);
    setIsCloneModalOpen(true);
  };

  const handleAddAppraisal = async (payload: any) => {
    try {
      const res = await fetch('/api/appraisals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created: Appraisal = await res.json();
        pushAction({ type: 'ADD', appraisals: [created] });
        setIsAddModalOpen(false);
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to create appraisal:', err);
    }
  };

  const handleEditAppraisal = async (payload: any, beforeAppraisal: Appraisal) => {
    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated: Appraisal = await res.json();
        pushAction({ type: 'UPDATE', appraisals: [updated], beforeAppraisals: [beforeAppraisal] });
        setIsEditModalOpen(false);
        setTargetAppraisal(null);
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to update appraisal:', err);
    }
  };

  const handleCloneAppraisalSubmit = async (id: string, newAddress: string, newDueDate: string) => {
    try {
      const res = await fetch('/api/appraisals/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newAddress, newDueDate }),
      });

      if (res.ok) {
        const created: Appraisal = await res.json();
        pushAction({ type: 'ADD', appraisals: [created] });
        setIsCloneModalOpen(false);
        setTargetAppraisal(null);
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to clone appraisal:', err);
    }
  };

  const handleInlineSave = async (id: string, field: keyof Appraisal) => {
    if (isHistorical) return;
    const beforeAppraisal = appraisals.find(a => a.id === id);
    if (!beforeAppraisal) return;

    let updatedValue = field === 'fee' ? Number(inlineValue) || 0 : inlineValue;
    if (field === 'address') {
      updatedValue = autoFormatAddress(inlineValue as string);
    }
    
    const afterAppraisal = {
      ...beforeAppraisal,
      [field]: updatedValue
    } as Appraisal;

    const isHybrid = afterAppraisal.type.toLowerCase().includes('hybrid');
    const hasDateTime = afterAppraisal.inspection_date && afterAppraisal.inspection_time;

    let finalColor = afterAppraisal.color_category;
    if (isHybrid) {
      finalColor = 'brown';
    } else if (hasDateTime) {
      finalColor = 'black';
    } else {
      if (beforeAppraisal.color_category === 'blue' || beforeAppraisal.color_category === 'black' || beforeAppraisal.color_category === 'brown') {
        finalColor = 'blue';
      }
    }

    let finalStats = afterAppraisal.stats;
    if (finalColor === 'blue') {
      finalStats = 'Unscheduled';
    } else if (finalColor === 'black') {
      finalStats = removeUnscheduled(finalStats);
    }

    afterAppraisal.color_category = finalColor;
    afterAppraisal.stats = finalStats;

    if (
      beforeAppraisal[field] === updatedValue && 
      beforeAppraisal.color_category === afterAppraisal.color_category && 
      beforeAppraisal.stats === afterAppraisal.stats
    ) {
      setEditingCell(null);
      return;
    }

    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(afterAppraisal),
      });

      if (res.ok) {
        pushAction({ type: 'UPDATE', appraisals: [afterAppraisal], beforeAppraisals: [beforeAppraisal] });
        setAppraisals(prev => prev.map(a => a.id === id ? afterAppraisal : a));
      }
    } catch (err) {
      console.error('Failed to update cell inline:', err);
    } finally {
      setEditingCell(null);
    }
  };

  // Calendar Time Travel Handlers
  const handleSelectTravelDate = async (date: string) => {
    if (!date) return;
    setTravelDate(date);
    setIsTimeTravelOpen(false);

    if (viewMode === 'time-machine') {
      const targetTimestamp = getSnapshotTimestamp(date, 3);
      fetchAppraisals(targetTimestamp, 'time-machine');
      fetchMetrics(date);
    } else {
      setIsHistoricalState(true);
      setDaySliderValue(1);
      const targetTimestamp = getSnapshotTimestamp(date, 1);
      fetchAppraisals(targetTimestamp);
    }
  };

  const fetchMetrics = async (date: string) => {
    try {
      const res = await fetch(`/api/appraisals/metrics?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setDailyMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    }
  };

  const handleDaySliderChange = (val: number) => {
    setDaySliderValue(val);
    if (!travelDate) return;

    const targetTimestamp = getSnapshotTimestamp(travelDate, val);
    fetchAppraisals(targetTimestamp);
  };

  const handleExitTimeTravel = () => {
    setIsHistoricalState(false);
    setTravelDate('');
    setDaySliderValue(0);
    setIsTimeTravelOpen(false);
    fetchAppraisals();
  };

  // Touch event handlers for mobile
  const handleTouchStart = (address: string) => {
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    touchActiveRef.current = true;
    touchTimeoutRef.current = setTimeout(() => {
      if (touchActiveRef.current) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(address)}`, '_blank');
      }
      touchTimeoutRef.current = null;
    }, 800);
  };

  const handleTouchEnd = () => {
    touchActiveRef.current = false;
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  const handleTouchMove = () => {
    touchActiveRef.current = false;
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  // Effects
  useEffect(() => {
    if (!isHistorical) {
      fetchAppraisals();
    }
    fetchSettings();
  }, [viewModeState, fetchAppraisals, isHistorical, fetchSettings]);

  useEffect(() => {
    if (editingCell && inlineInputRef.current) {
      inlineInputRef.current.focus();
      if (
        editingCell.field === 'inspection_date' ||
        editingCell.field === 'due_date' ||
        editingCell.field === 'inspection_time'
      ) {
        try {
          (inlineInputRef.current as any).showPicker();
        } catch (err) {
          console.warn('showPicker not supported', err);
        }
      } else {
        inlineInputRef.current.select();
      }
    }
  }, [editingCell]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      
      if (isInputActive && activeEl.id !== 'notesTextarea') return;
      
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isHistorical) return;
        const allIds = filteredAppraisals.map(a => a.id);
        setSelectedRowIds(allIds);
        if (allIds.length > 0) setLastSelectedId(allIds[0]);
      }
      
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isHistorical) return;
        clearSelection();
      }

      if (e.key === 'Escape') clearSelection();

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey && e.key.toLowerCase() === 'y') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, isHistorical, appraisals, searchQuery, colorFilter, sortBy]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      clearSelection();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, [clearSelection]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.modal-overlay') || target.closest('.modal-content')) return;
      if (target.closest('.selection-bar-active') || target.closest('.color-option-btn')) return;
      if (target.closest('.appraisal-table')) return;
      if (target.closest('#btnTimeTravel') || target.closest('.custom-calendar-popover')) return;
      clearSelection();
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [clearSelection]);

  useEffect(() => {
    const handleArrowNavigation = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA'
      );
      if (isInputActive) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredAppraisals.length === 0) return;

        let currentIndex = -1;
        if (selectedRowIds.length > 0) {
          const lastId = selectedRowIds[selectedRowIds.length - 1];
          currentIndex = filteredAppraisals.findIndex(a => a.id === lastId);
        }

        let nextIndex = 0;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex + 1;
          if (nextIndex >= filteredAppraisals.length) nextIndex = 0;
        } else {
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = filteredAppraisals.length - 1;
        }

        const nextAppraisal = filteredAppraisals[nextIndex];
        if (nextAppraisal) {
          setSelectedRowIds([nextAppraisal.id]);
          setLastSelectedId(nextAppraisal.id);
        }
      }

      if (e.key === 'Enter') {
        if (selectedRowIds.length === 1) {
          e.preventDefault();
          const selectedApp = filteredAppraisals.find(a => a.id === selectedRowIds[0]);
          if (selectedApp) openEditModal(selectedApp);
        }
      }
    };

    window.addEventListener('keydown', handleArrowNavigation);
    return () => window.removeEventListener('keydown', handleArrowNavigation);
  }, [filteredAppraisals, selectedRowIds]);

  const saveHomeAddress = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home_address: formHomeAddress })
      });
      fetchSettings();
      setIsOptionsOpen(false);
    } catch (err) {
      console.error('Failed to save home address:', err);
    }
  };

  return (
    <>
      <DashboardHeader 
        homeAddress={homeAddress}
        setFormHomeAddress={setFormHomeAddress}
        setIsOptionsOpen={setIsOptionsOpen}
        viewMode={viewModeState}
        setViewMode={setViewModeState}
        setTravelDate={setTravelDate}
        setDailyMetrics={setDailyMetrics}
        isHistorical={isHistoricalState}
        handleExitTimeTravel={handleExitTimeTravel}
        isTimeTravelOpen={isTimeTravelOpen}
        setIsTimeTravelOpen={setIsTimeTravelOpen}
        travelDate={travelDate}
        handleSelectTravelDate={handleSelectTravelDate}
        filteredAppraisals={filteredAppraisals}
        setIsMapModalOpen={setIsMapModalOpen}
        setIsAddModalOpen={setIsAddModalOpen}
      />

      <main className="dashboard-container" style={{ marginTop: '1rem' }}>
        
        {viewModeState === 'accounting' ? (
          <AccountingDashboard />
        ) : (
          <>
            {isHistoricalState && travelDate && (
              <div className="historical-banner" style={{ flexDirection: 'column', gap: '0.85rem', alignItems: 'stretch', padding: '0.85rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info className="w-4 h-4 text-warning" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Time Travel Active:</strong> Viewing ledger state for <strong>{travelDate}</strong>. Editing features are locked.
                    </span>
                  </div>
                  <button onClick={handleExitTimeTravel} className="reset-time-btn">
                    Exit Time Travel
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '0.85rem' }}>
                  <div className="timeline-slider-container" style={{ flexGrow: 1 }}>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      value={daySliderValue}
                      onChange={(e) => handleDaySliderChange(Number(e.target.value))}
                      className="timeline-slider"
                      id="dayRangeSlider"
                    />
                    <div className="timeline-labels" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>8:00 AM</span>
                      <span>12:00 PM (Noon)</span>
                      <span>8:00 PM</span>
                    </div>
                  </div>
                  <div className="date-indicator" style={{ minWidth: '220px', fontSize: '0.82rem' }}>
                    <span>Snapshot: {daySliderValue === 0 ? '8:00 AM' : daySliderValue === 1 ? '12:00 PM (Noon)' : '8:00 PM'}</span>
                  </div>
                </div>
              </div>
            )}

            {viewModeState === 'time-machine' && (
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
                  <div style={{ minWidth: '280px' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Select Historical Date</h3>
                    <CalendarPicker 
                      selectedDate={travelDate} 
                      onSelectDate={handleSelectTravelDate} 
                    />
                  </div>
                  {travelDate && dailyMetrics && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flexGrow: 1 }}>
                      <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Created ({dailyMetrics.created.length})</h4>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.85rem' }}>
                          {dailyMetrics.created.map((e: any) => <li key={e.event_id} style={{ marginBottom: '0.2rem' }}>{e.address}</li>)}
                        </ul>
                      </div>
                      <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Inspected ({dailyMetrics.inspected.length})</h4>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.85rem' }}>
                          {dailyMetrics.inspected.map((e: any) => <li key={e.event_id} style={{ marginBottom: '0.2rem' }}>{e.address}</li>)}
                        </ul>
                      </div>
                      <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Completed ({dailyMetrics.completed.length})</h4>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.85rem' }}>
                          {dailyMetrics.completed.map((e: any) => <li key={e.event_id} style={{ marginBottom: '0.2rem' }}>{e.address}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                {travelDate && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Showing end-of-day snapshot grid for <strong>{travelDate}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <section className="toolbar">
              {selectedRowIds.length > 0 && !isHistoricalState ? (
                <div className="category-filter-row selection-bar-active" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', padding: '0.25rem 0.5rem', borderRadius: '8px', animation: 'fade-in 0.15s ease', width: '100%', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="floating-selection-count" style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      {selectedRowIds.length} Selected
                    </span>
                    <div style={{ height: '14px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.15rem' }}>
                        Paint Category:
                      </span>
                      {['black', 'blue', 'purple', 'brown', 'gold'].map((color) => (
                        <button
                          key={color}
                          onClick={() => handlePaintRowsColor(color)}
                          className="color-option-btn"
                          style={{
                            height: '24px',
                            padding: '0 0.5rem',
                            fontSize: '0.7rem',
                            textTransform: 'capitalize',
                            backgroundColor: `var(--cat-${color}-bg)`,
                            color: `var(--cat-${color}-border)`,
                            borderColor: `var(--cat-${color}-border)`,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            cursor: 'pointer',
                            borderRadius: '4px'
                          }}
                          title={`Paint selected rows ${color}`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={handleBulkDelete}
                      className="btn btn-outline"
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        color: 'var(--danger)',
                        borderColor: 'rgba(239,68,68,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        height: '24px'
                      }}
                      title="Bulk Delete Selection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                    {viewModeState === 'completed' && (
                      <button
                        onClick={handleBulkMarkPaid}
                        className="btn btn-outline"
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          color: '#10b981',
                          borderColor: 'rgba(16, 185, 129, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          height: '24px'
                        }}
                        title="Bulk Mark Paid"
                      >
                        💲 Mark Paid
                      </button>
                    )}

                    <button
                      onClick={clearSelection}
                      className="btn btn-outline"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', height: '24px' }}
                      title="Deselect All (Ctrl+D)"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="search-input-wrapper">
                    <Search className="search-icon w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                      id="toolbarSearchInput"
                    />
                  </div>

                  {viewModeState === 'completed' && (
                    <div className="search-input-wrapper">
                      <Search className="search-icon w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Filter by City..."
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  )}

                  <div className="category-filter-row">
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Filter by Color:
                    </span>
                    <button
                      onClick={() => setColorFilter('all')}
                      className={`btn btn-secondary ${colorFilter === 'all' ? 'active' : ''}`}
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', border: colorFilter === 'all' ? '1px solid var(--text-primary)' : '1px solid var(--border-color)' }}
                    >
                      All
                    </button>
                    {['black', 'blue', 'purple', 'brown', 'gold'].map(color => (
                      <button
                        key={color}
                        onClick={() => setColorFilter(color)}
                        className={`btn btn-secondary`}
                        style={{
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize',
                          backgroundColor: colorFilter === color ? `var(--cat-${color}-border)` : `var(--cat-${color}-bg)`,
                          color: colorFilter === color ? '#000' : `var(--cat-${color}-border)`,
                          borderColor: colorFilter === color ? 'var(--text-primary)' : `var(--border-color)`,
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="table-container">
              <AppraisalTable 
                isLoading={isLoadingState}
                filteredAppraisals={filteredAppraisals}
                selectedRowIds={selectedRowIds}
                sortBy={sortBy}
                setSortBy={setSortBy}
                isHistorical={isHistoricalState}
                handleRowClick={handleRowClick}
                handleTouchStart={handleTouchStart}
                handleTouchEnd={handleTouchEnd}
                handleTouchMove={handleTouchMove}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                inlineValue={inlineValue}
                setInlineValue={setInlineValue}
                inlineInputRef={inlineInputRef}
                handleInlineSave={handleInlineSave}
                handleMarkInspected={handleMarkInspected}
                handleMarkCompleted={handleMarkCompleted}
                openCloneModal={openCloneModal}
                openEditModal={openEditModal}
                viewMode={viewModeState}
                handleMarkPaid={handleMarkPaid}
              />
            </section>

            <section className="middle-section">
              <div className="notes-card-clean">
                <textarea
                  className="notes-textarea-plain"
                  placeholder="Write reminders here (e.g. Update Websites, PICS OF EVERYTHING FOR BPL Mortgage, LLC)..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onSelect={checkSelection as any}
                  onMouseUp={checkSelection as any}
                  onKeyUp={checkSelection as any}
                  onBlur={() => {
                    setTimeout(() => setShowFontControls(false), 200);
                  }}
                  style={{ fontSize: `${notesFontSize}px` }}
                  disabled={isHistoricalState}
                  id="notesTextarea"
                />
                
                {showFontControls && (
                  <div className="selection-font-panel">
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginRight: '0.2rem', fontWeight: 700 }}>SIZE:</span>
                    <button 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleFontSizeChange(false);
                      }} 
                      className="size-btn"
                      title="Decrease font size"
                    >
                      A-
                    </button>
                    <span style={{ fontSize: '0.7rem', padding: '0 0.15rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{notesFontSize}</span>
                    <button 
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleFontSizeChange(true);
                      }} 
                      className="size-btn"
                      title="Increase font size"
                    >
                      A+
                    </button>
                  </div>
                )}
              </div>

              <div className="stats-sidebar-card">
                <div className="stats-sidebar-header">Appraisal Statistics</div>
                <div className="stats-subrow">
                  <div className="stats-item-box">
                    <span className="stats-item-label">Appraisals Count</span>
                    <span className="stats-item-val" id="kpiCountSidebar">{activeCount}</span>
                  </div>
                  
                  <div className="stats-item-box fee">
                    <span className="stats-item-label">Active Fee Volume</span>
                    <span className="stats-item-val" id="kpiActiveFeesSidebar">
                      ${activeFeeSum.toLocaleString('en-US')}
                    </span>
                  </div>
                  
                  <div className="stats-item-box ytd">
                    <div className="ytd-content">
                      <span className="stats-item-label">Yearly estimate</span>
                      <div className="ytd-projection-details">
                        <span className="stats-item-val" id="kpiYtdProjectedSidebar">
                          ${projectedFeeSum.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="ytd-hover-overlay" onClick={(e) => e.stopPropagation()}>
                      <span className="ytd-weeks-control-label">Weeks of Work:</span>
                      <div className="ytd-weeks-control-actions">
                        <button 
                          type="button" 
                          className="ytd-weeks-btn"
                          onClick={() => handleWeeksInYearChange(weeksInYear - 1)}
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          className="ytd-weeks-input"
                          value={weeksInYear} 
                          onChange={(e) => handleWeeksInYearChange(Number(e.target.value))}
                          min={1} 
                          max={100} 
                        />
                        <button 
                          type="button" 
                          className="ytd-weeks-btn"
                          onClick={() => handleWeeksInYearChange(weeksInYear + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modals */}
      <AddAppraisalModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddAppraisal} 
      />

      <EditAppraisalModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        onEdit={handleEditAppraisal} 
        targetAppraisal={targetAppraisal} 
      />

      <CloneAppraisalModal 
        isOpen={isCloneModalOpen} 
        onClose={() => setIsCloneModalOpen(false)} 
        onClone={handleCloneAppraisalSubmit} 
        targetAppraisal={targetAppraisal} 
      />

      <MapOverlay 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        appraisals={filteredAppraisals}
        homeAddress={homeAddress}
        homeLat={homeLat}
        homeLng={homeLng}
      />

      {isOptionsOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button onClick={() => setIsOptionsOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Home Base Address</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Used as the starting and ending point for the Map Route optimization.
                </div>
                <input
                  type="text"
                  value={formHomeAddress}
                  onChange={(e) => setFormHomeAddress(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 1724 Locust Pl Schaumburg, IL"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsOptionsOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={saveHomeAddress} className="btn btn-primary">
                  Save Options
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
