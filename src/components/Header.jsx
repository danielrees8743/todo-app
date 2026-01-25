import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ListTodo,
  LogOut,
  User,
  Clock,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { supabase } from '../lib/supabase';
import { useTodos } from '../hooks/useTodos';

export default function Header({ searchQuery, onSearch }) {
  const { todos } = useTodos();
  const [upcomingTask, setUpcomingTask] = useState(null);
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
        .eq('id', user.id)
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
      console.error('Error logging out:', error.message);
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
          new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime(),
      );

      const nearest = sortedTasks[0];
      setUpcomingTask(nearest);

      const dueTime = new Date(nearest.dueDateTime).getTime();
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

  return (
    <header className='flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow-md transition-colors duration-200'>
      <div className='flex items-center gap-3'>
        <Link
          to='/'
          className='flex items-center gap-3 hover:opacity-80 transition-opacity'
        >
          <div className='p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300'>
            <ListTodo size={24} />
          </div>
          <h1 className='text-xl font-bold text-gray-800 dark:text-white tracking-tight hidden sm:block'>
            TaskMaster
          </h1>
        </Link>
      </div>

      {upcomingTask && (
        <div className='hidden md:flex items-center gap-3 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-sm border border-orange-100 dark:border-orange-900/30'>
          <AlertCircle size={16} />
          <span className='font-medium max-w-37.5 truncate'>
            {upcomingTask.title}
          </span>
          <div className='flex items-center gap-1.5 font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded-md shadow-sm border border-orange-100 dark:border-orange-900/50'>
            <Clock size={12} />
            <span>{timeLeft}</span>
          </div>
        </div>
      )}

      <div className='flex items-center gap-4'>
        <div className='relative hidden sm:block'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
          <input
            type='text'
            placeholder='Search tasks...'
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className='w-48 lg:w-64 pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm text-gray-700 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all'
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
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
          <div className='w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm overflow-hidden'>
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
          onClick={handleLogout}
          className='flex items-center gap-2 p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
          title='Sign out'
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
