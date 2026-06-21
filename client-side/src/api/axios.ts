import axios, { type CreateAxiosDefaults } from "axios";

import { API_URL } from "@/constants/api.constants";
import { authService } from "@/services/auth.service";
import {
  getAccessToken,
  removeFromStorage,
} from "@/services/auth-token.service";

const options: CreateAxiosDefaults = {
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // нужно, чтобы httpOnly refreshToken-cookie уходил на бэкенд
};

/** Без токена авторизации — для login/register/refresh. */
export const axiosClassic = axios.create(options);

/** С Bearer-токеном и авто-обновлением access-токена. */
export const axiosWithAuth = axios.create(options);

axiosWithAuth.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (config.headers && accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

axiosWithAuth.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthError =
      error?.response?.status === 401 ||
      error?.response?.data?.message === "jwt expired" ||
      error?.response?.data?.message === "jwt must be provided";

    if (isAuthError && originalRequest && !originalRequest._isRetry) {
      originalRequest._isRetry = true;

      try {
        await authService.getNewTokens();
        return axiosWithAuth.request(originalRequest);
      } catch {
        removeFromStorage();
      }
    }

    throw error;
  },
);
