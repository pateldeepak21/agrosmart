// ═══════════════════════════════════════════════════════
//  public/js/app.js — Shared Utilities
// ═══════════════════════════════════════════════════════

const API = 'http://localhost:3000/api';

// ── Toast Notification ──────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.className = type === 'error' ? 'error' : '';
  t.innerHTML = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── API Helper ──────────────────────────────────────
async function apiGet(endpoint) {
  const res = await fetch(API + endpoint);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(endpoint, data) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(API + endpoint, { method: 'DELETE' });
  return res.json();
}

// ── Format helpers ──────────────────────────────────
function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function scoreColor(s) {
  if (s >= 85) return '#166534';
  if (s >= 70) return '#92400e';
  return '#991b1b';
}

function scoreBg(s) {
  if (s >= 85) return '#dcfce7';
  if (s >= 70) return '#fef3c7';
  return '#fee2e2';
}

function scoreLabel(s) {
  if (s >= 85) return 'Excellent 🌟';
  if (s >= 70) return 'Good 👍';
  return 'Needs Improvement ⚠️';
}

// ── Active nav link ─────────────────────────────────
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.href === location.href || location.pathname === a.getAttribute('href')) {
    a.classList.add('active');
  }
});

// ── NPK Frontend Calculator ─────────────────────────
const CROP_BASE = {
  wheat:     { n:120, p:60,  k:40,  yield:'3–5 t/ha'   },
  rice:      { n:100, p:50,  k:50,  yield:'4–6 t/ha'   },
  maize:     { n:150, p:75,  k:40,  yield:'5–8 t/ha'   },
  sugarcane: { n:200, p:80,  k:120, yield:'60–80 t/ha' },
  cotton:    { n:100, p:50,  k:50,  yield:'2–3 t/ha'   },
  soybean:   { n:30,  p:60,  k:40,  yield:'2–3 t/ha'   },
  potato:    { n:180, p:80,  k:150, yield:'20–30 t/ha' },
  tomato:    { n:140, p:70,  k:120, yield:'25–40 t/ha' },
};
const SOIL_MOD    = { loamy:1.0, sandy:1.15, clayey:0.9, silty:0.95, black:0.85 };
const RESIDUE_ADJ = { none:{n:0,p:0,k:0}, legume:{n:-30,p:0,k:0}, cereal:{n:-10,p:5,k:10}, compost:{n:-20,p:-10,k:-10} };

function calcNPK(crop, soil, ph, moisture, area, residue) {
  const base = CROP_BASE[crop] || CROP_BASE.wheat;
  const sm   = SOIL_MOD[soil]  || 1.0;
  const rm   = RESIDUE_ADJ[residue] || { n:0, p:0, k:0 };
  let n = Math.max(0, (base.n * sm) + rm.n);
  let p = Math.max(0, (base.p * sm) + rm.p);
  let k = Math.max(0, (base.k * sm) + rm.k);
  if (ph < 5.5) { n *= 0.85; p *= 0.70; }
  if (ph > 7.5) { p *= 0.80; k *= 0.90; }
  if (moisture > 65) n *= 0.90;
  n = Math.round(n); p = Math.round(p); k = Math.round(k);
  return {
    n, p, k,
    totalN: Math.round(n * area),
    totalP: Math.round(p * area),
    totalK: Math.round(k * area),
    yield: base.yield,
  };
}

function calcSusScore(residue, ph, moisture, n, soilType) {
  let sc = 65;
  if (residue === 'legume' || residue === 'compost') sc += 12;
  if (ph >= 6.0 && ph <= 7.0) sc += 6;
  if (moisture <= 55) sc += 5;
  if (n < 100) sc += 7;
  if (soilType === 'loamy' || soilType === 'black') sc += 5;
  return Math.min(100, sc);
}
