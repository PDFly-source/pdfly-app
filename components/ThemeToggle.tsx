'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    const saved =
      (localStorage.getItem('pdfly_theme') as 'light' | 'dark' | 'system') ||
      'system';
    applyTheme(saved);
    const timer = setTimeout(() => {
      setTheme(saved);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const cycleTheme = () => {
    let next: 'light' | 'dark' | 'system' = 'light';
    if (theme === 'light') next = 'dark';
    else if (theme === 'dark') next = 'system';
    else next = 'light';

    setTheme(next);
    localStorage.setItem('pdfly_theme', next);
    applyTheme(next);
  };

  return (
    <button
      id="theme-toggle-btn"
      onClick={cycleTheme}
      aria-label={`Current theme: ${theme}. Click to change theme.`}
      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#5C554F] dark:text-[#A39991] hover:text-[#141213] dark:hover:text-[#F5F0EB] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      title={`Theme: ${theme.toUpperCase()}`}
      suppressHydrationWarning
    >
      {theme === 'light' && <Sun className="w-4 h-4 text-[#C6A15B]" />}
      {theme === 'dark' && <Moon className="w-4 h-4 text-[#C6A15B]" />}
      {theme === 'system' && <Laptop className="w-4 h-4" />}
    </button>
  );
};
