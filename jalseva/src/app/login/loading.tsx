export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 h-48 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-white/20 rounded-3xl animate-pulse" />
        </div>
      </div>
      <div className="flex-1 -mt-6 bg-white rounded-t-3xl relative z-10 px-6 pt-8">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mx-auto" />
          <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse mx-auto" />
          <div className="h-14 bg-slate-100 rounded-xl animate-pulse mt-8" />
          <div className="h-14 bg-blue-100 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
