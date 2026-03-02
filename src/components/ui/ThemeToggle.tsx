import React from 'react';
import { Sun, Moon } from 'lucide-react';

type ThemeToggleProps = {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
};

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ darkMode, setDarkMode }) => (
  <button 
    onClick={() => setDarkMode(!darkMode)}
    className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
  >
    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
  </button>
);
