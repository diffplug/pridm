import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pridmApi } from './src/server/api.ts';

export default defineConfig({
  plugins: [react(), pridmApi()],
});
