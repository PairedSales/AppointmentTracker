'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Define a minimal dark theme that matches the existing CSS variables
// This scopes Material UI mostly to the Date/Time pickers without taking over global styles.
const muiDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // matches var(--primary-accent)
    },
    background: {
      paper: '#18181b', // matches var(--bg-tertiary)
      default: '#09090b', // matches var(--bg-primary)
    },
    text: {
      primary: '#fafafa', // matches var(--text-primary)
      secondary: '#a1a1aa', // matches var(--text-secondary)
    },
    divider: '#27272a', // matches var(--border-color)
  },
  typography: {
    fontFamily: 'inherit',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #27272a',
        },
      },
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiDarkTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {children}
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
