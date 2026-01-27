import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIChat from './AIChat';

const queryClient = new QueryClient();

describe('AIChat', () => {
  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AIChat todos={[]} onAddTodo={() => {}} onAddSubtask={() => {}} onToggleTodo={() => {}} />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    // Add more specific assertions here
  });
});
