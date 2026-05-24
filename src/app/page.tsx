/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Search, 
  Calendar, 
  Sliders, 
  Clock, 
  Smartphone, 
  Edit3, 
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  CheckCircle,
  Map
} from 'lucide-react';

interface Appraisal {
  id: string;
  address: string;
  type: string;
  inspection_date: string;
  inspection_time: string;
  due_date: string;
  stats: string;
  client: string;
  fee: number;
  color_category: string;
  status?: string;
  lat?: number;
  lng?: number;
}

interface HistoryAction {
  type: 'ADD' | 'DELETE' | 'UPDATE';
  appraisals: Appraisal[];
  beforeAppraisals?: Appraisal[];
}

import { autoFormatAddress, splitDateLabel, convertTo24Hour, convertTo12Hour, removeUnscheduled, getSnapshotTimestamp, splitAddress, getDueDateBadge } from '../lib/utils';
import { CalendarPicker } from '../components/CalendarPicker';
import dynamic from 'next/dynamic';

const MapOverlay = dynamic(() => import('../components/MapOverlay'), { ssr: false });

export default function Dashboard() {
  // Core Data State
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistorical, setIsHistorical] = useState(false);

  
  // Selection State (Multi-select)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // Undo/Redo Stacks (Capped at 50)
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // Settings & Network info
  const [notes, setNotes] = useState('');
  const [notesFontSize, setNotesFontSize] = useState(16);
  const [weeksInYear, setWeeksInYear] = useState<number>(52);
  const [showFontControls, setShowFontControls] = useState(false);
  
  // UI Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'inspection' | 'none'>('none');
  
  // Time Travel states
  const [travelDate, setTravelDate] = useState('');
  const [daySliderValue, setDaySliderValue] = useState(0);
  const [isTimeTravelOpen, setIsTimeTravelOpen] = useState(false);
  const [dailyMetrics, setDailyMetrics] = useState<any>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<'active' | 'completed' | 'time-machine'>('active');



  // Modals & Temp States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [targetAppraisal, setTargetAppraisal] = useState<Appraisal | null>(null);
  
  // Add/Edit Form States
  const [formAddress, setFormAddress] = useState('');
  const [formType, setFormType] = useState('');
  const [formInspectionDate, setFormInspectionDate] = useState('');
  const [formInspectionTime, setFormInspectionTime] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStats, setFormStats] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formColorCategory, setFormColorCategory] = useState('black');
  
  const [cloneAddress, setCloneAddress] = useState('');
  const [cloneDueDate, setCloneDueDate] = useState('');

  // Inline Editing cell state (for spreadsheet double-click edits)
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Appraisal } | null>(null);
  const [inlineValue, setInlineValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const touchTimeoutRef = useRef<any>(null);
  const touchActiveRef = useRef(false);

  // Baseline YTD fee sum (pre-loaded spreadsheet history from screenshot)
  const YTD_BASELINE = 165360; 

  // Derived calculations (defined above functions that use them)
  const filteredAppraisals = appraisals
    .filter(app => {
      if (colorFilter !== 'all' && app.color_category !== colorFilter) {
        return false;
      }
      const q = searchQuery.toLowerCase();
      return (
        app.address.toLowerCase().includes(q) ||
        app.type.toLowerCase().includes(q) ||
        app.client.toLowerCase().includes(q) ||
        app.stats.toLowerCase().includes(q)
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

  // Calculate Metrics
  const activeCount = filteredAppraisals.length;
  const activeFeeSum = filteredAppraisals.reduce((sum, item) => sum + item.fee, 0);
  const ytdFeeSum = YTD_BASELINE + activeFeeSum;

  const projectedFeeSum = activeFeeSum * weeksInYear;

  // Core functions and handlers (defined above useEffect hooks)
  const fetchAppraisals = async (timestamp?: string, forceMode?: 'active' | 'completed' | 'time-machine') => {
    setIsLoading(true);
    const mode = forceMode || viewMode;
    try {
      let url = '/api/appraisals';
      if (timestamp) {
         url = `/api/appraisals?timestamp=${encodeURIComponent(timestamp)}`;
      } else if (mode === 'completed') {
         url = '/api/appraisals?status=COMPLETED,CANCELLED';
      } else if (mode === 'time-machine') {
         // Prevent fetching all if no timestamp provided in time-machine mode
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
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) {
        setNotes(data.notes || '');
        setNotesFontSize(data.notes_font_size || 16);
        setWeeksInYear(data.weeks_in_year || 52);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const handleNotesChange = async (val: string) => {
    setNotes(val);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: val })
      });
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const handleFontSizeChange = async (increment: boolean) => {
    let newSize = notesFontSize + (increment ? 2 : -2);
    newSize = Math.max(10, Math.min(32, newSize));
    setNotesFontSize(newSize);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_font_size: newSize })
      });
    } catch (err) {
      console.error('Failed to save font size:', err);
    }
  };

  const handleWeeksInYearChange = async (val: number) => {
    if (isNaN(val)) return;
    const cleaned = Math.max(1, Math.min(100, val));
    setWeeksInYear(cleaned);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks_in_year: cleaned })
      });
    } catch (err) {
      console.error('Failed to save weeks in year:', err);
    }
  };

  const checkSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) {
      setShowFontControls(true);
    } else {
      setShowFontControls(false);
    }
  };

  const pushAction = (action: HistoryAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > 50) {
        newStack.shift();
      }
      return newStack;
    });
    setRedoStack([]);
  };

  const undo = async () => {
    if (isHistorical || undoStack.length === 0) return;
    
    const action = undoStack[undoStack.length - 1];
    
    try {
      if (action.type === 'ADD') {
        for (const app of action.appraisals) {
          await fetch(`/api/appraisals?id=${app.id}`, { method: 'DELETE' });
        }
      } else if (action.type === 'DELETE') {
        for (const app of action.appraisals) {
          await fetch('/api/appraisals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(app),
          });
        }
      } else if (action.type === 'UPDATE' && action.beforeAppraisals) {
        for (const app of action.beforeAppraisals) {
          await fetch('/api/appraisals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(app),
          });
        }
      }
      
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => {
        const newStack = [...prev, action];
        if (newStack.length > 50) newStack.shift();
        return newStack;
      });
      
      fetchAppraisals();
      setSelectedRowIds([]);
      setLastSelectedId(null);
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  const redo = async () => {
    if (isHistorical || redoStack.length === 0) return;
    
    const action = redoStack[redoStack.length - 1];
    
    try {
      if (action.type === 'ADD') {
        for (const app of action.appraisals) {
          await fetch('/api/appraisals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(app),
          });
        }
      } else if (action.type === 'DELETE') {
        for (const app of action.appraisals) {
          await fetch(`/api/appraisals?id=${app.id}`, { method: 'DELETE' });
        }
      } else if (action.type === 'UPDATE') {
        for (const app of action.appraisals) {
          await fetch('/api/appraisals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(app),
          });
        }
      }
      
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => {
        const newStack = [...prev, action];
        if (newStack.length > 50) newStack.shift();
        return newStack;
      });
      
      fetchAppraisals();
      setSelectedRowIds([]);
      setLastSelectedId(null);
    } catch (err) {
      console.error('Redo failed:', err);
    }
  };

  const handleRowClick = (id: string, e: React.MouseEvent) => {
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
  };

  const handlePaintRowsColor = async (color: string) => {
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
  };

  const handleDeleteAppraisal = async (id: string) => {
    if (isHistorical) return;
    
    const appraisalToDelete = appraisals.find(a => a.id === id);
    if (!appraisalToDelete) return;
    
    try {
      const res = await fetch(`/api/appraisals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        pushAction({ type: 'DELETE', appraisals: [appraisalToDelete] });
        setSelectedRowIds(prev => prev.filter(x => x !== id));
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to delete appraisal:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (isHistorical || selectedRowIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedRowIds.length} selected appointments?`)) return;
    
    const toDelete = appraisals.filter(a => selectedRowIds.includes(a.id));
    
    try {
      await Promise.all(selectedRowIds.map(id => 
        fetch(`/api/appraisals?id=${id}`, { method: 'DELETE' })
      ));
      
      pushAction({ type: 'DELETE', appraisals: toDelete });
      setSelectedRowIds([]);
      setLastSelectedId(null);
      fetchAppraisals();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  };

  const handleMarkInspected = async (app: Appraisal) => {
    if (isHistorical) return;
    if (app.stats.toLowerCase().includes('unscheduled')) return;
    
    let updatedStats = app.stats || '';
    if (!updatedStats.toLowerCase().includes('inspected')) {
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
  };

  const handleMarkCompleted = async (app: Appraisal) => {
    if (isHistorical) return;
    
    const beforeAppraisal = { ...app };
    const afterAppraisal = {
      ...app,
      status: 'COMPLETED' as any // Using any to bypass strict type checking if status is missing in old versions
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
  };

  const handleAddAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistorical) return;

    const formattedAddress = autoFormatAddress(formAddress);
    const isHybrid = formType.toLowerCase().includes('hybrid');
    const hasDateTime = formInspectionDate && formInspectionTime;

    let finalColor = formColorCategory;
    if (isHybrid) {
      finalColor = 'brown';
    } else if (hasDateTime) {
      finalColor = 'black';
    } else {
      finalColor = 'blue';
    }

    let finalStats = formStats;
    if (finalColor === 'blue') {
      finalStats = 'Unscheduled';
    } else if (finalColor === 'black') {
      finalStats = removeUnscheduled(finalStats);
    }

    const payload = {
      address: formattedAddress,
      type: formType,
      inspection_date: formInspectionDate,
      inspection_time: formInspectionTime,
      due_date: formDueDate,
      stats: finalStats,
      client: formClient,
      fee: Number(formFee) || 0,
      color_category: finalColor,
    };

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
        resetAddForm();
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to create appraisal:', err);
    }
  };

  const handleEditAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistorical || !targetAppraisal) return;

    const beforeAppraisal = { ...targetAppraisal };

    const formattedAddress = autoFormatAddress(formAddress);
    const isHybrid = formType.toLowerCase().includes('hybrid');
    const hasDateTime = formInspectionDate && formInspectionTime;

    let finalColor = formColorCategory;
    if (isHybrid) {
      finalColor = 'brown';
    } else if (hasDateTime) {
      finalColor = 'black';
    } else {
      if (formColorCategory === 'blue' || (!isHybrid && !hasDateTime && formColorCategory !== 'purple' && formColorCategory !== 'gold')) {
        finalColor = 'blue';
      }
    }

    let finalStats = formStats;
    if (finalColor === 'blue') {
      finalStats = 'Unscheduled';
    } else if (finalColor === 'black') {
      finalStats = removeUnscheduled(finalStats);
    }

    const payload = {
      id: targetAppraisal.id,
      address: formattedAddress,
      type: formType,
      inspection_date: formInspectionDate,
      inspection_time: formInspectionTime,
      due_date: formDueDate,
      stats: finalStats,
      client: formClient,
      fee: Number(formFee) || 0,
      color_category: finalColor,
    };

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
        resetAddForm();
        fetchAppraisals();
      }
    } catch (err) {
      console.error('Failed to update appraisal:', err);
    }
  };

  const handleCloneAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistorical || !targetAppraisal) return;

    try {
      const res = await fetch('/api/appraisals/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetAppraisal.id,
          newAddress: cloneAddress,
          newDueDate: cloneDueDate,
        }),
      });

      if (res.ok) {
        const created: Appraisal = await res.json();
        pushAction({ type: 'ADD', appraisals: [created] });
        setIsCloneModalOpen(false);
        setTargetAppraisal(null);
        setCloneAddress('');
        setCloneDueDate('');
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

    // Apply color and status automations:
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

  const resetAddForm = () => {
    setFormAddress('');
    setFormType('');
    setFormInspectionDate('');
    setFormInspectionTime('');
    setFormDueDate('');
    setFormStats('');
    setFormClient('');
    setFormFee('');
    setFormColorCategory('black');
  };

  const openEditModal = (appraisal: Appraisal) => {
    setTargetAppraisal(appraisal);
    setFormAddress(appraisal.address);
    setFormType(appraisal.type);
    setFormInspectionDate(appraisal.inspection_date);
    setFormInspectionTime(appraisal.inspection_time);
    setFormDueDate(appraisal.due_date);
    setFormStats(appraisal.stats);
    setFormClient(appraisal.client);
    setFormFee(String(appraisal.fee));
    setFormColorCategory(appraisal.color_category);
    setIsEditModalOpen(true);
  };

  const openCloneModal = (appraisal: Appraisal) => {
    setTargetAppraisal(appraisal);
    setCloneAddress('');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCloneDueDate(nextWeek.toISOString().split('T')[0]);
    setIsCloneModalOpen(true);
  };

  // Calendar Time Travel Handlers
  const handleSelectTravelDate = async (date: string) => {
    if (!date) return;
    setTravelDate(date);
    setIsTimeTravelOpen(false);

    if (viewMode === 'time-machine') {
      const targetTimestamp = getSnapshotTimestamp(date, 3); // 3 = End of day
      fetchAppraisals(targetTimestamp, 'time-machine');
      fetchMetrics(date);
    } else {
      setIsHistorical(true);
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
    setIsHistorical(false);
    setTravelDate('');
    setDaySliderValue(0);
    setIsTimeTravelOpen(false);
    fetchAppraisals();
  };

  // Touch event handlers for mobile long press (searches Google)
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

  // useEffect hooks (defined at the bottom to ensure handlers are available)
  useEffect(() => {
    if (!isHistorical) {
      fetchAppraisals();
    }
    fetchSettings();
  }, [viewMode]);

  useEffect(() => {
    if (editingCell && inlineInputRef.current) {
      inlineInputRef.current.focus();
      if (
        editingCell.field === 'inspection_date' ||
        editingCell.field === 'due_date' ||
        editingCell.field === 'inspection_time'
      ) {
        try {
          inlineInputRef.current.showPicker();
        } catch (err) {
          console.warn('showPicker not supported or failed', err);
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
      
      if (isInputActive && activeEl.id !== 'notesTextarea') {
        return;
      }
      
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isHistorical) return;
        const allIds = filteredAppraisals.map(a => a.id);
        setSelectedRowIds(allIds);
        if (allIds.length > 0) {
          setLastSelectedId(allIds[0]);
        }
      }
      
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isHistorical) return;
        setSelectedRowIds([]);
        setLastSelectedId(null);
      }

      if (e.key === 'Escape') {
        setSelectedRowIds([]);
        setLastSelectedId(null);
      }

      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } 
      
      else if (
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

  // Right click anywhere also deselects and does not bring up the right click menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setSelectedRowIds([]);
      setLastSelectedId(null);
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Clicking outside the main grid also deselects
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.modal-overlay') || target.closest('.modal-content')) {
        return;
      }
      if (target.closest('.selection-bar-active') || target.closest('.color-option-btn')) {
        return;
      }
      if (target.closest('.appraisal-table')) {
        return;
      }
      if (target.closest('#btnTimeTravel') || target.closest('.custom-calendar-popover')) {
        return;
      }
      setSelectedRowIds([]);
      setLastSelectedId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

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
        const activeEl = document.activeElement;
        const isInputActive = activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA'
        );
        if (isInputActive) return;

        if (selectedRowIds.length === 1) {
          e.preventDefault();
          const selectedApp = filteredAppraisals.find(a => a.id === selectedRowIds[0]);
          if (selectedApp) {
            openEditModal(selectedApp);
          }
        }
      }
    };

    window.addEventListener('keydown', handleArrowNavigation);
    return () => window.removeEventListener('keydown', handleArrowNavigation);
  }, [filteredAppraisals, selectedRowIds]);

  return (
    <>
      {/* Top Header */}
      <header className="app-header">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div>
            <h1>
              <Clock className="w-5 h-5 text-blue-500" />
              Appraisal Tracker
            </h1>
            <span className="logo-subtitle">Active Ledger & Timeline Snapshots</span>
          </div>

          {/* Time Travel Button with Calendar Popover Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsTimeTravelOpen(!isTimeTravelOpen)}
              className={`btn ${isHistorical ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                padding: '0.35rem 0.75rem', 
                fontSize: '0.75rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                borderRadius: '6px' 
              }}
              id="btnTimeTravel"
            >
              <Calendar className="w-4 h-4" />
              {isHistorical && travelDate ? `Snapshot: ${travelDate}` : 'Time Travel'}
            </button>

            {isTimeTravelOpen && (
              <div 
                className="modal-content" 
                style={{ 
                  position: 'absolute', 
                  left: 0, 
                  top: '115%', 
                  width: '260px', 
                  zIndex: 200, 
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              >
                <div className="form-group" style={{ gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Historical Date</label>
                  <CalendarPicker 
                    selectedDate={travelDate} 
                    onSelectDate={handleSelectTravelDate} 
                  />
                </div>
                {isHistorical && (
                  <button 
                    onClick={handleExitTimeTravel} 
                    className="btn btn-outline" 
                    style={{ width: '100%', marginTop: '0.65rem', padding: '0.35rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}
                  >
                    Clear History View
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map View & Add Appraisal Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              window.open('/api/backup', '_blank');
            }}
            className="btn btn-secondary"
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              borderRadius: '6px' 
            }}
            title="Download database backup for Google Drive sync"
          >
            <Clock className="w-4 h-4" />
            Backup Data
          </button>

          <button
            onClick={() => {
              if (filteredAppraisals.length > 0) {
                setIsMapModalOpen(true);
              } else {
                alert('No properties to map in current view.');
              }
            }}
            className="btn btn-secondary"
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              borderRadius: '6px' 
            }}
            title="Open Google Maps Route for up to 10 filtered properties"
          >
            <Map className="w-4 h-4" />
            Map View
          </button>
          
          <button
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            disabled={isHistorical || viewMode === 'completed' || viewMode === 'time-machine'}
            className="btn btn-secondary"
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              borderRadius: '6px',
              opacity: (isHistorical || viewMode === 'completed' || viewMode === 'time-machine') ? 0.5 : 1
            }}
            id="btnAddAppraisal"
          >
            <Plus className="w-4 h-4" />
            Add Appraisal
          </button>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="dashboard-container">
        
        {/* Day-specific Timeline Slider & Warning Banner (Reveals only when Time Travel is active) */}
        {isHistorical && travelDate && (
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

        {/* View Mode Tabs */}
        {!isHistorical && (
          <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <button
              onClick={() => { setViewMode('active'); setTravelDate(''); setDailyMetrics(null); }}
              className={`btn ${viewMode === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              Active Orders
            </button>
            <button
              onClick={() => { setViewMode('completed'); setTravelDate(''); setDailyMetrics(null); }}
              className={`btn ${viewMode === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              Completed Orders
            </button>
            <button
              onClick={() => { setViewMode('time-machine'); setTravelDate(''); setDailyMetrics(null); }}
              className={`btn ${viewMode === 'time-machine' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Clock className="w-4 h-4" /> Time Machine
            </button>
          </div>
        )}

        {/* Time Machine Daily Metrics */}
        {viewMode === 'time-machine' && (
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

        {/* Toolbar controls (Search, Filters) */}
        <section className="toolbar">
          {selectedRowIds.length > 0 && !isHistorical ? (
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

                <button
                  onClick={() => {
                    setSelectedRowIds([]);
                    setLastSelectedId(null);
                  }}
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
                      backgroundColor: `var(--cat-${color}-bg)`,
                      color: `var(--cat-${color}-border)`,
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

        {/* Appraisal Grid Table */}
        <section className="table-container">
          <table className="appraisal-table">
            <thead>
              <tr>
                <th className="sticky-col" style={{ textAlign: 'left' }}>Property Address</th>
                <th style={{ textAlign: 'center' }}>Appraisal Type</th>
                <th 
                  onClick={() => setSortBy(sortBy === 'inspection' ? 'none' : 'inspection')}
                  className={sortBy === 'inspection' ? 'sorted-header' : ''}
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                  Inspection Date {sortBy === 'inspection' && '▼'}
                </th>
                <th style={{ textAlign: 'center' }}>Time</th>
                <th 
                  onClick={() => setSortBy(sortBy === 'due_date' ? 'none' : 'due_date')}
                  className={sortBy === 'due_date' ? 'sorted-header' : ''}
                  style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                  Due Date {sortBy === 'due_date' && '▼'}
                </th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Client</th>
                <th style={{ textAlign: 'right' }}>Fee</th>
                <th style={{ textAlign: 'right', width: '60px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td className="sticky-col"><div className="skeleton-bar"></div></td>
                    <td><div className="skeleton-bar medium"></div></td>
                    <td><div className="skeleton-bar short"></div></td>
                    <td><div className="skeleton-bar short"></div></td>
                    <td><div className="skeleton-bar short"></div></td>
                    <td><div className="skeleton-bar short"></div></td>
                    <td><div className="skeleton-bar medium"></div></td>
                    <td><div className="skeleton-bar short"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : filteredAppraisals.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <Sliders className="w-8 h-8 text-muted" style={{ opacity: 0.5 }} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>No appointments found</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Try resetting the search query or changing active filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAppraisals.map((app) => {
                  const addr = splitAddress(app.address);
                  const dueBadge = getDueDateBadge(app.due_date);
                  const inspDateLabel = splitDateLabel(app.inspection_date);
                  const dueDateLabel = splitDateLabel(app.due_date);
                  
                  return (
                    <tr 
                      key={app.id}
                      className={`appraisal-row row-cat-${app.color_category} ${selectedRowIds.includes(app.id) ? 'selected-row' : ''}`}
                      onClick={(e) => handleRowClick(app.id, e)}
                      onTouchStart={() => handleTouchStart(app.address)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                    >
                      {/* Frozen Address column - Double click to search Google on desktop */}
                      <td 
                        className="editable-cell sticky-col"
                        style={{ textAlign: 'left' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/search?q=${encodeURIComponent(app.address)}`, '_blank');
                        }}
                      >
                        <div>
                          <div className="address-primary">
                            {addr.primary}
                          </div>
                          {addr.secondary && <div className="address-secondary">{addr.secondary}</div>}
                        </div>
                      </td>

                      {/* Type column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'type' });
                          setInlineValue(app.type);
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <span className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'type' ? 'hidden-text' : ''}`}>
                            {app.type}
                          </span>
                          {editingCell?.id === app.id && editingCell?.field === 'type' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="text"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => handleInlineSave(app.id, 'type')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'type');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Inspection Date column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'inspection_date' });
                          setInlineValue(app.inspection_date);
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <div className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'inspection_date' ? 'hidden-text' : ''}`}>
                            {app.inspection_date ? (
                              <div className="date-cell-wrapper-stacked" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span className="date-weekday">{inspDateLabel.weekday}</span>
                                {inspDateLabel.dateVal && <span className="date-sub">{inspDateLabel.dateVal}</span>}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>xx</span>
                            )}
                          </div>
                          {editingCell?.id === app.id && editingCell?.field === 'inspection_date' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="date"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => handleInlineSave(app.id, 'inspection_date')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'inspection_date');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Inspection Time column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'inspection_time' });
                          setInlineValue(app.inspection_time);
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <div className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'inspection_time' ? 'hidden-text' : ''}`}>
                            {app.inspection_time ? (
                              <div className="date-cell-wrapper" style={{ fontWeight: 400, justifyContent: 'center' }}>
                                <span>{app.inspection_time}</span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>xx</span>
                            )}
                          </div>
                          {editingCell?.id === app.id && editingCell?.field === 'inspection_time' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="time"
                                value={convertTo24Hour(inlineValue)}
                                onChange={(e) => setInlineValue(convertTo12Hour(e.target.value))}
                                onBlur={() => handleInlineSave(app.id, 'inspection_time')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'inspection_time');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Due Date column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'due_date' });
                          setInlineValue(app.due_date);
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <div className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'due_date' ? 'hidden-text' : ''}`}>
                            {app.due_date ? (
                              <div className="date-cell-wrapper-stacked" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                <span className="date-weekday">{dueDateLabel.weekday}</span>
                                {dueDateLabel.dateVal && <span className="date-sub">{dueDateLabel.dateVal}</span>}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>xx</span>
                            )}
                          </div>
                          {editingCell?.id === app.id && editingCell?.field === 'due_date' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="date"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => handleInlineSave(app.id, 'due_date')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'due_date');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'stats' });
                          setInlineValue(app.stats);
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <div className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'stats' ? 'hidden-text' : ''}`}>
                            {(app.stats || dueBadge || app.status === 'COMPLETED' || app.status === 'CANCELLED') ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                                {app.status === 'COMPLETED' && (
                                  <span className="status-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                                    COMPLETED
                                  </span>
                                )}
                                {app.status === 'CANCELLED' && (
                                  <span className="status-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                    CANCELLED
                                  </span>
                                )}
                                {app.stats && (
                                  <span className={`status-badge ${app.stats.toLowerCase()}`}>
                                    {app.stats}
                                  </span>
                                )}
                                {dueBadge && app.status !== 'COMPLETED' && app.status !== 'CANCELLED' && (
                                  <span className={`date-badge ${dueBadge.className}`}>
                                    {dueBadge.text}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </div>
                          {editingCell?.id === app.id && editingCell?.field === 'stats' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="text"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => handleInlineSave(app.id, 'stats')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'stats');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Client column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'client' });
                          setInlineValue(app.client);
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <span className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'client' ? 'hidden-text' : ''}`}>
                            {app.client}
                          </span>
                          {editingCell?.id === app.id && editingCell?.field === 'client' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="text"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => handleInlineSave(app.id, 'client')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'client');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Fee column */}
                      <td 
                        className="editable-cell fee-cell"
                        style={{ textAlign: 'right' }}
                        onDoubleClick={() => {
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'fee' });
                          setInlineValue(String(app.fee));
                        }}
                      >
                        <div className="editable-cell-wrapper">
                          <span className={`editable-cell-text ${editingCell?.id === app.id && editingCell?.field === 'fee' ? 'hidden-text' : ''}`}>
                            {`$${app.fee}`}
                          </span>
                          {editingCell?.id === app.id && editingCell?.field === 'fee' && (
                            <div className="editable-cell-input-container">
                              <input
                                ref={inlineInputRef}
                                type="number"
                                value={inlineValue}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => handleInlineSave(app.id, 'fee')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineSave(app.id, 'fee');
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="inline-input inline-input-fee"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions column */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          {/* Mark Inspected Button */}
                          <button
                            onClick={() => handleMarkInspected(app)}
                            disabled={isHistorical || app.stats.toLowerCase().includes('unscheduled')}
                            title={app.stats.toLowerCase().includes('unscheduled') ? "Cannot mark unscheduled appraisal as inspected" : "Mark Inspected"}
                            className="action-icon-btn check-inspected"
                            style={{ opacity: app.stats.toLowerCase().includes('unscheduled') ? 0.3 : 1 }}
                          >
                            <CheckSquare className="w-3 h-3" />
                          </button>
                          {/* Mark Completed Button */}
                          <button
                            onClick={() => handleMarkCompleted(app)}
                            disabled={isHistorical}
                            title="Mark Completed / Finished"
                            className="action-icon-btn complete"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          {/* Copy / Clone Button */}
                          <button
                            onClick={() => openCloneModal(app)}
                            disabled={isHistorical}
                            title="Copy / Clone similar appraisal"
                            className="action-icon-btn"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(app)}
                            disabled={isHistorical}
                            title="Edit full appraisal details"
                            className="action-icon-btn"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        {/* Middle Section: Notes Text Box & KPI metrics */}
        <section className="middle-section">
          {/* Notes Panel */}
          <div className="notes-card-clean">
            <textarea
              className="notes-textarea-plain"
              placeholder="Write reminders here (e.g. Update Websites, PICS OF EVERYTHING FOR BPL Mortgage, LLC)..."
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onSelect={checkSelection}
              onMouseUp={checkSelection}
              onKeyUp={checkSelection}
              onBlur={() => {
                setTimeout(() => setShowFontControls(false), 200);
              }}
              style={{ fontSize: `${notesFontSize}px` }}
              disabled={isHistorical}
              id="notesTextarea"
            />
            
            {/* Selection size bubble */}
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

          {/* Stats Sidebar Quick Summary */}
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
                
                {/* Hover overlay weeks adjuster */}
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
      </main>

      {/* MODAL: ADD APPRAISAL */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Appraisal Appointment</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddAppraisal} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 1414 Harrison St Algonquin, IL"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <input
                    type="text"
                    required
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="form-input"
                    placeholder="e.g. 1004 Purchase, Hybrid"
                  />
                </div>

                <div className="form-group">
                  <label>Client</label>
                  <input
                    type="text"
                    required
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Compass, Class"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inspection Date</label>
                  <input
                    type="date"
                    value={formInspectionDate}
                    onChange={(e) => setFormInspectionDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={convertTo24Hour(formInspectionTime)}
                    onChange={(e) => setFormInspectionTime(convertTo12Hour(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Fee ($)</label>
                  <input
                    type="number"
                    required
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    className="form-input"
                    placeholder="e.g. 400"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status / Stats</label>
                <input
                  type="text"
                  value={formStats}
                  onChange={(e) => setFormStats(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Hold, Email"
                />
              </div>

              <div>
                <div className="color-picker-label">Color Coding Category</div>
                <div className="color-option-row">
                  {['black', 'blue', 'purple', 'brown', 'gold'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColorCategory(color)}
                      className={`color-option-btn color-opt-${color} ${formColorCategory === color ? 'selected' : ''}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT APPRAISAL */}
      {isEditModalOpen && targetAppraisal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Appraisal Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditAppraisal} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <input
                    type="text"
                    required
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Client</label>
                  <input
                    type="text"
                    required
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Inspection Date</label>
                  <input
                    type="date"
                    value={formInspectionDate}
                    onChange={(e) => setFormInspectionDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={convertTo24Hour(formInspectionTime)}
                    onChange={(e) => setFormInspectionTime(convertTo12Hour(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Fee ($)</label>
                  <input
                    type="number"
                    required
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status / Stats</label>
                <input
                  type="text"
                  value={formStats}
                  onChange={(e) => setFormStats(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <div className="color-picker-label">Color Coding Category</div>
                <div className="color-option-row">
                  {['black', 'blue', 'purple', 'brown', 'gold'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColorCategory(color)}
                      className={`color-option-btn color-opt-${color} ${formColorCategory === color ? 'selected' : ''}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLONE/COPY APPRAISAL */}
      {isCloneModalOpen && targetAppraisal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Copy Similar Appraisal</h2>
              <button onClick={() => setIsCloneModalOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCloneAppraisal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <p><strong>Copying fields from source:</strong></p>
                <ul style={{ paddingLeft: '1rem', marginTop: '0.2rem', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                  <li>Type: {targetAppraisal.type}</li>
                  <li>Client: {targetAppraisal.client}</li>
                  <li>Fee: ${targetAppraisal.fee}</li>
                  <li>Status: {targetAppraisal.stats || 'None'}</li>
                  <li>Color Category: <span style={{ textTransform: 'capitalize', color: `var(--cat-${targetAppraisal.color_category}-border)` }}>{targetAppraisal.color_category}</span></li>
                </ul>
              </div>

              <div className="form-group">
                <label>New Address</label>
                <input
                  type="text"
                  required
                  value={cloneAddress}
                  onChange={(e) => setCloneAddress(e.target.value)}
                  className="form-input"
                  placeholder="e.g. 702 Maple Ln Geneva, IL"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>New Due Date</label>
                <input
                  type="date"
                  required
                  value={cloneDueDate}
                  onChange={(e) => setCloneDueDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsCloneModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Clone Appraisal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map View Overlay */}
      <MapOverlay 
        isOpen={isMapModalOpen} 
        onClose={() => setIsMapModalOpen(false)} 
        appraisals={filteredAppraisals} 
      />
    </>
  );
}
