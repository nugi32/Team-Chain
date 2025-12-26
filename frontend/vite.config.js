import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about/index.html'),
        dashboard: resolve(__dirname, 'dashboard/index.html'),
        owner: resolve(__dirname, 'owner/index.html'),
        Projects: resolve(__dirname, 'Projects/index.html'),
        Register: resolve(__dirname, 'Register/index.html'),
        task: resolve(__dirname, 'task/index.html'),
        taskDetail: resolve(__dirname, 'taskDetail/index.html')
      }
    }
  }
})