import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    // Allow camera access in development
    https: false,
  },
  // Optimize html5-qrcode
  optimizeDeps: {
    include: ['html5-qrcode', '@supabase/supabase-js', 'qrcode.react'],
  },
});
