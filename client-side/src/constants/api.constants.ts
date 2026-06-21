export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001";

export const getAuthUrl = (path = "") => `/auth${path}`;
export const getUsersUrl = (path = "") => `/users${path}`;

/** Полный URL OAuth-эндпоинта бэкенда — для full-page редиректа. */
export const getOAuthUrl = (provider: "google" | "yandex") =>
  `${API_URL}/auth/${provider}`;
