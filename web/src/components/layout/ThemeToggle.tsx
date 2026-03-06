'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 延迟渲染直到 hydration 完成，避免 SSR/客户端不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="theme-toggle action-btn"
        aria-label="切换主题"
        title="切换主题"
      >
        <Sun size={20} className="sun-icon" style={{ display: 'block' }} />
        <Moon size={20} className="moon-icon" style={{ display: 'none' }} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle action-btn"
      aria-label="切换主题"
      title="切换主题"
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
