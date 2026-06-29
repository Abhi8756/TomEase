import axios from 'axios';

// ⚠️ CHANGE THIS to your IceCloud deployment URL
// e.g., 'https://your-app-name.icecloud.in'
// See ICECLOUD_DEPLOYMENT_GUIDE.md for instructions
const API_URL = 'http://localhost:8080';

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

    const response = await axios.post(`${API_URL}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 seconds
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
    const response = await axios.get(`${API_URL}/model/info`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch model info:', error);
    return null;
  }
}

export async function checkHealth() {
  try {
    const response = await axios.get(`${API_URL}/health`);
    return response.data.status === 'healthy';
  } catch (error) {
    return false;
  }
}
