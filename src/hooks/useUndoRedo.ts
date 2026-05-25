import { useState, useCallback } from 'react';
import { HistoryAction } from '../types';

export function useUndoRedo(
  isHistorical: boolean,
  fetchAppraisals: () => void,
  clearSelection: () => void
) {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const pushAction = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > 50) {
        newStack.shift();
      }
      return newStack;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(async () => {
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
      clearSelection();
    } catch (err) {
      console.error('Undo failed:', err);
    }
  }, [isHistorical, undoStack, fetchAppraisals, clearSelection]);

  const redo = useCallback(async () => {
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
      clearSelection();
    } catch (err) {
      console.error('Redo failed:', err);
    }
  }, [isHistorical, redoStack, fetchAppraisals, clearSelection]);

  return {
    undoStack,
    redoStack,
    pushAction,
    undo,
    redo
  };
}
