import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PomodoroTimer from './PomodoroTimer';

describe('PomodoroTimer', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <PomodoroTimer  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
