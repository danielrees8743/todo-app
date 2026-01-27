import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfile from './UserProfile';

const queryClient = new QueryClient();

describe('UserProfile', () => {
  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UserProfile />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    // Add more specific assertions here
  });
});
