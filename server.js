// ═══════════════════════════════════════════════════════
//  AgroSmart — Sustainable Fertilizer Optimizer
//  server.js — Main Entry Point
// ═══════════════════════════════════════════════════════
const db = require('./db/database');
const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const path       = require('path');

const fieldRoutes   = require('./routes/fields');
const reportRoutes  = require('./routes/reports');
const cropRoutes    = require('./routes/crops');

const app  = express();
const PORT = 3000;

// ── Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── View Engine (plain HTML served from public/)
app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/history',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'history.html')));
app.get('/reports',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'reports.html')));
app.get('/about',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));

// ── API Routes
app.use('/api/fields',  fieldRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/crops',   cropRoutes);

// ── Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AgroSmart server is running 🌱', time: new Date().toISOString() });
});

// ── Start
app.listen(PORT, () => {
  console.log('');
  console.log('  🌱  AgroSmart Server Started');
  console.log('  ─────────────────────────────────────');
  console.log(`  🌐  Open in browser: http://localhost:${PORT}`);
  console.log(`  📊  API Base:        http://localhost:${PORT}/api`);
  console.log('  ─────────────────────────────────────');
  console.log('  Press Ctrl+C to stop the server\n');
});
