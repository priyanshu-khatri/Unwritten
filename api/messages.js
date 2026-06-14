/**
 * /api/messages
 * Vercel Serverless Function
 *
 * DATABASE OPTIONS (pick one — see README):
 *  A) Vercel KV (Redis)  ← default below, free tier available
 *  B) Supabase (Postgres) ← uncomment the supabase block
 *  C) MongoDB Atlas       ← uncomment the mongo block
 *
 * Set your env vars in Vercel Dashboard → Project → Settings → Environment Variables
 */

// ── Option A: Vercel KV (Redis) ──────────────────────────────────────────────
// Add KV to your Vercel project: vercel.com/dashboard → Storage → Create KV
import { kv } from '@vercel/kv';

// ── Option B: Supabase ───────────────────────────────────────────────────────
// npm install @supabase/supabase-js
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ── Option C: MongoDB Atlas ──────────────────────────────────────────────────
// npm install mongodb
// import { MongoClient } from 'mongodb';

// ─────────────────────────────────────────────────────────────────────────────

const SEED_MESSAGES = [
  { name: "you", text: "I still have the voicemail you left the night we met. I've never been able to delete it.", color: "#c084fc", colorName: "Soft Violet", mood: "longing", hearts: 84 },
  { name: "first love", text: "I googled your name last year. You have a daughter now. I hope she has your laugh.", color: "#f97316", colorName: "Warm Ember", mood: "bittersweet", hearts: 112 },
  { name: "dad", text: "I forgave you a long time ago. I just never got the chance to tell you before you were gone.", color: "#64748b", colorName: "Storm Gray", mood: "grief", hearts: 203 },
  { name: "M", text: "You were right. I knew you were right that night and I was too stubborn to say so. I'm sorry.", color: "#2dd4bf", colorName: "Sea Glass", mood: "regret", hearts: 67 },
  { name: "stranger on the train", text: "You were reading my favorite book. I almost said something. I think about that sometimes.", color: "#a3e635", colorName: "Spring", mood: "wonder", hearts: 145 },
  { name: "you know who you are", text: "I'm doing okay. Better than okay, actually. I just wanted you to know that.", color: "#fbbf24", colorName: "Golden Hour", mood: "hope", hearts: 98 },
  { name: "her", text: "Every love song I've ever listened to was about you. You just didn't know it.", color: "#f43f5e", colorName: "Rose Red", mood: "love", hearts: 234 },
  { name: "the version of me at 17", text: "It gets better. Not easier exactly — but richer. You'll understand what I mean someday.", color: "#fb923c", colorName: "Tangerine", mood: "hope", hearts: 189 },
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function validate(body) {
  const { text, color, mood } = body;
  if (!text || text.trim().length < 3) return 'Message text is required (min 3 chars)';
  if (text.length > 500) return 'Message exceeds 500 characters';
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return 'Valid hex color is required';
  const VALID_MOODS = ['love','longing','regret','hope','grief','wonder','bittersweet','gratitude','anger','nostalgia','relief','confusion'];
  if (mood && !VALID_MOODS.includes(mood)) return 'Invalid mood value';
  return null;
}

async function getMessages() {
  try {
    const data = await kv.get('unwritten:messages');
    if (!data || data.length === 0) {
      // Seed on first run
      const seeded = SEED_MESSAGES.map(m => ({
        ...m, id: genId(),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30*24*60*60*1000)).toISOString()
      }));
      await kv.set('unwritten:messages', seeded);
      return seeded;
    }
    return data;
  } catch (e) {
    // KV not connected yet — return seed data in memory
    return SEED_MESSAGES.map(m => ({ ...m, id: genId(), createdAt: new Date().toISOString() }));
  }
}

async function saveMessages(msgs) {
  await kv.set('unwritten:messages', msgs);
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/messages
  if (req.method === 'GET') {
    let msgs = await getMessages();
    const { sort = 'newest', color, mood, q, page = '0', limit = '12' } = req.query;

    if (color) msgs = msgs.filter(m => m.color === color);
    if (mood) msgs = msgs.filter(m => m.mood === mood);
    if (q) {
      const query = q.toLowerCase();
      msgs = msgs.filter(m => m.text.toLowerCase().includes(query) || m.name.toLowerCase().includes(query));
    }

    if (sort === 'newest') msgs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'oldest') msgs.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === 'most-loved') msgs.sort((a,b) => b.hearts - a.hearts);
    else msgs.sort(() => Math.random() - 0.5);

    const total = msgs.length;
    const p = parseInt(page), lim = Math.min(parseInt(limit), 50);
    const paginated = msgs.slice(p * lim, p * lim + lim);

    return res.status(200).json({
      messages: paginated,
      pagination: { page: p, limit: lim, total, hasMore: p * lim + lim < total }
    });
  }

  // POST /api/messages
  if (req.method === 'POST') {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    const { name, text, color, colorName, mood } = req.body;
    const msgs = await getMessages();
    const newMsg = {
      id: genId(),
      name: (name || 'you').trim().slice(0, 40),
      text: text.trim().slice(0, 500),
      color, colorName: colorName || '', mood: mood || null,
      hearts: 0,
      createdAt: new Date().toISOString(),
    };
    msgs.unshift(newMsg);
    await saveMessages(msgs);
    return res.status(201).json(newMsg);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
