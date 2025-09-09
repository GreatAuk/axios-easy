import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/utils/index.ts'],
    },
  }
})
