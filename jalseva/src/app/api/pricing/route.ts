// =============================================================================
// JalSeva API - Pricing
// =============================================================================
// GET  /api/pricing  - Calculate dynamic price for given parameters
// POST /api/pricing  - Admin: update zone pricing configuration
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getDemandLevel } from '@/lib/redis';
import type { WaterType, DemandLevel } from '@/types';

// ---------------------------------------------------------------------------
// Default Pricing Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_PRICES: Record<WaterType, number> = {
  ro: 150,
  mineral: 200,
  tanker: 500,
};

const DEFAULT_PER_KM_RATE = 15;

const SURGE_MULTIPLIERS: Record<DemandLevel, number> = {
  low: 0.9,
  normal: 1.0,
  high: 1.3,
  surge: 1.8,
};

const DEFAULT_COMMISSION_PERCENT = 15;

// ---------------------------------------------------------------------------
// GET - Calculate price for given parameters
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const waterType = searchParams.get('waterType') as WaterType | null;
    const quantity = parseFloat(searchParams.get('quantity') || '0');
    const distance = parseFloat(searchParams.get('distance') || '0');
    const zone = searchParams.get('zone') || 'default';

    // --- Validation ---
    const validWaterTypes: WaterType[] = ['ro', 'mineral', 'tanker'];
    if (!waterType || !validWaterTypes.includes(waterType)) {
      return NextResponse.json(
        { error: 'Invalid or missing waterType. Must be ro, mineral, or tanker.' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number (in litres).' },
        { status: 400 }
      );
    }

    if (distance < 0) {
      return NextResponse.json(
        { error: 'Distance must be a non-negative number (in km).' },
        { status: 400 }
      );
    }

    // --- Fetch zone pricing if available ---
    let basePrices = DEFAULT_BASE_PRICES;
    let perKmRate = DEFAULT_PER_KM_RATE;
    let demandLevel: DemandLevel = 'normal';
    let surgeMultiplier = SURGE_MULTIPLIERS.normal;

    // Try to get zone-specific pricing from Firestore
    const zoneDoc = await adminDb.collection('pricing_zones').doc(zone).get();

    if (zoneDoc.exists) {
      const zoneData = zoneDoc.data()!;
      if (zoneData.basePrice) basePrices = zoneData.basePrice as Record<WaterType, number>;
      if (zoneData.perKmRate) perKmRate = zoneData.perKmRate;
      if (zoneData.surgeMultiplier) surgeMultiplier = zoneData.surgeMultiplier;
      if (zoneData.demandLevel) demandLevel = zoneData.demandLevel as DemandLevel;
    }

    // Try to get real-time demand level from Redis
    const redisDemandLevel = await getDemandLevel(zone);
    if (redisDemandLevel) {
      demandLevel = redisDemandLevel;
      surgeMultiplier = SURGE_MULTIPLIERS[demandLevel];
    }

    // --- Calculate price ---
    const basePrice = basePrices[waterType] || DEFAULT_BASE_PRICES[waterType];
    const distanceCharge = distance * perKmRate * (quantity / 20);
    const subtotal = basePrice + distanceCharge;
    const surgeAmount = subtotal * (surgeMultiplier - 1);
    const total = Math.round(subtotal * surgeMultiplier);
    const commission = Math.round(total * (DEFAULT_COMMISSION_PERCENT / 100));
    const supplierEarning = total - commission;

    return NextResponse.json({
      success: true,
      pricing: {
        breakdown: {
          base: basePrice,
          distance: Math.round(distanceCharge),
          surge: Math.round(surgeAmount),
          total,
        },
        commission,
        supplierEarning,
        metadata: {
          waterType,
          quantityLitres: quantity,
          distanceKm: distance,
          zone,
          demandLevel,
          surgeMultiplier,
          perKmRate,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/pricing] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while calculating pricing.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST - Admin: Update zone pricing
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      adminId,
      zoneId,
      zoneName,
      basePrice,
      perKmRate,
      surgeMultiplier,
      demandLevel,
    } = body;

    // --- Validate admin ---
    if (!adminId) {
      return NextResponse.json(
        { error: 'Missing required field: adminId' },
        { status: 400 }
      );
    }

    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    if (!zoneId) {
      return NextResponse.json(
        { error: 'Missing required field: zoneId' },
        { status: 400 }
      );
    }

    // --- Build update data ---
    const updateData: Record<string, unknown> = {
      id: zoneId,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };

    if (zoneName) {
      updateData.name = zoneName;
    }

    if (basePrice) {
      // Validate base prices
      if (typeof basePrice !== 'object') {
        return NextResponse.json(
          { error: 'basePrice must be an object with ro, mineral, and tanker keys.' },
          { status: 400 }
        );
      }
      updateData.basePrice = basePrice;
    }

    if (perKmRate !== undefined) {
      if (typeof perKmRate !== 'number' || perKmRate < 0) {
        return NextResponse.json(
          { error: 'perKmRate must be a non-negative number.' },
          { status: 400 }
        );
      }
      updateData.perKmRate = perKmRate;
    }

    if (surgeMultiplier !== undefined) {
      if (typeof surgeMultiplier !== 'number' || surgeMultiplier < 0.1 || surgeMultiplier > 5) {
        return NextResponse.json(
          { error: 'surgeMultiplier must be between 0.1 and 5.' },
          { status: 400 }
        );
      }
      updateData.surgeMultiplier = surgeMultiplier;
    }

    if (demandLevel) {
      const validLevels: DemandLevel[] = ['low', 'normal', 'high', 'surge'];
      if (!validLevels.includes(demandLevel)) {
        return NextResponse.json(
          { error: 'demandLevel must be low, normal, high, or surge.' },
          { status: 400 }
        );
      }
      updateData.demandLevel = demandLevel;
    }

    // --- Upsert zone pricing ---
    await adminDb.collection('pricing_zones').doc(zoneId).set(updateData, { merge: true });

    const updatedDoc = await adminDb.collection('pricing_zones').doc(zoneId).get();

    return NextResponse.json({
      success: true,
      zone: { id: updatedDoc.id, ...updatedDoc.data() },
      message: `Pricing zone '${zoneId}' updated successfully.`,
    });
  } catch (error) {
    console.error('[POST /api/pricing] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating pricing.' },
      { status: 500 }
    );
  }
}
