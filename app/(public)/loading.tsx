export default function Loading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6" aria-busy="true" aria-label="Wird geladen">
      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="skeleton aspect-[16/9] w-full" />
          <div className="skeleton mt-4 h-3 w-24" />
          <div className="skeleton mt-3 h-9 w-full" />
          <div className="skeleton mt-2 h-9 w-3/4" />
          <div className="skeleton mt-4 h-4 w-full" />
          <div className="skeleton mt-2 h-4 w-5/6" />
        </div>
        <div className="space-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="skeleton aspect-[4/3] w-32 shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton mt-2 h-4 w-full" />
                <div className="skeleton mt-1.5 h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
