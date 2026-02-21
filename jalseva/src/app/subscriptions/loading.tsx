export default function SubscriptionsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div>
              <div className="h-5 w-28 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-2.5 w-20 bg-slate-100 rounded mt-1 animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-16 bg-blue-100 rounded-xl animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4 app-container">
        {/* Banner skeleton */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 p-5 h-44 animate-pulse" />

        {/* Section title skeleton */}
        <div className="space-y-1">
          <div className="h-4 w-36 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3 w-28 bg-slate-100 rounded-lg animate-pulse" />
        </div>

        {/* Subscription card skeletons */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3"
          >
            <div className="h-1 -mx-4 -mt-4 bg-slate-200 rounded-t-2xl animate-pulse" />
            <div className="flex items-start gap-3 mt-3">
              <div className="w-12 h-12 bg-slate-200 rounded-xl animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-6 w-12 bg-slate-200 rounded-full animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-12 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-6 w-20 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-6 w-16 bg-green-50 rounded-lg animate-pulse" />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-16 bg-amber-50 rounded-xl animate-pulse" />
                  <div className="h-9 w-14 bg-blue-50 rounded-xl animate-pulse" />
                  <div className="h-9 w-18 bg-red-50 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Timeline skeleton */}
        <div className="space-y-1 mt-4">
          <div className="h-4 w-36 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3 w-24 bg-slate-100 rounded-lg animate-pulse" />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-3 h-3 bg-slate-200 rounded-full animate-pulse shrink-0" />
              <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-28 bg-slate-200 rounded-lg animate-pulse" />
                <div className="h-3 w-20 bg-slate-100 rounded-lg mt-1 animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>

        {/* Savings skeleton */}
        <div className="space-y-1">
          <div className="h-4 w-24 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-3 w-16 bg-slate-100 rounded-lg animate-pulse" />
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center space-y-2">
                <div className="w-4 h-4 bg-green-200 rounded mx-auto animate-pulse" />
                <div className="h-6 w-16 bg-green-200 rounded-lg mx-auto animate-pulse" />
                <div className="h-3 w-14 bg-green-100 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
