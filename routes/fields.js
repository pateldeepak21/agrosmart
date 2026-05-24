// ═══════════════════════════════════════════════════════
//  routes/fields.js — Field & Farmer CRUD API
// ═══════════════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// ── NPK Calculation Engine ─────────────────────────────
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

function calcNPK(data) {
  const base = CROP_BASE[data.crop_type] || CROP_BASE.wheat;
  const sm   = SOIL_MOD[data.soil_type]  || 1.0;
  const rm   = RESIDUE_ADJ[data.prior_residue] || { n:0, p:0, k:0 };
  let n = Math.max(0, (base.n * sm) + rm.n);
  let p = Math.max(0, (base.p * sm) + rm.p);
  let k = Math.max(0, (base.k * sm) + rm.k);
  if (data.soil_ph < 5.5) { n *= 0.85; p *= 0.70; }
  if (data.soil_ph > 7.5) { p *= 0.80; k *= 0.90; }
  if (data.moisture_pct > 65) n *= 0.90;
  n = Math.round(n); p = Math.round(p); k = Math.round(k);
  const area = parseFloat(data.area_hectares);
  const score = calcScore(data, n);
  const nSaved = Math.round(base.n * 0.3 * area);
  return {
    n_per_ha: n, p_per_ha: p, k_per_ha: k,
    total_n: Math.round(n * area),
    total_p: Math.round(p * area),
    total_k: Math.round(k * area),
    sustainability_score: score,
    expected_yield: base.yield,
    cost_estimate: Math.round((n * area * 6) + (p * area * 12) + (k * area * 10)),
    co2_saved: Math.round(nSaved * 1.9),
    fertilizer_mix: buildFertMix(n, p, k),
  };
}

function calcScore(s, n) {
  let sc = 65;
  if (s.prior_residue === 'legume' || s.prior_residue === 'compost') sc += 12;
  if (s.soil_ph >= 6.0 && s.soil_ph <= 7.0) sc += 6;
  if (s.moisture_pct <= 55) sc += 5;
  if (n < 100) sc += 7;
  if (s.soil_type === 'loamy' || s.soil_type === 'black') sc += 5;
  return Math.min(100, sc);
}

function buildFertMix(n, p, k) {
  return [
    `Urea ${Math.round((n*0.7)/0.46)} kg/ha`,
    `Vermicompost ${Math.round((n*0.3)*12)} kg/ha`,
    p > 0 ? `SSP ${Math.round(p/0.16)} kg/ha` : null,
    k > 0 ? `MOP ${Math.round(k/0.60)} kg/ha` : null,
    'Rhizobium 5 kg/ha',
    'PSB 5 kg/ha',
  ].filter(Boolean);
}

// ── GET all records (with farmer join) ────────────────
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT f.*, fa.name as farmer_name, fa.village, fa.district,
             r.n_kg_per_ha, r.p_kg_per_ha, r.k_kg_per_ha,
             r.sustainability_score, r.expected_yield, r.cost_estimate_inr,
             r.created_at as rec_date
      FROM fields f
      LEFT JOIN farmers fa ON f.farmer_id = fa.id
      LEFT JOIN recommendations r ON r.field_id = f.id
      ORDER BY f.created_at DESC
    `).all();
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET single field ──────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const field = db.prepare(`
      SELECT f.*, fa.name as farmer_name, fa.village, fa.district, fa.phone
      FROM fields f
      LEFT JOIN farmers fa ON f.farmer_id = fa.id
      WHERE f.id = ?
    `).get(req.params.id);
    if (!field) return res.status(404).json({ success: false, error: 'Field not found' });
    const rec = db.prepare('SELECT * FROM recommendations WHERE field_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.id);
    res.json({ success: true, data: { field, recommendation: rec } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST — Save new field + auto-calculate + store ────
router.post('/', (req, res) => {
  try {
    const { farmer_name, village, district, phone, field_name, area_hectares,
            crop_type, soil_type, soil_ph, moisture_pct, season, prior_residue } = req.body;

    // Upsert farmer
    let farmer = db.prepare('SELECT id FROM farmers WHERE name = ? AND phone = ?').get(farmer_name, phone || '');
    if (!farmer) {
      const ins = db.prepare('INSERT INTO farmers (name, village, district, phone) VALUES (?, ?, ?, ?)');
      farmer = { id: ins.run(farmer_name || 'Anonymous', village || '', district || 'Indore', phone || '').lastInsertRowid };
    }

    // Insert field
    const fieldStmt = db.prepare(`
      INSERT INTO fields (farmer_id, field_name, area_hectares, crop_type, soil_type, soil_ph, moisture_pct, season, prior_residue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const fieldRes = fieldStmt.run(farmer.id, field_name || 'My Field', area_hectares, crop_type, soil_type, soil_ph, moisture_pct, season, prior_residue || 'none');
    const fieldId = fieldRes.lastInsertRowid;

    // Auto-calculate NPK
    const calc = calcNPK(req.body);

    // Store recommendation
    const recStmt = db.prepare(`
      INSERT INTO recommendations (field_id, n_kg_per_ha, p_kg_per_ha, k_kg_per_ha, total_n_kg, total_p_kg, total_k_kg,
        sustainability_score, expected_yield, cost_estimate_inr, co2_saved_kg, fertilizer_mix)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    recStmt.run(fieldId, calc.n_per_ha, calc.p_per_ha, calc.k_per_ha,
      calc.total_n, calc.total_p, calc.total_k,
      calc.sustainability_score, calc.expected_yield,
      calc.cost_estimate, calc.co2_saved, JSON.stringify(calc.fertilizer_mix));

    res.json({ success: true, message: 'Field saved and recommendations generated!', fieldId, calculation: calc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM recommendations WHERE field_id = ?').run(req.params.id);
    db.prepare('DELETE FROM application_logs WHERE field_id = ?').run(req.params.id);
    const result = db.prepare('DELETE FROM fields WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Field not found' });
    res.json({ success: true, message: 'Field deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /calculate — Just calculate, don't save ─────
router.post('/calculate/preview', (req, res) => {
  try {
    const calc = calcNPK(req.body);
    res.json({ success: true, data: calc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
