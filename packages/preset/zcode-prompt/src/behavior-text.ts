/**
 * ZCode 3.10.2 behavior text: identity/Harness plus dynamic behavior.
 *
 * Byte-verified evidence: identity-section-3.10.2.txt and
 * dynamic-behavior-3.10.2.txt in the evidence package
 * (240xu/zcode-agent), extracted statically from the official
 * ZCode Desktop 3.10.2 runtime. This module loads the two evidence files
 * shipped beside it and joins them verbatim; no wording is authored here.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** The identity section, minus its first sentence — the preset's persona row already states it. */
const identityText = await readFile(join(here, 'identity-section.txt'), 'utf8')

/** The dynamic-behavior section: communicating with the user, code style, comment policy, risk policy. */
const dynamicText = await readFile(join(here, 'dynamic-behavior.txt'), 'utf8')

/** Strip the identity file's first sentence (the preset persona states it); exported for unit tests. */
export function trimFirstSentence(text: string): string {  const first = 'You are an interactive ZCode agent that helps users with software engineering tasks.'
  const rest = text.trim().startsWith(first) ? text.trim().slice(first.length) : text
  return rest.replace(/^\s+/, '')
}

/** ZCode identity/Harness + dynamic behavior, joined verbatim from evidence. */
export const BEHAVIOR_TEXT = [trimFirstSentence(identityText).trim(), '', dynamicText.trim()].join('\n')
