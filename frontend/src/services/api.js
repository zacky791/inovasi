import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
});

export function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (
    imagePath.startsWith('http') ||
    imagePath.startsWith('data:') ||
    imagePath.startsWith('blob:')
  ) {
    return imagePath;
  }
  return `${API_URL}/${imagePath}`;
}

export async function createReport(formData) {
  const response = await api.post('/api/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getReports() {
  const response = await api.get('/api/reports');
  return response.data;
}

export async function getReport(id) {
  const response = await api.get(`/api/reports/${id}`);
  return response.data;
}

export async function createSensorLog(payload) {
  const response = await api.post('/api/sensor/log', payload);
  return response.data;
}

export async function getSensorLogs(params = {}) {
  const response = await api.get('/api/sensor/logs', { params });
  return response.data;
}

export async function getLatestSensorLogs() {
  const response = await api.get('/api/sensor/logs/latest');
  return response.data;
}

export async function getDevices() {
  const response = await api.get('/api/sensor/devices');
  return response.data;
}

export default api;
