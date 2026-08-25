'use client'

import { createContext, useContext } from 'react'

/**
 * Runtime ad configuration handed down from the server.
 *
 * Env vars alone are not enough: `adsEnabled` and the density are editable in
 * /admin/settings, so the value has to travel from a server component into the
 * client slots. This context is that channel — it carries switches only, never
 * a publisher id beyond the public one.
 */
export interface AdRuntime {
  enabled: boolean
  provider: string
  clientId: string
  autoAds: boolean
  density: string
  sidebarEnabled: boolean
  mobileStickyEnabled: boolean
  /** Placement key -> network slot id (empty when unconfigured). */
  slots: Record<string, string>
  /** Placement key -> enabled, from the AdPlacement table. */
  placementEnabled: Record<string, boolean>
  /** Renders labelled boxes instead of real ads (dev + admin preview). */
  preview: boolean
}

export const EMPTY_AD_RUNTIME: AdRuntime = {
  enabled: false,
  provider: 'none',
  clientId: '',
  autoAds: false,
  density: 'balanced',
  sidebarEnabled: false,
  mobileStickyEnabled: false,
  slots: {},
  placementEnabled: {},
  preview: false,
}

const AdContext = createContext<AdRuntime>(EMPTY_AD_RUNTIME)

export function AdRuntimeProvider({
  value,
  children,
}: {
  value: AdRuntime
  children: React.ReactNode
}) {
  return <AdContext.Provider value={value}>{children}</AdContext.Provider>
}

export function useAdRuntime(): AdRuntime {
  return useContext(AdContext)
}
