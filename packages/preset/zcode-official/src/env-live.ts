// Live env collection for the official env-info section builders.
// Ported adapter: the official runtime collects EnvInfo in
// apps/zcode-cli/packages/adapters/src/context/index.ts; here the same fields
// are collected synchronously and cheaply (git snapshot lazy per assembly).

import { execFileSync } from 'node:child_process'
import { basename, join } from 'node:path'
import { release } from 'node:os'
import type { EnvInfoText } from './official/env-info.ts'

const GIT_TIMEOUT_MS = 2000
const MAX_GIT_STATUS_BYTES = 20_000
const MAX_RECENT_COMMITS = 5

function git(args: readonly string[], cwd: string): string | undefined {
  try {
    return execFileSync('git', args, { cwd, timeout: GIT_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 })
      .toString()
      .trimEnd()
  } catch {
    return undefined
  }
}

/** Best-effort snapshot; returns not_repo-shaped info outside repositories. */
export function collectEnvInfo(cwd: string): EnvInfoText {
  const shellPath = process.env.SHELL ?? process.env.ComSpec ?? process.env.COMSPEC ?? ''
  const shell = shellPath ? basename(shellPath) : 'unknown'
  const revParse = git(['rev-parse', '--is-inside-work-tree'], cwd)
  if (revParse !== 'true') {
    return {
      cwd,
      isGitRepository: false,
      platform: process.platform,
      shell,
      osVersion: release(),
      gitStatus: 'not_repo',
    }
  }
  const branch = git(['branch', '--show-current'], cwd)
  const statusLines = git(['status', '--short'], cwd)
  const statusRaw = statusLines === undefined ? undefined : statusLines.slice(0, MAX_GIT_STATUS_BYTES)
  const status: 'clean' | 'dirty' = statusRaw !== undefined && statusRaw.length > 0 ? 'dirty' : 'clean'
  const recentCommits = git(
    ['log', '--oneline', `-${MAX_RECENT_COMMITS}`, '--format=%h %s'],
    cwd,
  )?.split('\n')
  const info: EnvInfoText = {
    cwd,
    isGitRepository: true,
    platform: process.platform,
    shell,
    osVersion: release(),
    gitStatus: status,
  }
  if (branch) info.gitBranch = branch
  if (statusRaw !== undefined && statusRaw.length > 0) info.gitStatusLines = statusRaw.split('\n')
  if (recentCommits && recentCommits.length > 0) info.recentCommits = recentCommits
  return info
}

/** Official memory root convention. */
export function memoryRootFor(cwd: string): string {
  return join(cwd, '.zcode', 'memory')
}

/** Local-ISO date in YYYY-MM-DD form (official formatLocalIsoDate date part). */
export function localIsoDate(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
