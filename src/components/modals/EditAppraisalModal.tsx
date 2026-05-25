import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { autoFormatAddress, convertTo24Hour, convertTo12Hour, removeUnscheduled } from '../../lib/utils';
import { Appraisal } from '../../types';

interface EditAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (payload: any, beforeAppraisal: Appraisal) => Promise<void>;
  targetAppraisal: Appraisal | null;
}

export function EditAppraisalModal({ isOpen, onClose, onEdit, targetAppraisal }: EditAppraisalModalProps) {
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formType, setFormType] = useState('');
  const [formInspectionDate, setFormInspectionDate] = useState('');
  const [formInspectionTime, setFormInspectionTime] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStats, setFormStats] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formLender, setFormLender] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formAppraisedValue, setFormAppraisedValue] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formClientOrder, setFormClientOrder] = useState('');
  const [formLenderOrder, setFormLenderOrder] = useState('');
  const [formFhaCase, setFormFhaCase] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formColorCategory, setFormColorCategory] = useState('black');
  
  const [formAmountDue, setFormAmountDue] = useState('');
  const [formPayments, setFormPayments] = useState<{amount: number, date: string}[]>([]);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');

  useEffect(() => {
    if (isOpen && targetAppraisal) {
      setFormAddress(targetAppraisal.address || '');
      setFormCity(targetAppraisal.city || '');
      setFormType(targetAppraisal.type || '');
      setFormInspectionDate(targetAppraisal.inspection_date || '');
      setFormInspectionTime(targetAppraisal.inspection_time || '');
      setFormEffectiveDate(targetAppraisal.effective_date || '');
      setFormDueDate(targetAppraisal.due_date || '');
      setFormStats(targetAppraisal.stats || '');
      setFormClient(targetAppraisal.client || '');
      setFormLender(targetAppraisal.lender || '');
      setFormFee(String(targetAppraisal.fee || 0));
      setFormAppraisedValue(String(targetAppraisal.appraised_value || ''));
      setFormSalePrice(String(targetAppraisal.sale_price || ''));
      setFormClientOrder(targetAppraisal.client_order_number || '');
      setFormLenderOrder(targetAppraisal.lender_order_number || '');
      setFormFhaCase(targetAppraisal.fha_case_number || '');
      setFormContactName(targetAppraisal.contact_name || '');
      setFormContactPhone(targetAppraisal.contact_phone || '');
      setFormColorCategory(targetAppraisal.color_category || 'black');
      
      setFormAmountDue(String(targetAppraisal.amount_due ?? targetAppraisal.fee ?? 0));
      let parsedPayments: {amount: number, date: string}[] = [];
      if (targetAppraisal.payments) {
        try { parsedPayments = JSON.parse(targetAppraisal.payments); } catch(e) {}
      }
      setFormPayments(parsedPayments);
      setNewPaymentAmount('');
      setNewPaymentDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, targetAppraisal]);

  if (!isOpen || !targetAppraisal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedAddress = formAddress.trim();
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
      city: formCity.trim(),
      type: formType,
      inspection_date: formInspectionDate,
      inspection_time: formInspectionTime,
      effective_date: formEffectiveDate,
      due_date: formDueDate,
      stats: finalStats,
      client: formClient,
      lender: formLender,
      fee: Number(formFee) || 0,
      sale_price: Number(formSalePrice) || null,
      appraised_value: Number(formAppraisedValue) || null,
      client_order_number: formClientOrder.trim() || null,
      lender_order_number: formLenderOrder.trim() || null,
      fha_case_number: formFhaCase.trim() || null,
      contact_name: formContactName.trim() || null,
      contact_phone: formContactPhone.trim() || null,
      color_category: finalColor,
      amount_due: Number(formAmountDue) || 0,
      amount_paid: formPayments.reduce((sum, p) => sum + p.amount, 0),
      paid_date: formPayments.length > 0 ? formPayments[formPayments.length - 1].date : null,
      payments: JSON.stringify(formPayments)
    };

    await onEdit(payload, targetAppraisal);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Appraisal Details</h2>
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Address</label>
              <input
                type="text"
                required
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>City</label>
              <input
                type="text"
                required
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type</label>
              <select
                required
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="form-input"
              >
                <option value="" disabled>Select Type</option>
                {[
                  "1004 Purchase", "1004 Refi", "1025 Purchase", "1025 Refi", 
                  "2055 Purchase", "2055 Refi", "Hybrid", "Final", "Private", 
                  "UAD 3.6", "1073 Purchase", "1073 Refi", "Field Review", "Desk Review",
                  "Manufactured", "Land", "Other", "Rent Schedule", "1004", "1073", "2055"
                ].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
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

            <div className="form-group">
              <label>Lender (Optional)</label>
              <input
                type="text"
                value={formLender}
                onChange={(e) => setFormLender(e.target.value)}
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
            
            <div className="form-group">
              <label>Effective Date</label>
              <input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
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
            
            <div className="form-group">
              <label>Appraised Val ($)</label>
              <input
                type="number"
                value={formAppraisedValue}
                onChange={(e) => setFormAppraisedValue(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Sale Price ($)</label>
              <input
                type="number"
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>FHA Case #</label>
              <input
                type="text"
                value={formFhaCase}
                onChange={(e) => setFormFhaCase(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Client Order #</label>
              <input
                type="text"
                value={formClientOrder}
                onChange={(e) => setFormClientOrder(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Lender Order #</label>
              <input
                type="text"
                value={formLenderOrder}
                onChange={(e) => setFormLenderOrder(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Contact Name</label>
              <input
                type="text"
                value={formContactName}
                onChange={(e) => setFormContactName(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="text"
                value={formContactPhone}
                onChange={(e) => setFormContactPhone(e.target.value)}
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

          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Payments & Ledger</h3>
            
            <div className="form-row" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Amount Due ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmountDue}
                  onChange={(e) => setFormAmountDue(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Total Paid ($)</label>
                <div className="form-input" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  ${formPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                </div>
              </div>
            </div>

            {formPayments.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label>Payment History</label>
                {formPayments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <span>{p.date}</span>
                    <span>${p.amount.toFixed(2)}</span>
                    <button type="button" onClick={() => setFormPayments(prev => prev.filter((_, idx) => idx !== i))} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Record Payment ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Date</label>
                <input
                  type="date"
                  value={newPaymentDate}
                  onChange={(e) => setNewPaymentDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '38px' }}
                onClick={() => {
                  if (newPaymentAmount && newPaymentDate) {
                    setFormPayments([...formPayments, { amount: Number(newPaymentAmount), date: newPaymentDate }]);
                    setNewPaymentAmount('');
                  }
                }}
              >
                Add
              </button>
            </div>
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
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
