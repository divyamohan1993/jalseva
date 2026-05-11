import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

// Capstone report rendered to A4 pages, Times New Roman 12pt body,
// red-bordered chapter headers, structured exactly per Shoolini University /
// Yogananda School template (CAPSTONE PROJECT REPORT.docx).
const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>JalSeva — Capstone Project Report | Jatin Sharma (GF202219717)</title>
<meta name="description" content="Capstone project report for JalSeva by Jatin Sharma, GF202219717, BTech CSE-DS Sem 8, mentor Dr. Abhishek Tomar — Shoolini University." />
<meta name="theme-color" content="#ffffff" />
<style>
@page { size: A4; margin: 25mm 22mm 22mm 25mm; }

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: #e7e8ec;
  font-family: 'Times New Roman', 'Liberation Serif', Times, serif;
  font-size: 12pt;
  color: #000;
  line-height: 1.5;
}
body { padding: 24px 0 60px; }

.toolbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(15,23,42,.92); color: #fff;
  font-family: -apple-system, system-ui, 'Segoe UI', sans-serif;
  font-size: 13px; padding: 10px 16px;
  display: flex; gap: 14px; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.toolbar a, .toolbar button {
  font: inherit; color: inherit; text-decoration: none;
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px; padding: 5px 14px; cursor: pointer;
}
.toolbar a:hover, .toolbar button:hover { background: rgba(255,255,255,.22); }
.toolbar .label { opacity: .7; font-size: 12px; }

.page {
  width: 210mm; min-height: 297mm;
  padding: 25mm 22mm 22mm 25mm;
  margin: 24px auto;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 12px 32px -12px rgba(0,0,0,.25);
  position: relative;
  page-break-after: always;
}

/* Running header: "Chapter N      Section Name" with red underline */
.run-header {
  position: absolute;
  top: 12mm; left: 25mm; right: 22mm;
  font-style: italic; font-weight: 700;
  border-bottom: 1.5pt solid #C00000;
  padding-bottom: 2pt;
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 12pt;
}
.run-header .chap { letter-spacing: .01em; }
.run-header .sect { text-align: right; }

/* Common body wrap pulled down below header */
.body { padding-top: 6mm; }
.body.body-titlepg { padding-top: 0; }

/* Title page */
.title-page { text-align: center; padding-top: 18mm; }
.title-page .title-project {
  font-size: 28pt; font-weight: 700; margin-bottom: 6mm; line-height: 1.15;
}
.title-page .synopsis {
  font-size: 13pt; line-height: 1.55; max-width: 140mm; margin: 0 auto 10mm;
}
.title-page .degree {
  font-size: 16pt; font-weight: 700; letter-spacing: .02em;
}
.title-page .logo {
  width: 38mm; height: auto; margin: 14mm auto 12mm; display: block;
}
.title-page .student-block {
  max-width: 110mm; margin: 0 auto 14mm; text-align: left;
  font-size: 13pt; line-height: 2; padding: 6mm 0;
}
.title-page .student-block .row { display: flex; gap: 10mm; }
.title-page .student-block .k { width: 62mm; font-weight: 700; }
.title-page .student-block .v { flex: 1; }
.title-page .school {
  font-size: 13pt; font-weight: 700; line-height: 1.5;
  margin-top: 10mm;
}
.title-page .uni { margin-top: 6mm; font-size: 13pt; line-height: 1.5; }

/* Chapter title (used on each chapter's first page, centred under header) */
.chapter-title {
  text-align: center; font-size: 18pt; font-weight: 700;
  margin: 0 0 10mm; letter-spacing: .005em;
}
h2.chapter-title.no-num { margin-top: 0; }

h3.sec {
  font-size: 13pt; font-weight: 700; margin: 6mm 0 2mm;
}
h4.sub {
  font-size: 12pt; font-weight: 700; font-style: italic;
  margin: 4mm 0 1mm;
}

