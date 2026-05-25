import React from 'react';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { TimePicker, TimePickerProps } from '@mui/x-date-pickers/TimePicker';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import dayjs, { Dayjs } from 'dayjs';
import { styled } from '@mui/material/styles';

// Common styling for the text fields to match the custom CSS dark theme
const StyledInputProps = {
  sx: {
    '& .MuiInputBase-root': {
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '4px',
      color: 'var(--text-primary)',
      fontFamily: 'inherit',
      fontSize: '0.82rem',
      height: '38px',
    },
    '& .MuiInputBase-input': {
      padding: '0.45rem 0.65rem',
      boxSizing: 'border-box',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--border-color)',
      borderWidth: '1px',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--border-hover)',
    },
    '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--primary-accent)',
      borderWidth: '1px',
    },
    '& .MuiSvgIcon-root': {
      color: 'var(--text-secondary)',
      fontSize: '1.2rem',
    },
    '& .MuiInputBase-root.Mui-error .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--danger)',
    }
  }
};

const InlineInputProps = {
  sx: {
    '& .MuiInputBase-root': {
      backgroundColor: 'transparent !important',
      borderRadius: '0 !important',
      color: 'var(--text-primary)',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      height: '100% !important',
      minHeight: '38px',
    },
    '& .MuiInputBase-input': {
      padding: '0 0.5rem', 
      textAlign: 'center',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      border: 'none !important', 
    },
    '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      border: 'none !important',
    },
    '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
      border: 'none !important',
    },
    '& .MuiSvgIcon-root': {
      color: 'var(--text-secondary)',
      fontSize: '1.2rem',
    }
  }
};

export interface AppDatePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  value: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  isInline?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
}

export function AppDatePicker({ value, onChange, isInline, onBlur, onKeyDown, autoFocus, ...props }: AppDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isOpenRef = React.useRef(false);
  const parsedValue = value ? dayjs(value, 'YYYY-MM-DD') : null;

  React.useEffect(() => {
    if (isInline) {
      // Delay opening slightly to trigger enter animation
      const timer = setTimeout(() => {
        setOpen(true);
        isOpenRef.current = true;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isInline]);

  return (
    <DatePicker
      {...props}
      open={open}
      onOpen={() => { 
        setOpen(true);
        isOpenRef.current = true; 
      }}
      onClose={() => {
        setOpen(false);
        isOpenRef.current = false;
        if (isInline && onBlur) {
          onBlur({} as any);
        }
      }}
      value={parsedValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format('YYYY-MM-DD') : '');
      }}
      slotProps={{
        textField: {
          variant: 'outlined',
          fullWidth: true,
          sx: isInline ? InlineInputProps.sx : StyledInputProps.sx,
          onBlur: (e) => {
            const event = { ...e };
            setTimeout(() => {
              if (!isOpenRef.current && onBlur) {
                onBlur(event as any);
              }
            }, 200);
          },
          onKeyDown,
          autoFocus,
          onClick: () => {
            if (!open) {
              setOpen(true);
              isOpenRef.current = true;
            }
          }
        },
      }}
    />
  );
}

export interface AppTimePickerProps extends Omit<TimePickerProps, 'value' | 'onChange'> {
  value: string | null; // HH:mm
  onChange: (value: string) => void;
  isInline?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
}

export function AppTimePicker({ value, onChange, isInline, onBlur, onKeyDown, autoFocus, ...props }: AppTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isOpenRef = React.useRef(false);
  // Pad with an arbitrary date to parse time
  const parsedValue = value ? dayjs(`2000-01-01T${value}`) : null;

  React.useEffect(() => {
    if (isInline) {
      // Delay opening slightly to trigger enter animation and show hour dial correctly
      const timer = setTimeout(() => {
        setOpen(true);
        isOpenRef.current = true;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isInline]);

  return (
    <TimePicker
      {...props}
      open={open}
      onOpen={() => { 
        setOpen(true);
        isOpenRef.current = true; 
      }}
      onClose={() => {
        setOpen(false);
        isOpenRef.current = false;
        if (isInline && onBlur) {
          onBlur({} as any);
        }
      }}
      views={['hours', 'minutes']}
      minutesStep={5}
      viewRenderers={{
        hours: renderTimeViewClock,
        minutes: renderTimeViewClock,
      }}
      value={parsedValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format('HH:mm') : '');
      }}
      slotProps={{
        textField: {
          variant: 'outlined',
          fullWidth: true,
          sx: isInline ? InlineInputProps.sx : StyledInputProps.sx,
          onBlur: (e) => {
            const event = { ...e };
            setTimeout(() => {
              if (!isOpenRef.current && onBlur) {
                onBlur(event as any);
              }
            }, 200);
          },
          onKeyDown,
          autoFocus,
          onClick: () => {
            if (!open) {
              setOpen(true);
              isOpenRef.current = true;
            }
          }
        },
      }}
    />
  );
}
