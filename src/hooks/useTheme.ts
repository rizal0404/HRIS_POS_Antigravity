"use client";

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'hris_theme';

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

    if (effectiveTheme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'system';
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        return stored || 'system';
    });

    const [isDark, setIsDark] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        const currentTheme = stored || 'system';
        return currentTheme === 'dark' || (currentTheme === 'system' && getSystemTheme() === 'dark');
    });

    // Apply theme on mount and when theme changes
    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
        setIsDark(effectiveTheme === 'dark');
    }, [theme]);

    // Listen for system theme changes when in 'system' mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            applyTheme('system');
            setIsDark(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState(current => {
            if (current === 'light') return 'dark';
            if (current === 'dark') return 'system';
            return 'light';
        });
    }, []);

    const cycleTheme = useCallback(() => {
        setThemeState(current => {
            if (current === 'light') return 'dark';
            if (current === 'dark') return 'light';
            return 'light'; // system -> light
        });
    }, []);

    return {
        theme,
        setTheme,
        toggleTheme,
        cycleTheme,
        isDark,
    };
}

export default useTheme;
