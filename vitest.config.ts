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
      all: true,
      include: [
        'lib/encryption.ts',
        'lib/emergency-alerts.ts',
        'lib/rateLimit.ts',
        'lib/request-ip.ts',
        'lib/rbac.ts',
        'lib/operations/activate-finished-good-unit.ts',
        'lib/operations/commerce-order-sync-outbox.ts',
        'lib/operations/commercial-order-reservation.ts',
        'domains/profiles/repositories/profile.repository.ts',
        'app/api/auth/register/route.ts',
        'app/api/orders/manual/route.ts',
        'app/api/organizations/corporate-chip/activate/route.ts',
      ],
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
