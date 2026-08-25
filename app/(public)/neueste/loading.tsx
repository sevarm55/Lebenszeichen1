export default function Loading() {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6"
      aria-busy="true"
      aria-label="Wird geladen"
    >
      <div className="skeleton mb-8 h-10 w-72" />
      <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="skeleton aspect-[16/10] w-full" />
            <div className="skeleton mt-3 h-3 w-24" />
            <div className="skeleton mt-2 h-5 w-full" />
            <div className="skeleton mt-1.5 h-5 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
