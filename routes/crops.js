// routes/crops.js
const express = require('express');
const router  = express.Router();

const CROPS = {
  wheat:     { name:'Wheat',     icon:'🌾', n:120, p:60,  k:40,  yield:'3–5 t/ha',   water:'Medium', season:['rabi'],           desc:'Most common rabi crop in India.' },
  rice:      { name:'Rice',      icon:'🍚', n:100, p:50,  k:50,  yield:'4–6 t/ha',   water:'High',   season:['kharif'],         desc:'Major kharif crop, needs high water.' },
  maize:     { name:'Maize',     icon:'🌽', n:150, p:75,  k:40,  yield:'5–8 t/ha',   water:'Medium', season:['kharif','zaid'],  desc:'High N demand, fast growing crop.' },
  sugarcane: { name:'Sugarcane', icon:'🎋', n:200, p:80,  k:120, yield:'60–80 t/ha', water:'High',   season:['kharif','rabi'],  desc:'Long duration, heavy feeder crop.' },
  cotton:    { name:'Cotton',    icon:'☁️',  n:100, p:50,  k:50,  yield:'2–3 t/ha',   water:'Medium', season:['kharif'],         desc:'Major cash crop of MP & Maharashtra.' },
  soybean:   { name:'Soybean',   icon:'🫘', n:30,  p:60,  k:40,  yield:'2–3 t/ha',   water:'Low',    season:['kharif'],         desc:'Legume — fixes its own nitrogen.' },
  potato:    { name:'Potato',    icon:'🥔', n:180, p:80,  k:150, yield:'20–30 t/ha', water:'Medium', season:['rabi'],           desc:'Very high K demand for tuber formation.' },
  tomato:    { name:'Tomato',    icon:'🍅', n:140, p:70,  k:120, yield:'25–40 t/ha', water:'Medium', season:['rabi','zaid'],    desc:'High value vegetable, needs balanced NPK.' },
};

router.get('/', (req, res) => res.json({ success:true, data: Object.entries(CROPS).map(([k,v]) => ({id:k,...v})) }));
router.get('/:id', (req, res) => {
  const c = CROPS[req.params.id];
  if (!c) return res.status(404).json({ success:false, error:'Crop not found' });
  res.json({ success:true, data:{ id:req.params.id, ...c } });
});

module.exports = router;
