import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TodoCard from './index';
// Mock the OpenAI library
vi.mock('../../lib/openai', () => ({
  getAISuggestions: vi.fn(),
}));

describe('TodoCard', () => {
  const mockTodo = {
    id: 1,
    title: 'Test Card',
    description: 'Test Desc',
    priority: 'High',
    completed: false,
    tags: ['work'],
    subtasks: [],
    createdAt: new Date().toISOString(),
  };

  const mockProps = {
    todo: mockTodo,
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onUpdateTags: vi.fn(),
    onAddSubtask: vi.fn(),
    onToggleSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
    onClick: vi.fn(),
  };

  it('renders todo information', () => {
    render(<TodoCard {...mockProps} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test Desc')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument(); // Priority badge
    expect(screen.getByText('#work')).toBeInTheDocument(); // Tag
  });

  it('styles completed items correctly', () => {
    const completedTodo = { ...mockTodo, completed: true };
    render(<TodoCard {...mockProps} todo={completedTodo} />);
    const title = screen.getByText('Test Card');
    expect(title).toHaveClass('line-through');
  });

  it('calls onToggle when check button is clicked', () => {
    render(<TodoCard {...mockProps} />);
    // Access the toggle button - tricky as it has an icon.
    // We can look for the title attribute we added "Mark as complete"
    const toggleButton = screen.getByTitle('Mark as complete');

    // Stop propagation is used in the component, so we need to ensure our test environment handles click events properly.
    // However, JSdom handles basic events.
    fireEvent.click(toggleButton);
    expect(mockProps.onToggle).toHaveBeenCalledWith(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<TodoCard {...mockProps} />);
    const deleteButton = screen.getByTitle('Delete task');
    fireEvent.click(deleteButton);
    expect(mockProps.onDelete).toHaveBeenCalledWith(1);
  });

  it('calls onClick when card is clicked (excluding buttons)', () => {
    render(<TodoCard {...mockProps} />);
    const card = screen.getByText('Test Card').closest('div').parentElement;
    // or select the main container
    // The main container has the onClick handler.

    // We can just click the title
    fireEvent.click(screen.getByText('Test Card'));
    expect(mockProps.onClick).toHaveBeenCalled();
  });
});
