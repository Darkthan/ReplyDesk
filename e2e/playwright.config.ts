import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
  },
  timeout: 30000,
  workers: 1,
});
