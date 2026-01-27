import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className='p-2.5 rounded-xl text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-stone-800 hover:scale-105 active:scale-95'
      aria-label='Toggle Dark Mode'
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
