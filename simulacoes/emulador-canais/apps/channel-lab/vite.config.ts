import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.CHANNEL_LAB_PORT ?? 15170);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('CHANNEL_LAB_PORT deve ser uma porta válida entre 1024 e 65535.');
  }
  return {
    plugins: [vanillaExtractPlugin(), react()],
    server: {
      host: env.CHANNEL_LAB_HOST ?? '127.0.0.1',
      port,
      strictPort: true,
    },
  };
});
