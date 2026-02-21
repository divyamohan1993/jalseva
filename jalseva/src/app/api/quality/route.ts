// =============================================================================
// JalSeva API - Water Quality Verification
// =============================================================================
// GET  /api/quality?supplierId=X    - Get supplier's water quality report
// POST /api/quality                 - Submit water quality report (supplier)
// =============================================================================
// Competitive advantage inspired by:
// - BookWater's QR-code-based water quality tracking (pH, TDS per can)
// - GoWatr's IoT TDS sensors
// - BWSSB's RFID volume verification
// - FSSAI compliance standards
//
// JalSeva USP: Quality score = composite of FSSAI compliance, lab reports,
// customer ratings, and delivery verification rate.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Firebase Admin - lazy import with fallback
// ---------------------------------------------------------------------------

function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );
}

async function getAdminDb() {
  const { adminDb } = await import('@/lib/firebase-admin');
  return adminDb;
}

// ---------------------------------------------------------------------------
// Quality Score Calculation
// ---------------------------------------------------------------------------

// Quality score factors (0-100):
// - FSSAI compliance: 30 points
// - Water test report freshness (< 30 days): 25 points
// - pH in safe range (6.5-8.5): 15 points
// - TDS in safe range (50-500 ppm): 15 points
// - Customer rating (4.0+): 15 points
function calculateQualityScore(report: {
  fssaiCompliant: boolean;
  ph: number;
  tds: number;
  testedAt: string;
  supplierRating: number;
}): number {
  let score = 0;

  // FSSAI compliance (30 points)
  if (report.fssaiCompliant) score += 30;

  // Test report freshness (25 points)
  const daysSinceTest = Math.floor(
    (Date.now() - new Date(report.testedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceTest <= 7) score += 25;
  else if (daysSinceTest <= 30) score += 20;
  else if (daysSinceTest <= 90) score += 10;
  else score += 0;

  // pH range (15 points) — WHO: 6.5-8.5 is safe
  if (report.ph >= 6.5 && report.ph <= 8.5) score += 15;
  else if (report.ph >= 6.0 && report.ph <= 9.0) score += 8;

  // TDS range (15 points) — BIS: 50-500 ppm acceptable, <300 ideal
  if (report.tds >= 50 && report.tds <= 300) score += 15;
  else if (report.tds >= 50 && report.tds <= 500) score += 10;
  else if (report.tds < 50) score += 5; // too pure, may indicate issues

  // Customer rating (15 points)
  if (report.supplierRating >= 4.5) score += 15;
  else if (report.supplierRating >= 4.0) score += 12;
  else if (report.supplierRating >= 3.5) score += 8;
  else if (report.supplierRating >= 3.0) score += 4;

  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// GET - Get water quality report for a supplier
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required.' }, { status: 400 });
    }

    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();

        // Get latest quality report
        const reportsSnapshot = await adminDb
          .collection('quality_reports')
          .where('supplierId', '==', supplierId)
          .orderBy('testedAt', 'desc')
          .limit(1)
          .get();

        if (reportsSnapshot.empty) {
          return NextResponse.json({
            success: true,
            qualityReport: null,
            qualityScore: 0,
            message: 'No quality report available for this supplier.',
          });
        }

        const report = reportsSnapshot.docs[0].data();

        // Get supplier rating
        const supplierDoc = await adminDb.collection('suppliers').doc(supplierId).get();
        const supplierRating = supplierDoc.exists
          ? (supplierDoc.data()?.rating?.average || 0)
          : 0;

        const qualityScore = calculateQualityScore({
          fssaiCompliant: report.fssaiCompliant,
          ph: report.ph,
          tds: report.tds,
          testedAt: report.testedAt,
          supplierRating,
        });

        return NextResponse.json({
          success: true,
          qualityReport: { id: reportsSnapshot.docs[0].id, ...report },
          qualityScore,
          qualityBadge: qualityScore >= 80 ? 'premium' : qualityScore >= 60 ? 'verified' : 'basic',
        });
      } catch (dbError) {
        console.warn('[GET /api/quality] Firestore error:', dbError);
      }
    }

    // Demo mode — return sample quality data
    const demoReport = {
      supplierId,
      ph: 7.2,
      tds: 180,
      testedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      labName: 'JalSeva Certified Lab',
      fssaiCompliant: true,
    };

    const qualityScore = calculateQualityScore({
      ...demoReport,
      supplierRating: 4.5,
    });

    return NextResponse.json({
      success: true,
      qualityReport: demoReport,
      qualityScore,
      qualityBadge: qualityScore >= 80 ? 'premium' : qualityScore >= 60 ? 'verified' : 'basic',
      demo: true,
    });
  } catch (error) {
    console.error('[GET /api/quality] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST - Submit water quality report (supplier-side)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 });
    }

    const { supplierId, ph, tds, labName, certificateUrl, fssaiCompliant } = body as {
      supplierId: string;
      ph: number;
      tds: number;
      labName: string;
      certificateUrl?: string;
      fssaiCompliant: boolean;
    };

    // Validation
    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required.' }, { status: 400 });
    }
    if (typeof ph !== 'number' || ph < 0 || ph > 14) {
      return NextResponse.json({ error: 'pH must be a number between 0 and 14.' }, { status: 400 });
    }
    if (typeof tds !== 'number' || tds < 0 || tds > 5000) {
      return NextResponse.json({ error: 'TDS must be a number between 0 and 5000 ppm.' }, { status: 400 });
    }
    if (!labName) {
      return NextResponse.json({ error: 'labName is required.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (hasAdminCredentials()) {
      try {
        const adminDb = await getAdminDb();

        const reportRef = adminDb.collection('quality_reports').doc();
        const report = {
          id: reportRef.id,
          supplierId,
          ph,
          tds,
          labName,
          certificateUrl: certificateUrl || null,
          fssaiCompliant: !!fssaiCompliant,
          testedAt: now,
          createdAt: now,
        };

        await reportRef.set(report);

        // Update supplier's quality score
        const supplierDoc = await adminDb.collection('suppliers').doc(supplierId).get();
        const supplierRating = supplierDoc.exists
          ? (supplierDoc.data()?.rating?.average || 0)
          : 0;

        const qualityScore = calculateQualityScore({
          fssaiCompliant: !!fssaiCompliant,
          ph,
          tds,
          testedAt: now,
          supplierRating,
        });

        await adminDb.collection('suppliers').doc(supplierId).update({
          waterQualityReport: { ph, tds, testedAt: now, labName, fssaiCompliant, certificateUrl },
          qualityScore,
        });

        return NextResponse.json({
          success: true,
          report,
          qualityScore,
          qualityBadge: qualityScore >= 80 ? 'premium' : qualityScore >= 60 ? 'verified' : 'basic',
        }, { status: 201 });
      } catch (dbError) {
        console.warn('[POST /api/quality] Firestore error:', dbError);
      }
    }

    // Demo mode
    const qualityScore = calculateQualityScore({
      fssaiCompliant: !!fssaiCompliant,
      ph,
      tds,
      testedAt: now,
      supplierRating: 4.0,
    });

    return NextResponse.json({
      success: true,
      report: {
        id: `qr_${Date.now()}`,
        supplierId, ph, tds, labName, fssaiCompliant,
        testedAt: now,
      },
      qualityScore,
      qualityBadge: qualityScore >= 80 ? 'premium' : qualityScore >= 60 ? 'verified' : 'basic',
      demo: true,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/quality] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
