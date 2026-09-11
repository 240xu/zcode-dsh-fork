/** Pure marker-helper tests for dsh-zcode-bash (no executor needed). */

import { describe, expect, it } from 'vitest'
import { appendResetSuffix, cleanStdout, formatTimeoutDuration, insideWorkspace, isAutoBackgroundEligible, markerPrefix, markerSuffix, parseBashTimeoutEnv, parseCwdMarker, renderBackgroundAck, renderForegroundResult, renderStderr, resolveBashTimeoutPolicy, resolveTimeoutMs, stripMarkerLines, wrapWithCwdMarker, wrapWithCwdMarkerAndStderrFile, ZCODE_BASH_DEFAULT_TIMEOUT_MS, ZCODE_BASH_MAX_TIMEOUT_MS } from '../src/index.ts'

describe('zcode-bash markers', () => {
  it('wrap/parse round-trip', () => {
    const script = wrapWithCwdMarker('echo hi', 'abc123')
    expect(script).toContain(markerPrefix('abc123'))
    expect(script).toContain(markerSuffix())
    expect(script).toContain('exit $__ZCODE_STATUS__')
    const parsed = parseCwdMarker(`hi\n${markerPrefix('abc123')}/tmp/x${markerSuffix()}\n`, 'abc123')
    expect(parsed).toEqual({ output: 'hi', cwd: '/tmp/x' })
  })

  it('foreign markers are ignored', () => {
    const foreign = parseCwdMarker(`hi\n${markerPrefix('other')}/tmp/y${markerSuffix()}\n`, 'abc123')
    expect(foreign).toEqual({ output: `hi\n${markerPrefix('other')}/tmp/y${markerSuffix()}\n`, cwd: undefined })
  })

  it('stripMarkerLines removes marker lines only', () => {
    expect(stripMarkerLines(`a\n${markerPrefix('zzz')}/t${markerSuffix()}\nb`)).toBe('a\nb')
  })
})

describe('zcode-bash oracle render contract', () => {
  it('cleanStdout drops leading blank lines and trims the end', () => {
    expect(cleanStdout('')).toBe('')
    expect(cleanStdout('hello\n')).toBe('hello')
    expect(cleanStdout('\n\n  \nhello\n\n')).toBe('hello')
    expect(cleanStdout('a\n\nb\n')).toBe('a\n\nb')
  })

  it('renderStderr trims, and appends the abort tag when interrupted', () => {
    expect(renderStderr('oops\n', false)).toBe('oops')
    expect(renderStderr('', true)).toBe('<error>Command was aborted before completion</error>')
    expect(renderStderr('oops\n', true)).toBe('oops\n<error>Command was aborted before completion</error>')
  })

  it('renderForegroundResult matches the oracle specimens', () => {
    const ok = { status: 'completed' as const, exitCode: 0, timeoutMs: 120_000 }
    expect(renderForegroundResult('oracle-hello\n/tmp/x\n', '', ok)).toBe('oracle-hello\n/tmp/x')
    expect(renderForegroundResult('out-line\n', 'err-line\n', ok)).toBe('out-line\nerr-line')
    expect(renderForegroundResult('', '', ok)).toBe('')
    const failed = { status: 'failed' as const, exitCode: 5, timeoutMs: 120_000 }
    expect(renderForegroundResult('out-line\n', 'err-line\n', failed)).toBe('Exit code 5\nout-line\nerr-line')
    expect(renderForegroundResult('', 'oops\n', { status: 'failed' as const, exitCode: 3, timeoutMs: 120_000 })).toBe('Exit code 3\noops')
    // Signal death (no numeric code): failed status, output parts only, no
    // header (corpus/bash/signal-death).
    expect(renderForegroundResult('before-kill\n', '', { status: 'failed' as const, exitCode: null, timeoutMs: 120_000 })).toBe('before-kill')
    expect(renderForegroundResult('out\n', 'err\n', { status: 'failed' as const, exitCode: null, timeoutMs: 120_000 })).toBe('out\nerr')
    const timedOut = { status: 'timed_out' as const, exitCode: null, timeoutMs: 800 }
    expect(renderForegroundResult('', '', timedOut)).toBe('Command timed out after 800ms\n<error>Command was aborted before completion</error>')
  })
})

describe('zcode-bash workspace boundary', () => {
  it('insideWorkspace adopts same-or-inside, rejects escapes', () => {
    expect(insideWorkspace('/w', '/w')).toBe(true)
    expect(insideWorkspace('/w/sub/deep', '/w')).toBe(true)
    expect(insideWorkspace('/other', '/w')).toBe(false)
    expect(insideWorkspace('/w-sibling', '/w')).toBe(false)
    expect(insideWorkspace('/w/sub/../sub2', '/w')).toBe(true) // resolves inside
    expect(insideWorkspace('/w/sub/../../other', '/w')).toBe(false)
  })

  it('appendResetSuffix strips trailing newlines before joining', () => {
    expect(appendResetSuffix('', 'Shell cwd was reset to /w')).toBe('Shell cwd was reset to /w')
    expect(appendResetSuffix('oops\n\n', 'Shell cwd was reset to /w')).toBe('oops\nShell cwd was reset to /w')
  })
})

