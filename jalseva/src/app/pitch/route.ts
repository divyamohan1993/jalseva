import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>JalSeva — Pitch | Capstone</title>
<meta name="description" content="JalSeva — Uber for Water Tankers. Capstone pitch by Jatin Sharma." />
<meta property="og:title" content="JalSeva — Pitch" />
<meta property="og:description" content="Uber for water tankers in Bharat. Capstone by Jatin Sharma." />
<meta property="og:url" content="https://jalseva.dmj.one/pitch" />
<meta name="theme-color" content="#0a0a0a" />
<style>
:root { --accent: #38bdf8; --accent-strong: #0ea5e9; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; }
body {
  overflow: hidden; background: #0a0a0a; color: #f0f0f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
.deck { width: 100vw; height: 100vh; position: relative; }
.slide {
  width: 100%; height: 100%; position: absolute; top: 0; left: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding: 9vh 10vw; opacity: 0; pointer-events: none;
  transition: opacity .3s ease;
}
.slide.active { opacity: 1; pointer-events: auto; }
.slide.active > * { animation: fadeUp .25s ease-out both; }
.slide.active > *:nth-child(1) { animation-delay: 0ms; }
.slide.active > *:nth-child(2) { animation-delay: 80ms; }
.slide.active > *:nth-child(3) { animation-delay: 160ms; }
.slide.active > *:nth-child(4) { animation-delay: 240ms; }
.slide.active > *:nth-child(5) { animation-delay: 320ms; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

.eyebrow {
  font-size: .85rem; letter-spacing: .18em; text-transform: uppercase;
  color: var(--accent); font-weight: 700; margin-bottom: 1.25rem;
}
h1 { font-size: clamp(2.5rem, 5.5vw, 5rem); font-weight: 800; line-height: 1.05; letter-spacing: -.02em; }
h1 .accent { color: var(--accent); }
h2 { font-size: clamp(1.8rem, 3.5vw, 3rem); font-weight: 800; line-height: 1.1; margin-bottom: 1.25rem; letter-spacing: -.01em; }
p { font-size: clamp(1.05rem, 1.6vw, 1.35rem); line-height: 1.6; max-width: 70ch; color: rgba(255,255,255,.85); }
.stat { font-size: clamp(3rem, 8vw, 6.5rem); font-weight: 900; color: var(--accent); line-height: 1; }
.subtle { font-size: .85rem; color: rgba(255,255,255,.5); margin-top: 1.5rem; }
.tagline { font-size: clamp(1.1rem, 2vw, 1.6rem); color: rgba(255,255,255,.7); max-width: 60ch; margin-top: 1rem; }
.cta { margin-top: 1.5rem; display: inline-flex; align-items: center; gap: .6rem; padding: .8rem 1.4rem; border-radius: 999px; background: var(--accent); color: #06212d; font-weight: 700; text-decoration: none; }

.grid-2 { display: grid; grid-template-columns: 1.05fr 1fr; gap: 4vw; align-items: center; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 1.5rem; }
.card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 16px; padding: 1.25rem 1.4rem; }
.card h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: .4rem; color: #fff; }
.card p { font-size: .95rem; line-height: 1.55; color: rgba(255,255,255,.7); }

.flow { display: grid; grid-template-columns: repeat(5, 1fr); gap: .8rem; margin-top: 1.5rem; }
.flow .step { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: .85rem .9rem; }
.flow .step b { display: block; color: var(--accent); font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; margin-bottom: .3rem; }
.flow .step span { font-size: .92rem; color: rgba(255,255,255,.85); }

table.compare { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: .95rem; }
table.compare th, table.compare td { padding: .65rem .85rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,.08); }
table.compare th { color: rgba(255,255,255,.5); font-weight: 600; font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; }
table.compare td.ok { color: #4ade80; }
table.compare td.no { color: rgba(255,255,255,.35); }
table.compare td b { color: var(--accent); }

.team { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-top: 1.5rem; }
.member { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 1.1rem 1.2rem; }
.member .role { color: var(--accent); font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; font-weight: 700; }
.member .name { font-size: 1.15rem; font-weight: 700; margin-top: .2rem; color: #fff; }
.member .detail { font-size: .85rem; color: rgba(255,255,255,.6); margin-top: .35rem; }

ul.bullets { margin-top: 1.25rem; max-width: 70ch; }
ul.bullets li { list-style: none; padding-left: 1.6rem; position: relative; margin-bottom: .8rem; font-size: 1.05rem; line-height: 1.55; color: rgba(255,255,255,.85); }
ul.bullets li::before { content: ''; position: absolute; left: 0; top: .55rem; width: .55rem; height: .55rem; background: var(--accent); border-radius: 2px; }

.progress { position: fixed; bottom: 0; left: 0; height: 2px; background: var(--accent); transition: width .3s ease; z-index: 100; width: 10%; }
.counter { position: fixed; bottom: .9rem; right: 1.25rem; font-size: .75rem; color: rgba(255,255,255,.35); font-variant-numeric: tabular-nums; }
.brand { position: fixed; top: 1.25rem; left: 1.5rem; font-size: .8rem; letter-spacing: .14em; color: rgba(255,255,255,.4); text-transform: uppercase; }
.brand b { color: var(--accent); }

@media (max-width: 880px) {
  .slide { padding: 7vh 6vw; }
  .grid-2 { grid-template-columns: 1fr; gap: 1.5rem; }
  .grid-3, .team { grid-template-columns: 1fr; }
  .flow { grid-template-columns: 1fr 1fr; }
  h1 { font-size: clamp(2rem, 8vw, 3.2rem); }
  table.compare th, table.compare td { padding: .5rem .55rem; font-size: .85rem; }
}
</style>
</head>
<body>
<div class="brand">Capstone · <b>Jatin Sharma</b> · GF202219717</div>
<main class="deck" role="main" aria-label="Pitch presentation">

  <!-- Slide 1: Title -->
  <section class="slide active" id="s1" role="region" aria-label="Slide 1: Title">
    <div class="eyebrow">JalSeva · जलसेवा</div>
    <h1>Uber for <span class="accent">water tankers</span>, built for Bharat.</h1>
    <p class="tagline">163 million Indians depend on tankers for water. The system is broken — no tracking, no transparency, no accountability. We rebuilt it.</p>
    <p class="subtle">Capstone · Jatin Sharma (GF202219717) · BTech CSE-DS Sem 8 · Mentor Dr. Abhishek Tomar</p>
  </section>

  <!-- Slide 2: Problem -->
  <section class="slide" id="s2" role="region" aria-label="Slide 2: Problem">
    <div class="eyebrow">The Problem</div>
    <h2>Phone the number. Pray it picks up.</h2>
    <p>An Indian family in a tier-2 town with no piped water. Mid-summer. Phone hopper-dialled across four supplier numbers; nobody picks up. The tanker promised at 11 AM never came. By evening, jerry-cans are empty.</p>
    <div class="grid-3">
      <div class="card"><h3>No tracking</h3><p>Customer never knows where the tanker is, or if it's even coming.</p></div>
      <div class="card"><h3>No accountability</h3><p>If the driver bails, nobody knows. No rating, no consequence.</p></div>
      <div class="card"><h3>Cash &amp; confusion</h3><p>Pricing varies per call. Receipts are non-existent. Disputes are routine.</p></div>
    </div>
  </section>

  <!-- Slide 3: Value -->
  <section class="slide" id="s3" role="region" aria-label="Slide 3: Value">
    <div class="eyebrow">The Promise</div>
    <h2>Three taps. Water at your door. Tracked end-to-end.</h2>
    <div class="flow">
      <div class="step"><b>Tap 1</b><span>Pick your location</span></div>
      <div class="step"><b>Tap 2</b><span>Pick tanker size</span></div>
      <div class="step"><b>Tap 3</b><span>Pay with UPI</span></div>
      <div class="step"><b>Track</b><span>Live GPS on map</span></div>
      <div class="step"><b>Rate</b><span>After delivery</span></div>
    </div>
    <p style="margin-top:1.75rem">Voice ordering in 22 Indian languages. PWA-installable. Works on a 2GB phone over 3G.</p>
  </section>

  <!-- Slide 4: Magic -->
  <section class="slide" id="s4" role="region" aria-label="Slide 4: Magic">
    <div class="eyebrow">Under the Hood</div>
    <h2>Real-time, resilient, ridiculously cheap to run.</h2>
    <div class="grid-3">
      <div class="card"><h3>Firestore real-time</h3><p>Customer's map updates the instant the supplier's phone pings GPS. No polling.</p></div>
      <div class="card"><h3>Coalesced writes</h3><p>5-20 GPS updates merge into 1 Firestore write. Burns no quota.</p></div>
      <div class="card"><h3>Cloud Run, scale-to-zero</h3><p>Idle cost: ₹0. First request spins instance up in seconds. India-region.</p></div>
      <div class="card"><h3>IAM-internal auth</h3><p>Firebase Admin uses Cloud Run service account via ADC. Zero private keys in env.</p></div>
      <div class="card"><h3>Geohash spatial index</h3><p>Find nearby suppliers in O(k) instead of O(n) scanning every supplier in country.</p></div>
      <div class="card"><h3>Haversine + Routes fallback</h3><p>Sub-microsecond ETA via Haversine; Maps Routes API used only for polyline.</p></div>
    </div>
    <a class="cta" href="https://jalseva.dmj.one" target="_blank" rel="noopener">Open live demo →</a>
  </section>

  <!-- Slide 5: Business Model -->
  <section class="slide" id="s5" role="region" aria-label="Slide 5: Business Model">
    <div class="eyebrow">Business Model</div>
    <h2>10% commission. That's the whole pricing page.</h2>
    <div class="grid-3">
      <div class="card"><h3>Customer pays</h3><p>Surge-fair price visible up-front. UPI / Card / Wallet / COD.</p></div>
      <div class="card"><h3>Supplier earns</h3><p>~90% of order value. Instant payout view. No middleman skimming.</p></div>
      <div class="card"><h3>Platform takes</h3><p>10% per order. At 1,000 orders/day in one tier-2 town: ₹95K/day GMV → ₹9.5K/day revenue.</p></div>
    </div>
    <p class="subtle">Government rural-water schemes (e.g. Jal Jeevan Mission) become channel partners, not competitors.</p>
  </section>

  <!-- Slide 6: GTM -->
  <section class="slide" id="s6" role="region" aria-label="Slide 6: Go to Market">
    <div class="eyebrow">Go to Market</div>
    <h2>Start in one ward. Win it. Then the next.</h2>
    <ul class="bullets">
      <li><b>Wedge:</b> one tier-2 town with chronic tanker dependence — pick 50 supplier numbers off Justdial, onboard 20.</li>
      <li><b>Hook:</b> free first delivery for the customer; ₹0 onboarding for the supplier.</li>
      <li><b>Loop:</b> WhatsApp share — "track your tanker" link makes neighbours ask "what's this?"</li>
      <li><b>Scale:</b> RWA (Resident Welfare Association) partnerships replicate the loop across colonies.</li>
    </ul>
  </section>

  <!-- Slide 7: Competition -->
  <section class="slide" id="s7" role="region" aria-label="Slide 7: Competition">
    <div class="eyebrow">Competitive Landscape</div>
    <h2>Phone-and-pray is the incumbent. We're the alternative.</h2>
    <table class="compare">
      <thead><tr><th></th><th>Phone supplier</th><th>WhatsApp groups</th><th>Existing apps</th><th>JalSeva</th></tr></thead>
      <tbody>
        <tr><td>Live GPS tracking</td><td class="no">—</td><td class="no">—</td><td class="no">Some</td><td class="ok">Real-time</td></tr>
        <tr><td>Transparent price</td><td class="no">—</td><td class="no">—</td><td class="ok">Yes</td><td class="ok">Yes, w/ surge</td></tr>
        <tr><td>Multi-language voice</td><td class="ok">Yes</td><td class="no">—</td><td class="no">—</td><td class="ok"><b>22 lang</b></td></tr>
        <tr><td>UPI / receipt</td><td class="no">—</td><td class="no">—</td><td class="ok">Yes</td><td class="ok">Yes</td></tr>
        <tr><td>Works on 2GB phone</td><td class="ok">N/A</td><td class="ok">Yes</td><td class="no">Often no</td><td class="ok">PWA, &lt;200 KB</td></tr>
      </tbody>
    </table>
  </section>

  <!-- Slide 8: Team -->
  <section class="slide" id="s8" role="region" aria-label="Slide 8: Team">
    <div class="eyebrow">Team</div>
    <h2>One engineer. One mentor. One AI build partner.</h2>
    <div class="team">
      <div class="member">
        <div class="role">Author · Capstone</div>
        <div class="name">Jatin Sharma</div>
        <div class="detail">Enrollment GF202219717 · BTech CSE (Data Science), Sem 8.</div>
        <div class="detail">Architecture, full-stack implementation, deployment, demo ops.</div>
      </div>
      <div class="member">
        <div class="role">Mentor</div>
        <div class="name">Dr. Abhishek Tomar</div>
        <div class="detail">Faculty advisor, scope &amp; rigour review.</div>
      </div>
      <div class="member">
        <div class="role">AI Build Partner</div>
        <div class="name">Claude Opus (Anthropic)</div>
        <div class="detail">Code synthesis under author's direction, security review prompts.</div>
      </div>
      <div class="member">
        <div class="role">Institution</div>
        <div class="name">Shoolini University</div>
        <div class="detail">Yogananda School of AI, Computers and Data Sciences.</div>
      </div>
    </div>
  </section>

  <!-- Slide 9: Metrics -->
  <section class="slide" id="s9" role="region" aria-label="Slide 9: Metrics">
    <div class="eyebrow">Built-in metrics</div>
    <div class="stat">19</div>
    <p style="margin-top:.6rem">API endpoints. 4 surfaces: customer PWA, supplier dashboard, admin ops, WhatsApp bot.</p>
    <div class="grid-3" style="margin-top:1.75rem">
      <div class="card"><h3>&lt; 1 ms</h3><p>Haversine ETA, in-process, replaces blocking Maps calls on the hot path.</p></div>
      <div class="card"><h3>5-20×</h3><p>Firestore write reduction via 500 ms coalescer on supplier GPS updates.</p></div>
      <div class="card"><h3>₹0 / idle hour</h3><p>Cloud Run scale-to-zero. First request boots a fresh instance in &lt; 5s.</p></div>
    </div>
  </section>

  <!-- Slide 10: Status -->
  <section class="slide" id="s10" role="region" aria-label="Slide 10: Status">
    <div class="eyebrow">Status &amp; Roadmap</div>
    <h2>Live now. Multi-device demo ready.</h2>
    <ul class="bullets">
      <li><b>Live:</b> jalseva.dmj.one — Cloud Run, asia-east1, Firebase Phone Auth, Firestore real-time.</li>
      <li><b>Demo:</b> 5 test phone numbers (no SMS billing). 1 customer phone + 1 supplier phone replays the full Uber-style flow.</li>
      <li><b>Next:</b> ONDC/Beckn handshake so any aggregator app can order on JalSeva inventory.</li>
      <li><b>Next:</b> WhatsApp-bot ordering in regional languages for low-literacy users.</li>
    </ul>
    <a class="cta" href="/report">Read the project report →</a>
  </section>

</main>
<div class="progress" role="progressbar" aria-valuenow="1" aria-valuemin="1" aria-valuemax="10"></div>
<div class="counter" aria-hidden="true">1 / 10</div>

<script>
(function(){
  var slides = document.querySelectorAll('.slide');
  var progress = document.querySelector('.progress');
  var counter = document.querySelector('.counter');
  var total = slides.length;
  var current = 0;

  function go(n){
    if (n < 0 || n >= total || n === current) return;
    slides[current].classList.remove('active');
    current = n;
    slides[current].classList.add('active');
    progress.style.width = (((current + 1) / total) * 100) + '%';
    progress.setAttribute('aria-valuenow', current + 1);
    counter.textContent = (current + 1) + ' / ' + total;
    history.replaceState(null, '', '#s' + (current + 1));
  }

  document.addEventListener('keydown', function(e){
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    }
  });

  document.addEventListener('click', function(e){
    if (e.target.closest('a, button')) return;
    if (e.clientX > window.innerWidth / 2) go(current + 1); else go(current - 1);
  });

  var touchX = 0;
  document.addEventListener('touchstart', function(e){ touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function(e){
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1));
  });

  var hash = parseInt((location.hash || '#s1').replace('#s', ''), 10) - 1;
  if (hash > 0 && hash < total) go(hash); else go(0);
})();
</script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