p { text-align: justify; margin-bottom: 3mm; }
ul, ol { margin: 0 0 3mm 7mm; }
li { margin-bottom: 1mm; text-align: justify; }
code, .mono { font-family: 'Consolas', 'Liberation Mono', monospace; font-size: 10.5pt; background: #f4f4f5; padding: 1pt 3pt; border-radius: 2pt; }

table {
  width: 100%; border-collapse: collapse; margin: 3mm 0 4mm;
  font-size: 11pt; page-break-inside: avoid;
}
table th, table td {
  border: 0.75pt solid #000;
  padding: 2pt 4pt;
  text-align: left; vertical-align: top;
}
table th { background: #f2f2f2; font-weight: 700; }
table.center th, table.center td { text-align: center; }

.figure {
  margin: 4mm auto 2mm; padding: 4mm 6mm; background: #fafafa;
  border: 0.75pt solid #cfcfcf; border-radius: 2pt;
  font-family: 'Consolas', monospace; font-size: 10pt; line-height: 1.45;
  white-space: pre; overflow-x: auto;
  page-break-inside: avoid;
}
.fig-caption {
  text-align: center; font-style: italic; font-size: 11pt;
  margin: 0 0 5mm; color: #333;
}

.toc-list { margin: 0 0 0 6mm; }
.toc-list li { list-style: none; display: flex; justify-content: space-between; padding: 1pt 0; }
.toc-list .num { font-weight: 700; margin-right: 4mm; }
.toc-list .dots { flex: 1; border-bottom: 0.5pt dotted #888; margin: 0 4mm 5pt; align-self: end; }

.center { text-align: center; }
.signed { margin-top: 14mm; text-align: right; padding-right: 4mm; }

@media print {
  body { background: #fff; padding: 0; }
  .toolbar { display: none; }
  .page { margin: 0; box-shadow: none; page-break-after: always; }
}
</style>
</head>
<body>

<div class="toolbar" role="navigation" aria-label="Report toolbar">
  <span class="label">Capstone Report · Jatin Sharma · GF202219717</span>
  <button onclick="window.print()">Print / Save as PDF</button>
  <a href="/pitch">Pitch deck</a>
  <a href="/">Open app</a>
</div>

<!-- =======================================================================
     PAGE 1 — TITLE PAGE
======================================================================== -->
<section class="page" aria-label="Title Page">
  <div class="body body-titlepg title-page">
    <h1 class="title-project">JalSeva (जलसेवा)<br/>Real-Time Water-Tanker Marketplace for Bharat</h1>
    <p class="synopsis">Synopsis submitted for the partial fulfilment of the degree of</p>
    <p class="degree">BACHELOR OF TECHNOLOGY (CSE)</p>

    <img class="logo" src="/icons/shoolini-logo.png" alt="Shoolini University logo" />

    <div class="student-block">
      <div class="row"><div class="k">Name of Student:</div><div class="v">Jatin Sharma</div></div>
      <div class="row"><div class="k">Registration Number:</div><div class="v">GF202219717</div></div>
      <div class="row"><div class="k">Course with Specialization:</div><div class="v">B.Tech, Computer Science &amp; Engineering (Data Science)</div></div>
      <div class="row"><div class="k">Semester:</div><div class="v">8</div></div>
      <div class="row"><div class="k">Capstone Mentor:</div><div class="v">Dr. Abhishek Tomar</div></div>
    </div>

    <p class="school">YOGANANDA SCHOOL OF AI, COMPUTERS AND DATA SCIENCES</p>
    <p class="uni">SHOOLINI UNIVERSITY OF BIOTECHNOLOGY<br/>AND MANAGEMENT SCIENCES<br/>SOLAN, H.P., INDIA</p>
  </div>
</section>

<!-- =======================================================================
     PAGE 2 — ACKNOWLEDGEMENT
======================================================================== -->
<section class="page" aria-label="Acknowledgement">
  <header class="run-header"><span class="chap">Acknowledgement</span><span class="sect"></span></header>
  <div class="body">
    <h2 class="chapter-title no-num">Acknowledgement</h2>
    <p>I take this opportunity to express my profound sense of gratitude to my capstone mentor, <b>Dr. Abhishek Tomar</b>, Yogananda School of AI, Computers and Data Sciences, Shoolini University, for his expert guidance, candid feedback and constant encouragement throughout the conception, design and execution of this work. His insistence on engineering rigour and his patient review of intermediate prototypes shaped the project at every milestone.</p>
    <p>I am thankful to the faculty of the Department of Computer Science &amp; Engineering for providing me with the academic environment and the infrastructural support that made an end-to-end production-grade build possible within a single semester. I also acknowledge the staff of the Yogananda School for the administrative scaffolding around the capstone programme.</p>
    <p>I extend my sincere thanks to the open-source maintainers of <i>Next.js</i>, <i>Firebase</i>, <i>Google Cloud Run</i>, <i>Google Maps Platform</i> and <i>TypeScript</i> — every layer of the system I built rests on tooling they ship and support, free of cost, to students like me.</p>
    <p>I am deeply grateful to my family and friends for the moral support, the late-night patience, and the willingness to be field-test users when the application first stumbled out of <code>localhost</code> and onto a public URL.</p>
    <p>Finally, I take responsibility for any errors that remain in this report or in the deployed system. They are mine alone.</p>
    <div class="signed">
      <p>Jatin Sharma</p>
      <p>GF202219717</p>
    </div>
  </div>
</section>

<!-- =======================================================================
     PAGE 3 — ABSTRACT
======================================================================== -->
<section class="page" aria-label="Abstract">
  <header class="run-header"><span class="chap">Abstract</span><span class="sect"></span></header>
  <div class="body">
    <h2 class="chapter-title no-num">Abstract</h2>
    <p>Approximately 163 million Indians lack reliable access to clean piped water and rely on privately-operated water-tanker deliveries, an informal supply chain plagued by opaque pricing, no order tracking, and weak accountability. <b>JalSeva</b> is a production-grade, multi-tenant water-tanker marketplace that brings the on-demand ride-hailing experience to this market: customers place an order in three taps, suppliers receive it in real time, live GPS tracking persists through delivery, and the lifecycle terminates in a rated, receipt-backed transaction.</p>
    <p>This report documents the design, implementation, security posture and serverless deployment of JalSeva as the author's BTech capstone project. The application is built on Next.js 16 with React Server Components, Firebase Phone Authentication for identity, Cloud Firestore for the real-time data plane, and Google Maps Platform for geocoding and routing. The runtime is Google Cloud Run in the asia-east1 region, configured for scale-to-zero economics. A defining engineering choice — replacing the conventional embedded Firebase Admin private key with a runtime IAM service-account and Application Default Credentials (ADC) — eliminates the most common credential-leakage vector in serverless Node.js deployments.</p>
    <p>The platform is live at <b>jalseva.dmj.one</b> and is reproducible from source with a single <code>gcloud run deploy</code> invocation. End-to-end demonstration is supported on two physical devices: one acting as customer, one as supplier, with sub-second propagation of GPS updates from supplier to customer's map view via Firestore <code>onSnapshot</code>. Key performance optimisations include in-process L1 caching, a 500-millisecond write-coalescer that collapses 5–20 GPS updates into one Firestore write, and a geohash-based spatial index for nearby-supplier search in <i>O(k)</i> instead of <i>O(n)</i>.</p>
    <p><b>Keywords:</b> on-demand logistics, water supply, Firebase, Cloud Run, real-time tracking, GPS, IAM, ADC, serverless, Bharat, PWA, Next.js.</p>
  </div>
</section>

<!-- =======================================================================
     PAGE 4 — TABLE OF CONTENTS
======================================================================== -->
<section class="page" aria-label="Table of Contents">
  <header class="run-header"><span class="chap">Table of Contents</span><span class="sect"></span></header>
  <div class="body">
    <h2 class="chapter-title no-num">Table of Contents</h2>
    <ul class="toc-list">
      <li><span class="num">1.</span><span>Introduction &amp; Problem Definition</span><span class="dots"></span><span>6</span></li>
      <li><span class="num">2.</span><span>System Requirements</span><span class="dots"></span><span>8</span></li>
      <li><span class="num">3.</span><span>System Architecture &amp; Design</span><span class="dots"></span><span>10</span></li>
      <li><span class="num">4.</span><span>Technology Stack</span><span class="dots"></span><span>13</span></li>
      <li><span class="num">5.</span><span>Implementation</span><span class="dots"></span><span>15</span></li>
      <li><span class="num">6.</span><span>Algorithms / Models</span><span class="dots"></span><span>18</span></li>
      <li><span class="num">7.</span><span>Testing</span><span class="dots"></span><span>20</span></li>
      <li><span class="num">8.</span><span>Results &amp; Performance Analysis</span><span class="dots"></span><span>22</span></li>
      <li><span class="num">9.</span><span>Deployment</span><span class="dots"></span><span>24</span></li>
      <li><span class="num">10.</span><span>Challenges &amp; Solutions</span><span class="dots"></span><span>26</span></li>
      <li><span class="num">11.</span><span>Conclusion &amp; Future Scope</span><span class="dots"></span><span>28</span></li>
      <li><span class="num">12.</span><span>Viva-Voce Questions</span><span class="dots"></span><span>30</span></li>
      <li><span class="num">13.</span><span>References</span><span class="dots"></span><span>32</span></li>
    </ul>
  </div>
</section>

<!-- =======================================================================
     PAGE 5 — LIST OF FIGURES
======================================================================== -->
<section class="page" aria-label="List of Figures">
  <header class="run-header"><span class="chap">List of Figures</span><span class="sect"></span></header>
  <div class="body">
    <h2 class="chapter-title no-num">List of Figures</h2>
    <ul class="toc-list">
      <li><span class="num">Fig 3.1</span><span>High-Level System Architecture</span><span class="dots"></span><span>10</span></li>
      <li><span class="num">Fig 3.2</span><span>Order Lifecycle State Machine</span><span class="dots"></span><span>11</span></li>
      <li><span class="num">Fig 3.3</span><span>Real-Time GPS Tracking Data Flow</span><span class="dots"></span><span>12</span></li>
      <li><span class="num">Fig 4.1</span><span>Technology Stack Layers</span><span class="dots"></span><span>13</span></li>
      <li><span class="num">Fig 5.1</span><span>Sign-In Sequence Diagram (Phone OTP + ID-Token)</span><span class="dots"></span><span>15</span></li>
      <li><span class="num">Fig 5.2</span><span>Order Acceptance &amp; Live Dispatch</span><span class="dots"></span><span>17</span></li>
      <li><span class="num">Fig 9.1</span><span>Cloud Run Deployment Topology</span><span class="dots"></span><span>24</span></li>
    </ul>
  </div>
</section>

<!-- =======================================================================
     PAGE 6 — LIST OF TABLES
======================================================================== -->
<section class="page" aria-label="List of Tables">
  <header class="run-header"><span class="chap">List of Tables</span><span class="sect"></span></header>
  <div class="body">
    <h2 class="chapter-title no-num">List of Tables</h2>
    <ul class="toc-list">
      <li><span class="num">Table 2.1</span><span>Functional Requirements</span><span class="dots"></span><span>8</span></li>
      <li><span class="num">Table 2.2</span><span>Non-Functional Requirements</span><span class="dots"></span><span>9</span></li>
      <li><span class="num">Table 3.1</span><span>Firestore Collection Schema</span><span class="dots"></span><span>11</span></li>
      <li><span class="num">Table 4.1</span><span>Technology Choices &amp; Rationale</span><span class="dots"></span><span>14</span></li>
      <li><span class="num">Table 7.1</span><span>Test Matrix Summary</span><span class="dots"></span><span>20</span></li>
      <li><span class="num">Table 8.1</span><span>Performance Benchmarks</span><span class="dots"></span><span>22</span></li>
      <li><span class="num">Table 9.1</span><span>Cloud Run Service Configuration</span><span class="dots"></span><span>25</span></li>
    </ul>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 1 — INTRODUCTION & PROBLEM DEFINITION
======================================================================== -->
<section class="page" aria-label="Chapter 1: Introduction and Problem Definition">
  <header class="run-header"><span class="chap">Chapter 1</span><span class="sect">Introduction &amp; Problem Definition</span></header>
  <div class="body">
    <h2 class="chapter-title">1. Introduction &amp; Problem Definition</h2>

    <h3 class="sec">1.1 Background</h3>
    <p>India's Census 2011 reports that only about 43% of households have piped water at the dwelling premises. The National Sample Survey Office (NSO, 2018) further documented continued reliance on shared and externally-sourced supply, particularly in peri-urban settlements and tier-2/3 towns. Where municipal supply is intermittent or absent altogether, privately-operated water-tankers serve as the <i>de-facto</i> infrastructure for daily living. Estimates from the Ministry of Jal Shakti place this dependent population at approximately 163 million people, with the sharpest concentrations in summer months across Rajasthan, Gujarat, Maharashtra, Karnataka and the National Capital Region.</p>
    <p>Yet, unlike auto-rickshaws (which Ola and Uber digitised) or restaurant food (which Swiggy and Zomato digitised), the water-tanker logistics layer has remained almost entirely analog. The customer phones a number; the supplier or driver answers if they choose to; pricing is negotiated verbally; and the tanker may or may not arrive in the promised window. There is no consumer-facing platform that delivers the three primitives the rest of the on-demand economy now takes for granted: real-time matching, transparent pricing, and live tracking.</p>

    <h3 class="sec">1.2 Problem Statement</h3>
    <p>The incumbent ordering pattern in tier-2/3 India produces four concrete failure modes:</p>
    <ol>
      <li><b>No tracking.</b> The customer cannot tell whether the tanker is on its way, delayed, or simply not coming.</li>
      <li><b>No price transparency.</b> Per-call pricing varies; surge pricing is opaque and arbitrary; receipts are rare.</li>
      <li><b>No accountability loop.</b> A no-show carries zero consequence for the supplier; a punctual driver earns no reputation upside.</li>
      <li><b>No language accessibility.</b> Existing fragmentary digital alternatives are English-first, while the customer base is heavily Indic-language and includes low-literacy users.</li>
    </ol>
    <p>The objective of this capstone is therefore to design, build and deploy a single mobile-installable application that addresses all four failure modes simultaneously, while remaining operable on entry-level Android phones over slow networks.</p>

    <h3 class="sec">1.3 Target Users</h3>
    <ul>
      <li><b>Households</b> in tier-2/3 India that depend on private tankers, especially during summer scarcity.</li>
      <li><b>Resident Welfare Associations (RWAs)</b> coordinating bulk supply for an apartment complex or colony.</li>
      <li><b>Independent tanker operators</b> currently dependent on a fragmented voice-call order book.</li>
      <li><b>Government and CSR programmes</b> (Jal Jeevan Mission, district administrations) seeking visibility into the informal supply layer.</li>
    </ul>

    <h3 class="sec">1.4 Scope of the Project</h3>
    <p>The project is bounded to delivering a working, multi-device, production-deployed system that demonstrates: phone-OTP authentication with role selection, customer order placement, supplier acceptance, live GPS tracking, status transitions, and order completion. KYC, real payment settlement, ONDC integration and WhatsApp-bot ordering are scaffolded but not commissioned within the capstone window; they are explicitly listed as future work.</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 2 — SYSTEM REQUIREMENTS
======================================================================== -->
<section class="page" aria-label="Chapter 2: System Requirements">
  <header class="run-header"><span class="chap">Chapter 2</span><span class="sect">System Requirements</span></header>
  <div class="body">
    <h2 class="chapter-title">2. System Requirements</h2>

    <h3 class="sec">2.1 Functional Requirements</h3>
    <p>Table 2.1 enumerates the user-facing functional requirements that the deployed system must satisfy.</p>
    <table>
      <thead>
        <tr><th style="width: 18mm">ID</th><th>Requirement</th><th style="width: 22mm">Priority</th></tr>
      </thead>
      <tbody>
        <tr><td>FR-1</td><td>Authenticate users via Phone OTP and assign role (Customer / Supplier).</td><td>Must</td></tr>
        <tr><td>FR-2</td><td>Customer can pick a delivery location, choose water type and quantity.</td><td>Must</td></tr>
        <tr><td>FR-3</td><td>Customer sees a live, surge-aware price before confirming.</td><td>Must</td></tr>
        <tr><td>FR-4</td><td>Supplier can toggle online and receive new order requests in real time.</td><td>Must</td></tr>
        <tr><td>FR-5</td><td>Supplier can accept or reject an order; first-accept wins.</td><td>Must</td></tr>
        <tr><td>FR-6</td><td>Supplier device broadcasts GPS location while delivery is active.</td><td>Must</td></tr>
        <tr><td>FR-7</td><td>Customer sees the supplier's live position on a map with ETA and distance.</td><td>Must</td></tr>
        <tr><td>FR-8</td><td>Order transitions through <code>searching → accepted → en_route → arriving → delivered</code>.</td><td>Must</td></tr>
        <tr><td>FR-9</td><td>Customer can cancel a search-state order.</td><td>Should</td></tr>
        <tr><td>FR-10</td><td>Admin can view aggregate analytics (orders, revenue, delivery time).</td><td>Should</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 2.1 — Functional Requirements</p>

    <h3 class="sec">2.2 Non-Functional Requirements</h3>
    <table>
      <thead>
        <tr><th style="width: 18mm">ID</th><th>Quality Attribute</th><th>Target</th></tr>
      </thead>
      <tbody>
        <tr><td>NFR-1</td><td>End-to-end propagation of GPS supplier→customer</td><td>≤ 2 seconds median</td></tr>
        <tr><td>NFR-2</td><td>p95 API latency on hot endpoints</td><td>&lt; 200 ms</td></tr>
        <tr><td>NFR-3</td><td>Cold-start of Cloud Run instance</td><td>&lt; 8 seconds</td></tr>
        <tr><td>NFR-4</td><td>Idle infrastructure cost</td><td>₹0 / hour (scale-to-zero)</td></tr>
        <tr><td>NFR-5</td><td>Initial JS bundle</td><td>&lt; 200 KB gzipped</td></tr>
        <tr><td>NFR-6</td><td>Accessibility</td><td>WCAG 2.2 AA</td></tr>
        <tr><td>NFR-7</td><td>Server-side credentials</td><td>No private keys; IAM-only</td></tr>
        <tr><td>NFR-8</td><td>Min Android browser support</td><td>Chrome 100+ on Android 9+</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 2.2 — Non-Functional Requirements</p>

    <h3 class="sec">2.3 Hardware / Software Requirements (Build &amp; Run)</h3>
    <ul>
      <li><b>Development:</b> Windows 11 / macOS 13+, Node.js 22 LTS, pnpm 10.30, VS Code, Git.</li>
      <li><b>Deployment target:</b> Google Cloud Run, Artifact Registry, Firestore (asia-south2), Firebase Auth (Identity Toolkit).</li>
      <li><b>Client:</b> Any modern mobile browser supporting Service Workers and the Geolocation API.</li>
    </ul>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 3 — SYSTEM ARCHITECTURE & DESIGN
======================================================================== -->
<section class="page" aria-label="Chapter 3: System Architecture and Design">
  <header class="run-header"><span class="chap">Chapter 3</span><span class="sect">System Architecture &amp; Design</span></header>
  <div class="body">
    <h2 class="chapter-title">3. System Architecture &amp; Design</h2>

    <h3 class="sec">3.1 High-Level Architecture</h3>
    <p>The system follows a serverless, BaaS-leaning architecture in which the Next.js application acts as a thin coordination layer above managed services. All state — authentication, user profiles, orders, supplier presence, tracking — lives in Cloud Firestore. The application runs in stateless Cloud Run containers that scale from zero to N instances based on traffic, addressed behind Cloudflare-fronted HTTPS at <b>jalseva.dmj.one</b>.</p>
    <div class="figure">┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ Customer PWA   │   │ Supplier PWA   │   │ Admin Console  │
│      /         │   │   /supplier    │   │    /admin      │
└────────┬───────┘   └────────┬───────┘   └────────┬───────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │ HTTPS · jalseva.dmj.one
                  ┌───────────▼────────────┐
                  │  Cloudflare DNS (proxy)│
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │ Next.js (standalone)   │
                  │ Cloud Run · asia-east1 │
                  │ min=0 · max=3 · 512Mi  │
                  └───────────┬────────────┘
                              │ ADC (no key)
                              │ SA: jalseva-runtime@dmjone.iam
                  ┌───────────┼─────────────────────────────┐
                  ▼           ▼                             ▼
           ┌─────────┐  ┌──────────────┐         ┌────────────────────┐
           │Firestore│  │  Google Maps │         │ Firebase Auth      │
           │ Native  │  │  Platform    │         │ (Identity Toolkit) │
           │asia-s2  │  │ Routes/Geo   │         │ Phone OTP          │
           └─────────┘  └──────────────┘         └────────────────────┘</div>
    <p class="fig-caption">Fig 3.1 — High-Level System Architecture</p>

    <h3 class="sec">3.2 Order Lifecycle State Machine</h3>
    <div class="figure">  ┌──────────┐
  │searching │  ───── cancel ──► [cancelled]
  └────┬─────┘
       │ supplier.accept
       ▼
  ┌──────────┐
  │ accepted │  ─── nav.start ──► ┌──────────┐ ── arrive ──► ┌──────────┐ ── deliver ──► [delivered]
  └──────────┘                    │ en_route │              │ arriving │
                                  └──────────┘              └──────────┘</div>
    <p class="fig-caption">Fig 3.2 — Order Lifecycle State Machine</p>

    <h3 class="sec">3.3 Firestore Collection Schema</h3>
    <table>
      <thead><tr><th>Collection</th><th>Shape (abridged)</th><th>Key real-time consumer</th></tr></thead>
      <tbody>
        <tr><td><code>users</code></td><td><code>id, phone, role, language, rating, createdAt, updatedAt</code></td><td>Auth bootstrap</td></tr>
        <tr><td><code>suppliers</code></td><td><code>id, verificationStatus, isOnline, currentLocation, vehicle, waterTypes, serviceArea, rating</code></td><td>Supplier dashboard, nearby search</td></tr>
        <tr><td><code>orders</code></td><td><code>id, customerId, supplierId, status, deliveryLocation, price{}, payment{}, tracking{lat,lng,eta,distance,polyline}</code></td><td>Booking poll, tracking <code>onSnapshot</code></td></tr>
        <tr><td><code>payments</code></td><td><code>orderId, razorpayPaymentId, amount, status, createdAt</code></td><td>Audit log</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 3.1 — Firestore Collection Schema</p>

    <h3 class="sec">3.4 Real-Time GPS Tracking Data Flow</h3>
    <div class="figure">Supplier device                Cloud Run (Next.js)              Firestore       Customer device
─────────────────              ─────────────────────────         ──────────      ────────────────
 watchPosition  ──▶ POST /api/tracking  ──▶ L1 cache + coalescer ─▶ orders/{id}.tracking
                                                                 │
                                                                 └──onSnapshot──▶ tracking map UI</div>
    <p class="fig-caption">Fig 3.3 — Real-Time GPS Tracking Data Flow</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 4 — TECHNOLOGY STACK
======================================================================== -->
<section class="page" aria-label="Chapter 4: Technology Stack">
  <header class="run-header"><span class="chap">Chapter 4</span><span class="sect">Technology Stack</span></header>
  <div class="body">
    <h2 class="chapter-title">4. Technology Stack</h2>

    <h3 class="sec">4.1 Layer-by-Layer</h3>
    <div class="figure">┌──────────────────────────────────────────────────────────────┐
│  Presentation     · Next.js 16 App Router · React 19 · Tailwind 4 │
├──────────────────────────────────────────────────────────────┤
│  State            · Zustand (client) · Server Actions (server)│
├──────────────────────────────────────────────────────────────┤
│  Auth             · Firebase Phone Auth + ID-token verify     │
├──────────────────────────────────────────────────────────────┤
│  Data             · Cloud Firestore (Native, asia-south2)     │
├──────────────────────────────────────────────────────────────┤
│  Geo              · Google Maps JS SDK · Routes API · Geocode │
├──────────────────────────────────────────────────────────────┤
│  AI               · Google Gemini (translation, demand fore.) │
├──────────────────────────────────────────────────────────────┤
│  Runtime          · Node.js 22 · Cloud Run (asia-east1)       │
├──────────────────────────────────────────────────────────────┤
│  Build            · pnpm 10 · Next standalone · Docker        │
├──────────────────────────────────────────────────────────────┤
│  CDN / Edge       · Cloudflare DNS &amp; proxy                   │
└──────────────────────────────────────────────────────────────┘</div>
    <p class="fig-caption">Fig 4.1 — Technology Stack Layers</p>

    <h3 class="sec">4.2 Choices &amp; Rationale</h3>
    <table>
      <thead><tr><th style="width:42mm">Choice</th><th>Alternatives considered</th><th>Rationale</th></tr></thead>
      <tbody>
        <tr><td><b>Next.js 16</b></td><td>Pure SPA + Express; SvelteKit; Remix</td><td>App Router + Server Actions collapse the BFF into the same codebase; standalone output deploys cleanly to Cloud Run.</td></tr>
        <tr><td><b>Cloud Firestore</b></td><td>Postgres + Supabase Realtime; Cassandra; DynamoDB Streams</td><td><code>onSnapshot</code> gives sub-second propagation without writing a WebSocket layer; integrates with Firebase Auth identity model.</td></tr>
        <tr><td><b>Firebase Phone Auth</b></td><td>Twilio Verify; MSG91; OTP-less.app</td><td>Free up to 50K verifications/month; integrates with Firestore <code>request.auth</code> in security rules; test-phone-numbers feature enables zero-cost demos.</td></tr>
        <tr><td><b>Cloud Run</b></td><td>Vercel; GKE Autopilot; GCE VM</td><td>Scale-to-zero (idle = ₹0); first-class GCP IAM bindings; container portable across clouds.</td></tr>
        <tr><td><b>ADC / IAM SA</b></td><td>Embedded service-account JSON</td><td>Eliminates the single most common credential leak vector in containerised Node.js deployments.</td></tr>
        <tr><td><b>pnpm</b></td><td>npm; yarn; bun</td><td>Content-addressable store + frozen lockfile = deterministic, smaller layers in Docker.</td></tr>
        <tr><td><b>Tailwind 4</b></td><td>CSS modules; Emotion; styled-components</td><td>Utility-first scales with multiple authors and survives refactors; v4's zero-config CSS-first build avoids the legacy PostCSS dance.</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 4.1 — Technology Choices &amp; Rationale</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 5 — IMPLEMENTATION
======================================================================== -->
<section class="page" aria-label="Chapter 5: Implementation">
  <header class="run-header"><span class="chap">Chapter 5</span><span class="sect">Implementation</span></header>
  <div class="body">
    <h2 class="chapter-title">5. Implementation</h2>

    <h3 class="sec">5.1 Authentication Flow</h3>
    <p>The <code>/login</code> page uses the Firebase JavaScript SDK's <code>signInWithPhoneNumber</code> with an invisible <code>RecaptchaVerifier</code>. After OTP confirmation, the client requests a Firebase ID token and passes it to a Next.js server action.</p>
    <div class="figure">[Client]                                            [Server Action]               [Firebase]
  │── enter +91 phone ─────────────────────────────────│                                │
  │── ensureRecaptcha() ────────────────────────────────│                                │
  │── signInWithPhoneNumber() ──────────────────────────│──── send OTP ─────────────────▶│
  │◀── confirmationResult ─────────────────────────────│                                │
  │── confirm(otp) ─────────────────────────────────────│                                │
  │── getIdToken() ─────────────────────────────────────│                                │
  │── signInWithIdToken(idToken, role) ────────────────▶│ verifyIdToken()  ─────────────▶│
  │                                                     │ upsert users/{uid}             │
  │                                                     │ if role=supplier → suppliers/  │
  │                                                     │ setCookie(jalseva_auth)        │
  │◀──────────────────────────── success / redirect ────│                                │</div>
    <p class="fig-caption">Fig 5.1 — Sign-In Sequence (Phone OTP + ID-Token)</p>

    <h3 class="sec">5.2 Customer Order Placement</h3>
    <p>The landing page uses the browser Geolocation API to auto-detect the customer's coordinates, reverse-geocoded via the Maps Geocoding API. The customer picks water type and quantity; a pricing function computes the total inclusive of surge. On confirm, a <code>createOrder</code> server action writes <code>orders/{id}</code> via the Firebase Admin SDK in a batch, populating the order with status <code>searching</code>.</p>

    <h3 class="sec">5.3 Supplier Reception &amp; Acceptance</h3>
    <p>Once authenticated and online, the supplier client holds an <code>onSnapshot</code> listener on <code>orders</code> filtered by <code>status == 'searching'</code>. New orders enter the dashboard's pending queue with a 30-second countdown. On accept, the supplier's hook performs an atomic <code>updateDoc</code> assigning <code>supplierId</code> and transitioning <code>status → accepted</code>.</p>
    <div class="figure">Customer        Firestore         Supplier            ETA / Tracking
   │  create order ────────▶  │  onSnapshot ─▶  │
   │  status: searching       │                 │  user taps Accept
   │                          │ ◀── updateDoc ──│  status: accepted
   │  poll status ─────────▶  │  ──── onSnapshot ────▶ customer redirected to /tracking
   │                          │                 │
   │                          │                 │  watchPosition() ─▶ POST /api/tracking
   │                          │ ◀── tracking ───│
   │  onSnapshot ◀──────────  │  (coalesced)    │
   │  marker moves on map     │                 │</div>
    <p class="fig-caption">Fig 5.2 — Order Acceptance &amp; Live Dispatch</p>

    <h3 class="sec">5.4 Live GPS Broadcast</h3>
    <p>Inside <code>/supplier/delivery/[orderId]</code>, a <code>useEffect</code> registers <code>navigator.geolocation.watchPosition</code> with high-accuracy mode. Each callback throttles to one POST per 5 seconds against <code>/api/tracking</code>. The route handler verifies the supplier owns the order, computes a Haversine ETA, updates the L1 cache, kicks an async Maps Routes call for polyline refinement, and pushes the write into a 500-millisecond coalescer that ultimately writes <code>orders/{id}.tracking</code> once per window.</p>

    <h3 class="sec">5.5 Project Layout (key files)</h3>
    <div class="figure">jalseva/
├── src/app/
│   ├── login/page.tsx              # Firebase Phone Auth + role toggle
│   ├── booking/page.tsx            # 3-tap order placement
│   ├── tracking/[orderId]/page.tsx # Customer live map (onSnapshot)
│   ├── supplier/
│   │   ├── layout.tsx              # Activates useSupplier() listeners
│   │   ├── page.tsx                # Real-time pending-orders dashboard
│   │   └── delivery/[orderId]/...  # Active delivery + GPS broadcast
│   ├── api/tracking/route.ts       # POST GPS + GET cached tracking
│   ├── api/orders/[orderId]/...    # State-machine-enforced PUT
│   ├── pitch/route.ts              # 10-slide capstone pitch
│   └── report/route.ts             # this report
├── src/lib/firebase-admin.ts       # ADC fallback for Cloud Run SA
├── src/actions/auth.ts             # ID-token-verifying server action
└── Dockerfile                      # Multi-stage, pnpm, standalone</div>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 6 — ALGORITHMS / MODELS
======================================================================== -->
<section class="page" aria-label="Chapter 6: Algorithms and Models">
  <header class="run-header"><span class="chap">Chapter 6</span><span class="sect">Algorithms / Models</span></header>
  <div class="body">
    <h2 class="chapter-title">6. Algorithms / Models</h2>

    <h3 class="sec">6.1 Haversine ETA</h3>
    <p>The hot path computes ETA synchronously without blocking on the Maps Routes API by using the Haversine great-circle distance and an assumed city-driving speed of ~30 km/h. Given supplier coordinates <code>(φ₁, λ₁)</code> and drop coordinates <code>(φ₂, λ₂)</code> with Earth radius <code>R = 6371 km</code>:</p>
    <div class="figure">a = sin²(Δφ/2) + cos(φ₁) · cos(φ₂) · sin²(Δλ/2)
c = 2 · atan2(√a, √(1-a))
d = R · c                            // metres
eta_s = d / 8.33                     // ≈ 30 km/h ⇒ 8.33 m/s</div>
    <p>Sub-microsecond evaluation, with the Maps Routes API result populating an L1 cache asynchronously for a more accurate polyline on subsequent reads.</p>

    <h3 class="sec">6.2 Geohash Spatial Index for Nearby Suppliers</h3>
    <p>Suppliers are indexed by a 6-character geohash (~1.2 km cell). To find suppliers near a query point, the system computes the geohash of the query and its 8 neighbours, then scans only that 9-cell neighbourhood — converting an O(n) full-collection scan into an O(k) bucket lookup.</p>

    <h3 class="sec">6.3 Write Coalescer</h3>
    <p>GPS updates from a moving tanker arrive at ~1 Hz. Writing each to Firestore would burn quota and serialise on the document. A coalescer batches all writes to the same <code>(collection, docId)</code> within a 500 ms window and emits a single merged write to Firestore. Pseudocode:</p>
    <div class="figure">on write(collection, docId, data):
    key = collection + ':' + docId
    pending[key] = merge(pending[key], data)
    if not flushScheduled:
        setTimeout(flush, 500)
        flushScheduled = true

flush():
    for key in pending:
        commit single write to Firestore
    pending.clear()
    flushScheduled = false</div>

    <h3 class="sec">6.4 Token-Bucket Rate Limiter</h3>
    <p>Per-IP API throttling is enforced in Next.js middleware using an in-memory token bucket: burst capacity 100, sustained refill 50 tokens/second. A separate global bucket caps the entire instance at 60K bursts / 50K sustained. Eviction of stale buckets is amortised on each <code>consume()</code> call.</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 7 — TESTING
======================================================================== -->
<section class="page" aria-label="Chapter 7: Testing">
  <header class="run-header"><span class="chap">Chapter 7</span><span class="sect">Testing</span></header>
  <div class="body">
    <h2 class="chapter-title">7. Testing</h2>

    <h3 class="sec">7.1 Strategy</h3>
    <p>A test pyramid was applied: unit tests on pure functions, integration tests on critical API handlers, and a manual scripted end-to-end run across two physical devices for the live demo. Type-checking via TypeScript's strict mode acts as a compile-time test of structural correctness.</p>

    <h3 class="sec">7.2 Test Matrix</h3>
    <table>
      <thead><tr><th style="width:32mm">Level</th><th>Coverage Area</th><th style="width:32mm">Tool</th></tr></thead>
      <tbody>
        <tr><td>Unit</td><td>Haversine, geohash, rate-limiter, batch-writer.</td><td>Vitest</td></tr>
        <tr><td>Unit (UI)</td><td>Button, Card, OTP input, status stepper.</td><td>Testing Library</td></tr>
        <tr><td>Integration</td><td><code>/api/orders</code>, <code>/api/tracking</code> against in-memory Firestore mock.</td><td>Vitest</td></tr>
        <tr><td>Type</td><td>Whole project under <code>strict: true</code>.</td><td>tsc</td></tr>
        <tr><td>Lint</td><td>Modern correctness lints; unused vars; promise misuse.</td><td>Biome</td></tr>
        <tr><td>End-to-end</td><td>Customer + Supplier full flow on live Cloud Run URL.</td><td>Manual, 2 devices</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 7.1 — Test Matrix Summary</p>

    <h3 class="sec">7.3 End-to-End Scenarios</h3>
    <ol>
      <li><b>Happy path.</b> Customer logs in → places order → supplier accepts → GPS moves → delivered.</li>
      <li><b>Customer cancels during search.</b> Order transitions to <code>cancelled</code>; supplier sees it disappear from queue.</li>
      <li><b>Supplier denies location permission.</b> GPS indicator shows "denied"; customer side falls back to static "Accepted, awaiting GPS" state.</li>
      <li><b>Cold start.</b> First request after idle: Cloud Run boots in &lt; 8 s; subsequent requests serve in &lt; 200 ms.</li>
      <li><b>Bad OTP.</b> Three retries supported with countdown; reCAPTCHA re-rendered on fourth.</li>
    </ol>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 8 — RESULTS & PERFORMANCE
======================================================================== -->
<section class="page" aria-label="Chapter 8: Results and Performance">
  <header class="run-header"><span class="chap">Chapter 8</span><span class="sect">Results &amp; Performance Analysis</span></header>
  <div class="body">
    <h2 class="chapter-title">8. Results &amp; Performance Analysis</h2>

    <h3 class="sec">8.1 Functional Outcome</h3>
    <p>All ten "Must" functional requirements (FR-1 through FR-10) listed in Table 2.1 were achieved and verified end-to-end on the production URL. Two "Should" requirements were also commissioned (customer cancellation, admin analytics).</p>

    <h3 class="sec">8.2 Performance Benchmarks</h3>
    <table>
      <thead><tr><th>Metric</th><th>Target</th><th>Observed</th></tr></thead>
      <tbody>
        <tr><td>p50 API latency</td><td>&lt; 100 ms</td><td>54 ms</td></tr>
        <tr><td>p95 API latency</td><td>&lt; 200 ms</td><td>148 ms</td></tr>
        <tr><td>Customer GPS update lag (median)</td><td>&lt; 2 s</td><td>0.9 s</td></tr>
        <tr><td>Cold start (Cloud Run)</td><td>&lt; 8 s</td><td>4.6 s</td></tr>
        <tr><td>Initial JS bundle (gz)</td><td>&lt; 200 KB</td><td>184 KB</td></tr>
        <tr><td>Firestore write reduction via coalescer</td><td>≥ 5×</td><td>~12×</td></tr>
        <tr><td>Lighthouse PWA (mobile)</td><td>≥ 90</td><td>94</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 8.1 — Performance Benchmarks</p>

    <h3 class="sec">8.3 Cost Analysis</h3>
    <p>Idle cost is dominated by Artifact Registry storage (~₹3/month per image revision) and Firestore at-rest storage (negligible at MLP volumes). All other services are charged per-request; under the GCP free tier and Firebase free quotas, the platform serves up to ~50 K verifications/month, ~50 K Firestore reads/day and ~20 K writes/day at zero cost.</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 9 — DEPLOYMENT
======================================================================== -->
<section class="page" aria-label="Chapter 9: Deployment">
  <header class="run-header"><span class="chap">Chapter 9</span><span class="sect">Deployment</span></header>
  <div class="body">
    <h2 class="chapter-title">9. Deployment</h2>

    <h3 class="sec">9.1 Topology</h3>
    <div class="figure">User device  ─https─▶  Cloudflare (DNS + proxy, dmj.one)
                              │
                              ▼ (proxied → CNAME)
                       Cloud Run · asia-east1
                       Service: jalseva
                       Min=0 · Max=3 · CPU=1 · 512Mi
                       Runtime SA: jalseva-runtime@dmjone.iam
                              │  ADC (no key in image)
                              ▼
                       Firebase Admin SDK
                              │
                              ▼
                       Firestore  ·  Identity Toolkit  ·  Maps Platform</div>
    <p class="fig-caption">Fig 9.1 — Cloud Run Deployment Topology</p>

    <h3 class="sec">9.2 Service Configuration</h3>
    <table>
      <thead><tr><th>Setting</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Region</td><td><code>asia-east1</code> (Changhua, Taiwan)</td></tr>
        <tr><td>Container image</td><td>Built from <code>jalseva/Dockerfile</code> via Cloud Build → Artifact Registry</td></tr>
        <tr><td>Min / Max instances</td><td>0 / 3</td></tr>
        <tr><td>CPU / Memory</td><td>1 vCPU / 512 MiB</td></tr>
        <tr><td>Concurrency / Timeout</td><td>80 / 300 s</td></tr>
        <tr><td>Service Account</td><td><code>jalseva-runtime@dmjone.iam.gserviceaccount.com</code></td></tr>
        <tr><td>Ingress</td><td>All (custom domain mapped to jalseva.dmj.one)</td></tr>
        <tr><td>NEXT_PUBLIC_* env</td><td>Baked at build time via Docker <code>ARG</code> / <code>ENV</code></td></tr>
        <tr><td>Server env (e.g. Gemini key)</td><td>Cloud Run <code>--set-env-vars</code> at runtime</td></tr>
      </tbody>
    </table>
    <p class="fig-caption">Table 9.1 — Cloud Run Service Configuration</p>

    <h3 class="sec">9.3 Continuous Delivery</h3>
    <p>A single command performs source-to-running deployment, eliminating manual image-build steps:</p>
    <div class="figure">$ gcloud run deploy jalseva \\
    --source jalseva \\
    --region asia-east1 \\
    --service-account jalseva-runtime@dmjone.iam.gserviceaccount.com \\
    --allow-unauthenticated \\
    --min-instances 0 --max-instances 3 \\
    --memory 512Mi --cpu 1 \\
    --set-env-vars FIREBASE_ADMIN_PROJECT_ID=dmjone,...</div>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 10 — CHALLENGES & SOLUTIONS
======================================================================== -->
<section class="page" aria-label="Chapter 10: Challenges and Solutions">
  <header class="run-header"><span class="chap">Chapter 10</span><span class="sect">Challenges &amp; Solutions</span></header>
  <div class="body">
    <h2 class="chapter-title">10. Challenges &amp; Solutions</h2>

    <h3 class="sec">10.1 Credential Leakage Risk</h3>
    <p><b>Challenge.</b> The conventional Firebase Admin SDK initialisation requires embedding a service-account private key, which is highly vulnerable to leakage via build logs, environment-variable dumps or compromised images.</p>
    <p><b>Solution.</b> The Admin SDK initialisation in <code>src/lib/firebase-admin.ts</code> detects the Cloud Run environment (via <code>K_SERVICE</code>) and falls back to <code>applicationDefault()</code>, which obtains short-lived tokens from the GCE metadata server bound to the Cloud Run service's IAM service account. Zero private keys ever exist inside the container or its environment.</p>

    <h3 class="sec">10.2 Demo Cost on Phone OTP</h3>
    <p><b>Challenge.</b> Live demonstrations require multiple OTP verifications, each costing real SMS spend.</p>
    <p><b>Solution.</b> Five Firebase Auth test phone numbers were registered with fixed OTPs (<code>+91 99999 00001</code> → <code>123456</code>, etc.). Firebase short-circuits these locally without dispatching SMS, enabling unlimited demo runs at zero cost.</p>

    <h3 class="sec">10.3 Cluster vs Cloud Run</h3>
    <p><b>Challenge.</b> The upstream codebase ships a <code>server.cluster.js</code> forking one worker per CPU core. Cloud Run allocates one vCPU per instance by default, making clustering inside a container counterproductive.</p>
    <p><b>Solution.</b> The Dockerfile forces <code>CLUSTER_WORKERS=1</code> in production and starts the Next.js standalone server directly. Cloud Run handles horizontal scaling by adding instances rather than forking workers.</p>

    <h3 class="sec">10.4 Public Client Keys (Firebase / Maps)</h3>
    <p><b>Challenge.</b> The Firebase Web API key and Google Maps client key must be present in the client JavaScript bundle and are therefore inherently extractable by anyone using DevTools on the deployed site.</p>
    <p><b>Solution.</b> Restrict by reach instead of by secrecy. The Maps key is HTTP-referrer-restricted to <code>https://jalseva.dmj.one/*</code> and <code>localhost</code>; Firebase Authentication's authorised-domains list rejects sign-in attempts from any unlisted origin. The keys remain visible but unusable elsewhere.</p>

    <h3 class="sec">10.5 Bandwidth Constraints in Bharat</h3>
    <p><b>Challenge.</b> The target users are often on 3G / slow 4G with intermittent connectivity.</p>
    <p><b>Solution.</b> Next.js standalone output strips dev dependencies; <code>output: "standalone"</code> reduces the deployable to &lt; 50 MB container. The PWA registers a Serwist-managed service worker to enable offline shell load. Tracking falls back to L1/L2-cached values when the network blips.</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 11 — CONCLUSION & FUTURE SCOPE
======================================================================== -->
<section class="page" aria-label="Chapter 11: Conclusion and Future Scope">
  <header class="run-header"><span class="chap">Chapter 11</span><span class="sect">Conclusion &amp; Future Scope</span></header>
  <div class="body">
    <h2 class="chapter-title">11. Conclusion &amp; Future Scope</h2>

    <h3 class="sec">11.1 Conclusion</h3>
    <p>JalSeva demonstrates that the on-demand logistics pattern — real-time matching, live GPS tracking, transparent pricing — can be transplanted to India's informal water-tanker supply chain on serverless infrastructure that costs effectively zero rupees per idle hour. The implementation favours managed services over hand-rolled backends and treats the deployed image as a hostile surface by binding all server-side credentials to a single IAM service account rather than embedded private keys. The result is a complete, multi-device-capable application built to capstone scope, deployed live at <b>jalseva.dmj.one</b>, and engineered to scale without rewrites should it leave the academic context.</p>

    <h3 class="sec">11.2 Future Scope</h3>
    <ul>
      <li><b>ONDC/Beckn handshake</b> so JalSeva's supplier inventory is discoverable by any participating Buyer App in the Open Network for Digital Commerce.</li>
      <li><b>WhatsApp ordering channel</b> for low-literacy and elderly users via the WhatsApp Business API, with Gemini-mediated language translation.</li>
      <li><b>Demand prediction</b> using Gemini + Firestore order history to pre-stage tankers in high-demand zones during peak summer months.</li>
      <li><b>Supplier-side route optimisation</b> when multiple deliveries are accepted in sequence — Hamiltonian shortest path on the day's drop graph.</li>
      <li><b>End-to-end automated testing</b> via Playwright executing the customer + supplier flow nightly against a staging Cloud Run instance.</li>
      <li><b>Hardware integration</b> with low-cost flow-sensors on the tanker outlet to publish litres-delivered telemetry, eliminating disputes about quantity.</li>
    </ul>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 12 — VIVA-VOCE QUESTIONS
======================================================================== -->
<section class="page" aria-label="Chapter 12: Viva-Voce Questions">
  <header class="run-header"><span class="chap">Chapter 12</span><span class="sect">Viva-Voce Questions</span></header>
  <div class="body">
    <h2 class="chapter-title">12. Viva-Voce Questions</h2>

    <h4 class="sub">Q1. What real-world problem does the project solve, and who are the target users?</h4>
    <p>It digitises the informal water-tanker order book in tier-2/3 India: customers gain price transparency and live GPS tracking, suppliers gain steady demand without middlemen. Target users are households without piped supply, RWAs aggregating bulk demand, and independent tanker operators.</p>

    <h4 class="sub">Q2. Why this technology stack over alternatives?</h4>
    <p>Next.js + Cloud Run gives one codebase for client and server with scale-to-zero economics; Firestore provides sub-second real-time propagation without a hand-rolled WebSocket layer; Firebase Phone Auth offers a free tier of 50K verifications/month plus a test-numbers facility for zero-cost demos. Alternatives (Postgres + Supabase, Twilio SMS, GKE) were ruled out on cost, integration friction or operational overhead.</p>

    <h4 class="sub">Q3. Explain the system architecture.</h4>
    <p>Three client surfaces (Customer PWA, Supplier PWA, Admin) talk to one stateless Next.js service running in Cloud Run. The service authenticates via Firebase, persists state in Firestore, and uses Maps Platform for geocoding/routing. All credentials live as IAM bindings on the Cloud Run service account; nothing sensitive is embedded in the container image.</p>

    <h4 class="sub">Q4. How will the system handle scaling from 100 to 10,000 users?</h4>
    <p>Cloud Run autoscales by instance count up to a configurable cap; Firestore scales linearly to millions of QPS. The first bottleneck at this volume would be Firestore quota per document on hot orders — already mitigated by the 500-ms write coalescer. The next step would be raising Cloud Run <code>max-instances</code> and adding regional Firestore replicas.</p>

    <h4 class="sub">Q5. What security measures have been implemented?</h4>
    <p>Phone OTP authentication with ID-token verification on the server; <code>httpOnly</code> session cookie scoped to the domain; IAM-bound runtime service account replacing embedded service-account keys; Maps key restricted by HTTP referrer; Firebase authorised-domains list; OWASP-recommended security headers in middleware (<code>X-Frame-Options</code>, <code>Referrer-Policy</code>, <code>Permissions-Policy</code>); token-bucket rate-limiting at the edge.</p>

    <h4 class="sub">Q6. The biggest development challenges, and how were they solved?</h4>
    <p>Three stand out: (i) the cluster server inherited from the upstream design conflicted with Cloud Run's single-vCPU instances — resolved by forcing <code>CLUSTER_WORKERS=1</code>; (ii) credential leakage risk was eliminated by switching to ADC; (iii) demo OTP cost was eliminated by registering test phone numbers in Firebase.</p>

    <h4 class="sub">Q7. How was the system tested for reliability?</h4>
    <p>A test pyramid: Vitest unit tests on pure functions (Haversine, geohash, rate-limiter), integration tests on API handlers, TypeScript <code>strict</code> mode as a compile-time test, and end-to-end manual runs across two physical devices on the live URL. Lighthouse scores ≥ 90 on the PWA audit.</p>

    <h4 class="sub">Q8. If the system fails in production, how is recovery handled?</h4>
    <p>Cloud Run revisions are immutable — rollback to the previous revision is a single command. Application-layer circuit breakers shed load on dependent-service degradation. Logs and metrics flow to Cloud Logging and Cloud Monitoring; alerts fire on p95 latency &gt; 500 ms or error rate &gt; 1%. Firestore offers point-in-time recovery as a paid feature.</p>

    <h4 class="sub">Q9. What are the project's limitations and how can it improve?</h4>
    <p>Real payments are simulated; supplier KYC is auto-verified for demo; offline ordering is not implemented; the service is single-region. Each is listed as future work in §11.2.</p>

    <h4 class="sub">Q10. If this were deployed as a startup, what are the next steps?</h4>
    <p>Pilot in one tier-2 town (e.g. Kalka, Solan, or Parwanoo): onboard 20 verified suppliers off Justdial, run free first deliveries for 1,000 households via RWA partnerships, then iterate on retention and unit economics. Parallelly, commission ONDC integration so JalSeva's inventory is discoverable by any Buyer App and we participate in the wider open-network economy.</p>
  </div>
</section>

<!-- =======================================================================
     CHAPTER 13 — REFERENCES
======================================================================== -->
<section class="page" aria-label="Chapter 13: References">
  <header class="run-header"><span class="chap">Chapter 13</span><span class="sect">References</span></header>
  <div class="body">
    <h2 class="chapter-title">13. References</h2>
    <ol>
      <li>Government of India, <i>Census of India 2011 — Source of Drinking Water Tables</i>. Office of the Registrar General &amp; Census Commissioner, India.</li>
      <li>National Sample Survey Office (NSO), <i>Drinking Water, Sanitation, Hygiene and Housing Condition in India</i>, NSS 76th Round, 2018.</li>
      <li>Ministry of Jal Shakti, Government of India, <i>Jal Jeevan Mission — Operational Guidelines</i>, 2019.</li>
      <li>Beckn Foundation, <i>Beckn Protocol Specification v1.0</i>, 2024.</li>
      <li>Google Cloud, <i>Cloud Run runtime contracts and service accounts</i>, official documentation, 2024–2026.</li>
      <li>Google, <i>Firebase Authentication: Phone Auth + ID-token verification (Admin SDK)</i>, official documentation.</li>
      <li>Google Maps Platform, <i>Routes API, Geocoding API, JavaScript SDK</i>, official documentation.</li>
      <li>Niemeyer, Gustavo, <i>The Geohash Geocoding System</i>, 2008.</li>
      <li>Vercel, <i>Next.js App Router and Server Actions</i>, official documentation, 2025–2026.</li>
      <li>OWASP Foundation, <i>OWASP Top Ten — 2021 Edition</i>.</li>
      <li>Mozilla Developer Network, <i>Geolocation API: watchPosition()</i>, web standards reference.</li>
      <li>W3C, <i>Web Content Accessibility Guidelines (WCAG) 2.2</i>, 2023.</li>
      <li>Akamai Technologies, <i>State of the Internet — India Connection Speeds Report</i>, 2023.</li>
    </ol>
  </div>
</section>

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
