import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the supabase client to prevent errors in test environment
jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signOut: jest.fn(),
    },
  },
}));

test('renders loading message initially', () => {
  render(<App />);
  const loadingMessage = screen.getByText(/Preparando el café... digo, la aplicación./i);
  expect(loadingMessage).toBeInTheDocument();
});
