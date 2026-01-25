import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTodos } from './useTodos';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Import QueryClientProvider
import { supabase } from '../lib/supabase'; // Import the named export

// Create a chainable mock object
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  // Make it thenable to simulate a Promise
  then: vi.fn((resolve) => resolve({ data: [], error: null })),
};

// Update the mock to behave like a Promise for specific calls if needed, 
// but the 'then' property above handles default resolution.

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('useTodos', () => {
    let queryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createTestQueryClient();
        
        // Reset the default resolved value
        mockSupabaseChain.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
    });

    const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it('should fetch and return todos', async () => {
        const mockTodos = [
            { id: 1, title: 'Test Todo 1', position: 0, created_at: '2023-01-01T00:00:00Z', tags: [] },
            { id: 2, title: 'Test Todo 2', position: 1, created_at: '2023-01-02T00:00:00Z', tags: [] },
        ];
        
        // Mock the resolved value for this test
        mockSupabaseChain.then.mockImplementation((resolve) => resolve({ data: mockTodos, error: null }));

        const { result } = renderHook(() => useTodos(), { wrapper });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.todos).toHaveLength(2);
        expect(result.current.todos[0].title).toBe('Test Todo 1');
        expect(supabase.from).toHaveBeenCalledWith('todos');
    });

    it('should add a todo', async () => {
        const newTodo = { title: 'New Todo', description: 'desc', priority: 'Low' };
        const returnedTodo = { ...newTodo, id: 123, created_at: '2023-01-03T00:00:00Z', tags: [] };

        // Mock fetch return (empty initially)
        mockSupabaseChain.then.mockImplementationOnce((resolve) => resolve({ data: [], error: null })); 
        
        const { result } = renderHook(() => useTodos(), { wrapper });
        
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Mock insert return
        mockSupabaseChain.then.mockImplementation((resolve) => resolve({ data: [returnedTodo], error: null }));

        await act(async () => {
             await result.current.addTodo(newTodo);
        });

        expect(supabase.from).toHaveBeenCalledWith('todos');
        expect(mockSupabaseChain.insert).toHaveBeenCalled();
    });

    it('should toggle a todo', async () => {
         // Mock fetch return
         mockSupabaseChain.then.mockImplementationOnce((resolve) => resolve({ data: [{id: 1, completed: false}], error: null }));

         const { result } = renderHook(() => useTodos(), { wrapper });
         await waitFor(() => expect(result.current.loading).toBe(false));

         // Mock update return
         mockSupabaseChain.then.mockImplementation((resolve) => resolve({ error: null }));

         await act(async () => {
             await result.current.toggleTodo(1, false);
         });

         expect(mockSupabaseChain.update).toHaveBeenCalledWith({ completed: true });
         expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 1);
    });

    it('should delete a todo', async () => {
         // Mock fetch return
         mockSupabaseChain.then.mockImplementationOnce((resolve) => resolve({ data: [{id: 1}], error: null }));

         const { result } = renderHook(() => useTodos(), { wrapper });
         await waitFor(() => expect(result.current.loading).toBe(false));

         // Mock delete return
         mockSupabaseChain.then.mockImplementation((resolve) => resolve({ error: null }));

         await act(async () => {
             await result.current.deleteTodo(1);
         });

         expect(mockSupabaseChain.delete).toHaveBeenCalled();
         expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 1);
    });
});
