import React from 'react';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { TimePicker, TimePickerProps } from '@mui/x-date-pickers/TimePicker';
import { MobileDatePicker } from '@mui/x-date-pickers/MobileDatePicker';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { styled } from '@mui/material/styles';

// Common styling for the text fields to match the custom CSS dark theme
const StyledInputProps = {
  sx: {
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    height: '100%',
    '.MuiInputBase-input': {
      padding: '0.45rem 0.65rem',
      height: 'auto',
      boxSizing: 'border-box',
    },
    '.MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--border-color)',
      borderWidth: '1px',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--border-hover)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--primary-accent)',
      borderWidth: '1px',
    },
    '.MuiSvgIcon-root': {
      color: 'var(--text-secondary)',
      fontSize: '1.2rem',
    },
    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
      borderColor: 'var(--danger)',
    }
  }
};

// Inline variants for AppraisalTable inline editing
const InlineInputProps = {
  sx: {
    backgroundColor: 'transparent',
    borderRadius: '0',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    height: '100%',
    width: '100%',
    '.MuiInputBase-input': {
      padding: '0.65rem 1rem', // Match table cell padding roughly
      height: 'auto',
      textAlign: 'center',
    },
    '.MuiOutlinedInput-notchedOutline': {
      border: 'none', // Remove border for inline edit
    },
    '.MuiSvgIcon-root': {
      display: 'none', // Hide icon for inline editing to save space
    }
  }
};

export interface AppDatePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
  value: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  isInline?: boolean;
}

export function AppDatePicker({ value, onChange, isInline, ...props }: AppDatePickerProps) {
  const parsedValue = value ? dayjs(value, 'YYYY-MM-DD') : null;

  return (
    <DatePicker
      {...props}
      value={parsedValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format('YYYY-MM-DD') : '');
      }}
      slotProps={{
        textField: {
          variant: 'outlined',
          fullWidth: true,
          sx: isInline ? InlineInputProps.sx : StyledInputProps.sx,
        },
      }}
    />
  );
}

export interface AppTimePickerProps extends Omit<TimePickerProps, 'value' | 'onChange'> {
  value: string | null; // HH:mm
  onChange: (value: string) => void;
  isInline?: boolean;
}

export function AppTimePicker({ value, onChange, isInline, ...props }: AppTimePickerProps) {
  // Pad with an arbitrary date to parse time
  const parsedValue = value ? dayjs(`2000-01-01T${value}`) : null;

  return (
    <TimePicker
      {...props}
      value={parsedValue}
      onChange={(newValue) => {
        onChange(newValue ? newValue.format('HH:mm') : '');
      }}
      slotProps={{
        textField: {
          variant: 'outlined',
          fullWidth: true,
          sx: isInline ? InlineInputProps.sx : StyledInputProps.sx,
        },
      }}
    />
  );
}
