// =============================================================================
// JalSeva - Phone OTP daily SMS cap
// =============================================================================
// GET  /api/auth/sms-quota
//   → { allowed: boolean, remaining: number, limit: number, date: string }
// POST /api/auth/sms-quota
//   → atomically increments the counter and returns the post-increment view.
//
// Purpose: cap real-SMS Phone Auth attempts project-wide to PHONE_OTP_DAILY_LIMIT
// (default 2) per UTC day, preventing accidental or malicious billing spikes.
// Firebase test phone numbers do NOT consume real SMS and so bypass the gate
// client-side. Layered on top of Firebase's own authorized-domains allowlist
// and its built-in per-IP heuristics.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const DEFAULT_LIMIT = 2;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function limit(): number {
  const raw = process.env.PHONE_OTP_DAILY_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LIMIT;
}

async function readCount(): Promise<number> {
  const ref = adminDb.collection('meta').doc('phoneOtp').collection('daily').doc(todayKey());
  const snap = await ref.get();
  if (!snap.exists) return 0;
  const data = snap.data() as { count?: number } | undefined;
  return Number(data?.count ?? 0);
}

export async function GET() {
  try {
    const used = await readCount();
    const cap = limit();
    return NextResponse.json({
      allowed: used < cap,
      remaining: Math.max(0, cap - used),
      used,
      limit: cap,
      date: todayKey(),
    });
  } catch (err) {
    console.error('[sms-quota GET]', err);
    // Fail-closed: if we cannot read the counter, deny the SMS to be safe.
    return NextResponse.json(
      { allowed: false, remaining: 0, limit: limit(), error: 'quota_unavailable' },
      { status: 503 }
    );
  }
}

export async function POST(_request: NextRequest) {
  const cap = limit();
  const date = todayKey();
  try {
    const ref = adminDb.collection('meta').doc('phoneOtp').collection('daily').doc(date);

    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = snap.exists ? Number((snap.data() as { count?: number }).count ?? 0) : 0;
      if (used >= cap) {
        return { committed: false, used };
      }
      tx.set(
        ref,
        {
          count: FieldValue.increment(1),
          lastIncrementAt: FieldValue.serverTimestamp(),
          date,
          limit: cap,
        },
        { merge: true }
      );
      return { committed: true, used: used + 1 };
    });

    if (!result.committed) {
      return NextResponse.json(
        { allowed: false, remaining: 0, used: result.used, limit: cap, date },
        { status: 429 }
      );
    }

    return NextResponse.json({
      allowed: true,
      remaining: Math.max(0, cap - result.used),
      used: result.used,
      limit: cap,
      date,
    });
  } catch (err) {
    console.error('[sms-quota POST]', err);
    return NextResponse.json(
      { allowed: false, remaining: 0, limit: cap, error: 'quota_unavailable' },
      { status: 503 }
    );
  }
}
