import { create } from 'zustand';
import type { AdminUser } from '../types/api.types';

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AdminUser) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

/** Đọc token + user từ localStorage đồng bộ ngay khi khởi tạo */
function getInitialState(): { token: string | null; user: AdminUser | null; isAuthenticated: boolean } {
  try {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr) as AdminUser;
      return { token, user, isAuthenticated: true };
    }
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
  return { token: null, user: null, isAuthenticated: false };
}

const initialState = getInitialState();

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setAuth: (token: string, user: AdminUser) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const state = getInitialState();
    set(state);
  },
}));
