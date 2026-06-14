import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const msgs = (await kv.get('unwritten:messages')) || [];
  const colors = new Set(msgs.map(m => m.color)).size;
  const hearts = msgs.reduce((s, m) => s + (m.hearts || 0), 0);
  const moods = msgs.reduce((acc, m) => {
    if (m.mood) acc[m.mood] = (acc[m.mood] || 0) + 1;
    return acc;
  }, {});

  res.status(200).json({ total: msgs.length, colors, hearts, moods });
}
