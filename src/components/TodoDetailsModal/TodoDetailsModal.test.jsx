import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TodoDetailsModal from './TodoDetailsModal';

describe('TodoDetailsModal', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <TodoDetailsModal isOpen={true} onClose={() => {}} todo={{id: 1, title: "Test Todo", tags: [], subtasks: []}} onUpdateTodo={() => {}} />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
