// src/config/app.ts 
// # App-wide configuration

export const APP_CONFIG = {
  name: 'INSEE Safety',
  version: '1.0.0',
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 10000,
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;