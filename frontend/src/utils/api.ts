import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export async function api(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    const detail = error.detail;
    throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ') : 'An error occurred');
  }
  return response.json();
}

export const CATEGORIES: Record<string, { icon: string; color: string; label: string }> = {
  fitness: { icon: 'fitness', color: '#58D6A4', label: 'Fitness' },
  learning: { icon: 'school', color: '#8C65F7', label: 'Learning' },
  productivity: { icon: 'briefcase', color: '#FFD37D', label: 'Productivity' },
  health: { icon: 'heart', color: '#FF6B6B', label: 'Health' },
  creativity: { icon: 'color-palette', color: '#FF9500', label: 'Creativity' },
  mindfulness: { icon: 'leaf', color: '#58D6A4', label: 'Mindfulness' },
  finance: { icon: 'cash', color: '#4CAF50', label: 'Finance' },
  other: { icon: 'star', color: '#8E8E93', label: 'Other' },
};
