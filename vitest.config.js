import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const appNodeModules = resolve(__dirname, 'src/app/node_modules')

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/app/setup.js'],
    include: ['test/app/**/*.test.{js,jsx}'],
    deps: {
      moduleDirectories: ['node_modules', appNodeModules],
    },
  },
  resolve: {
    alias: {
      // Ensure single React instance from src/app
      'react': resolve(appNodeModules, 'react'),
      'react-dom': resolve(appNodeModules, 'react-dom'),
      '@testing-library/react': resolve(appNodeModules, '@testing-library/react'),
      '@testing-library/jest-dom': resolve(appNodeModules, '@testing-library/jest-dom'),
    },
  },
})
