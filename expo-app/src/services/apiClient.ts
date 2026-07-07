import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// En emulador de Android, localhost es 10.0.2.2
const getBaseUrl = (port: number) => {
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${port}/api/v1`;
};

export const SERVICE_URLS = {
  AUTH: getBaseUrl(3003),
  CATALOG: getBaseUrl(3001),
  AVAILABILITY: getBaseUrl(3004),
  BOOKING: getBaseUrl(3005),
  CHATBOT: `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:4000/api/chat`,
};

const apiClient = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el JWT
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('user_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
