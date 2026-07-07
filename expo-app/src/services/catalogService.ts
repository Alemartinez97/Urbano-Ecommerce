import apiClient, { SERVICE_URLS } from './apiClient';

export interface Provider {
  id: string;
  name: string;
  category: string;
  rating: number;
  basePrice: number;
  image?: string;
  bio?: string;
}

export const catalogService = {
  getServices: async (): Promise<Provider[]> => {
    const response = await apiClient.get(`${SERVICE_URLS.CATALOG}/services`);
    return response.data;
  },
  
  getProviderById: async (id: string): Promise<Provider> => {
    const response = await apiClient.get(`${SERVICE_URLS.CATALOG}/services/${id}`);
    return response.data;
  }
};
