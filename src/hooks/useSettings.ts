import { useState, useCallback } from 'react';

export function useSettings() {
  const [notes, setNotes] = useState('');
  const [notesFontSize, setNotesFontSize] = useState(16);
  const [weeksInYear, setWeeksInYear] = useState<number>(52);
  const [homeAddress, setHomeAddress] = useState('1724 Locust Pl Schaumburg, IL 60173');
  const [homeLat, setHomeLat] = useState<number>(42.0494);
  const [homeLng, setHomeLng] = useState<number>(-88.0436);
  const [showFontControls, setShowFontControls] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [formHomeAddress, setFormHomeAddress] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (data) {
        setNotes(data.notes || '');
        setNotesFontSize(data.notes_font_size || 16);
        setWeeksInYear(data.weeks_in_year || 52);
        if (data.home_address) setHomeAddress(data.home_address);
        if (data.home_lat) setHomeLat(data.home_lat);
        if (data.home_lng) setHomeLng(data.home_lng);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, []);

  const handleNotesChange = useCallback(async (val: string) => {
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
  }, []);

  const handleFontSizeChange = useCallback(async (increment: boolean) => {
    setNotesFontSize(prev => {
      let newSize = prev + (increment ? 2 : -2);
      newSize = Math.max(10, Math.min(32, newSize));
      
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_font_size: newSize })
      }).catch(err => console.error('Failed to save font size:', err));

      return newSize;
    });
  }, []);

  const handleWeeksInYearChange = useCallback(async (val: number) => {
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
  }, []);

  const checkSelection = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) {
      setShowFontControls(true);
    } else {
      setShowFontControls(false);
    }
  }, []);

  return {
    notes,
    setNotes,
    notesFontSize,
    setNotesFontSize,
    weeksInYear,
    setWeeksInYear,
    homeAddress,
    setHomeAddress,
    homeLat,
    setHomeLat,
    homeLng,
    setHomeLng,
    showFontControls,
    setShowFontControls,
    isOptionsOpen,
    setIsOptionsOpen,
    formHomeAddress,
    setFormHomeAddress,
    fetchSettings,
    handleNotesChange,
    handleFontSizeChange,
    handleWeeksInYearChange,
    checkSelection
  };
}
