/** Pure foreground-truncation tests for dsh-zcode-bash (no executor needed). */

import { describe, expect, it } from 'vitest'
import { formatOutputBytes, persistedByteLength, renderForegroundResultPersisted, renderPersistedOutput, sanitizeSessionId, shouldPersistOutput, trimTrailingZero, ZCODE_BASH_INLINE_OUTPUT_LIMIT_BYTES, ZCODE_BASH_PREVIEW_CHARS } from '../src/index.ts'

describe('zcode-bash truncation constants', () => {
  it('inline cap is 30000 bytes, preview is 2000 chars', () => {
    expect(ZCODE_BASH_INLINE_OUTPUT_LIMIT_BYTES).toBe(30_000)
    expect(ZCODE_BASH_PREVIEW_CHARS).toBe(2_000)
  })
})

describe('zcode-bash formatOutputBytes (oracle formatBytes, bundle-verbatim)', () => {
  it('renders sub-kilobyte sizes as bytes', () => {
    expect(formatOutputBytes(0)).toBe('0 bytes')
    expect(formatOutputBytes(1023)).toBe('1023 bytes')
  })

  it('renders kilobytes with one decimal and a stripped .0', () => {
    expect(formatOutputBytes(1024)).toBe('1KB')
    expect(formatOutputBytes(1536)).toBe('1.5KB')
    expect(trimTrailingZero(1.0)).toBe('1')
    expect(trimTrailingZero(1.56)).toBe('1.6')
  })

  it('matches every live-observed oracle label', () => {
    // 30001 -> 29.3KB, 40010 -> 39.1KB, 35000 -> 34.2KB, 673xx -> 67.3KB.
    expect(formatOutputBytes(30_001)).toBe('29.3KB')
    expect(formatOutputBytes(40_010)).toBe('39.1KB')
    expect(formatOutputBytes(35_000)).toBe('34.2KB')
    expect(formatOutputBytes(68_900)).toBe('67.3KB')
  })

  it('scales to MB and GB', () => {
    expect(formatOutputBytes(1024 * 1024)).toBe('1MB')
    expect(formatOutputBytes(1024 * 1024 * 1024)).toBe('1GB')
  })
})

describe('zcode-bash persist measurand (oracle: raw stdout+stderr UTF-8 bytes)', () => {
  it('counts trailing newlines (raw, not cleaned)', () => {
    // Live: 29995 A + 10 newlines = 30005 persisted.
    expect(persistedByteLength('A'.repeat(29_995), '\n'.repeat(10))).toBe(30_005)
    expect(shouldPersistOutput('A'.repeat(29_995), '\n'.repeat(10))).toBe(true)
  })

  it('counts multibyte as bytes, not chars', () => {
    // Live: 15001 e-acute = 30002 bytes persisted.
    expect(persistedByteLength('é'.repeat(15_001), '')).toBe(30_002)
    expect(shouldPersistOutput('é'.repeat(15_001), '')).toBe(true)
  })

  it('counts stderr untrimmed', () => {
    // Live: 29998 A + 10 stderr spaces = 30008 persisted.
    expect(persistedByteLength('A'.repeat(29_998), ' '.repeat(10))).toBe(30_008)
    expect(shouldPersistOutput('A'.repeat(29_998), ' '.repeat(10))).toBe(true)
  })

  it('threshold: 30000 inline, 30001 persisted', () => {
    expect(shouldPersistOutput('A'.repeat(30_000), '')).toBe(false)
    expect(shouldPersistOutput('A'.repeat(30_001), '')).toBe(true)
  })

  it('combines stdout first, then stderr', () => {
    expect(persistedByteLength('small-out\n', 'E'.repeat(40_000))).toBe(40_010)
  })
})

describe('zcode-bash persisted-output envelope (oracle byte-shape modulo path)', () => {
  const path = '/tmp/zcode-bash-exec/sess/call_1_0-stdout.log'

  it('renders the exact envelope template', () => {
    const preview = 'A'.repeat(2_000)
    expect(renderPersistedOutput(path, 30_001, preview)).toBe(
      `<persisted-output>\nOutput too large (29.3KB). Full output saved to: ${path}\n\nPreview (first 2KB):\n${preview}\n...\n</persisted-output>`,
    )
  })

  it('success renders the bare envelope', () => {
    const text = renderForegroundResultPersisted('A'.repeat(30_001), '', path, { status: 'completed', exitCode: 0, timeoutMs: 120_000 })
    expect(text).toBe(renderPersistedOutput(path, 30_001, 'A'.repeat(2_000)))
  })

  it('failure composes the Exit code header OUTSIDE the envelope', () => {
    // Live: `Exit code 3\n<envelope>`, file = pure command output.
    const text = renderForegroundResultPersisted('B'.repeat(35_000), '', path, { status: 'failed', exitCode: 3, timeoutMs: 120_000 })
    expect(text.startsWith('Exit code 3\n<persisted-output>\n')).toBe(true)
    expect(text).toContain('Output too large (34.2KB).')
  })

  it('signal death (failed, null code) renders the bare envelope', () => {
    const text = renderForegroundResultPersisted('B'.repeat(35_000), '', path, { status: 'failed', exitCode: null, timeoutMs: 120_000 })
    expect(text.startsWith('<persisted-output>\n')).toBe(true)
  })

  it('preview is the first 2000 characters of raw content', () => {
    const stdout = `small-out\n${'E'.repeat(40_000)}`
    const text = renderForegroundResultPersisted(stdout, '', path, { status: 'completed', exitCode: 0, timeoutMs: 120_000 })
    const preview = text.split('Preview (first 2KB):\n')[1]?.split('\n...\n</persisted-output>')[0] ?? ''
    expect(preview.length).toBe(2_000)
    expect(preview).toBe(stdout.slice(0, 2_000))
  })
})

describe('zcode-bash sanitizeSessionId', () => {
  it('keeps safe characters and replaces the rest', () => {
    expect(sanitizeSessionId('sess_abc-123')).toBe('sess_abc-123')
    expect(sanitizeSessionId('a/b:c')).toBe('a_b_c')
    expect(sanitizeSessionId('')).toBe('session')
  })
})
