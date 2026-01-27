import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import SortableTodoCard from './SortableTodoCard';
import type { Todo } from '../../types';

describe('SortableTodoCard', () => {
  it('renders without crashing', () => {
    const mockTodo: Todo = {
      id: '1',
      user_id: 'test-user',
      title: 'Test Todo',
      description: null,
      priority: 'Medium',
      completed: false,
      created_at: new Date().toISOString(),
      createdAt: Date.now(),
      due_datetime: null,
      dueDateTime: null,
      tags: [],
      position: 0,
      subtasks: [],
    };

    render(
      <BrowserRouter>
        <SortableTodoCard
          todo={mockTodo}
          onToggle={() => {}}
          onDelete={() => {}}
          onUpdateTags={() => {}}
          onAddSubtask={() => {}}
          onToggleSubtask={() => {}}
          onDeleteSubtask={() => {}}
        />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
