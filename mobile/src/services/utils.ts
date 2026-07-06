import { API_URL } from './api';

/**
 * Converts a relative storage path like `/storage/gradcams/xyz.png`
 * to the full production URL: `https://tomease.icecloud.in/api/storage/gradcams/xyz.png`
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  // Strip /api suffix from API_URL if present, storage is served at base URL
  const base = API_URL;
  return `${base}${url}`;
}

export function getDiseaseColor(disease: string): string {
  if (disease === 'Healthy') return '#10b981';
  if (disease === 'TYLCV') return '#ef4444';
  return '#f59e0b';
}

export function getSeverityLabel(confidence: number): string {
  if (confidence > 0.9) return 'High Confidence';
  if (confidence > 0.7) return 'Moderate Confidence';
  return 'Low Confidence';
}
