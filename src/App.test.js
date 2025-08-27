import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders loading message initially', () => {
  render(<App />);
  const loadingMessage = screen.getByText(/Preparando el café... digo, la aplicación./i);
  expect(loadingMessage).toBeInTheDocument();
});
