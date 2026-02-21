import { Loader2 } from 'lucide-react';

export default function TrackingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}
