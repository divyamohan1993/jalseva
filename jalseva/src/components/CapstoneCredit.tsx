import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

// Small capstone credit bar surfaced at the bottom of public pages.
// Single-source-of-truth for the project author/mentor strings.
export const CAPSTONE_AUTHOR = 'Jatin Sharma';
export const CAPSTONE_ENROLLMENT = 'GF202219717';
export const CAPSTONE_PROGRAMME = 'BTech CSE (Data Science) · Sem 8';
export const CAPSTONE_MENTOR = 'Dr. Abhishek Tomar';

export function CapstoneCredit({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-gray-400 px-3 py-2 leading-snug">
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="w-3 h-3" aria-hidden />
          Capstone · {CAPSTONE_AUTHOR} ({CAPSTONE_ENROLLMENT})
        </span>
        <span className="text-gray-300">·</span>
        <span>Mentor: {CAPSTONE_MENTOR}</span>
        <span className="text-gray-300">·</span>
        <Link href="/demo" className="text-blue-600 hover:underline">Live demo</Link>
        <Link href="/pitch" className="text-blue-600 hover:underline">Pitch</Link>
        <Link href="/report" className="text-blue-600 hover:underline">Report</Link>
      </div>
    );
  }

  return (
    <footer className="mt-12 border-t border-gray-100 bg-gray-50/60 px-4 py-6">
      <div className="mx-auto max-w-3xl flex flex-col items-center gap-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600">
          <GraduationCap className="w-3.5 h-3.5 text-blue-600" aria-hidden />
          <span className="font-semibold">Capstone Project</span>
        </div>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{CAPSTONE_AUTHOR}</span>
          <span className="text-gray-400"> · </span>
          <span className="font-mono">{CAPSTONE_ENROLLMENT}</span>
        </p>
        <p className="text-xs text-gray-500">{CAPSTONE_PROGRAMME}</p>
        <p className="text-xs text-gray-500">
          Mentor: <span className="font-medium text-gray-700">{CAPSTONE_MENTOR}</span>
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-blue-600">
          <Link href="/pitch" className="hover:underline">View Pitch</Link>
          <span className="text-gray-300">·</span>
          <Link href="/report" className="hover:underline">Project Report</Link>
        </div>
      </div>
    </footer>
  );
}
