export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center px-4 h-16">
          <div className="h-6 w-24 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </header>
      <main className="px-4 pt-4 space-y-3 max-w-lg mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-28 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-5 w-16 bg-blue-100 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-full bg-slate-100 rounded-lg animate-pulse" />
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
