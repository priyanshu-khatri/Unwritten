# Unwritten — Deployment Guide

A full-stack anonymous message archive. Built for Vercel + Vercel KV (free tier).

---

## 📁 Project Structure

```
unwritten/
├── public/
│   └── index.html          ← Frontend (HTML/CSS/JS)
├── api/
│   ├── messages.js         ← GET all / POST new message
│   ├── messages/
│   │   └── [id].js         ← GET one / POST heart / DELETE
│   └── stats.js            ← GET site statistics
├── vercel.json             ← Vercel routing config
├── package.json
└── README.md
```

---

## 🚀 Step-by-Step: GitHub → Vercel

### Step 1 — Create a GitHub Repo

1. Go to **github.com** → click **New repository**
2. Name it `unwritten` (or anything you like)
3. Set to **Public** (or Private — both work)
4. Do NOT initialize with README (you already have files)
5. Click **Create repository**

### Step 2 — Push your files to GitHub

Open a terminal in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/unwritten.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 3 — Connect to Vercel

1. Go to **vercel.com** → Sign up / Log in (use your GitHub account)
2. Click **Add New → Project**
3. Click **Import** next to your `unwritten` repo
4. Keep all default settings (Framework: Other)
5. Click **Deploy** → wait ~30 seconds

Your site is now live! But messages won't save yet — you need a database.

---

## 🗄️ Step 4 — Add Vercel KV (Database)

Vercel KV is a free Redis database. This is what stores all messages.

1. In your Vercel project dashboard, click **Storage** tab
2. Click **Create Database** → choose **KV**
3. Name it `unwritten-kv` → click **Create**
4. Click **Connect to Project** → select your project → **Connect**
5. Vercel automatically adds `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` to your environment variables

6. Go to **Settings → Environment Variables** and verify you see those 3 KV variables

7. Go to **Deployments** → click the 3 dots on your latest deploy → **Redeploy**

✅ Done! Your database is connected and messages will now persist for all users.

---

## 🔐 Step 5 — Add Admin Secret (Optional)

To allow deleting messages via the API:

1. Vercel Dashboard → **Settings → Environment Variables**
2. Add new variable:
   - **Name:** `ADMIN_SECRET`
   - **Value:** any strong password you choose
3. Redeploy

To delete a message:
```bash
curl -X DELETE https://your-site.vercel.app/api/messages/MESSAGE_ID \
  -H "x-admin-secret: your_password_here"
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages` | List messages (with filters) |
| POST | `/api/messages` | Submit new message |
| GET | `/api/messages/:id` | Get single message |
| POST | `/api/messages/:id` | Toggle heart (`{action:"add"\|"remove"}`) |
| DELETE | `/api/messages/:id` | Delete (requires `x-admin-secret` header) |
| GET | `/api/stats` | Get site stats |

### GET /api/messages — Query Parameters

| Param | Values | Default |
|-------|--------|---------|
| `sort` | `newest`, `oldest`, `most-loved`, `random` | `newest` |
| `color` | `#hexcolor` | — |
| `mood` | `love`, `longing`, `regret`, etc. | — |
| `q` | search string | — |
| `page` | number | `0` |
| `limit` | number (max 50) | `12` |

---

## 🔄 Alternative Databases

### Option B — Supabase (Postgres, more powerful)

1. Create free account at supabase.com
2. Create a new project
3. Run this SQL in the SQL editor:
```sql
create table messages (
  id text primary key,
  name text,
  text text not null,
  color text not null,
  "colorName" text,
  mood text,
  hearts integer default 0,
  "createdAt" timestamptz default now()
);
```
4. Get your Project URL and anon key from Settings → API
5. Add to Vercel env vars: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
6. In `api/messages.js`, uncomment the Supabase block and comment out the KV block

### Option C — MongoDB Atlas (also free)

1. Create free account at mongodb.com/atlas
2. Create a free M0 cluster
3. Get your connection string
4. Add to Vercel env vars: `MONGODB_URI`

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Install Vercel CLI
npm install -g vercel

# Pull env vars from your Vercel project
vercel env pull .env.local

# Run locally with Vercel dev (supports serverless functions)
vercel dev
```

Then open http://localhost:3000

---

## 🎨 Customization

- **Colors:** Edit the `COLORS` array in `public/index.html`
- **Moods:** Edit the `MOODS` array in `public/index.html`  
- **Seed messages:** Edit `SEED_MESSAGES` in `api/messages.js`
- **Page size:** Change `PAGE_SIZE = 12` in `public/index.html`
- **Site name:** Search for "Unwritten" in `index.html`

---

## 📝 Notes

- Messages are anonymous by design — no user accounts, no IPs stored
- Heart/like state is stored in `localStorage` per browser
- The `ADMIN_SECRET` env var is the only access control — keep it private
