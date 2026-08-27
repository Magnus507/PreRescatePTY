import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup-env.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      all: false,
      thresholds: {
        lines: 35,
        functions: 30,
        branches: 25,
        statements: 35,
      },
      exclude: [
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/**/not-found.tsx',
        'components/ui/**',
        'coverage/**',
        'docs/**',
        'node_modules/**',
        'prisma/**',
        'scripts/**',
        'tmp/**',
        'types/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/generated/**',
        'tests/helpers/**',
        'tests/factories/**',
      ],
    },
  },
})
