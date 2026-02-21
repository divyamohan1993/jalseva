export default function AdminLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="h-4 w-20 bg-slate-200 rounded-lg animate-pulse" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse mb-2" />
        ))}
      </div>
    </div>
  );
}
