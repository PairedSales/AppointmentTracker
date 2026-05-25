import React, { useState } from 'react';
import { X } from 'lucide-react';
import { autoFormatAddress, convertTo24Hour, convertTo12Hour, removeUnscheduled } from '../../lib/utils';
import { Appraisal } from '../../types';

interface AddAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (payload: any) => Promise<void>;
}

export function AddAppraisalModal({ isOpen, onClose, onAdd }: AddAppraisalModalProps) {
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

  if (!isOpen) return null;

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
    };

    await onAdd(payload);
    
    // Reset form after successful submission
    setFormAddress('');
    setFormCity('');
    setFormType('');
    setFormInspectionDate('');
    setFormInspectionTime('');
    setFormEffectiveDate('');
    setFormDueDate('');
    setFormStats('');
    setFormClient('');
    setFormLender('');
    setFormFee('');
    setFormAppraisedValue('');
    setFormSalePrice('');
    setFormClientOrder('');
    setFormLenderOrder('');
    setFormFhaCase('');
    setFormContactName('');
    setFormContactPhone('');
    setFormColorCategory('black');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add Appraisal Appointment</h2>
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
                placeholder="e.g. 1414 Harrison St"
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
                placeholder="e.g. Algonquin"
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
                placeholder="e.g. Compass, Class"
              />
            </div>

            <div className="form-group">
              <label>Lender (Optional)</label>
              <input
                type="text"
                value={formLender}
                onChange={(e) => setFormLender(e.target.value)}
                className="form-input"
                placeholder="e.g. Chase Bank"
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
                placeholder="e.g. 400"
              />
            </div>
            
            <div className="form-group">
              <label>Appraised Val ($)</label>
              <input
                type="number"
                value={formAppraisedValue}
                onChange={(e) => setFormAppraisedValue(e.target.value)}
                className="form-input"
                placeholder="e.g. 500000"
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
                placeholder="e.g. 450000"
              />
            </div>
            <div className="form-group">
              <label>FHA Case #</label>
              <input
                type="text"
                value={formFhaCase}
                onChange={(e) => setFormFhaCase(e.target.value)}
                className="form-input"
                placeholder="FHA Case Number"
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
                placeholder="Order Number"
              />
            </div>
            <div className="form-group">
              <label>Lender Order #</label>
              <input
                type="text"
                value={formLenderOrder}
                onChange={(e) => setFormLenderOrder(e.target.value)}
                className="form-input"
                placeholder="Lender Number"
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
                placeholder="Name"
              />
            </div>
            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="text"
                value={formContactPhone}
                onChange={(e) => setFormContactPhone(e.target.value)}
                className="form-input"
                placeholder="Phone"
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
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
