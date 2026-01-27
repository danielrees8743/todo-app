import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Todo, NewTodo, TodoUpdates, Subtask } from '../types';

interface UseTodosReturn {
  todos: Todo[];
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addTodo: (todo: NewTodo) => void;
  updateTags: (id: string, tags: string[]) => void;
  updatePosition: (id: string, position: number) => void;
  updateTodoDetails: (id: string, updates: TodoUpdates) => void;
  addSubtask: (todoId: string, title: string) => void;
  toggleSubtask: (id: string, completed: boolean) => void;
  deleteSubtask: (id: string) => void;
  updateSubtaskPosition: (id: string, position: number) => void;
  loading: boolean;
}

interface DbTodo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
  created_at: string;
  due_datetime: string | null;
  tags: string[] | null;
  position: number | null;
  subtasks: Subtask[] | null;
}

export function useTodos(): UseTodosReturn {
  const queryClient = useQueryClient();

  // Fetch Todos
  const { data: todos = [], isLoading: loading } = useQuery({
    queryKey: ['todos'],
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from('todos')
        .select('*, subtasks(*)')
        .order('position', { ascending: true }) // Sort by position first
        .order('created_at', { ascending: false }); // Then by newest

      if (error) throw error;

      return (data as DbTodo[]).map((t) => ({
        ...t,
        createdAt: new Date(t.created_at).getTime(),
        dueDateTime: t.due_datetime,
        tags: t.tags || [],
        position: t.position || 0, // Ensure position exists
        subtasks: t.subtasks
          ? t.subtasks.sort((a, b) => {
               // Sort by position if available, else by created_at
               if (a.position !== undefined && b.position !== undefined && a.position !== b.position) {
                   return a.position - b.position;
               }
               return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })
          : [],
      }));
    },
  });

  // Add Todo
  const addTodoMutation = useMutation({
    mutationFn: async (todo: NewTodo) => {
      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            completed: todo.completed,
            due_datetime: todo.dueDateTime,
            created_at: new Date().toISOString(),
            tags: todo.tags || [],
            position: new Date().getTime(), // Simple initial position strategy
          },
        ])
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Toggle Todo
  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Delete Todo
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('todos').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Update Position
  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase
        .from('todos')
        .update({ position })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, position }: { id: string; position: number }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update to the new value
      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return [];
        return old
          .map((t) => (t.id === id ? { ...t, position } : t))
          .sort((a, b) => {
            // Replicate the sort logic from queryFn
            if (a.position !== b.position) {
              // Sort by position ASC
              return (a.position || 0) - (b.position || 0);
            }
            // Then by created_at DESC (newest first)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
      });

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Update Tags
  const updateTagsMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase
        .from('todos')
        .update({ tags })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Update Todo Details (Title, Description, Priority, Due Date)
  const updateTodoDetailsMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TodoUpdates }) => {
      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Subtask Mutations
  const addSubtaskMutation = useMutation({
    mutationFn: async ({ todoId, title }: { todoId: string; title: string }) => {
      const { error } = await supabase
        .from('subtasks')
        .insert([{ todo_id: todoId, title, position: 0 }]); // Default position
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: !completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const updateSubtaskPositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase
        .from('subtasks')
        .update({ position })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, position }: { id: string; position: number }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      queryClient.setQueryData<Todo[]>(['todos'], (old) => {
        if (!old) return [];
        return old.map((todo) => {
           if (todo.subtasks.some(s => s.id === id)) {
               return {
                   ...todo,
                   subtasks: todo.subtasks.map(s => s.id === id ? { ...s, position } : s)
               }
           }
           return todo;
        });
      });

      return { previousTodos };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  // Wrapper functions to maintain the same API signature for components
  const addTodo = (todo: NewTodo) => addTodoMutation.mutate(todo);
  const toggleTodo = (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      toggleTodoMutation.mutate({ id, completed: todo.completed });
    }
  };
  const deleteTodo = (id: string) => deleteTodoMutation.mutate(id);
  const updateTags = (id: string, tags: string[]) => updateTagsMutation.mutate({ id, tags });
  const updatePosition = (id: string, position: number) =>
    updatePositionMutation.mutate({ id, position });
  const updateTodoDetails = (id: string, updates: TodoUpdates) =>
    updateTodoDetailsMutation.mutate({ id, updates });

  const addSubtask = (todoId: string, title: string) =>
    addSubtaskMutation.mutate({ todoId, title });
  const toggleSubtask = (id: string, completed: boolean) =>
    toggleSubtaskMutation.mutate({ id, completed });
  const deleteSubtask = (id: string) => deleteSubtaskMutation.mutate(id);
  const updateSubtaskPosition = (id: string, position: number) => updateSubtaskPositionMutation.mutate({ id, position });

  return {
    todos,
    toggleTodo,
    deleteTodo,
    addTodo,
    updateTags,
    updatePosition,
    updateTodoDetails,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtaskPosition,
    loading,
  };
}
