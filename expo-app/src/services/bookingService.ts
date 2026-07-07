import apiClient, { SERVICE_URLS } from './apiClient';

export interface AvailabilityCheckParams {
  providerId: string;
  startTime: string;
  endTime: string;
}

export interface BookingParams {
  providerId: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
}

export const bookingService = {
  checkAvailability: async (params: AvailabilityCheckParams): Promise<{ available: boolean }> => {
    const response = await apiClient.get(`${SERVICE_URLS.AVAILABILITY}/availability/check`, {
      params
    });
    return response.data;
  },

  createBooking: async (data: BookingParams): Promise<any> => {
    const response = await apiClient.post(`${SERVICE_URLS.BOOKING}/bookings`, data);
    return response.data;
  }
};
