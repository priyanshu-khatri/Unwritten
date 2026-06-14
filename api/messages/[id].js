/**
 * /api/messages/[id]
 * Handles: GET, DELETE, and heart toggling via POST /api/messages/[id]/heart
 */
import { kv } from '@vercel/kv';

async function getMessages() {
  return (await kv.get('unwritten:messages')) || [];
}
async function saveMessages(msgs) {
  await kv.set('unwritten:messages', msgs);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const msgs = await getMessages();
  const idx = msgs.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Message not found' });

  if (req.method === 'GET') {
    return res.status(200).json(msgs[idx]);
  }

  // POST — heart toggle
  if (req.method === 'POST') {
    const { action } = req.body;
    if (action === 'add') msgs[idx].hearts += 1;
    else if (action === 'remove') msgs[idx].hearts = Math.max(0, msgs[idx].hearts - 1);
    else return res.status(400).json({ error: 'action must be "add" or "remove"' });
    await saveMessages(msgs);
    return res.status(200).json({ hearts: msgs[idx].hearts });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    msgs.splice(idx, 1);
    await saveMessages(msgs);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
