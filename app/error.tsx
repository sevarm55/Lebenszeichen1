'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] unhandled error', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <p className="eyebrow">Fehler</p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold tracking-[-0.02em]">
          Da ist etwas schiefgelaufen.
        </h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--color-muted-soft)]">
            Referenz: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-7 inline-flex h-10 items-center rounded-sm bg-[var(--color-text)] px-4 text-sm font-medium text-white"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  )
}
