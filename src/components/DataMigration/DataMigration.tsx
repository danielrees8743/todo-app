import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database, Trash2, Upload } from 'lucide-react';

interface LocalTodo {
  title: string;
  description?: string;
  priority?: string;
  completed?: boolean;
  createdAt?: number;
  dueDateTime?: string;
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function DataMigration() {
  const [localTodos, setLocalTodos] = useState<LocalTodo[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    // Check for local storage data
    const todos = localStorage.getItem('todos');
    if (todos) {
      try {
        const parsed = JSON.parse(todos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalTodos(parsed);
        }
      } catch (e) {
        console.error('Failed to parse local todos', e);
      }
    }
  }, []);

  const migrateTodos = async () => {
    setMigrating(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('You must be logged in to migrate data.');
      }

      const formattedTodos = localTodos.map((todo) => ({
        title: todo.title,
        description: todo.description,
        priority: todo.priority || 'Medium',
        completed: todo.completed || false,
        created_at: todo.createdAt
          ? new Date(todo.createdAt).toISOString()
          : new Date().toISOString(),
        due_datetime: todo.dueDateTime
          ? new Date(todo.dueDateTime).toISOString()
          : null,
      }));

      const { error } = await supabase.from('todos').insert(formattedTodos);

      if (error) throw error;

      // Success
      setMessage({
        type: 'success',
        text: `Successfully migrated ${localTodos.length} todos!`,
      });
      localStorage.removeItem('todos'); // Clear local data
      setLocalTodos([]); // Clear state

      // Emit event or refresh to show new data
      window.location.reload();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessage({ type: 'error', text: `Migration failed: ${errorMessage}` });
    } finally {
      setMigrating(false);
    }
  };

  const clearLocalData = () => {
    if (
      confirm(
        'Are you sure? This will delete your local data permanently without backing it up.',
      )
    ) {
      localStorage.removeItem('todos');
      setLocalTodos([]);
      setMessage({ type: 'info', text: 'Local data cleared.' });
    }
  };

  if (localTodos.length === 0) return null;

  return (
    <div className='fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-blue-100 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-bottom-4'>
      <div className='flex items-start gap-4'>
        <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
          <Database className='w-5 h-5 text-blue-600 dark:text-blue-400' />
        </div>
        <div className='flex-1'>
          <h3 className='font-semibold text-gray-900 dark:text-white'>
            Local Data Detected
          </h3>
          <p className='text-sm text-gray-700 dark:text-gray-300 mt-1'>
            Found {localTodos.length} tasks in your browser storage. Would you
            like to migrate them to your account?
          </p>

          {message && (
            <div
              className={`mt-3 p-2 rounded text-xs font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : message.type === 'error'
                    ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className='flex gap-2 mt-4'>
            <button
              onClick={migrateTodos}
              disabled={migrating}
              className='flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50'
            >
              {migrating ? (
                'Migrating...'
              ) : (
                <>
                  <Upload size={14} /> Migrate
                </>
              )}
            </button>
            <button
              onClick={clearLocalData}
              disabled={migrating}
              className='px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors'
              title='Delete local data'
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
