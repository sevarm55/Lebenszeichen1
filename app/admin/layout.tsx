import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Редакция',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * The admin shell only sets the visual context. Authentication is enforced per
 * page by `requireUser()` — a layout is not a security boundary in the App
 * Router, since a client-side navigation can render a page without re-running
 * a parent layout.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root min-h-screen">{children}</div>
}
