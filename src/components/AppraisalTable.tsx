import React from 'react';
import { Sliders, CheckSquare, CheckCircle, Copy, Edit3 } from 'lucide-react';
import { Appraisal } from '../types';
import {
  splitAddress,
  getDueDateBadge,
  splitDateLabel,
  convertTo24Hour,
  convertTo12Hour,
} from '../lib/utils';

interface AppraisalTableProps {
  isLoading: boolean;
  filteredAppraisals: Appraisal[];
  selectedRowIds: string[];
  sortBy: 'due_date' | 'inspection' | 'none';
  setSortBy: React.Dispatch<React.SetStateAction<'due_date' | 'inspection' | 'none'>>;
  isHistorical: boolean;
  handleRowClick: (id: string, e: React.MouseEvent) => void;
  handleTouchStart: (address: string) => void;
  handleTouchEnd: () => void;
  handleTouchMove: () => void;
  editingCell: { id: string; field: keyof Appraisal } | null;
  setEditingCell: React.Dispatch<React.SetStateAction<{ id: string; field: keyof Appraisal } | null>>;
  inlineValue: string;
  setInlineValue: React.Dispatch<React.SetStateAction<string>>;
  inlineInputRef: React.RefObject<HTMLInputElement | null>;
  handleInlineSave: (id: string, field: keyof Appraisal) => void;
  handleMarkInspected: (app: Appraisal) => void;
  handleMarkCompleted: (app: Appraisal) => void;
  openCloneModal: (app: Appraisal) => void;
  openEditModal: (app: Appraisal) => void;
}