describe('zcode-bash timeout policy', () => {
  it('resolveTimeoutMs falls back on falsy input and caps at the max', () => {
    expect(resolveTimeoutMs(undefined)).toBe(ZCODE_BASH_DEFAULT_TIMEOUT_MS)
    expect(resolveTimeoutMs(0)).toBe(ZCODE_BASH_DEFAULT_TIMEOUT_MS)
    expect(resolveTimeoutMs(50)).toBe(50)
    expect(resolveTimeoutMs(999_999_999)).toBe(ZCODE_BASH_MAX_TIMEOUT_MS)
  })

  it('formatTimeoutDuration humanizes like the oracle (cLt ladder, live-verified)', () => {
    expect(formatTimeoutDuration(0)).toBe('0ms')
    expect(formatTimeoutDuration(50)).toBe('50ms')
    expect(formatTimeoutDuration(800)).toBe('800ms')
    expect(formatTimeoutDuration(999)).toBe('999ms')
    expect(formatTimeoutDuration(1000)).toBe('1s')
    expect(formatTimeoutDuration(1500)).toBe('1.5s')
    expect(formatTimeoutDuration(3000)).toBe('3s')
    expect(formatTimeoutDuration(59999)).toBe('60s') // jUe(59.999) -> toFixed(1) -> "60s", bundle-verbatim
    expect(formatTimeoutDuration(60000)).toBe('1m')
    expect(formatTimeoutDuration(90000)).toBe('1.5m')
    expect(formatTimeoutDuration(120000)).toBe('2m')
    expect(formatTimeoutDuration(3600000)).toBe('1h')
    expect(formatTimeoutDuration(5400000)).toBe('1.5h')
  })

  it('timed-out render carries the humanized effective deadline', () => {
    const timedOut = (timeoutMs: number) => ({ status: 'timed_out' as const, exitCode: null, timeoutMs })
    expect(renderForegroundResult('', '', timedOut(1500))).toBe('Command timed out after 1.5s\n<error>Command was aborted before completion</error>')
    expect(renderForegroundResult('', '', timedOut(120000))).toBe('Command timed out after 2m\n<error>Command was aborted before completion</error>')
  })

  it('parseBashTimeoutEnv mirrors WPr (blank/NaN/non-positive absent)', () => {
    expect(parseBashTimeoutEnv(undefined)).toBeUndefined()
    expect(parseBashTimeoutEnv('')).toBeUndefined()
    expect(parseBashTimeoutEnv('   ')).toBeUndefined()
    expect(parseBashTimeoutEnv('abc')).toBeUndefined()
    expect(parseBashTimeoutEnv('0')).toBeUndefined()
    expect(parseBashTimeoutEnv('-5')).toBeUndefined()
    expect(parseBashTimeoutEnv('3000')).toBe(3000)
    expect(parseBashTimeoutEnv(' 5000 ')).toBe(5000)
  })

  it('resolveBashTimeoutPolicy reads env with max floored at default', () => {
    expect(resolveBashTimeoutPolicy({})).toEqual({ defaultTimeoutMs: 120000, maxTimeoutMs: 600000 })
    expect(resolveBashTimeoutPolicy({ BASH_DEFAULT_TIMEOUT_MS: '3000' })).toEqual({ defaultTimeoutMs: 3000, maxTimeoutMs: 600000 })
    // Oracle max() floor: an env max below the default never lowers the
    // cap (observed live: max=5000 + default=120000 completed sleep 8).
    expect(resolveBashTimeoutPolicy({ BASH_MAX_TIMEOUT_MS: '5000' })).toEqual({ defaultTimeoutMs: 120000, maxTimeoutMs: 120000 })
    expect(resolveBashTimeoutPolicy({ BASH_DEFAULT_TIMEOUT_MS: '2000', BASH_MAX_TIMEOUT_MS: '5000' })).toEqual({ defaultTimeoutMs: 2000, maxTimeoutMs: 5000 })
    expect(resolveBashTimeoutPolicy({ BASH_DEFAULT_TIMEOUT_MS: 'bogus' })).toEqual({ defaultTimeoutMs: 120000, maxTimeoutMs: 600000 })
  })

  it('resolveTimeoutMs honors the env policy', () => {
    const env = { BASH_DEFAULT_TIMEOUT_MS: '2000', BASH_MAX_TIMEOUT_MS: '5000' }
    expect(resolveTimeoutMs(undefined, env)).toBe(2000)
    expect(resolveTimeoutMs(700000, env)).toBe(5000)
    expect(resolveTimeoutMs(3000, env)).toBe(3000)
  })
})

describe('zcode-bash auto-background routing', () => {
  it('isAutoBackgroundEligible mirrors the oracle (non-empty, first word is not sleep)', () => {
    expect(isAutoBackgroundEligible('')).toBe(false)
    expect(isAutoBackgroundEligible('   ')).toBe(false)
    expect(isAutoBackgroundEligible('sleep 30')).toBe(false)
    expect(isAutoBackgroundEligible('  sleep 30 && echo x')).toBe(false)
    expect(isAutoBackgroundEligible('echo hi && sleep 30')).toBe(true)
    expect(isAutoBackgroundEligible('Sleep 30')).toBe(true)
    expect(isAutoBackgroundEligible('"sleep" 30')).toBe(true)
  })

  it('renderBackgroundAck carries id, notification promise, collection pointer', () => {
    expect(renderBackgroundAck('bash-7')).toBe(
      'Command running in background with ID: bash-7. You will be notified when it completes. To check interim output, use job_output.',
    )
  })

  it('wrapWithCwdMarkerAndStderrFile diverts stderr and keeps the marker', () => {
    const script = wrapWithCwdMarkerAndStderrFile('echo hi', 'tok', "/tmp/a'b/c.log")
    expect(script).toContain(`2> '/tmp/a'\\''b/c.log'`)
    expect(script).toContain(markerPrefix('tok'))
    expect(script).toContain('exit $__ZCODE_STATUS__')
  })
})
