import axios from 'axios';
import { useStore } from '../store';
import * as SecureStore from 'expo-secure-store';

// Production: ICE Cloud backend
export const API_URL = 'https://tomease.icecloud.in/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration/refresh (simplified)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

export interface PredictionResult {
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

export async function predictDisease(imageUri: string): Promise<PredictionResult> {
  try {
    const formData = new FormData();
    
    // @ts-ignore - React Native FormData handles files differently
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'leaf.jpg',
    });

    const response = await api.post('/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Server error');
    } else if (error.request) {
      throw new Error('Network error - please check your connection');
    } else {
      throw new Error('Failed to process image');
    }
  }
}

export async function getModelInfo() {
  try {
    const response = await api.get('/model/info');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch model info:', error);
    return null;
  }
}

export async function checkHealth() {
  try {
    const response = await api.get('/health');
    return response.data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

