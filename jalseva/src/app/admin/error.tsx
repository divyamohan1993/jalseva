'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Admin Panel Error</h2>
      <p className="text-gray-400 text-sm mb-5">{error.message}</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
