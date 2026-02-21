import Link from 'next/link';
import { Droplets, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-6">
        <Droplets className="w-10 h-10 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Page Not Found</h2>
      <p className="text-gray-500 text-sm mb-6">पेज नहीं मिला</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors active:scale-[0.97]"
      >
        <Home className="w-4 h-4" />
        Go Home / होम जाएं
      </Link>
    </div>
  );
}
