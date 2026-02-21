import { Droplets } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center animate-pulse">
        <Droplets className="w-8 h-8 text-blue-500" />
      </div>
      <div className="space-y-2 text-center">
        <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse mx-auto" />
        <div className="h-3 w-24 bg-slate-200 rounded-full animate-pulse mx-auto" />
      </div>
    </div>
  );
}
