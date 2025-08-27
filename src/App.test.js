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

test('renders login page when no user is logged in', () => {
  render(<App />);
  const loginHeading = screen.getByRole('heading', { name: /iniciar sesión/i });
  expect(loginHeading).toBeInTheDocument();
});
