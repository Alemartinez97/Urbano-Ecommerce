import axios from 'axios';

// En un entorno real, la URL base se tomaría de las variables de entorno
const API_BASE_URL = 'https://api.example.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token si es necesario
apiClient.interceptors.request.use(
  (config) => {
    // Ejemplo: const token = useAuthStore.getState().token;
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
