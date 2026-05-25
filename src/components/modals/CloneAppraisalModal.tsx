import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Appraisal } from '../../types';
import { AppDatePicker, AppTimePicker } from '../Pickers';

interface CloneAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (id: string, newAddress: string, newDueDate: string) => Promise<void>;
  targetAppraisal: Appraisal | null;
}

export function CloneAppraisalModal({ isOpen, onClose, onClone, targetAppraisal }: CloneAppraisalModalProps) {
  const [cloneAddress, setCloneAddress] = useState('');
  const [cloneDueDate, setCloneDueDate] = useState('');

  useEffect(() => {
    if (isOpen && targetAppraisal) {
      setCloneAddress('');
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCloneDueDate(nextWeek.toISOString().split('T')[0]);
    }
  }, [isOpen, targetAppraisal]);

  if (!isOpen || !targetAppraisal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onClone(targetAppraisal.id, cloneAddress, cloneDueDate);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>Clone Appraisal</h2>
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong>Source:</strong> {targetAppraisal.address} <br/>
            <strong>Type:</strong> {targetAppraisal.type} | <strong>Fee:</strong> ${targetAppraisal.fee}
          </div>

          <div className="form-group">
            <label>New Address</label>
            <input
              type="text"
              required
              value={cloneAddress}
              onChange={(e) => setCloneAddress(e.target.value)}
              className="form-input"
              placeholder="e.g. 123 Main St, New City, IL"
            />
          </div>

          <div className="form-group">
            <label>New Due Date</label>
            <div style={{ height: '38px' }}>
              <AppDatePicker
                value={cloneDueDate}
                onChange={setCloneDueDate}
              />
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Clone Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