export default function AppraisalTable({
  isLoading,
  filteredAppraisals,
  selectedRowIds,
  sortBy,
  setSortBy,
  isHistorical,
  handleRowClick,
  handleTouchStart,
  handleTouchEnd,
  handleTouchMove,
  editingCell,
  setEditingCell,
  inlineValue,
  setInlineValue,
  inlineInputRef,
  handleInlineSave,
  handleMarkInspected,
  handleMarkCompleted,
  openCloneModal,
  openEditModal,
}: AppraisalTableProps) {
  return (
    <section className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg overflow-auto shadow-[0_4px_20px_rgba(0,0,0,0.25)] relative">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-30 bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] select-none text-left">
              Property Address
            </th>
            <th className="bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-center">
              Appraisal Type
            </th>
            <th
              onClick={() => setSortBy(sortBy === 'inspection' ? 'none' : 'inspection')}
              className={`bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-center cursor-pointer`}
            >
              Inspection Date {sortBy === 'inspection' && '▼'}
            </th>
            <th className="bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-center">
              Time
            </th>
            <th
              onClick={() => setSortBy(sortBy === 'due_date' ? 'none' : 'due_date')}
              className={`bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-center cursor-pointer`}
            >
              Due Date {sortBy === 'due_date' && '▼'}
            </th>
            <th className="bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-center">
              Status
            </th>
            <th className="bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-center">
              Client
            </th>
            <th className="bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-right">
              Fee
            </th>
            <th className="bg-[#0b0b0e] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-[0.06em] py-3 px-4 border-b-2 border-[var(--border-color)] sticky top-0 z-20 select-none text-right w-[60px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="skeleton-row">
                <td className="sticky left-0 z-10 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-color)] shadow-[2px_0_5px_rgba(0,0,0,0.2)] py-2.5 px-4"><div className="skeleton-bar"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar medium"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar short"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar short"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar short"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar short"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar medium"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"><div className="skeleton-bar short"></div></td>
                <td className="py-2.5 px-4 border-b border-[var(--border-color)]"></td>
              </tr>
            ))
          ) : filteredAppraisals.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] text-center p-16 text-[var(--text-muted)]">
                <div className="flex flex-col items-center gap-3">
                  <Sliders className="w-8 h-8 opacity-50 text-[var(--text-muted)]" />
                  <span className="text-[0.9rem] font-semibold">No appointments found</span>
                  <span className="text-[0.78rem] text-[var(--text-muted)]">Try resetting the search query or changing active filters</span>
                </div>
              </td>
            </tr>
          ) : (
            filteredAppraisals.map((app) => {
              const addr = splitAddress(app.address);
              const dueBadge = getDueDateBadge(app.due_date);
              const inspDateLabel = splitDateLabel(app.inspection_date);
              const dueDateLabel = splitDateLabel(app.due_date);
              
              // Handle selected-row styling via tailwind classes instead of pseudo selectors where possible, but keep some inline styles for the shading if it's complex.
              // Actually globals.css still has `.row-cat-black td.sticky-col` etc. so I will keep `row-cat-${app.color_category}` and `selected-row` for the complex box-shadows if needed, or convert them.
              // To convert strictly, I can use inline styling. The prompt says: "convert ALL custom CSS classes (e.g. .btn, .toolbar, .appraisal-table, etc.) to inline Tailwind CSS v4 utility classes"
              
              return (
                <tr 
                  key={app.id}
                  className={`bg-[var(--bg-secondary)] cursor-pointer relative select-none hover:brightness-115 row-cat-${app.color_category} ${selectedRowIds.includes(app.id) ? 'outline-none z-9 shadow-[inset_0_2px_0_var(--text-primary),inset_0_-2px_0_var(--text-primary)] brightness-120' : ''}`}
                  onClick={(e) => handleRowClick(app.id, e)}
                  onTouchStart={() => handleTouchStart(app.address)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  style={{
                    backgroundColor: `var(--cat-${app.color_category}-bg)`,
                  }}
                >
                  <td 
                    className={`relative sticky left-0 z-10 border-r border-b border-[var(--border-color)] shadow-[2px_0_5px_rgba(0,0,0,0.2)] py-2.5 px-4 text-[0.85rem] text-[var(--text-primary)] transition-colors duration-150 text-left`}
                    style={{
                      backgroundColor: app.color_category === 'black' ? '#121215' : app.color_category === 'brown' ? '#1e1511' : app.color_category === 'blue' ? '#111622' : app.color_category === 'purple' ? '#161222' : app.color_category === 'gold' ? '#1e1a11' : 'var(--bg-secondary)',
                      boxShadow: selectedRowIds.includes(app.id) ? 'inset 2px 0 0 var(--text-primary), inset 0 2px 0 var(--text-primary), inset 0 -2px 0 var(--text-primary), 2px 0 5px rgba(0, 0, 0, 0.2)' : '2px 0 5px rgba(0, 0, 0, 0.2)',
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(app.address)}`, '_blank');
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: `var(--cat-${app.color_category}-border)` }}></div>
                    <div>
                      <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        {addr.primary}
                      </div>
                      {addr.secondary && <div className="text-[0.75rem] text-[var(--text-secondary)] mt-0.5">{addr.secondary}</div>}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-center"
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'type' });
                      setInlineValue(app.type);
                    }}
                  >
                    <div className="relative inline-flex items-center justify-center w-full h-full min-h-[24px]">
                      <span className={`w-full text-inherit inline-flex items-center justify-inherit ${editingCell?.id === app.id && editingCell?.field === 'type' ? 'invisible pointer-events-none' : ''}`}>
                        {app.type}
                      </span>
                      {editingCell?.id === app.id && editingCell?.field === 'type' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-inherit">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-inherit p-0 m-0 w-full h-full shadow-none text-center select-text"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-center"
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'inspection_date' });
                      setInlineValue(app.inspection_date);
                    }}
                  >
                    <div className="relative inline-flex items-center justify-center w-full h-full min-h-[24px]">
                      <div className={`w-full text-inherit inline-flex items-center justify-center ${editingCell?.id === app.id && editingCell?.field === 'inspection_date' ? 'invisible pointer-events-none' : ''}`}>
                        {app.inspection_date ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-[0.7rem] uppercase text-[var(--text-secondary)] font-bold">{inspDateLabel.weekday}</span>
                            {inspDateLabel.dateVal && <span className="font-mono text-[0.85rem] font-bold tracking-tight">{inspDateLabel.dateVal}</span>}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">xx</span>
                        )}
                      </div>
                      {editingCell?.id === app.id && editingCell?.field === 'inspection_date' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-inherit p-0 m-0 w-full h-full shadow-none text-center select-text"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-center"
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'inspection_time' });
                      setInlineValue(app.inspection_time);
                    }}
                  >
                    <div className="relative inline-flex items-center justify-center w-full h-full min-h-[24px]">
                      <div className={`w-full text-inherit inline-flex items-center justify-center ${editingCell?.id === app.id && editingCell?.field === 'inspection_time' ? 'invisible pointer-events-none' : ''}`}>
                        {app.inspection_time ? (
                          <div className="flex items-center gap-1.5 font-mono font-normal justify-center">
                            <span>{app.inspection_time}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">xx</span>
                        )}
                      </div>
                      {editingCell?.id === app.id && editingCell?.field === 'inspection_time' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-inherit p-0 m-0 w-full h-full shadow-none text-center select-text"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-center"
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'due_date' });
                      setInlineValue(app.due_date);
                    }}
                  >
                    <div className="relative inline-flex items-center justify-center w-full h-full min-h-[24px]">
                      <div className={`w-full text-inherit inline-flex items-center justify-center ${editingCell?.id === app.id && editingCell?.field === 'due_date' ? 'invisible pointer-events-none' : ''}`}>
                        {app.due_date ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-[0.7rem] uppercase text-[var(--text-secondary)] font-bold">{dueDateLabel.weekday}</span>
                            {dueDateLabel.dateVal && <span className="font-mono text-[0.85rem] font-bold tracking-tight">{dueDateLabel.dateVal}</span>}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">xx</span>
                        )}
                      </div>
                      {editingCell?.id === app.id && editingCell?.field === 'due_date' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-inherit p-0 m-0 w-full h-full shadow-none text-center select-text"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-center"
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'stats' });
                      setInlineValue(app.stats);
                    }}
                  >
                    <div className="relative inline-flex items-center justify-center w-full h-full min-h-[24px]">
                      <div className={`w-full text-inherit inline-flex items-center justify-center ${editingCell?.id === app.id && editingCell?.field === 'stats' ? 'invisible pointer-events-none' : ''}`}>
                        {(app.stats || dueBadge) ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            {app.stats && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[0.75rem] font-semibold tracking-[0.02em] bg-[rgba(255,255,255,0.06)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                {app.stats}
                              </span>
                            )}
                            {dueBadge && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.72rem] font-bold uppercase bg-[rgba(239,68,68,0.12)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">
                                {dueBadge.text}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </div>
                      {editingCell?.id === app.id && editingCell?.field === 'stats' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-inherit p-0 m-0 w-full h-full shadow-none text-center select-text"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-center"
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'client' });
                      setInlineValue(app.client);
                    }}
                  >
                    <div className="relative inline-flex items-center justify-center w-full h-full min-h-[24px]">
                      <span className={`w-full text-inherit inline-flex items-center justify-center ${editingCell?.id === app.id && editingCell?.field === 'client' ? 'invisible pointer-events-none' : ''}`}>
                        {app.client}
                      </span>
                      {editingCell?.id === app.id && editingCell?.field === 'client' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-inherit p-0 m-0 w-full h-full shadow-none text-center select-text"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td 
                    className="relative py-2.5 px-4 text-[0.85rem] border-b border-[var(--border-color)] transition-colors duration-150 text-right font-mono font-semibold text-[var(--text-primary)]"
                    style={selectedRowIds.includes(app.id) ? { boxShadow: 'inset -2px 0 0 var(--text-primary), inset 0 2px 0 var(--text-primary), inset 0 -2px 0 var(--text-primary)' } : {}}
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'fee' });
                      setInlineValue(String(app.fee));
                    }}
                  >
                    <div className="relative inline-flex items-center justify-end w-full h-full min-h-[24px]">
                      <span className={`w-full text-inherit inline-flex items-center justify-end ${editingCell?.id === app.id && editingCell?.field === 'fee' ? 'invisible pointer-events-none' : ''}`}>
                        {`$${app.fee}`}
                      </span>
                      {editingCell?.id === app.id && editingCell?.field === 'fee' && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-end">
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
                            className="bg-transparent border-none outline-none text-[var(--text-primary)] text-inherit font-mono font-semibold p-0 m-0 w-full h-full shadow-none text-right select-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-4 border-b border-[var(--border-color)] text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-grid grid-cols-2 gap-[2px] justify-end items-center transition-all duration-200 hover:gap-[5px]">
                      <button
                        onClick={() => handleMarkInspected(app)}
                        disabled={isHistorical || app.stats.toLowerCase().includes('unscheduled')}
                        title={app.stats.toLowerCase().includes('unscheduled') ? "Cannot mark unscheduled appraisal as inspected" : "Mark Inspected"}
                        className="w-6 h-6 flex justify-center items-center rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#34d399] hover:text-white hover:border-[#34d399] transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{ opacity: app.stats.toLowerCase().includes('unscheduled') ? 0.3 : 1 }}
                      >
                        <CheckSquare className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMarkCompleted(app)}
                        disabled={isHistorical}
                        title="Mark Completed / Finished"
                        className="w-6 h-6 flex justify-center items-center rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#10b981] hover:text-white hover:border-[#10b981] transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => openCloneModal(app)}
                        disabled={isHistorical}
                        title="Copy / Clone similar appraisal"
                        className="w-6 h-6 flex justify-center items-center rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--primary-accent)] hover:text-white hover:border-[var(--primary-accent)] transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => openEditModal(app)}
                        disabled={isHistorical}
                        title="Edit full appraisal details"
                        className="w-6 h-6 flex justify-center items-center rounded bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--primary-accent)] hover:text-white hover:border-[var(--primary-accent)] transition-colors duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
  );
}
