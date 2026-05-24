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
  ChevronRight
} from 'lucide-react';
import QRCode from 'qrcode';

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
}

interface NetworkIp {
  name: string;
  address: string;
  isTailscale: boolean;
}

interface HistoryAction {
  type: 'ADD' | 'DELETE' | 'UPDATE';
  appraisals: Appraisal[];
  beforeAppraisals?: Appraisal[];
}



// Format date to split format: { weekday, date }
const formatDateLabelSplit = (dateStr: string) => {
  if (!dateStr || dateStr === 'xx') return null;
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return { weekday: dateStr, date: '' };
  
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  const datePart = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit' }).format(date);
  
  return { weekday, date: datePart };
};

// Format address to standard "Street Suffix, City, IL"
const formatAddress = (val: string): string => {
  const s = val.trim().replace(/\s+/g, ' ');
  if (!s) return '';
  
  const suffixes = [
    'st', 'street', 'rd', 'road', 'dr', 'drive', 'wy', 'way', 'ave', 'avenue', 
    'ln', 'lane', 'blvd', 'boulevard', 'pl', 'place', 'ct', 'court', 'ter', 'terrace', 
    'cir', 'circle', 'hwy', 'highway', 'pkwy', 'parkway'
  ];
  
  const words = s.split(' ');
  let suffixIndex = -1;
  for (let i = 0; i < words.length; i++) {
    const wordClean = words[i].replace(/[.,]/g, '').toLowerCase();
    if (suffixes.includes(wordClean)) {
      suffixIndex = i;
      break;
    }
  }
  
  let street = '';
  let rest = '';
  
  if (suffixIndex !== -1) {
    street = words.slice(0, suffixIndex + 1).join(' ').replace(/,$/, '');
    rest = words.slice(suffixIndex + 1).join(' ');
  } else {
    const commaIdx = s.indexOf(',');
    if (commaIdx !== -1) {
      street = s.substring(0, commaIdx).trim();
      rest = s.substring(commaIdx + 1).trim();
    } else {
      if (words.length > 1) {
        street = words.slice(0, words.length - 1).join(' ');
        rest = words[words.length - 1];
      } else {
        street = s;
        rest = '';
      }
    }
  }
  
  rest = rest.trim().replace(/^,/, '').trim();
  let city = rest.replace(/(?:,\s*|\s+)(?:IL|Illinois|il|illinois)$/i, '').trim();
  city = city.replace(/,$/, '').trim();
  
  if (!city) {
    return `${street}, IL`;
  }
  
  return `${street}, ${city}, IL`;
};

// Format address text to bold main street and muted city/state/zip on second line
const splitAddress = (addressStr: string) => {
  if (!addressStr) return { primary: '', secondary: '' };
  
  // 1. Split by first comma if exists
  const commaIndex = addressStr.indexOf(',');
  if (commaIndex !== -1) {
    return {
      primary: addressStr.substring(0, commaIndex).trim(),
      secondary: addressStr.substring(commaIndex + 1).trim()
    };
  }

  // 2. Look for standard street suffixes as whole words
  const suffixes = [
    'st', 'street', 'ln', 'lane', 'ave', 'avenue', 'rd', 'road', 
    'blvd', 'boulevard', 'dr', 'drive', 'pl', 'place', 'ct', 'court', 
    'way', 'ter', 'terrace', 'cir', 'circle', 'hwy', 'highway', 'pkwy', 'parkway'
  ];
  
  const words = addressStr.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const normalizedWord = words[i].toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (suffixes.includes(normalizedWord)) {
      const primary = words.slice(0, i + 1).join(' ');
      const secondary = words.slice(i + 1).join(' ');
      return { primary, secondary };
    }
  }

  // 3. Fallback to known Illinois cities
  const cities = ['algonquin', 'geneva', 'bensenville', 'vernon hills', 'chicago', 'winfield', 'highland park', 'arlington heights'];
  const lowerAddress = addressStr.toLowerCase();
  for (const city of cities) {
    const idx = lowerAddress.indexOf(' ' + city);
    if (idx !== -1) {
      return {
        primary: addressStr.substring(0, idx + 1).trim(),
        secondary: addressStr.substring(idx + 1).trim()
      };
    }
  }

  // 4. Fallback split after first 3 words
  if (words.length > 3) {
    return {
      primary: words.slice(0, 3).join(' '),
      secondary: words.slice(3).join(' ')
    };
  }

  return { primary: addressStr, secondary: '' };
};

