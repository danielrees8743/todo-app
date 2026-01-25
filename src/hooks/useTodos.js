import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useTodos() {
  const queryClient = useQueryClient();

  // Fetch Todos
  const { data: todos = [], isLoading: loading } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('todos')
        .select('*, subtasks(*)')
        .order('position', { ascending: true }) // Sort by position first
        .order('created_at', { ascending: false }); // Then by newest

      if (error) throw error;

      return data.map((t) => ({
        ...t,
        createdAt: new Date(t.created_at).getTime(),
        dueDateTime: t.due_datetime,
        tags: t.tags || [],
        position: t.position || 0, // Ensure position exists
        subtasks: t.subtasks
          ? t.subtasks.sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at),
            )
          : [],
      }));
    },
  });

  // Add Todo
  const addTodoMutation = useMutation({
    mutationFn: async (todo) => {
      // Get the minimum position to place new item at top if we want reverse chronological
      // Or max position if we want it at bottom.
      // Convention usually: New items at top.
      // If we sort by position ASC, we need a smaller position than the current min.
      // For now, let's just use default (0) and rely on the secondary sort (created_at DESC)
      // until the user manually moves it.

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
    mutationFn: async ({ id, completed }) => {
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
    mutationFn: async (id) => {
      const { error } = await supabase.from('todos').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Update Position
  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, position }) => {
      const { error } = await supabase
        .from('todos')
        .update({ position })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async ({ id, position }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update to the new value
      queryClient.setQueryData(['todos'], (old) => {
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
            return new Date(b.created_at) - new Date(a.created_at);
          });
      });

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['todos'], context.previousTodos);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Update Tags
  const updateTagsMutation = useMutation({
    mutationFn: async ({ id, tags }) => {
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

  // Subtask Mutations
  const addSubtaskMutation = useMutation({
    mutationFn: async ({ todoId, title }) => {
      const { error } = await supabase
        .from('subtasks')
        .insert([{ todo_id: todoId, title }]);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: !completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  });

  // Wrapper functions to maintain the same API signature for components
  const addTodo = (todo) => addTodoMutation.mutate(todo);
  // toggleTodo needs current status, which we can get from the todos list or pass in.
  // Ideally, components should pass the full object or status, but existing API takes ID.
  const toggleTodo = (id) => {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      toggleTodoMutation.mutate({ id, completed: todo.completed });
    }
  };
  const deleteTodo = (id) => deleteTodoMutation.mutate(id);
  const updateTags = (id, tags) => updateTagsMutation.mutate({ id, tags });
  const updatePosition = (id, position) =>
    updatePositionMutation.mutate({ id, position });

  const addSubtask = (todoId, title) =>
    addSubtaskMutation.mutate({ todoId, title });
  const toggleSubtask = (id, completed) =>
    toggleSubtaskMutation.mutate({ id, completed });
  const deleteSubtask = (id) => deleteSubtaskMutation.mutate(id);

  return {
    todos,
    toggleTodo,
    deleteTodo,
    addTodo,
    updateTags,
    updatePosition,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    loading,
  };
}
