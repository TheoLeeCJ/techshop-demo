// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': env.API_URL || 'http://localhost:8080',
        '/images': env.API_URL || 'http://localhost:8080'
      },
    },
    // Make env variables available to your app
    define: {
      __APP_ENV__: env.APP_ENV
    }
  }
})