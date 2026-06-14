import { SEED_MESSAGES } from './_seed.js'; // We will create this helper file next

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
    // Dynamically require KV so it doesn't crash the file if the DB isn't set up yet
    const { kv } = await import('@vercel/kv');
    const data = await kv.get('unwritten:messages');
    if (!data || data.length === 0) {
      const seeded = SEED_MESSAGES.map(m => ({
        ...m, id: genId(),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30*24*60*60*1000)).toISOString()
      }));
      await kv.set('unwritten:messages', seeded);
      return seeded;
    }
    return data;
  } catch (e) {
    // If Vercel KV is not connected or fails, fallback safely to local memory
    return SEED_MESSAGES.map(m => ({ ...m, id: genId(), createdAt: new Date().toISOString() }));
  }
}

async function saveMessages(msgs) {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set('unwritten:messages', msgs);
  } catch (e) {
    console.log("Database not connected. Message saved to temporary runtime memory.");
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

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