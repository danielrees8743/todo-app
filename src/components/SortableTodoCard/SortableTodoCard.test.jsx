import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SortableTodoCard from './SortableTodoCard';

describe('SortableTodoCard', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <SortableTodoCard todo={{id: 1, title: "Test Todo", tags: [], subtasks: []}} onToggle={() => {}} onDelete={() => {}} />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
