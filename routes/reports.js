// routes/reports.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');

// Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const totalFields  = db.prepare('SELECT COUNT(*) as c FROM fields').get().c;
    const totalFarmers = db.prepare('SELECT COUNT(*) as c FROM farmers').get().c;
    const avgScore     = db.prepare('SELECT ROUND(AVG(sustainability_score),1) as avg FROM recommendations').get().avg || 0;
    const totalCO2     = db.prepare('SELECT ROUND(SUM(co2_saved_kg),0) as t FROM recommendations').get().t || 0;
    const totalSaved   = db.prepare('SELECT ROUND(SUM(cost_estimate_inr),0) as t FROM recommendations').get().t || 0;
    const cropDist     = db.prepare('SELECT crop_type, COUNT(*) as count FROM fields GROUP BY crop_type ORDER BY count DESC').all();
    const recent       = db.prepare(`
      SELECT f.field_name, f.crop_type, f.area_hectares, fa.name as farmer_name,
             r.sustainability_score, r.expected_yield, f.created_at
      FROM fields f
      JOIN farmers fa ON f.farmer_id = fa.id
      LEFT JOIN recommendations r ON r.field_id = f.id
      ORDER BY f.created_at DESC LIMIT 5
    `).all();
    res.json({ success:true, data:{ totalFields, totalFarmers, avgScore, totalCO2, totalSaved, cropDist, recent } });
  } catch(err) { res.status(500).json({ success:false, error:err.message }); }
});

// All recommendations list
router.get('/all', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, f.field_name, f.crop_type, f.area_hectares, f.soil_type, f.season,
             fa.name as farmer_name, fa.village
      FROM recommendations r
      JOIN fields f ON r.field_id = f.id
      JOIN farmers fa ON f.farmer_id = fa.id
      ORDER BY r.created_at DESC
    `).all();
    res.json({ success:true, data:rows });
  } catch(err) { res.status(500).json({ success:false, error:err.message }); }
});

module.exports = router;
