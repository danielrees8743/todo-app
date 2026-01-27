import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './Header';

const queryClient = new QueryClient();

describe('Header', () => {
  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Header searchQuery='' onSearch={() => {}} />
        </BrowserRouter>
      </QueryClientProvider>,
    );
    // Add more specific assertions here
  });
});
