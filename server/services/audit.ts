import 'server-only'

import { prisma } from '@/lib/prisma'

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'POST_CREATE'
  | 'POST_UPDATE'
  | 'POST_PUBLISH'
  | 'POST_UNPUBLISH'
  | 'POST_DELETE'
  | 'POST_RESTORE'
  | 'CATEGORY_CHANGE'
  | 'MEDIA_UPLOAD'
  | 'MEDIA_DELETE'
  | 'SETTINGS_CHANGE'
  | 'AI_GENERATE'
  | 'URL_IMPORT'
  | 'SOURCE_CHANGE'

export interface AuditInput {
  action: AuditAction
  userId?: string | null
  entity?: string
  entityId?: string
  detail?: string
  ip?: string | null
}

/**
 * Never throws. An audit write failing must not take down the action it was
 * recording — the action itself is the thing the user asked for.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        entity: input.entity ?? '',
        entityId: input.entityId ?? '',
        detail: (input.detail ?? '').slice(0, 1000),
        ip: input.ip ?? null,
      },
    })
  } catch (error) {
    console.error('[audit] write failed', error)
  }
}
