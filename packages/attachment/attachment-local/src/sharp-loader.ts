/**
 * Lazy sharp loader (runtime-loading fix).
 *
 * `sharp` needs libvips, which is absent on some platforms
 * (android-arm64/Termux). A static `import sharp` kills plugin load at
 * boot even when nobody touches images — so load it lazily: the plugin
 * mounts, and only actual image transforms fail, with the stable
 * `ATTACHMENT_PROJECTION_UNSUPPORTED` routing code. Mirrors the
 * 0.1.2-rc.1 upstream shape (deferred import + use-time throw).
 */
import { AttachmentError } from '@deepseek-ai/dsh-attachment'
import type { Sharp } from 'sharp'

/** The sharp call signature used by this package. */
export type SharpFactory = (
  input: Uint8Array,
  options?: { failOn?: string; limitInputPixels?: boolean },
) => Sharp

async function importSharp(): Promise<SharpFactory> {
  try {
    return (await import('sharp')).default as unknown as SharpFactory
  } catch {
    return () => {
      throw new AttachmentError(
        'sharp is unavailable on this platform.',
        'ATTACHMENT_PROJECTION_UNSUPPORTED',
      )
    }
  }
}

/** Module-scope factory: resolved once, synchronously usable at call sites. */
export const sharp: SharpFactory = await importSharp()
