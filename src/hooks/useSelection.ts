import { useState, useCallback } from 'react';
import { Appraisal } from '../types';

export function useSelection(isHistorical: boolean, filteredAppraisals: Appraisal[]) {
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedRowIds([]);
    setLastSelectedId(null);
  }, []);

  const handleRowClick = useCallback((id: string, e: React.MouseEvent) => {
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
  }, [isHistorical, filteredAppraisals, lastSelectedId]);

  return {
    selectedRowIds,
    setSelectedRowIds,
    lastSelectedId,
    setLastSelectedId,
    clearSelection,
    handleRowClick
  };
}
