import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

describe('Login', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <Login  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
