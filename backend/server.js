const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const path       = require('path');
const sqlite3    = require('sqlite3').verbose();

const app  = express();
const PORT = 3000;

const db = new sqlite3.Database(path.join(__dirname, 'agrosmart.db'), (err) => {
  if (err) console.error('DB Error:', err);
  else console.log('✅ Database ready');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS field_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farmer_name TEXT, field_name TEXT, crop TEXT, soil TEXT,
    ph REAL, moisture REAL, area REAL, season TEXT, residue TEXT,
    n_required REAL, p_required REAL, k_required REAL, sus_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS recommendations_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER, fert_name TEXT, fert_type TEXT, rate_per_ha REAL, total_qty REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, email TEXT, message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total, AVG(n_required) as avgN, AVG(sus_score) as avgS FROM field_submissions', [], (err, row) => {
    if (err) return res.status(500).json({ success: false });
    db.all('SELECT crop, COUNT(*) as count FROM field_submissions GROUP BY crop', [], (err2, crops) => {
      res.json({ success: true, stats: { total_submissions: row.total, avg_nitrogen: Math.round(row.avgN||0), avg_sus_score: Math.round(row.avgS||0), crop_breakdown: crops }});
    });
  });
});

app.post('/api/optimize', (req, res) => {
  const { farmer_name, field_name, crop, soil, ph, moisture, area, season, residue } = req.body;
  const CROPS = { wheat:{n:120,p:60,k:40}, rice:{n:100,p:50,k:50}, maize:{n:150,p:75,k:40}, sugarcane:{n:200,p:80,k:120}, cotton:{n:100,p:50,k:50}, soybean:{n:30,p:60,k:40}, potato:{n:180,p:80,k:150}, tomato:{n:140,p:70,k:120} };
  const SOIL_MOD = { loamy:1.0, sandy:1.15, clayey:0.9, silty:0.95, black:0.85 };
  const RES_ADJ = { none:{n:0,p:0,k:0}, legume:{n:-30,p:0,k:0}, cereal:{n:-10,p:5,k:10}, compost:{n:-20,p:-10,k:-10} };
  const base = CROPS[crop]||CROPS.wheat, sm = SOIL_MOD[soil]||1.0, ra = RES_ADJ[residue]||RES_ADJ.none;
  let N=Math.max(0,(base.n*sm)+ra.n), P=Math.max(0,(base.p*sm)+ra.p), K=Math.max(0,(base.k*sm)+ra.k);
  if(ph<5.5){N*=0.85;P*=0.70;} if(ph>7.5){P*=0.80;K*=0.90;} if(moisture>65)N*=0.90;
  N=Math.round(N);P=Math.round(P);K=Math.round(K);
  let score=65; if(residue==='legume'||residue==='compost')score+=12; if(ph>=6&&ph<=7)score+=6; if(moisture<=55)score+=5; if(N<100)score+=7; if(soil==='loamy'||soil==='black')score+=5; score=Math.min(100,score);
  db.run('INSERT INTO field_submissions (farmer_name,field_name,crop,soil,ph,moisture,area,season,residue,n_required,p_required,k_required,sus_score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [farmer_name,field_name||'',crop,soil,ph,moisture,area,season,residue,N,P,K,score], function(err) {
    if(err) return res.status(500).json({success:false,message:err.message});
    const fertMix = [
  { name:'Vermicompost / FYM',             type:'Organic',  rate: Math.round(N*0.3*12) },
  { name:'Urea (46-0-0)',                   type:'Chemical', rate: Math.round((N*0.7)/0.46) },
  { name:'Single Superphosphate (SSP)',     type:'Chemical', rate: P>0 ? Math.round(P/0.16) : 0 },
  { name:'Muriate of Potash (MOP)',         type:'Chemical', rate: K>0 ? Math.round(K/0.60) : 0 },
  { name:'Rhizobium Biofertilizer',         type:'Bio',      rate: 5 },
  { name:'PSB (Phosphate Solubilizing B.)', type:'Bio',      rate: 5 },
].filter(f => f.rate > 0);

res.json({
  success: true,
  submission_id: this.lastID,
  npk: { n:N, p:P, k:K },
  sus_score: score,
  fert_mix: fertMix.map(f => ({ ...f, total: Math.round(f.rate * area) })),
  message: 'Data saved successfully!'
});
  });
});

app.get('/api/history', (req, res) => {
  db.all('SELECT * FROM field_submissions ORDER BY created_at DESC LIMIT 50', [], (err, rows) => {
    if(err) return res.status(500).json({success:false});
    res.json({success:true,data:rows});
  });
});

app.delete('/api/history/:id', (req, res) => {
  db.run('DELETE FROM recommendations_log WHERE submission_id=?', [req.params.id], () => {
    db.run('DELETE FROM field_submissions WHERE id=?', [req.params.id], (err) => {
      res.json({success:true,message:'Deleted'});
    });
  });
});

app.post('/api/contact', (req, res) => {
  const {name,email,message} = req.body;
  db.run('INSERT INTO contact_messages (name,email,message) VALUES (?,?,?)', [name,email,message], (err) => {
    res.json({success:true,message:'Message sent!'});
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🌱  AgroSmart Backend Running!');
  console.log('🔗  Open: http://localhost:' + PORT);
  console.log('─────────────────────────────');
});
