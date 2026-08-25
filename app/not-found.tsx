import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <p className="eyebrow">Fehler 404</p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
          Diese Seite gibt es nicht.
        </h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Vielleicht wurde der Beitrag verschoben oder der Link enthält einen Tippfehler.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-sm bg-[var(--color-text)] px-4 text-sm font-medium text-white"
          >
            Zur Startseite
          </Link>
          <Link
            href="/neueste"
            className="inline-flex h-10 items-center rounded-sm border border-[var(--color-border-strong)] px-4 text-sm font-medium"
          >
            Neueste Geschichten
          </Link>
          <Link
            href="/suche"
            className="inline-flex h-10 items-center rounded-sm border border-[var(--color-border-strong)] px-4 text-sm font-medium"
          >
            Suchen
          </Link>
        </div>
      </div>
    </div>
  )
}
