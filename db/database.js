const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, 'agrosmart.db');
const db      = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, village TEXT, district TEXT,
    state TEXT DEFAULT 'Madhya Pradesh', phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_id INTEGER, field_name TEXT NOT NULL,
    area_hectares REAL NOT NULL, crop_type TEXT NOT NULL,
    soil_type TEXT NOT NULL, soil_ph REAL NOT NULL,
    moisture_pct INTEGER NOT NULL, season TEXT NOT NULL,
    prior_residue TEXT DEFAULT 'none',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id INTEGER NOT NULL,
    n_kg_per_ha REAL, p_kg_per_ha REAL, k_kg_per_ha REAL,
    total_n_kg REAL, total_p_kg REAL, total_k_kg REAL,
    sustainability_score INTEGER, expected_yield TEXT,
    cost_estimate_inr REAL, co2_saved_kg REAL,
    fertilizer_mix TEXT, notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (field_id) REFERENCES fields(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS application_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id INTEGER NOT NULL, stage TEXT NOT NULL,
    fertilizer_name TEXT NOT NULL, quantity_kg REAL NOT NULL,
    applied_date DATE, status TEXT DEFAULT 'pending', notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (field_id) REFERENCES fields(id)
  )`);

  console.log('✅ Database ready: agrosmart.db');
});

module.exports = db;