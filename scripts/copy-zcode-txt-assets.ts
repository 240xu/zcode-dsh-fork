/**
 * Copy ZCode evidence txt assets beside the built lib entries.
 *
 * The zcode-memory/zcode-prompt plugins read their prompt txt files at
 * import time relative to their own module file. tsc/tsdown do not copy
 * non-code assets, so without this step a published package (files[]
 * whitelists the lib-side txt paths) would ship a lib/ whose entry
 * crashes with ENOENT while unit tests pass via the tsconfig src alias.
 *
 * Wired at the end of the root `build:lib` chain. Idempotent and fast.
 * Run directly: `tsx scripts/copy-zcode-txt-assets.ts`.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

const assets: ReadonlyArray<readonly [string, string]> = [
  ['packages/experimental/zcode-memory/src/memory-prompt.txt', 'packages/experimental/zcode-memory/lib/memory-prompt.txt'],
  ['packages/experimental/zcode-prompt/src/identity-section.txt', 'packages/experimental/zcode-prompt/lib/identity-section.txt'],
  ['packages/experimental/zcode-prompt/src/dynamic-behavior.txt', 'packages/experimental/zcode-prompt/lib/dynamic-behavior.txt'],
  ['packages/experimental/zcode-prompt/src/context-management.txt', 'packages/experimental/zcode-prompt/lib/context-management.txt'],
]

let copied = 0
for (const [from, to] of assets) {
  const src = join(root, from)
  const dst = join(root, to)
  if (!existsSync(src)) throw new Error(`copy-zcode-txt-assets: missing source ${from}`)
  mkdirSync(dirname(dst), { recursive: true })
  copyFileSync(src, dst)
  copied += 1
}
console.log(`copy-zcode-txt-assets: copied ${copied} file(s)`)
