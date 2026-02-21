export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 px-4 pt-4 pb-8">
        <div className="flex items-center gap-4 mt-12">
          <div className="w-18 h-18 bg-white/20 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-white/20 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-white/20 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
      <main className="px-4 -mt-4 space-y-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-8 w-12 bg-slate-200 rounded-lg animate-pulse mx-auto" />
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
