import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WeatherWidget from './WeatherWidget';

describe('WeatherWidget', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <WeatherWidget  />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
