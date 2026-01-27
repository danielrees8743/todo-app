import { useState, useEffect, type ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ListTodo,
  LogOut,
  User,
  Clock,
  AlertCircle,
  Search,
  X,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { supabase } from '../../lib/supabase';
import { useTodos } from '../../hooks/useTodos';
import type { Todo } from '../../types';

interface HeaderProps {
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

export default function Header({ searchQuery = '', onSearch }: HeaderProps) {
  const { todos } = useTodos();
  const [upcomingTask, setUpcomingTask] = useState<Todo | null>(null);
  const [timeLeft, setTimeLeft] = useState('');

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user!.id)
        .single();
      return data;
    },
  });

  const name = profile?.full_name || profile?.username || user?.email;
  const initials = name ? name.charAt(0).toUpperCase() : null;

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error logging out:', (error as Error).message);
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();

      // Find the nearest upcoming task
      const activeTasks = todos.filter(
        (t) =>
          !t.completed &&
          t.dueDateTime &&
          new Date(t.dueDateTime).getTime() > now,
      );

      if (activeTasks.length === 0) {
        setUpcomingTask(null);
        return;
      }

      // Sort by due date ascending
      const sortedTasks = activeTasks.sort(
        (a, b) =>
          new Date(a.dueDateTime!).getTime() - new Date(b.dueDateTime!).getTime(),
      );

      const nearest = sortedTasks[0];
      setUpcomingTask(nearest);

      const dueTime = new Date(nearest.dueDateTime!).getTime();
      const distance = dueTime - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Initial call

    return () => clearInterval(timer);
  }, [todos]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  const handleClearSearch = () => {
    onSearch?.('');
  };

  return (
    <header className='flex items-center justify-between px-6 py-4 bg-white dark:bg-stone-800 shadow-sm border-b border-stone-100 dark:border-stone-700 transition-colors duration-200'>
      <div className='flex items-center gap-6'>
        <Link
          to='/'
          className='flex items-center gap-3 hover:opacity-80 transition-opacity'
        >
          <div className='p-2 bg-violet-100 dark:bg-violet-900/50 rounded-xl text-violet-600 dark:text-violet-300'>
            <ListTodo size={24} />
          </div>
          <h1 className='text-xl font-bold text-stone-800 dark:text-white tracking-tight hidden sm:block'>
            TaskMaster
          </h1>
        </Link>

        <nav className='flex items-center gap-1 border-l border-stone-200 dark:border-stone-700 pl-4 h-8'>
          <Link
            to='/'
            className='p-2 text-stone-500 hover:bg-stone-100 hover:text-violet-600 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-violet-400 rounded-xl transition-colors'
            title='List View'
          >
            <ListTodo size={20} />
          </Link>
          <Link
            to='/calendar'
            className='p-2 text-stone-500 hover:bg-stone-100 hover:text-violet-600 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-violet-400 rounded-xl transition-colors'
            title='Calendar View'
          >
            <Calendar size={20} />
          </Link>
        </nav>
      </div>

      {upcomingTask && (
        <div className='hidden md:flex items-center gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-sm border border-amber-100 dark:border-amber-900/30'>
          <AlertCircle size={16} />
          <span className='font-medium max-w-37.5 truncate'>
            {upcomingTask.title}
          </span>
          <div className='flex items-center gap-1.5 font-mono bg-white dark:bg-stone-900 px-2.5 py-1 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/50'>
            <Clock size={12} />
            <span>{timeLeft}</span>
          </div>
        </div>
      )}

      <div className='flex items-center gap-4'>
        <div className='relative hidden sm:block'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
          <input
            type='text'
            placeholder='Search tasks...'
            aria-label='Search tasks'
            value={searchQuery}
            onChange={handleSearchChange}
            className='w-48 lg:w-64 pl-9 pr-4 py-2.5 bg-stone-100 dark:bg-stone-700 border-none rounded-xl text-sm text-stone-700 dark:text-stone-200 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all'
          />
          {searchQuery && (
            <button
              type='button'
              onClick={handleClearSearch}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
              aria-label='Clear search'
            >
              <X size={14} />
            </button>
          )}
        </div>
        <ThemeToggle />
        <Link
          to='/profile'
          className='flex items-center gap-2 hover:opacity-80 transition-opacity'
          title='Profile'
        >
          <div className='w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center text-sm font-semibold shadow-sm overflow-hidden'>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt='Profile'
                className='w-full h-full object-cover'
              />
            ) : (
              initials || <User size={16} />
            )}
          </div>
        </Link>
        <button
          type='button'
          onClick={handleLogout}
          className='flex items-center gap-2 p-2 text-stone-500 hover:text-red-500 dark:text-stone-400 dark:hover:text-red-400 transition-colors rounded-xl hover:bg-stone-100 dark:hover:bg-stone-700'
          title='Sign out'
          aria-label='Sign out'
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
