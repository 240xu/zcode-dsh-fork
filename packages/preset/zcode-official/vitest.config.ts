import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Standalone config: the host repo's vitest.config.ts needs the full
// dependency tree (vite-tsconfig-paths etc.) that this machine cannot install.
// Resolves workspace sources by absolute alias instead.
const root = fileURLToPath(new URL('../../..', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@deepseek-ai/cordis': root + '/vendor/cordis/src/index.ts',
      '@deepseek-ai/dsh-system-prompt': root + '/packages/core/system-prompt/src/index.ts',
      '@deepseek-ai/schemastery': root + '/vendor/schemastery/src/index.ts',
      '@deepseek-ai/cosmokit': root + '/vendor/cosmokit/src/index.ts',
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
