/** Pure marker-helper tests for dsh-zcode-bash (no executor needed). */

import { describe, expect, it } from 'vitest'
import { cleanStdout, markerPrefix, markerSuffix, parseCwdMarker, renderForegroundResult, renderStderr, stripMarkerLines, wrapWithCwdMarker } from '../src/index.ts'

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
    const timedOut = { status: 'timed_out' as const, exitCode: null, timeoutMs: 800 }
    expect(renderForegroundResult('', '', timedOut)).toBe('Command timed out after 800ms\n<error>Command was aborted before completion</error>')
  })
})
