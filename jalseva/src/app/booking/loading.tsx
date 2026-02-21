import { Droplets } from 'lucide-react';

export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
        <Droplets className="w-10 h-10 text-blue-500" />
      </div>
      <div className="text-center space-y-2">
        <div className="h-5 w-40 bg-slate-200 rounded-lg animate-pulse mx-auto" />
        <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse mx-auto" />
      </div>
    </div>
  );
}
