import { create } from 'zustand';
import { authApi } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'advisor' | 'admin';
}

export interface ScanResult {
  scan_id: string;
  disease: string;
  confidence: number;
  confidence_calibrated: number;
  gradcam_url: string;
  recommendations: string[];
  is_reliable: boolean;
  warning?: string;
  timestamp: string;
  image_uri?: string;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;

  // Scans
  recentScans: any[];
  latestResult: ScanResult | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setLatestResult: (result: ScanResult, imageUri?: string) => void;
  setRecentScans: (scans: any[]) => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  authLoading: true,
  recentScans: [],
  latestResult: null,

  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await get().loadUser();
  },

  register: async (name, email, password) => {
    const { data } = await authApi.register(name, email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await get().loadUser();
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ authLoading: false });
      return;
    }
    try {
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true, authLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, authLoading: false });
    }
  },

  setLatestResult: (result, imageUri) => {
    set({ latestResult: { ...result, image_uri: imageUri } });
  },

  setRecentScans: (scans) => set({ recentScans: scans }),
}));
