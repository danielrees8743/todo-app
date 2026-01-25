import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AddTodoModal from './index';

describe('AddTodoModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAdd: vi.fn(),
  };

  it('renders correctly when open', () => {
    render(<AddTodoModal {...mockProps} />);
    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
  });

  it('updates input values', () => {
    render(<AddTodoModal {...mockProps} />);
    const titleInput = screen.getByPlaceholderText('What needs to be done?');
    fireEvent.change(titleInput, { target: { value: 'New Task' } });
    expect(titleInput).toHaveValue('New Task');
  });

  it('submits form with correct data', () => {
    render(<AddTodoModal {...mockProps} />);
    
    // Fill form
    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'New Task' } });
    fireEvent.change(screen.getByPlaceholderText('Add details...'), { target: { value: 'Details' } });
    
    // Select Priority (assuming Medium is default, let's change to High)
    fireEvent.click(screen.getByText('High'));
    
    // Submit
    fireEvent.click(screen.getByText('Create Task'));
    
    expect(mockProps.onAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New Task',
      description: 'Details',
      priority: 'High'
    }));
  });
});
