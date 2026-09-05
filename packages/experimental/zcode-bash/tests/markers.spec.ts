/** Pure marker-helper tests for dsh-zcode-bash (no executor needed). */

import { describe, expect, it } from 'vitest'
import { markerPrefix, markerSuffix, parseCwdMarker, stripMarkerLines, wrapWithCwdMarker } from '../src/index.ts'

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