// Convert inspection time string to minutes of day for sorting
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 9999;
  
  const ampmMatch = timeStr.match(/^\s*(\d+):(\d+)\s*(AM|PM)\s*$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1]);
    const min = parseInt(ampmMatch[2]);
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + min;
  }
  
  const hhmmMatch = timeStr.match(/^\s*(\d+):(\d+)\s*$/);
  if (hhmmMatch) {
    const hour = parseInt(hhmmMatch[1]);
    const min = parseInt(hhmmMatch[2]);
    return hour * 60 + min;
  }
  
  return 9999;
};

// Convert AM/PM time string to 24h format HH:MM for input time element
const timeTo24h = (timeStr: string): string => {
  if (!timeStr) return '';
  
  const ampmMatch = timeStr.match(/^\s*(\d+):(\d+)\s*(AM|PM)\s*$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1]);
    const min = ampmMatch[2].padStart(2, '0');
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }
  
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  const singleHhMatch = timeStr.match(/^\s*(\d):(\d{2})$/);
  if (singleHhMatch) {
    return `${singleHhMatch[1].padStart(2, '0')}:${singleHhMatch[2]}`;
  }
  
  return '';
};

// Format a HH:MM 24h string to 12h AM/PM for cell display
const formatTimeLabel = (timeStr: string): string => {
  if (!timeStr) return 'xx';
  if (/AM|PM/i.test(timeStr)) return timeStr;
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hour = parseInt(match[1]);
    const min = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${min} ${ampm}`;
  }
  return timeStr;
};

// Helper to implement the 2026 row coloring rules
const adjustAppraisalColorAndStatus = (app: Partial<Appraisal>, isCreation = false): Partial<Appraisal> => {
  let category = app.color_category || 'black';
  let stats = app.stats || '';
  const typeLower = (app.type || '').toLowerCase();

  if (isCreation) {
    if (typeLower.includes('hybrid')) {
      category = 'brown';
    } else if (app.inspection_date && app.inspection_time) {
      category = 'black';
    } else {
      category = 'blue';
      stats = 'Unscheduled';
    }
  } else {
    // During edits/updates:
    if (typeLower.includes('hybrid')) {
      category = 'brown';
    }
    // If inspection date and time are entered in a blue highlighted row, then it becomes black
    else if (category === 'blue' && app.inspection_date && app.inspection_time) {
      category = 'black';
    }
  }

  // Common overrides:
  if (category === 'blue') {
    stats = 'Unscheduled';
  } else if (category === 'black') {
    stats = stats.replace(/\bunscheduled\b/gi, '').replace(/\s+/g, ' ').trim();
  }

  return {
    ...app,
    color_category: category,
    stats: stats
  };
};

// Relative due date warning badges (overdue only)
const getDueDateBadge = (dueDateStr: string) => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr + 'T00:00:00');
  if (isNaN(due.getTime())) return null;
  
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffMs = due.getTime() - cur.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, className: 'date-badge-overdue' };
  }
  return null;
};

// Custom Calendar Picker Component for Time Travel
interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const CalendarPicker = ({ selectedDate, onSelectDate }: CalendarPickerProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewDate, setViewDate] = useState(isNaN(initialDate.getTime()) ? new Date() : initialDate);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleDayClick = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    
    const clickedDate = new Date(dateStr + 'T00:00:00');
    if (clickedDate.getTime() > today.getTime()) return;

    onSelectDate(dateStr);
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    const parts = selectedDate.split('-');
    return (
      parseInt(parts[0]) === viewYear &&
      parseInt(parts[1]) === viewMonth + 1 &&
      parseInt(parts[2]) === day
    );
  };

  const isToday = (day: number) => {
    const curToday = new Date();
    return (
      curToday.getFullYear() === viewYear &&
      curToday.getMonth() === viewMonth &&
      curToday.getDate() === day
    );
  };

  const isFuture = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    const clickedDate = new Date(dateStr + 'T00:00:00');
    return clickedDate.getTime() > today.getTime();
  };

  return (
    <div className="custom-calendar-popover" onClick={(e) => e.stopPropagation()}>
      <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button 
          type="button" 
          onClick={handlePrevMonth} 
          className="action-icon-btn"
          style={{ padding: '0.2rem', borderRadius: '4px' }}
        >
          <ChevronLeft className="w-4 h-4 text-zinc-400" />
        </button>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {monthNames[viewMonth]} {viewYear}
        </span>
        <button 
          type="button" 
          onClick={handleNextMonth} 
          className="action-icon-btn"
          style={{ padding: '0.2rem', borderRadius: '4px' }}
        >
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
      
      <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
          <div key={w} style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', paddingBottom: '2px' }}>
            {w}
          </div>
        ))}
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} style={{ padding: '6px' }}></div>;
          }
          
          const selected = isSelected(day);
          const current = isToday(day);
          const future = isFuture(day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={future}
              onClick={(e) => handleDayClick(day, e)}
              className={`calendar-day-btn ${selected ? 'selected' : ''} ${current ? 'today' : ''} ${future ? 'future' : ''}`}
              style={{
                width: '100%',
                padding: '5px 0',
                fontSize: '0.72rem',
                fontWeight: current || selected ? '600' : '400',
                borderRadius: '4px',
                border: 'none',
                cursor: future ? 'not-allowed' : 'pointer',
                backgroundColor: selected 
                  ? 'var(--accent-color)' 
                  : current 
                    ? 'rgba(59,130,246,0.15)' 
                    : 'transparent',
                color: selected 
                  ? '#ffffff' 
                  : future 
                    ? 'var(--text-muted)' 
                    : current 
                      ? 'var(--accent-color)' 
                      : 'var(--text-primary)',
                opacity: future ? 0.25 : 1,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleTouchStart = (address: string) => () => {
    isLongPressRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(mapsUrl, '_blank');
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

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
  const [systemIps, setSystemIps] = useState<NetworkIp[]>([]);
  const [activeIp, setActiveIp] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // UI Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'inspection' | 'none'>('none');
  
  // Time Travel states
  const [travelDate, setTravelDate] = useState('');
  const [daySliderValue, setDaySliderValue] = useState(0);
  const [isTimeTravelOpen, setIsTimeTravelOpen] = useState(false);



  // Modals & Temp States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
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
        
        const timeA = timeToMinutes(a.inspection_time);
        const timeB = timeToMinutes(b.inspection_time);
        return timeA - timeB;
      }
      return 0;
    });

  // Calculate Metrics
  const activeCount = filteredAppraisals.length;
  const activeFeeSum = filteredAppraisals.reduce((sum, item) => sum + item.fee, 0);
  const ytdFeeSum = YTD_BASELINE + activeFeeSum;

  const projectedFeeSum = activeFeeSum * weeksInYear;

  // Core functions and handlers (defined above useEffect hooks)
  const fetchAppraisals = async (timestamp?: string) => {
    setIsLoading(true);
    try {
      const url = timestamp 
        ? `/api/appraisals?timestamp=${encodeURIComponent(timestamp)}`
        : '/api/appraisals';
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
        if (data.ips) {
          setSystemIps(data.ips);
          const tailscaleIp = data.ips.find((ip: NetworkIp) => ip.isTailscale);
          if (tailscaleIp) {
            setActiveIp(tailscaleIp.address);
          } else if (data.ips.length > 0) {
            setActiveIp(data.ips[0].address);
          }
        }
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

    // Avoid click handling if this was a Touch long-press redirect
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

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
          // Normal click on selected row deselects it
          if (selectedRowIds.includes(id)) {
            setSelectedRowIds(prev => prev.filter(x => x !== id));
          } else {
            setSelectedRowIds([id]);
          }
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
      // Normal single click on selected row deselects it
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

  const handleRowContextMenu = async (app: Appraisal, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // prevent global window contextmenu deselect
    
    if (isHistorical) return;
    if (app.stats === 'Inspected') return; // Do nothing if already Inspected
    
    const beforeAppraisal = { ...app };
    let afterAppraisal = {
      ...app,
      stats: 'Inspected',
      inspection_date: '',
      inspection_time: ''
    } as Appraisal;
    
    // Apply auto coloring coding rules (switches black/blue/etc. based on date/time removal)
    afterAppraisal = adjustAppraisalColorAndStatus(afterAppraisal, false) as Appraisal;
    
    try {
      const res = await fetch('/api/appraisals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(afterAppraisal)
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
      console.error('Failed to update status to Inspected on right click:', err);
    }
  };

  const handlePaintRowsColor = async (color: string) => {
    if (isHistorical || selectedRowIds.length === 0) return;
    
    const beforeAppraisals: Appraisal[] = [];
    const afterAppraisals: Appraisal[] = [];
    
    for (const id of selectedRowIds) {
      const target = appraisals.find(a => a.id === id);
      if (target) {
        let updated = { ...target, color_category: color };
        updated = adjustAppraisalColorAndStatus(updated, false) as Appraisal;
        
        if (
          updated.color_category !== target.color_category || 
          updated.stats !== target.stats
        ) {
          beforeAppraisals.push({ ...target });
          afterAppraisals.push(updated);
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

  const handleAddAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHistorical) return;

    const payload = {
      address: formatAddress(formAddress),
      type: formType,
      inspection_date: formInspectionDate,
      inspection_time: formInspectionTime,
      due_date: formDueDate,
      stats: formStats,
      client: formClient,
      fee: Number(formFee) || 0,
      color_category: formColorCategory,
    };

    // Apply auto color and status constraints for creation
    const adjusted = adjustAppraisalColorAndStatus(payload, true);
    payload.color_category = adjusted.color_category!;
    payload.stats = adjusted.stats!;

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
    const payload = {
      id: targetAppraisal.id,
      address: formatAddress(formAddress),
      type: formType,
      inspection_date: formInspectionDate,
      inspection_time: formInspectionTime,
      due_date: formDueDate,
      stats: formStats,
      client: formClient,
      fee: Number(formFee) || 0,
      color_category: formColorCategory,
    };

    // Apply auto color and status constraints for updates
    const adjusted = adjustAppraisalColorAndStatus(payload, false);
    payload.color_category = adjusted.color_category!;
    payload.stats = adjusted.stats!;

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

    // Address formatting before calling backend clone API
    const formatted = formatAddress(cloneAddress);

    try {
      const res = await fetch('/api/appraisals/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetAppraisal.id,
          newAddress: formatted,
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
      updatedValue = formatAddress(inlineValue);
    }

    let afterAppraisal = {
      ...beforeAppraisal,
      [field]: updatedValue
    } as Appraisal;

    // Apply auto color and status constraints
    afterAppraisal = adjustAppraisalColorAndStatus(afterAppraisal, false) as Appraisal;

    if (
      beforeAppraisal[field] === afterAppraisal[field] &&
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
  const getSnapshotTimestamp = (dateStr: string, hour: number) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, hour, 0, 0);
    return d.toISOString();
  };

  const handleSelectTravelDate = async (date: string) => {
    if (!date) return;
    setTravelDate(date);
    setIsTimeTravelOpen(false);
    setIsHistorical(true);

    // Default to 8:00 PM snapshot (index 2)
    setDaySliderValue(2);
    const targetTimestamp = getSnapshotTimestamp(date, 20);
    fetchAppraisals(targetTimestamp);
  };

  const handleDaySliderChange = (val: number) => {
    setDaySliderValue(val);
    if (!travelDate) return;

    let hour = 8;
    if (val === 1) hour = 12;
    if (val === 2) hour = 20;

    const targetTimestamp = getSnapshotTimestamp(travelDate, hour);
    fetchAppraisals(targetTimestamp);
  };

  const handleExitTimeTravel = () => {
    setIsHistorical(false);
    setTravelDate('');
    setDaySliderValue(0);
    setIsTimeTravelOpen(false);
    fetchAppraisals();
  };

  // useEffect hooks (defined at the bottom to ensure handlers are available)
  useEffect(() => {
    fetchAppraisals();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeIp) {
      const url = `http://${activeIp}:3000`;
      QRCode.toDataURL(url, { margin: 2, width: 120 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('QR Code error:', err));
    }
  }, [activeIp]);

  useEffect(() => {
    if (editingCell && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
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
      
      if (e.key === 'Escape') {
        if (editingCell) {
          setEditingCell(null);
        } else {
          setSelectedRowIds([]);
          setLastSelectedId(null);
        }
        return;
      }

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
  }, [undoStack, redoStack, isHistorical, appraisals, searchQuery, colorFilter, sortBy, editingCell]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('.appraisal-table') ||
        target.closest('.toolbar') ||
        target.closest('.modal-content') ||
        target.closest('.custom-calendar-popover') ||
        target.closest('#btnTimeTravel') ||
        target.closest('#btnMobileLink') ||
        target.closest('.btn') ||
        target.closest('.action-icon-btn')
      ) {
        return;
      }
      setSelectedRowIds([]);
      setLastSelectedId(null);
    };

    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setSelectedRowIds([]);
      setLastSelectedId(null);
    };

    window.addEventListener('click', handleDocumentClick);
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => {
      window.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('contextmenu', handleGlobalContextMenu);
    };
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
          
          <button 
            onClick={() => setIsQrModalOpen(true)}
            className="btn btn-secondary"
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              borderRadius: '6px' 
            }}
            id="btnMobileLink"
          >
            <Smartphone className="w-4 h-4 tailscale-logo" />
            Mobile Link
          </button>
        </div>

        {/* Add Appraisal Button in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            disabled={isHistorical}
            className="btn btn-secondary"
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              borderRadius: '6px' 
            }}
            id="btnAddAppraisalHeader"
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
                <div className="timeline-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <span>8:00 AM</span>
                  <span>12:00 PM (Noon)</span>
                  <span>8:00 PM</span>
                </div>
              </div>
              <div className="date-indicator" style={{ minWidth: '180px', fontSize: '0.82rem', textAlign: 'right' }}>
                <span>Viewing: {daySliderValue === 0 ? '8:00 AM' : daySliderValue === 1 ? '12:00 PM (Noon)' : '8:00 PM'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar controls (Search, Filters, Sorting, Add, Undo/Redo) */}
        <section className="toolbar">
          {selectedRowIds.length > 0 && !isHistorical ? (
            <div className="category-filter-row selection-bar-active" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', padding: '0.25rem 0.5rem', borderRadius: '8px', animation: 'fade-in 0.15s ease', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                <th className="sticky-col" style={{ textAlign: 'left', width: '28%' }}>Property Address</th>
                <th style={{ textAlign: 'center', width: '12%' }}>Appraisal Type</th>
                <th 
                  onClick={() => setSortBy(sortBy === 'inspection' ? 'none' : 'inspection')}
                  style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', width: '12%' }}
                  className={sortBy === 'inspection' ? 'sorted-header' : ''}
                >
                  Inspection Date {sortBy === 'inspection' && '▼'}
                </th>
                <th style={{ textAlign: 'center', width: '10%' }}>Time</th>
                <th 
                  onClick={() => setSortBy(sortBy === 'due_date' ? 'none' : 'due_date')}
                  style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', width: '12%' }}
                  className={sortBy === 'due_date' ? 'sorted-header' : ''}
                >
                  Due Date {sortBy === 'due_date' && '▼'}
                </th>
                <th style={{ textAlign: 'center', width: '10%' }}>Status</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Client</th>
                <th style={{ textAlign: 'right', width: '8%' }}>Fee</th>
                <th style={{ textAlign: 'right', width: '85px' }}>Actions</th>
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
                  const inspDateSplit = formatDateLabelSplit(app.inspection_date);
                  const dueDateSplit = formatDateLabelSplit(app.due_date);
                  
                  return (
                    <tr 
                      key={app.id}
                      className={`appraisal-row row-cat-${app.color_category} ${selectedRowIds.includes(app.id) ? 'selected-row' : ''}`}
                      onClick={(e) => {
                        if (isLongPressRef.current) {
                          isLongPressRef.current = false;
                          return;
                        }
                        handleRowClick(app.id, e);
                      }}
                      onContextMenu={(e) => handleRowContextMenu(app, e)}
                      onTouchStart={handleTouchStart(app.address)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                      onTouchCancel={handleTouchEnd}
                    >
                      {/* Frozen Address column - Double click opens in Google Maps */}
                      <td 
                        className="sticky-col"
                        style={{ textAlign: 'left' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(app.address)}`;
                          window.open(mapsUrl, '_blank');
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
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'type' });
                          setInlineValue(app.type);
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'type' ? (
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
                        ) : (
                          app.type
                        )}
                      </td>

                      {/* Inspection Date column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'inspection_date' });
                          setInlineValue(app.inspection_date);
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'inspection_date' ? (
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
                        ) : (
                          inspDateSplit ? (
                            <div className="date-display-split">
                              <div className="date-weekday">{inspDateSplit.weekday}</div>
                              <div className="date-sub">{inspDateSplit.date}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>xx</span>
                          )
                        )}
                      </td>

                      {/* Inspection Time column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'inspection_time' });
                          setInlineValue(timeTo24h(app.inspection_time));
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'inspection_time' ? (
                          <input
                            ref={inlineInputRef}
                            type="time"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onBlur={() => handleInlineSave(app.id, 'inspection_time')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineSave(app.id, 'inspection_time');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="inline-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          app.inspection_time ? (
                            <div className="date-cell-wrapper" style={{ fontWeight: 400, justifyContent: 'center' }}>
                              <span>{formatTimeLabel(app.inspection_time)}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>xx</span>
                          )
                        )}
                      </td>

                      {/* Due Date column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'due_date' });
                          setInlineValue(app.due_date);
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'due_date' ? (
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
                        ) : (
                          dueDateSplit ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'center' }}>
                              <div className="date-display-split">
                                <div className="date-weekday">{dueDateSplit.weekday}</div>
                                <div className="date-sub">{dueDateSplit.date}</div>
                              </div>
                              {dueBadge && (
                                <div style={{ display: 'flex' }}>
                                  <span className={`date-badge ${dueBadge.className}`}>{dueBadge.text}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>xx</span>
                          )
                        )}
                      </td>

                      {/* Status/Stats Badge column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'stats' });
                          setInlineValue(app.stats);
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'stats' ? (
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
                        ) : (
                          app.stats ? (
                            <span className={`status-badge ${app.stats.toLowerCase()}`}>
                              {app.stats}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )
                        )}
                      </td>

                      {/* Client column */}
                      <td 
                        className="editable-cell"
                        style={{ textAlign: 'center' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'client' });
                          setInlineValue(app.client);
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'client' ? (
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
                        ) : (
                          app.client
                        )}
                      </td>

                      {/* Fee column */}
                      <td 
                        className="editable-cell fee-cell"
                        style={{ textAlign: 'right' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isHistorical) return;
                          setEditingCell({ id: app.id, field: 'fee' });
                          setInlineValue(String(app.fee));
                        }}
                      >
                        {editingCell?.id === app.id && editingCell?.field === 'fee' ? (
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
                        ) : (
                          `$${app.fee}`
                        )}
                      </td>

                      {/* Actions column */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            onClick={() => openCloneModal(app)}
                            disabled={isHistorical}
                            title="Copy / Clone similar appraisal"
                            className="action-icon-btn"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(app)}
                            disabled={isHistorical}
                            title="Edit full appraisal details"
                            className="action-icon-btn"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppraisal(app.id)}
                            disabled={isHistorical}
                            title="Delete appointment"
                            className="action-icon-btn delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                  <span className="stats-item-label">YTD Volume (Running)</span>
                  <div className="ytd-projection-details">
                    <span className="stats-item-val" id="kpiYtdVolumeSidebar">
                      ${ytdFeeSum.toLocaleString('en-US')}
                    </span>
                    <span className="ytd-projected-val" id="kpiYtdProjectedSidebar">
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

      {/* MODAL: MOBILE QR CODE LINK */}
      {isQrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Smartphone className="w-5 h-5 tailscale-logo" />
                Mobile Connection Link
              </h2>
              <button onClick={() => setIsQrModalOpen(false)} className="modal-close-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="tailscale-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                To view this tracker on your phone while in the field:
              </p>
              <ol style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <li>Ensure both this PC and your phone are connected to your <strong>Tailscale VPN</strong> network.</li>
                <li>Scan the QR code below using your phone&apos;s camera, or visit the link.</li>
              </ol>

              {systemIps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.65rem' }}>Select Connection IP</label>
                    <select 
                      value={activeIp} 
                      onChange={(e) => setActiveIp(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                    >
                      {systemIps.map(ip => (
                        <option key={ip.address} value={ip.address}>
                          {ip.address} ({ip.name}) {ip.isTailscale ? '★ Tailscale' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tailscale-ip-list">
                    <div className="tailscale-ip-item">
                      <span className="tailscale-ip-label">Browser Link</span>
                      <span className="tailscale-ip-val">{`http://${activeIp}:3000`}</span>
                    </div>
                  </div>

                  {qrCodeDataUrl && (
                    <div className="tailscale-qr-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeDataUrl} alt="Mobile link QR code" style={{ width: '100%', height: '100%' }} />
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>
                  No local network interfaces detected. Make sure Tailscale is connected.
                </p>
              )}
            </div>

            <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button onClick={() => setIsQrModalOpen(false)} className="btn btn-secondary" style={{ width: '100%', padding: '0.45rem' }}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

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
                    value={formInspectionTime}
                    onChange={(e) => setFormInspectionTime(e.target.value)}
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
                    value={formInspectionTime}
                    onChange={(e) => setFormInspectionTime(e.target.value)}
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
    </>
  );
}
