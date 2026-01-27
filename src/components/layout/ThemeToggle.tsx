'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle action-btn"
      aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      title={theme === 'light' ? '深色模式' : '浅色模式'}
    >
      <Sun
        size={20}
        className="sun-icon"
        style={{
          display: theme === 'light' ? 'block' : 'none',
        }}
      />
      <Moon
        size={20}
        className="moon-icon"
        style={{
          display: theme === 'dark' ? 'block' : 'none',
        }}
      />
    </button>
  );
}
