import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const CalendarPicker = ({ selectedDate, onSelectDate }: CalendarPickerProps) => {
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
