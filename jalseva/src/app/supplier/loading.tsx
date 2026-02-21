export default function SupplierLoading() {
  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="h-6 w-40 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="h-6 w-12 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-4 w-full bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-10 bg-blue-100 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}
