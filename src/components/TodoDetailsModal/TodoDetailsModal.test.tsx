import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import TodoDetailsModal from './TodoDetailsModal';
import type { Todo } from '../../types';

describe('TodoDetailsModal', () => {
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
        <TodoDetailsModal
          isOpen={true}
          onClose={() => {}}
          todo={mockTodo}
          onUpdateTodo={() => {}}
          onAddSubtask={() => {}}
          onToggleSubtask={() => {}}
          onDeleteSubtask={() => {}}
        />
      </BrowserRouter>
    );
    // Add more specific assertions here
  });
});
