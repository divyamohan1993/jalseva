'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Something went wrong</h2>
      <p className="text-gray-500 text-sm mb-1">कुछ गलत हो गया</p>
      <p className="text-gray-400 text-xs mb-6 text-center max-w-sm">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.97]"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again / फिर से कोशिश करें
      </button>
    </div>
  );
}
