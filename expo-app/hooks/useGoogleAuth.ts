import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import * as Linking from 'expo-linking';
import { SERVICE_URLS } from '../src/services/apiClient';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const redirectUrl = Linking.createURL('/');
      const authUrl = `${SERVICE_URLS.AUTH}/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const { queryParams } = Linking.parse(result.url);
        const token = queryParams?.token as string;

        if (token) {
          await SecureStore.setItemAsync('user_token', token);
          return { success: true, token };
        } else {
          throw new Error('No se recibió el token de autenticación');
        }
      }
      return { success: false };
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('user_token');
  };

  const getToken = async () => {
    return await SecureStore.getItemAsync('user_token');
  };

  return {
    signIn,
    signOut,
    getToken,
    isLoading,
    error,
  };
}
