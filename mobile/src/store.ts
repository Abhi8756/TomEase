import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync('access_token', token);
    } else {
      await SecureStore.deleteItemAsync('access_token');
    }
    set({ token });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, token: null });
  },
}));
