const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const mongoose   = require('mongoose');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// ── Connect to MongoDB ────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ── Mongoose Schemas ──────────────────────────────
const submissionSchema = new mongoose.Schema({
  farmer_name: String,
  field_name:  String,
  crop:        String,
  soil:        String,
  ph:          Number,
  moisture:    Number,
  area:        Number,
  season:      String,
  residue:     String,
  n_required:  Number,
  p_required:  Number,
  k_required:  Number,
  sus_score:   Number,
  created_at:  { type: Date, default: Date.now }
});

const fertSchema = new mongoose.Schema({
  submission_id: mongoose.Schema.Types.ObjectId,
  fert_name:     String,
  fert_type:     String,
  rate_per_ha:   Number,
  total_qty:     Number,
});

const contactSchema = new mongoose.Schema({
  name:       String,
  email:      String,
  message:    String,
  created_at: { type: Date, default: Date.now }
});

const Submission = mongoose.model('Submission', submissionSchema);
const Fert       = mongoose.model('Fert', fertSchema);
const Contact    = mongoose.model('Contact', contactSchema);

// ── Middleware ────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ── Pages ─────────────────────────────────────────
app.get('/',         (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/history',  (req, res) => res.sendFile(path.join(__dirname, '../public/pages/history.html')));
app.get('/optimizer',(req, res) => res.sendFile(path.join(__dirname, '../public/pages/optimizer.html')));
app.get('/about',    (req, res) => res.sendFile(path.join(__dirname, '../public/pages/about.html')));
app.get('/contact',  (req, res) => res.sendFile(path.join(__dirname, '../public/pages/contact.html')));

// ── Health Check ──────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── POST /api/optimize ────────────────────────────
app.post('/api/optimize', async (req, res) => {
  try {
    const { farmer_name, field_name, crop, soil, ph, moisture, area, season, residue } = req.body;

    if (!farmer_name || !crop || !soil || !ph || !moisture || !area || !season || !residue)
      return res.status(400).json({ success: false, message: 'All fields are required.' });

    // NPK Calculation
    const CROPS = {
      wheat:{n:120,p:60,k:40}, rice:{n:100,p:50,k:50}, maize:{n:150,p:75,k:40},
      sugarcane:{n:200,p:80,k:120}, cotton:{n:100,p:50,k:50}, soybean:{n:30,p:60,k:40},
      potato:{n:180,p:80,k:150}, tomato:{n:140,p:70,k:120},
    };
    const SOIL_MOD = { loamy:1.0, sandy:1.15, clayey:0.9, silty:0.95, black:0.85 };
    const RES_ADJ  = { none:{n:0,p:0,k:0}, legume:{n:-30,p:0,k:0}, cereal:{n:-10,p:5,k:10}, compost:{n:-20,p:-10,k:-10} };

    const base = CROPS[crop] || CROPS.wheat;
    const sm   = SOIL_MOD[soil] || 1.0;
    const ra   = RES_ADJ[residue] || RES_ADJ.none;

    let N = Math.max(0, (base.n * sm) + ra.n);
    let P = Math.max(0, (base.p * sm) + ra.p);
    let K = Math.max(0, (base.k * sm) + ra.k);
    if (ph < 5.5) { N *= 0.85; P *= 0.70; }
    if (ph > 7.5) { P *= 0.80; K *= 0.90; }
    if (moisture > 65) N *= 0.90;
    N = Math.round(N); P = Math.round(P); K = Math.round(K);

    // Sustainability Score
    let score = 65;
    if (residue === 'legume' || residue === 'compost') score += 12;
    if (ph >= 6.0 && ph <= 7.0) score += 6;
    if (moisture <= 55) score += 5;
    if (N < 100) score += 7;
    if (soil === 'loamy' || soil === 'black') score += 5;
    score = Math.min(100, score);

    // Save to MongoDB
    const sub = await Submission.create({
      farmer_name, field_name: field_name || '', crop, soil,
      ph, moisture, area, season, residue,
      n_required: N, p_required: P, k_required: K, sus_score: score
    });

    // Fertilizer Mix
    const fertMix = [
      { name:'Vermicompost / FYM',            type:'Organic',  rate: Math.round(N*0.3*12) },
      { name:'Urea (46-0-0)',                  type:'Chemical', rate: Math.round((N*0.7)/0.46) },
      { name:'Single Superphosphate (SSP)',    type:'Chemical', rate: P>0 ? Math.round(P/0.16) : 0 },
      { name:'Muriate of Potash (MOP)',        type:'Chemical', rate: K>0 ? Math.round(K/0.60) : 0 },
      { name:'Rhizobium Biofertilizer',        type:'Bio',      rate: 5 },
      { name:'PSB (Phosphate Solubilizing B.)',type:'Bio',      rate: 5 },
    ].filter(f => f.rate > 0);

    for (const f of fertMix) {
      await Fert.create({
        submission_id: sub._id,
        fert_name: f.name, fert_type: f.type,
        rate_per_ha: f.rate, total_qty: Math.round(f.rate * area)
      });
    }

    res.json({
      success: true,
      submission_id: sub._id,
      npk: { n: N, p: P, k: K },
      sus_score: score,
      fert_mix: fertMix.map(f => ({ ...f, total: Math.round(f.rate * area) })),
      message: 'Data saved successfully!'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/history ──────────────────────────────
app.get('/api/history', async (req, res) => {
  try {
    const rows = await Submission.find().sort({ created_at: -1 }).limit(50);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/history/:id ──────────────────────────
app.get('/api/history/:id', async (req, res) => {
  try {
    const sub  = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    const recs = await Fert.find({ submission_id: req.params.id });
    res.json({ success: true, submission: sub, fertilizers: recs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/history/:id ───────────────────────
app.delete('/api/history/:id', async (req, res) => {
  try {
    await Fert.deleteMany({ submission_id: req.params.id });
    await Submission.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/stats ────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const total  = await Submission.countDocuments();
    const aggN   = await Submission.aggregate([{ $group: { _id: null, avg: { $avg: '$n_required' } } }]);
    const aggS   = await Submission.aggregate([{ $group: { _id: null, avg: { $avg: '$sus_score' } } }]);
    const crops  = await Submission.aggregate([
      { $group: { _id: '$crop', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { crop: '$_id', count: 1, _id: 0 } }
    ]);
    res.json({
      success: true,
      stats: {
        total_submissions: total,
        avg_nitrogen:  aggN[0] ? Math.round(aggN[0].avg) : 0,
        avg_sus_score: aggS[0] ? Math.round(aggS[0].avg) : 0,
        crop_breakdown: crops
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/contact ─────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ success: false, message: 'All fields required.' });
    await Contact.create({ name, email, message });
    res.json({ success: true, message: 'Message sent!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🌱  AgroSmart Backend Running!');
  console.log(`🔗  Open: http://localhost:${PORT}`);
  console.log('─────────────────────────────');
});