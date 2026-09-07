import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig({
  plugins: [vanillaExtractPlugin(), react()],
  server: {
    host: '127.0.0.1',
    port: 15171,
    strictPort: true,
  },
});

