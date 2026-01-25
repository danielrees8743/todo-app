import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TodoDetailsModal from './index';

describe('TodoDetailsModal', () => {
  const mockTodo = {
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    priority: 'Medium',
    dueDateTime: null,
    subtasks: [],
    completed: false,
  };

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    todo: mockTodo,
    onUpdateTodo: vi.fn(),
    onAddSubtask: vi.fn(),
    onToggleSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
  };

  it('does not render when closed', () => {
    render(<TodoDetailsModal {...mockProps} isOpen={false} />);
    expect(screen.queryByText('Task Details')).not.toBeInTheDocument();
  });

  it('renders correctly when open', () => {
    render(<TodoDetailsModal {...mockProps} />);
    expect(screen.getByText('Task Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<TodoDetailsModal {...mockProps} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('updates form data when inputs change', () => {
    render(<TodoDetailsModal {...mockProps} />);
    const titleInput = screen.getByDisplayValue('Test Todo');

    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    expect(titleInput).toHaveValue('Updated Title');
  });
});
