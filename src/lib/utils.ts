// Automatically format Illinois addresses
export const autoFormatAddress = (addressStr: string): string => {
  if (!addressStr) return '';
  const clean = addressStr.trim();
  
  const suffixes = [
    'st', 'street', 'rd', 'road', 'dr', 'drive', 'ave', 'avenue', 
    'ln', 'lane', 'blvd', 'boulevard', 'ct', 'court', 'pl', 'place', 
    'wy', 'way', 'ter', 'terrace', 'cir', 'circle', 'hwy', 'highway', 
    'pkwy', 'parkway', 'loop'
  ];

  const suffixPattern = new RegExp(
    `^(.*\\b(${suffixes.join('|')})\\b[.,\\s]*)(.*)$`, 
    'i'
  );
  
  const match = clean.match(suffixPattern);
  if (match) {
    let streetPart = match[1].trim();
    const remaining = match[3].trim();
    
    if (streetPart.endsWith(',')) {
      streetPart = streetPart.slice(0, -1).trim();
    }
    
    let cityPart = remaining;
    let zipPart = '';
    
    const zipMatch = cityPart.match(/\b\d{5}\b/);
    if (zipMatch) {
      zipPart = zipMatch[0];
      cityPart = cityPart.replace(/\b\d{5}\b/, '').trim();
    }
    
    cityPart = cityPart.replace(/,?\s*\b(il|illinois)\b/i, '').trim();
    
    if (cityPart.endsWith(',')) {
      cityPart = cityPart.slice(0, -1).trim();
    }
    if (cityPart.startsWith(',')) {
      cityPart = cityPart.slice(1).trim();
    }
    
    if (!cityPart) {
      if (!clean.toUpperCase().includes('IL')) {
        return `${clean}, IL`;
      }
      return clean;
    }
    
    let formatted = `${streetPart}, ${cityPart}, IL`;
    if (zipPart) {
      formatted += ` ${zipPart}`;
    }
    return formatted;
  }
  
  if (!clean.toLowerCase().includes('il') && !clean.toLowerCase().includes('illinois')) {
    return `${clean}, IL`;
  }
  
  return clean;
};

// Split date into Day of Week and Date values
export const splitDateLabel = (dateStr: string) => {
  if (!dateStr || dateStr === 'xx') return { weekday: 'xx', dateVal: '' };
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return { weekday: dateStr, dateVal: '' };
  
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  const dateVal = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit' }).format(date);
  
  return { weekday, dateVal };
};

// Time converter helpers (between 12-hour AM/PM and 24-hour HH:mm)
export const convertTo24Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr;
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

export const convertTo12Hour = (timeStr24: string): string => {
  if (!timeStr24) return '';
  const match = timeStr24.match(/^(\d{2}):(\d{2})$/);
  if (!match) return timeStr24;
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  if (hours === 0) hours = 12;
  
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

// Remove "unscheduled" (case-insensitive) from a status string
export const removeUnscheduled = (stats: string) => {
  if (!stats) return '';
  return stats
    .replace(/\bunscheduled\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Calculate fixed snapshot UTC ISO timestamp
export const getSnapshotTimestamp = (dateStr: string, step: number) => {
  const timeStr = step === 0 ? '08:00:00' : step === 1 ? '12:00:00' : '20:00:00';
  const localDate = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(localDate.getTime())) {
    return `${dateStr}T${timeStr}Z`;
  }
  return localDate.toISOString();
};

// Format address text to bold main street and muted city/state/zip on second line
export const splitAddress = (addressStr: string) => {
  if (!addressStr) return { primary: '', secondary: '' };
  
  // 1. Split by first comma if exists
  const commaIndex = addressStr.indexOf(',');
  if (commaIndex !== -1) {
    return {
      primary: addressStr.substring(0, commaIndex).trim(),
      secondary: addressStr.substring(commaIndex + 1).trim()
    };
  }

  // 2. Look for standard street suffixes as whole words
  const suffixes = [
    'st', 'street', 'ln', 'lane', 'ave', 'avenue', 'rd', 'road', 
    'blvd', 'boulevard', 'dr', 'drive', 'pl', 'place', 'ct', 'court', 
    'way', 'ter', 'terrace', 'cir', 'circle', 'hwy', 'highway', 'pkwy', 'parkway'
  ];
  
  const words = addressStr.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const normalizedWord = words[i].toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    if (suffixes.includes(normalizedWord)) {
      const primary = words.slice(0, i + 1).join(' ');
      const secondary = words.slice(i + 1).join(' ');
      return { primary, secondary };
    }
  }

  // 3. Fallback to known Illinois cities
  const cities = ['algonquin', 'geneva', 'bensenville', 'vernon hills', 'chicago', 'winfield', 'highland park', 'arlington heights'];
  const lowerAddress = addressStr.toLowerCase();
  for (const city of cities) {
    const idx = lowerAddress.indexOf(' ' + city);
    if (idx !== -1) {
      return {
        primary: addressStr.substring(0, idx + 1).trim(),
        secondary: addressStr.substring(idx + 1).trim()
      };
    }
  }

  // 4. Fallback split after first 3 words
  if (words.length > 3) {
    return {
      primary: words.slice(0, 3).join(' '),
      secondary: words.slice(3).join(' ')
    };
  }

  return { primary: addressStr, secondary: '' };
};

// Relative due date warning badges (overdue only)
export const getDueDateBadge = (dueDateStr: string) => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr + 'T00:00:00');
  if (isNaN(due.getTime())) return null;
  
  const cur = new Date();
  cur.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffMs = due.getTime() - cur.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, className: 'date-badge-overdue' };
  }
  return null;
};
