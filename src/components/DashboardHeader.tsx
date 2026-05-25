import React, { useTransition } from 'react';
import { Clock, Settings, Calendar, Map, Plus } from 'lucide-react';
import { CalendarPicker } from './CalendarPicker';
import { Appraisal } from '../types';

interface DashboardHeaderProps {
  homeAddress: string;
  setFormHomeAddress: (val: string) => void;
  setIsOptionsOpen: (val: boolean) => void;
  viewMode: 'active' | 'completed' | 'time-machine' | 'accounting';
  setViewMode: (mode: 'active' | 'completed' | 'time-machine' | 'accounting') => void;
  setTravelDate: (date: string) => void;
  setDailyMetrics: (metrics: any) => void;
  isHistorical: boolean;
  handleExitTimeTravel: () => void;
  isTimeTravelOpen: boolean;
  setIsTimeTravelOpen: (val: boolean) => void;
  travelDate: string;
  handleSelectTravelDate: (date: string) => void;
  filteredAppraisals: Appraisal[];
  setIsMapModalOpen: (val: boolean) => void;
  setIsAddModalOpen: (val: boolean) => void;
}

export function DashboardHeader({
  homeAddress,
  setFormHomeAddress,
  setIsOptionsOpen,
  viewMode,
  setViewMode,
  setTravelDate,
  setDailyMetrics,
  isHistorical,
  handleExitTimeTravel,
  isTimeTravelOpen,
  setIsTimeTravelOpen,
  travelDate,
  handleSelectTravelDate,
  filteredAppraisals,
  setIsMapModalOpen,
  setIsAddModalOpen
}: DashboardHeaderProps) {
  const [isPending, startTransition] = useTransition();

  const handleTabSwitch = (mode: 'active' | 'completed' | 'time-machine' | 'accounting') => {
    startTransition(() => {
      setViewMode(mode);
      setTravelDate('');
      setDailyMetrics(null);
      if (isHistorical) handleExitTimeTravel();
    });
  };

  return (
    <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
      <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock className={`w-5 h-5 text-blue-500 ${isPending ? 'animate-pulse' : ''}`} />
              Appraisal Tracker
            </h1>
            <span className="logo-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Ledger & Timeline Snapshots</span>
          </div>
          <button 
            onClick={() => { setFormHomeAddress(homeAddress); setIsOptionsOpen(true); }}
            className="action-icon-btn" 
            title="Options & Settings"
            style={{ padding: '0.35rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '28px', height: '28px' }}
          >
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s ease-in-out' }}>
          <button
            onClick={() => handleTabSwitch('active')}
            className={`btn ${viewMode === 'active' && !isHistorical ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.8rem', border: viewMode === 'active' && !isHistorical ? '' : 'none', boxShadow: viewMode === 'active' && !isHistorical ? '' : 'none' }}
          >
            Active Orders
          </button>
          <button
            onClick={() => handleTabSwitch('completed')}
            className={`btn hide-on-mobile ${viewMode === 'completed' && !isHistorical ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.8rem', border: viewMode === 'completed' && !isHistorical ? '' : 'none', boxShadow: viewMode === 'completed' && !isHistorical ? '' : 'none' }}
          >
            Completed Orders
          </button>
          <button
            onClick={() => handleTabSwitch('accounting')}
            className={`btn hide-on-mobile ${viewMode === 'accounting' && !isHistorical ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.8rem', border: viewMode === 'accounting' && !isHistorical ? '' : 'none', boxShadow: viewMode === 'accounting' && !isHistorical ? '' : 'none' }}
          >
            Accounting
          </button>
          <button
            onClick={() => handleTabSwitch('time-machine')}
            className={`btn hide-on-mobile ${viewMode === 'time-machine' || isHistorical ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: viewMode === 'time-machine' || isHistorical ? '' : 'none', boxShadow: viewMode === 'time-machine' || isHistorical ? '' : 'none' }}
          >
            <Clock className="w-3.5 h-3.5" /> Time Machine
          </button>
        </div>

        {(viewMode === 'time-machine' || isHistorical) && (
          <div className="hide-on-mobile" style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsTimeTravelOpen(!isTimeTravelOpen)}
              className={`btn ${isHistorical ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px' }}
              id="btnTimeTravel"
            >
              <Calendar className="w-4 h-4" />
              {isHistorical && travelDate ? `Snapshot: ${travelDate}` : 'Select Date'}
            </button>

            {isTimeTravelOpen && (
              <div 
                className="modal-content" 
                style={{ 
                  position: 'absolute', 
                  left: '50%',
                  transform: 'translateX(-50%)', 
                  top: '120%', 
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
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {viewMode !== 'completed' && !isHistorical && (
          <button
            onClick={() => {
              if (filteredAppraisals.length > 0) {
                setIsMapModalOpen(true);
              } else {
                alert('No properties to map in current view.');
              }
            }}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px' }}
            title="Open Google Maps Route for up to 10 filtered properties"
          >
            <Map className="w-4 h-4" />
            Map View
          </button>
        )}
        
        <button
          onClick={() => {
            setIsAddModalOpen(true);
          }}
          disabled={isHistorical || viewMode === 'completed' || viewMode === 'time-machine'}
          className="btn btn-primary"
          style={{ 
            padding: '0.45rem 0.75rem', 
            fontSize: '0.8rem', 
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
  );
}
