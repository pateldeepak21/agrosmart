# 🌱 AgroSmart — Sustainable Fertilizer Optimizer
### Complete Minor Project | Node.js + SQLite + HTML/CSS/JS

---

## 📁 PROJECT STRUCTURE

```
agrosmart/
├── backend/
│   ├── server.js          ← Express server + all API routes
│   ├── package.json       ← Node dependencies
│   └── agrosmart.db       ← SQLite database (auto-created on first run)
│
└── frontend/
    ├── index.html         ← Homepage
    ├── css/
    │   └── style.css      ← All CSS styles
    ├── js/
    │   └── main.js        ← Shared JS (toast, tabs, utilities)
    └── pages/
        ├── optimizer.html ← Main fertilizer optimizer tool
        ├── history.html   ← View all database records
        ├── about.html     ← Project information
        └── contact.html   ← Contact form (saved to DB)
```

---

## ⚡ HOW TO RUN — STEP BY STEP

### STEP 1 — Install Node.js (one-time only)
1. Go to: https://nodejs.org
2. Download **LTS version** (e.g., 20.x)
3. Install it (keep all defaults, click Next → Next → Install)
4. Verify: Open Terminal/CMD → type `node -v` → should show version

---

### STEP 2 — Open Project in VS Code
1. Open VS Code
2. Click **File → Open Folder**
3. Select the `agrosmart` folder
4. You should see `backend/` and `frontend/` folders in the sidebar

---

### STEP 3 — Install Dependencies
1. In VS Code, press **Ctrl + ` ** (backtick) to open Terminal
2. Navigate to backend:
```bash
cd backend
```
3. Install packages:
```bash
npm install
```
4. Wait for it to finish (you'll see a `node_modules` folder appear)

---

### STEP 4 — Start the Backend Server
In the same terminal (inside `backend/`):
```bash
node server.js
```

You should see:
```
🌱  AgroSmart Backend Running!
🔗  Open in browser: http://localhost:3000
📦  Database: agrosmart.db
```

> ✅ Keep this terminal running! Don't close it.

---

### STEP 5 — Open the Website
**Option A (Recommended) — Live Server extension:**
1. Install "Live Server" extension in VS Code (by Ritwick Dey)
2. Right-click on `frontend/index.html`
3. Click "Open with Live Server"
4. Browser opens at `http://127.0.0.1:5500`

**Option B — Direct open:**
1. Go to `frontend/` folder in File Explorer
2. Double-click `index.html`
3. It opens in browser directly

---

## 🌐 PAGES

| Page | URL / File | Description |
|------|------------|-------------|
| Home | `index.html` | Landing page with stats |
| Optimizer | `pages/optimizer.html` | Main tool — enter field data |
| History | `pages/history.html` | View all DB records |
| About | `pages/about.html` | Project info & tech stack |
| Contact | `pages/contact.html` | Contact form (saved to DB) |

---

## 🔌 API ENDPOINTS

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/optimize` | Submit field data, get NPK result, save to DB |
| GET | `/api/history` | Get all submissions |
| GET | `/api/history/:id` | Get one submission with fertilizer details |
| DELETE | `/api/history/:id` | Delete a record |
| GET | `/api/stats` | Dashboard stats (count, averages, crop breakdown) |
| POST | `/api/contact` | Save a contact message |

---

## 🗄️ DATABASE TABLES

### `field_submissions`
Stores every optimizer form submission.
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment primary key |
| farmer_name | TEXT | Name entered by user |
| field_name | TEXT | Optional field name |
| crop | TEXT | Crop type |
| soil | TEXT | Soil type |
| ph | REAL | Soil pH value |
| moisture | REAL | Soil moisture % |
| area | REAL | Field area in hectares |
| season | TEXT | kharif / rabi / zaid |
| residue | TEXT | Prior crop residue type |
| n_required | REAL | Calculated Nitrogen kg/ha |
| p_required | REAL | Calculated Phosphorus kg/ha |
| k_required | REAL | Calculated Potassium kg/ha |
| sus_score | REAL | Sustainability score (0–100) |
| created_at | DATETIME | Timestamp |

### `recommendations_log`
Fertilizer mix saved per submission.

### `contact_messages`
Messages from the contact form.

---

## 🌾 CROPS SUPPORTED
- 🌾 Wheat
- 🍚 Rice
- 🌽 Maize / Corn
- 🎋 Sugarcane
- ☁️ Cotton
- 🫘 Soybean
- 🥔 Potato
- 🍅 Tomato

---

## 🔧 TROUBLESHOOTING

**"Cannot connect to server"**
→ Make sure backend is running: `cd backend && node server.js`

**"node is not recognized"**
→ Node.js not installed. Download from https://nodejs.org

**"npm install fails"**
→ Make sure you're inside the `backend/` folder

**Port 3000 already in use**
→ Change `const PORT = 3000` to `3001` in `server.js`

---

## 📦 DEPENDENCIES

```json
{
  "express": "^4.18.2",       ← Web server
  "cors": "^2.8.5",           ← Allow frontend to call API
  "better-sqlite3": "^9.4.3", ← SQLite database
  "body-parser": "^1.20.2",   ← Parse JSON requests
  "nodemon": "^3.0.3"         ← Auto-restart on file change (dev)
}
```

---

*AgroSmart — Minor Project 2024-25*
