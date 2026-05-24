// ═══════════════════════════════════════════════════
//  AgroSmart — main.js   (shared across all pages)
// ═══════════════════════════════════════════════════

const API = 'https://agrosmart-97ts.onrender.com';

// ── Toast notification ────────────────────────────
function showToast(msg, duration = 3000) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── Mobile hamburger menu ─────────────────────────
function toggleMenu() {
  const links = document.querySelector('.nav-links');
  if (!links) return;
  if (links.style.display === 'flex') {
    links.style.display = '';
  } else {
    links.style.cssText = `
      display:flex; flex-direction:column;
      position:absolute; top:64px; left:0; right:0;
      background:#1a3a1f; padding:12px 24px 20px; gap:4px; z-index:999;
    `;
  }
}

// ── Set active nav link ───────────────────────────
(function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') && path.endsWith(a.getAttribute('href').replace('../', '').replace('./', ''))) {
      a.classList.add('active');
    }
  });
})();

// ── Tab switcher ──────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const target = this.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      const panel = document.getElementById('panel-' + target);
      if (panel) panel.classList.add('active');
    });
  });
}

// ── Animate numbers (count-up) ────────────────────
function animateCount(el, target, suffix = '') {
  let cur = 0;
  const step = Math.max(1, Math.floor(target / 40));
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur + suffix;
    if (cur >= target) clearInterval(timer);
  }, 30);
}

document.addEventListener('DOMContentLoaded', initTabs);
