export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
      <div className="reading-column py-10 sm:py-14">
        <h1 className="font-serif text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
          {title}
        </h1>
        {intro && <p className="mt-4 text-lg leading-relaxed text-[var(--color-muted)]">{intro}</p>}
        <div className="mt-8 space-y-5 text-[0.9375rem] leading-relaxed text-[var(--color-text-soft)] [&_h2]:mt-9 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--color-text)] [&_h3]:mt-6 [&_h3]:font-sans [&_h3]:text-base [&_h3]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Marks a value that must be filled in before the site may go live. */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-amber-50 px-1 py-0.5 font-mono text-[0.8125rem] text-amber-800">
      {children}
    </span>
  )
}
