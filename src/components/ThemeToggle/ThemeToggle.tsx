import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className='p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500'
      aria-label='Toggle Dark Mode'
    >
      {darkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
