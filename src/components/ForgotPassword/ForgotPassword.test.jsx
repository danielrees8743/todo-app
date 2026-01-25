import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';

describe('ForgotPassword', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <ForgotPassword  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
