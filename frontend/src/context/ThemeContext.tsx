import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightColors = {
  background: '#FBFBFD',
  surface: '#FFFFFF',
  surface_alt: '#F2F2F7',
  primary: '#8C65F7',
  primary_foreground: '#FFFFFF',
  secondary: '#58D6A4',
  secondary_foreground: '#FFFFFF',
  accent: '#FFD37D',
  text_primary: '#1C1C1E',
  text_secondary: '#8E8E93',
  border: '#E5E5EA',
  error: '#FF453A',
  success: '#34C759',
  ai_bubble: '#F0EAFD',
};

const darkColors = {
  background: '#0F0F13',
  surface: '#1C1C1E',
  surface_alt: '#2C2C2E',
  primary: '#A688FA',
  primary_foreground: '#000000',
  secondary: '#6DE3B5',
  secondary_foreground: '#000000',
  accent: '#FFE19E',
  text_primary: '#F2F2F7',
  text_secondary: '#AEAEB2',
  border: '#38383A',
  error: '#FF453A',
  success: '#32D74B',
  ai_bubble: '#2A1F45',
};

export type ThemeColors = typeof lightColors;
type ThemeMode = 'auto' | 'light' | 'dark';

type ThemeContextType = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'auto') setModeState(saved);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem('theme_mode', m);
  };

  const isDark = mode === 'auto' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
