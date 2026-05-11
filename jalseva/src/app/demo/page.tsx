'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCw, ExternalLink, MapPin, Truck, CheckCircle2, ArrowLeft } from 'lucide-react';

// Lazy script-tag injection so we don't need @types/google.maps or
// @googlemaps/js-api-loader runtime semantics.
let mapsLoadPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('jalseva-gmaps-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Maps script failed')));
      return;
    }
    const s = document.createElement('script');
    s.id = 'jalseva-gmaps-script';
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Maps script failed'));
    document.head.appendChild(s);
  });
  return mapsLoadPromise;
}

import { CapstoneCredit } from '@/components/CapstoneCredit';

interface SimSession {
  orderId: string;
  customerId: string;
  supplierId: string;
  waypoints: { lat: number; lng: number }[];
  trackingUrl: string;
}

type SimStatus = 'idle' | 'starting' | 'running' | 'paused' | 'delivered' | 'error';

export default function DemoPage() {
  const [session, setSession] = useState<SimSession | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<SimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Use loose typing for (window as any).google.maps so we don't need @types/(window as any).google.maps.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type GMap = any;
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<GMap>(null);
  const supplierMarkerRef = useRef<GMap>(null);
  const dropMarkerRef = useRef<GMap>(null);
  const polylineRef = useRef<GMap>(null);
  const tickTimerRef = useRef<number | null>(null);

  // -------- Initialize Google Map once --------
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapDivRef.current) return;
    let cancelled = false;
    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !mapDivRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapRef.current = new (window as any).google.maps.Map(mapDivRef.current, {
        center: { lat: 28.62, lng: 77.23 },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bcdff5' }] },
        ],
      });
    });
    return () => {
      cancelled = true;
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    };
  }, []);

  // -------- Draw waypoints + markers once session begins --------
  useEffect(() => {
    if (!session || !mapRef.current) return;
    const map = mapRef.current;

    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = new (window as any).google.maps.Polyline({
      path: session.waypoints,
      geodesic: true,
      strokeColor: '#0ea5e9',
      strokeOpacity: 0.7,
      strokeWeight: 4,
      map,
    });

    if (dropMarkerRef.current) dropMarkerRef.current.setMap(null);
    dropMarkerRef.current = new (window as any).google.maps.Marker({
      position: session.waypoints[session.waypoints.length - 1],
      map,
      title: 'Drop location',
      icon: {
        path: (window as any).google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });

    if (supplierMarkerRef.current) supplierMarkerRef.current.setMap(null);
    supplierMarkerRef.current = new (window as any).google.maps.Marker({
      position: session.waypoints[0],
      map,
      title: 'Tanker (live)',
      icon: {
        path: (window as any).google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 8,
        fillColor: '#0ea5e9',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        rotation: 90,
      },
    });

    const bounds = new (window as any).google.maps.LatLngBounds();
    session.waypoints.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [session]);

  // -------- Tick handler: advance supplier + post to server --------
  useEffect(() => {
    if (!session || status !== 'running') return;
    if (stepIndex >= session.waypoints.length) {
      // Last waypoint reached → mark delivered
      (async () => {
        try {
          await fetch('/api/dev/simulate?action=deliver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: session.orderId }),
          });
        } catch {}
        setStatus('delivered');
      })();
      return;
    }

    const wp = session.waypoints[stepIndex];

    // Move map marker immediately
    if (supplierMarkerRef.current) {
      supplierMarkerRef.current.setPosition(wp);
    }

    // Post tick to server (same path as real supplier GPS)
    fetch('/api/dev/simulate?action=tick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: session.orderId,
        supplierId: session.supplierId,
        lat: wp.lat,
        lng: wp.lng,
        stepIndex,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.tracking) {
          setEta(data.tracking.eta);
          setDistance(data.tracking.distance);
        }
      })
      .catch(() => {});

    const id = window.setTimeout(() => setStepIndex((s) => s + 1), 5000);
    tickTimerRef.current = id;
    return () => window.clearTimeout(id);
  }, [stepIndex, status, session]);

  // -------- Actions --------
  const startDemo = async () => {
    setStatus('starting');
    setError(null);
    try {
      const res = await fetch('/api/dev/simulate?action=start', { method: 'POST' });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Failed (${res.status})`);
      }
      const data = (await res.json()) as SimSession;
      setSession(data);
      setStepIndex(0);
      setStatus('running');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start demo');
      setStatus('error');
    }
  };

  const togglePause = () => {
    if (status === 'running') setStatus('paused');
    else if (status === 'paused') setStatus('running');
  };

  const resetDemo = () => {
    if (tickTimerRef.current) {
      window.clearTimeout(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    setSession(null);
    setStepIndex(0);
    setStatus('idle');
    setEta(null);
    setDistance(null);
    setError(null);
    if (supplierMarkerRef.current) supplierMarkerRef.current.setMap(null);
    if (dropMarkerRef.current) dropMarkerRef.current.setMap(null);
    if (polylineRef.current) polylineRef.current.setMap(null);
  };

  // -------- Render --------
  const progressPct = session ? Math.round((stepIndex / session.waypoints.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-gray-900">Live Demo Simulator</h1>
            <p className="text-[11px] text-gray-500">End-to-end customer ↔ supplier flow without leaving this tab</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col lg:flex-row gap-4">
        {/* Map */}
        <div className="flex-1 min-h-[420px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white relative">
          <div ref={mapDivRef} className="w-full h-full min-h-[420px]" />
          {status === 'idle' && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6">
              <MapPin className="w-10 h-10 text-blue-500 mb-3" />
              <p className="font-semibold text-gray-900">Tap "Start Live Demo" to spin up a virtual customer + supplier and watch the tanker drive itself to the drop point in real time.</p>
              <p className="text-xs text-gray-500 mt-2">Uses the same Firestore real-time path as a real delivery.</p>
            </div>
          )}
          {status === 'delivered' && (
            <div className="absolute top-4 left-4 right-4 bg-green-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <p className="font-semibold">Delivery completed</p>
                <p className="text-xs text-green-100">Tanker reached the drop location.</p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="lg:w-[320px] flex flex-col gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900">Live Tanker</h2>
            </div>

            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-semibold text-gray-900 capitalize">{status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ETA</span>
                <span className="font-mono text-gray-900">{eta != null ? `${Math.ceil(eta / 60)} min` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Distance to drop</span>
                <span className="font-mono text-gray-900">{distance != null ? `${(distance / 1000).toFixed(2)} km` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Waypoint</span>
                <span className="font-mono text-gray-900">{session ? `${stepIndex}/${session.waypoints.length}` : '—'}</span>
              </div>
            </div>

            {session && (
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mb-3">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {status === 'idle' && (
                <button
                  onClick={startDemo}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" /> Start Live Demo
                </button>
              )}
              {status === 'starting' && (
                <button disabled className="w-full bg-gray-300 text-gray-600 rounded-xl py-3">Starting…</button>
              )}
              {(status === 'running' || status === 'paused') && (
                <>
                  <button
                    onClick={togglePause}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
                  >
                    {status === 'running' ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
                  </button>
                  <button
                    onClick={resetDemo}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl py-2 flex items-center justify-center gap-2 text-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Reset
                  </button>
                </>
              )}
              {status === 'delivered' && (
                <button
                  onClick={resetDemo}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4" /> Run another delivery
                </button>
              )}
              {status === 'error' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600">{error}</p>
                  <button onClick={resetDemo} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2 text-sm">Reset</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-900 text-sm">How this works</p>
            <p>The Start button calls <code>/api/dev/simulate?action=start</code>, which uses the Firebase Admin SDK on the Cloud Run service to create a virtual customer, a verified virtual supplier, and an order in <code>accepted</code> state.</p>
            <p>Every five seconds, the page advances to the next waypoint along a fixed Delhi route and POSTs to <code>/api/dev/simulate?action=tick</code> — the same write path the real supplier app uses.</p>
            <p>Want to verify a real two-device flow? Sign in as customer on one phone (<code>+91&nbsp;99999&nbsp;00001</code>) and supplier on another (<code>+91&nbsp;99999&nbsp;00002</code>), then place an order.</p>
          </div>

          {session && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm text-xs space-y-1">
              <p className="font-semibold text-gray-900 mb-1">Session</p>
              <p><span className="text-gray-500">Order:</span> <span className="font-mono">{session.orderId.slice(-8)}</span></p>
              <p><span className="text-gray-500">Customer:</span> <span className="font-mono">{session.customerId.slice(-8)}</span></p>
              <p><span className="text-gray-500">Supplier:</span> <span className="font-mono">{session.supplierId.slice(-8)}</span></p>
              <a
                href={`/api/tracking?orderId=${session.orderId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mt-1"
              >
                <ExternalLink className="w-3 h-3" /> Raw tracking JSON
              </a>
            </div>
          )}
        </aside>
      </main>

      <CapstoneCredit compact />
    </div>
  );
}
