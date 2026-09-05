/**
 * ZCode 3.10.2 environment sections for the zcode agent preset.
 *
 * Ports three dynamic builders verbatim in shape, with values resolved live
 * (evidence: 240xu/zcode-agent findings/prompt-assembly-3.10.2.json):
 *
 * - CLI prefix (`are`): the stable single line `Djo`.
 * - Environment Info (`Rut`/`Xjo`): labels verbatim; values from the same
 *   sources as `detectEnvInfo` (cwd, git presence, platform, shell
 *   basename, `platform release arch`). The conditional model line is
 *   omitted exactly when the model is unknown — this deployment never
 *   knows it at assembly time, so the line is always omitted.
 * - System Context (`Put`/`eFo`): the git snapshot at conversation start.
 *   Values come from the same git invocations (`u8t` family: 3s timeout,
 *   1MB buffer, `--no-optional-locks` on status/log, 5 log lines, 2000-char
 *   status truncation). Snapshot cached per cwd: the first assembly wins,
 *   which is the session start for CLI/headless deployments. Non-repos
 *   render `''` (dropped by the assembler), mirroring `Put` → null.
 * - Current Date (`fre`): `# currentDate` plus the local-ISO date (`BZ`).
 *
 * No `{{variable}}` references: every value is rendered before assembly so
 * these sections never depend on variable providers.
 * @module @deepseek-ai/dsh-zcode-prompt/env-sections
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { arch, platform, release } from 'node:os'

/** The stable CLI prefix line (`Djo`), verbatim. */
export function buildCliPrefix(): string {
  return 'You are ZCode, an interactive coding agent'
}

/** Shell display name: basename of SHELL/ComSpec, else `unknown`. */
export function detectShell(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.SHELL ?? env.ComSpec ?? env.COMSPEC ?? ''
  return raw !== '' ? basename(raw) : 'unknown'
}

/** `Is a git repository` answer mirroring `C1e` minus live git fields. */
export function isGitRepository(cwd: string = process.cwd()): boolean {
  if (existsSync(join(cwd, '.git'))) return true
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd, encoding: 'utf8', timeout: 3000, windowsHide: true,
    }).trim() === 'true'
  } catch {
    return false
  }
}

/** Environment Info section (`Xjo` shape), values resolved live. */
export function buildEnvInfo(cwd: string = process.cwd()): string {
  return [
    '# Environment',
    'You have been invoked in the following environment:',
    `- Primary working directory: ${cwd}`,
    `- Is a git repository: ${isGitRepository(cwd) ? 'yes' : 'no'}`,
    `- Platform: ${platform()}`,
    `- Shell: ${detectShell()}`,
    `- OS Version: ${platform()} ${release()} ${arch()}`,
  ].join('\n')
}

interface GitSnapshot {
  readonly branch: string | undefined
  readonly mainBranch: string | undefined
  readonly user: string | undefined
  readonly statusLines: readonly string[]
  readonly recentCommits: readonly string[]
}

/** One git invocation mirroring `l8t` (3s timeout, 1MB buffer, '' on any failure). */
function git(args: readonly string[], cwd: string): string | undefined {
  try {
    const out = execFileSync('git', [...args], {
      cwd, encoding: 'utf8', timeout: 3000, maxBuffer: 1024 * 1024, windowsHide: true,
    } as const).trim()
    return out === '' ? undefined : out
  } catch {
    return undefined
  }
}

function splitLines(text: string | undefined): string[] {
  if (text === undefined || text === '') return []
  return text.split(/\r?\n/u).filter(line => line.length > 0)
}

/** Status truncation mirroring `zPn` (2000 chars + platform tool note). */
export function truncateStatus(text: string): string {
  if (text.length <= 2000) return text
  /* v8 ignore next -- win32-only branch; exercised on Windows CI, unreachable on posix hosts */
  const tool = platform() === 'win32' ? 'PowerShell' : 'Bash'
  return `${text.substring(0, 2000)}\n... (truncated because it exceeds 2k characters. If you need more information, run "git status" using ${tool})`
}

/** Full git snapshot mirroring `u8t` (branch/main/user/status/log). */
export function readGitSnapshot(cwd: string): GitSnapshot | null {
  if (!isGitRepository(cwd)) return null
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd) ?? 'HEAD'
  const originHead = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], cwd)?.replace(/^origin\//u, '')
  const candidates = originHead !== undefined ? [originHead, 'main', 'master'] : ['main', 'master']
  let mainBranch = 'main'
  for (const candidate of candidates) {
    try {
      execFileSync('git', ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${candidate}`], {
        cwd, encoding: 'utf8', timeout: 3000, windowsHide: true, stdio: 'ignore',
      })
      mainBranch = candidate
      break
    } catch {
      continue
    }
  }
  const user = git(['config', 'user.name'], cwd)
  const statusLines = splitLines(git(['--no-optional-locks', 'status', '--short'], cwd))
  const recentCommits = splitLines(git(['--no-optional-locks', 'log', '--oneline', '-n', '5'], cwd)).slice(0, 5)
  return { branch, mainBranch, user, statusLines, recentCommits }
}

/** System Context section (`eFo` shape) from a snapshot. */
export function renderSystemContext(snapshot: GitSnapshot): string {
  const statusValue = snapshot.statusLines.length > 0
    ? truncateStatus(snapshot.statusLines.join('\n'))
    : '(clean)'
  return [
    'gitStatus: This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.',
    '',
    `Current branch: ${snapshot.branch}`,
    '',
    `Main branch (you will usually use this for PRs): ${snapshot.mainBranch}`,
    '',
    // Upstream pushes the user line unconditionally: an unset user renders
    // the literal word `undefined`. Mirrored, not sanitized.
    `Git user: ${snapshot.user ?? 'undefined'}`,
    '',
    'Status:',
    statusValue,
    '',
    'Recent commits:',
    snapshot.recentCommits.join('\n'),
  ].join('\n')
}

/**
 * Snapshot cache per cwd: the first assembly wins, which is the session
 * start for CLI/headless deployments (mirroring "snapshot at the start of
 * the conversation"). Long-lived multi-session servers keep the first
 * snapshot per directory; the staleness warning is upstream's own
 * ("will not update during the conversation").
 */
const snapshotCache = new Map<string, GitSnapshot | null>()

export function gitSnapshot(cwd: string = process.cwd()): GitSnapshot | null {
  const hit = snapshotCache.get(cwd)
  if (hit !== undefined) return hit
  const snapshot = readGitSnapshot(cwd)
  snapshotCache.set(cwd, snapshot)
  return snapshot
}

/** System Context section text; `''` outside repos (dropped by the assembler). */
export function buildSystemContext(cwd: string = process.cwd()): string {
  const snapshot = gitSnapshot(cwd)
  return snapshot === null ? '' : renderSystemContext(snapshot)
}

/** Local-ISO date mirroring `BZ` (`YYYY-MM-DD`). */
export function formatLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Current Date section (`fre` shape). */
export function buildCurrentDate(date: Date = new Date()): string {
  return `# currentDate\nToday's date is ${formatLocalDate(date)}.`
}
