import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <ThemeToggle  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
