import api from './api';
import type { LoginResponse } from '../types/api.types';

export const authService = {
  login: async (username: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { username, password });
    return data.data;
  },

  getProfile: async () => {
    const { data } = await api.get('/auth/me');
    return data.data;
  },
};
