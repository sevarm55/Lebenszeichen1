import 'server-only'

import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '@/config/env'

/**
 * Storage abstraction.
 *
 * Today: the local disk under public/uploads, served by Next. Tomorrow: S3 or
 * R2 behind a CDN. Call sites only ever see `put`/`remove`/`urlFor`, so the
 * driver swap is contained to this file.
 */
export interface StorageDriver {
  readonly id: string
  put(relativePath: string, data: Buffer, contentType: string): Promise<string>
  remove(relativePath: string): Promise<void>
  urlFor(relativePath: string): string
}

class LocalDiskDriver implements StorageDriver {
  readonly id = 'local'

  private root = path.join(process.cwd(), env.storage.localDir)

  private resolve(relativePath: string): string {
    const target = path.join(this.root, relativePath)
    // Defence against a crafted filename escaping the upload root.
    const normalizedRoot = path.resolve(this.root)
    const normalizedTarget = path.resolve(target)
    if (!normalizedTarget.startsWith(normalizedRoot + path.sep)) {
      throw new Error('Ungültiger Dateipfad.')
    }
    return normalizedTarget
  }

  async put(relativePath: string, data: Buffer): Promise<string> {
    const target = this.resolve(relativePath)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, data)
    return this.urlFor(relativePath)
  }

  async remove(relativePath: string): Promise<void> {
    try {
      await unlink(this.resolve(relativePath))
    } catch {
      // Already gone — deleting a media record must not fail on a missing file.
    }
  }

  urlFor(relativePath: string): string {
    return `${env.storage.publicPrefix}/${relativePath}`.replace(/\/{2,}/g, '/')
  }
}

let driver: StorageDriver | null = null

export function getStorage(): StorageDriver {
  if (driver) return driver
  switch (env.storage.driver) {
    // case 's3': driver = new S3Driver(); break   <- future
    case 'local':
    default:
      driver = new LocalDiskDriver()
  }
  return driver
}
