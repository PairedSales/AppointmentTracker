import React from 'react';
import { Sliders, CheckSquare, CheckCircle, Copy, Edit3, DollarSign } from 'lucide-react';
import { Appraisal } from '../types';
import {
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
  viewMode: 'active' | 'completed' | 'time-machine' | 'accounting';
  handleMarkPaid: (app: Appraisal) => void;
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
  viewMode,
  handleMarkPaid,
}: AppraisalTableProps) {
  return (
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
            {viewMode === 'completed' && <th style={{ textAlign: 'center' }}>Lender</th>}
            <th style={{ textAlign: 'right' }}>Fee</th>
            <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody style={{ opacity: isLoading && filteredAppraisals.length > 0 ? 0.4 : 1, transition: 'opacity 0.2s ease-in-out' }}>
          {isLoading && filteredAppraisals.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="skeleton-row">
                <td className="sticky-col"><div className="skeleton-bar"></div></td>
                <td><div className="skeleton-bar medium"></div></td>
                <td><div className="skeleton-bar short"></div></td>
                <td><div className="skeleton-bar short"></div></td>
                <td><div className="skeleton-bar short"></div></td>
                <td><div className="skeleton-bar short"></div></td>
                <td><div className="skeleton-bar medium"></div></td>
                {viewMode === 'completed' && <td><div className="skeleton-bar medium"></div></td>}
                <td><div className="skeleton-bar short"></div></td>
                <td></td>
              </tr>
            ))
          ) : filteredAppraisals.length === 0 ? (
            <tr>
              <td colSpan={viewMode === 'completed' ? 10 : 9} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <Sliders className="w-8 h-8 text-muted" style={{ opacity: 0.5 }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>No appointments found</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Try resetting the search query or changing active filters</span>
                </div>
              </td>
            </tr>
          ) : (
            filteredAppraisals.map((app) => {
              const dueBadge = getDueDateBadge(app.due_date);
              const inspDateLabel = splitDateLabel(app.inspection_date);
              const dueDateLabel = splitDateLabel(app.due_date);
              
              return (
                <tr 
                  key={app.id}
                  className={`appraisal-row ${viewMode !== 'completed' ? `row-cat-${app.color_category}` : ''} ${selectedRowIds.includes(app.id) ? 'selected-row' : ''}`}
                  onClick={(e) => handleRowClick(app.id, e)}
                  onTouchStart={() => handleTouchStart(app.address)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
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
                        {app.address}
                      </div>
                      {app.city && <div className="address-secondary">{app.city}</div>}
                    </div>
                  </td>

                  <td 
                    className="editable-cell"
                    style={{ textAlign: 'center' }}
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'type' });
                      setInlineValue(app.type);
                    }}
                  >
                    {editingCell?.id === app.id && editingCell?.field === 'type' ? (
                      <select
                        ref={inlineInputRef as any}
                        value={inlineValue}
                        onChange={(e) => setInlineValue(e.target.value)}
                        onBlur={() => handleInlineSave(app.id, 'type')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineSave(app.id, 'type');
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        className="inline-input"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="" disabled>Select Type...</option>
                        {[
                          "1004 Purchase", "1004 Refi", "1025 Purchase", "1025 Refi", 
                          "2055 Purchase", "2055 Refi", "Hybrid", "Final", "Private", 
                          "UAD 3.6", "1073 Purchase", "1073 Refi", "Field Review", "Desk Review",
                          "Manufactured", "Land", "Other", "Rent Schedule", "1004", "1073", "2055"
                        ].map(type => (
                          <option key={type} value={type} style={{ backgroundColor: '#121215', color: 'var(--text-primary)' }}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      app.type
                    )}
                  </td>

                  <td 
                    className="editable-cell"
                    style={{ textAlign: 'center' }}
                    onDoubleClick={() => {
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
                      app.inspection_date ? (
                        <div className="date-cell-wrapper-stacked" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span className="date-weekday">{inspDateLabel.weekday}</span>
                          {inspDateLabel.dateVal && <span className="date-sub">{inspDateLabel.dateVal}</span>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>xx</span>
                      )
                    )}
                  </td>

                  <td 
                    className="editable-cell"
                    style={{ textAlign: 'center' }}
                    onDoubleClick={() => {
                      if (isHistorical) return;
                      setEditingCell({ id: app.id, field: 'inspection_time' });
                      setInlineValue(app.inspection_time);
                    }}
                  >
                    {editingCell?.id === app.id && editingCell?.field === 'inspection_time' ? (
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
                    ) : (
                      app.inspection_time ? (
                        <div className="date-cell-wrapper-stacked" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span>{convertTo12Hour(app.inspection_time)}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>xx</span>
                      )
                    )}
                  </td>

                  <td 
                    className="editable-cell"
                    style={{ textAlign: 'center' }}
                    onDoubleClick={() => {
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
                      app.due_date ? (
                        <div className="date-cell-wrapper-stacked" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span className="date-weekday">{dueDateLabel.weekday}</span>
                          {dueDateLabel.dateVal && <span className="date-sub">{dueDateLabel.dateVal}</span>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>xx</span>
                      )
                    )}
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
                      (app.stats || dueBadge) ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          {app.stats && (
                            <span className={`status-badge ${app.stats.toLowerCase()}`}>
                              {app.stats}
                            </span>
                          )}
                          {dueBadge && (
                            <span className="date-badge date-badge-overdue">
                              {dueBadge.text}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )
                    )}
                  </td>

                  <td 
                    className="editable-cell"
                    style={{ textAlign: 'center' }}
                    onDoubleClick={() => {
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

                  {viewMode === 'completed' && (
                    <td 
                      className="editable-cell"
                      style={{ textAlign: 'center' }}
                      onDoubleClick={() => {
                        if (isHistorical) return;
                        setEditingCell({ id: app.id, field: 'lender' });
                        setInlineValue(app.lender || '');
                      }}
                    >
                      {editingCell?.id === app.id && editingCell?.field === 'lender' ? (
                        <input
                          ref={inlineInputRef as any}
                          type="text"
                          value={inlineValue}
                          onChange={(e) => setInlineValue(e.target.value)}
                          onBlur={() => handleInlineSave(app.id, 'lender')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleInlineSave(app.id, 'lender');
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="inline-input"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        app.lender || '-'
                      )}
                    </td>
                  )}

                  <td 
                    className="editable-cell fee-cell"
                    style={{ textAlign: 'right' }}
                    onDoubleClick={() => {
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
                        style={{ textAlign: 'right' }}
                      />
                    ) : (
                      `$${app.fee}`
                    )}
                  </td>

                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      {viewMode === 'completed' ? (
                        <button
                          onClick={() => handleMarkPaid(app)}
                          disabled={isHistorical}
                          title="Mark Paid"
                          className="action-icon-btn"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleMarkInspected(app)}
                            disabled={isHistorical || (app.stats || '').toLowerCase().includes('unscheduled')}
                            title={(app.stats || '').toLowerCase().includes('unscheduled') ? "Cannot mark unscheduled appraisal as inspected" : "Mark Inspected"}
                            className="action-icon-btn check-inspected"
                            style={{ opacity: (app.stats || '').toLowerCase().includes('unscheduled') ? 0.3 : 1 }}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMarkCompleted(app)}
                            disabled={isHistorical}
                            title="Mark Completed / Finished"
                            className="action-icon-btn complete"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openCloneModal(app)}
                            disabled={isHistorical}
                            title="Copy / Clone similar appraisal"
                            className="action-icon-btn"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(app)}
                            disabled={isHistorical}
                            title="Edit full appraisal details"
                            className="action-icon-btn"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </>
                      )}
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
