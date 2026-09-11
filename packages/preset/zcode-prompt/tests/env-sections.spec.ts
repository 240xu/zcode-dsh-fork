/**
 * zcode-prompt environment sections: CLI prefix, env info, git system
 * context, and current date — shapes verbatim from the 3.10.2 builders
 * (are/Xjo/eFo/fre), values resolved live.
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildCliPrefix,
  buildCurrentDate,
  buildEnvInfo,
  buildSystemContext,
  detectShell,
  formatLocalDate,
  gitSnapshot,
  isGitRepository,
  renderSystemContext,
  truncateStatus,
} from '@deepseek-ai/dsh-zcode-prompt/src/env-sections.ts'

describe('the CLI prefix', () => {
  it('is the stable Djo line verbatim', () => {
    expect(buildCliPrefix()).toBe('You are ZCode, an interactive coding agent')
  })
})

describe('the env info', () => {
  it('renders the Xjo labels with live values', () => {
    const text = buildEnvInfo(process.cwd())
    expect(text).toContain('# Environment')
    expect(text).toContain('You have been invoked in the following environment:')
    expect(text).toContain(`- Primary working directory: ${process.cwd()}`)
    expect(text).toContain('- Platform: ')
    expect(text).toContain('- Shell: ')
    expect(text).toContain('- OS Version: ')
    expect(text).not.toContain('{{')
  })

  it('detects the shell the way detectEnvInfo does', () => {
    // Us.basename is node:path basename: platform-native separators only,
    // identical semantics on both sides by construction.
    expect(detectShell({ SHELL: '/bin/bash' })).toBe('bash')
    expect(detectShell({})).toBe('unknown')
  })
})

describe('the git system context', () => {
  it('renders nothing outside a repository', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zcode-norepo-'))
    try {
      expect(isGitRepository(dir)).toBe(false)
      expect(buildSystemContext(dir)).toBe('')
      expect(buildEnvInfo(dir)).toContain('Is a git repository: no')
      // second assembly hits the per-directory snapshot cache
      expect(gitSnapshot(dir)).toBeNull()
      expect(gitSnapshot(dir)).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('falls back to HEAD on an unborn branch, like upstream rpe', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zcode-unborn-'))
    try {
      execFileSync('git', ['init', '-b', 'main', dir], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'config', 'user.name', 'ZCode Test'], { stdio: 'ignore' })
      const text = buildSystemContext(dir)
      // rev-parse fails on unborn HEAD on some git builds; upstream and the
      // port both fall back to the literal 'HEAD' (verified on this host).
      expect(text).toContain('Current branch: HEAD')
      expect(text).toContain('Status:\n(clean)')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('resolves the main branch from the origin HEAD reference', () => {
    const bare = mkdtempSync(join(tmpdir(), 'zcode-origin-'))
    const dir = mkdtempSync(join(tmpdir(), 'zcode-clone-'))
    try {
      execFileSync('git', ['init', '--bare', '--initial-branch=main', bare], { stdio: 'ignore' })
      execFileSync('git', ['init', '-b', 'main', dir], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'config', 'user.name', 'ZCode Test'], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'commit', '--allow-empty', '-m', 'seed'], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'remote', 'add', 'origin', bare], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'push', '-u', 'origin', 'main'], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'remote', 'set-head', 'origin', '--auto'], { stdio: 'ignore' })
      const text = buildSystemContext(dir)
      expect(text).toContain('Main branch (you will usually use this for PRs): main')
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(bare, { recursive: true, force: true })
    }
  })

  it('renders the eFo shape inside a real repository', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zcode-repo-'))
    try {
      execFileSync('git', ['init', '-b', 'main', dir], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'config', 'user.name', 'ZCode Test'], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'config', 'user.email', 'test@example.com'], { stdio: 'ignore' })
      writeFileSync(join(dir, 'a.txt'), 'a\n')
      writeFileSync(join(dir, 'new.txt'), 'new\n')
      execFileSync('git', ['-C', dir, 'add', 'a.txt'], { stdio: 'ignore' })
      execFileSync('git', ['-C', dir, 'commit', '-m', 'first'], { stdio: 'ignore' })
      const text = buildSystemContext(dir)
      expect(text).toContain('gitStatus: This is the git status at the start of the conversation.')
      expect(text).toContain('Current branch: main')
      expect(text).toContain('Main branch (you will usually use this for PRs): main')
      expect(text).toContain('Git user: ZCode Test')
      expect(text).toContain('Status:')
      expect(text).toContain('?? new.txt')
      expect(text).toContain('Recent commits:')
      expect(text).toContain('first')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('truncates long status output with the platform tool note', () => {
    const out = truncateStatus(`${'x'.repeat(3000)}\nsecond`)
    expect(out).toContain('... (truncated because it exceeds 2k characters.')
    expect(out).toContain('using Bash')
  })

  it('renders the unset user as the literal word undefined, like upstream', () => {
    const text = renderSystemContext({
      branch: 'main',
      mainBranch: 'main',
      user: undefined,
      statusLines: [],
      recentCommits: [],
    })
    expect(text).toContain('Git user: undefined')
    expect(text).toContain('Status:\n(clean)')
  })
})

describe('the current date', () => {
  it('renders the fre shape with a local-ISO date', () => {
    expect(buildCurrentDate(new Date(2026, 8, 4))).toBe("# currentDate\nToday's date is 2026-09-04.")
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(buildCurrentDate()).toMatch(/^# currentDate\nToday's date is \d{4}-\d{2}-\d{2}\.$/)
  })
})
