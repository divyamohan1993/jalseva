export default function QualityLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="space-y-1">
              <div className="h-5 w-28 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-16 bg-green-100 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="px-4 pt-5 space-y-5 app-container">
        {/* Quality Score skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-4 space-y-1">
            <div className="h-5 w-36 bg-slate-200 rounded-lg animate-pulse mx-auto" />
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse mx-auto" />
          </div>
          <div className="w-36 h-36 mx-auto rounded-full bg-slate-100 animate-pulse" />
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-px bg-gray-200" />
            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Parameters skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="space-y-1">
            <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-10 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full animate-pulse" />
          </div>
          <div className="border-t border-gray-100" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="h-20 bg-green-50 rounded-xl animate-pulse" />
            <div className="h-20 bg-blue-50 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Supplier ranking skeleton */}
        <div className="space-y-2.5">
          <div className="space-y-1">
            <div className="h-4 w-40 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-2.5 w-28 bg-slate-100 rounded animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-3.5 w-12 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3.5 w-12 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3.5 w-12 bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Report issue skeleton */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 rounded-lg animate-pulse" />
            <div className="space-y-1">
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-2.5 w-40 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-10 w-20 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
          <div className="h-20 w-full bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-12 w-full bg-red-100 rounded-2xl animate-pulse" />
        </div>
      </main>
    </div>
  );
}
