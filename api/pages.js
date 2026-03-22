// api/pages.js — CRUD for spaces, pages, comments
import { redis } from './_kv.js';
import { authMiddleware } from './_jwt.js';

function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authMiddleware(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const u = user.username;
  const { method, query } = req;
  const { type, id: itemId, commentId } = query;

  try {
    // GET all spaces + pages
    if (method === 'GET' && !type) {
      const spaceIds = await redis.smembers(`${u}:spaces`) || [];
      const spaces = await Promise.all(spaceIds.map(async sid => {
        const sp = await redis.get(`${u}:space:${sid}`);
        if (!sp) return null;
        const pageIds = await redis.smembers(`${u}:space:${sid}:pages`) || [];
        const pages = (await Promise.all(pageIds.map(pid => redis.get(`${u}:page:${pid}`)))).filter(Boolean);
        pages.sort((a, b) => a.createdAt - b.createdAt);
        return { ...sp, pages };
      }));
      return res.status(200).json(spaces.filter(Boolean).sort((a, b) => a.createdAt - b.createdAt));
    }

    // GET comments for a page
    if (method === 'GET' && type === 'comments' && itemId) {
      const page = await redis.get(`${u}:page:${itemId}`);
      return res.status(200).json({ comments: page?.comments || [] });
    }

    // POST create space
    if (method === 'POST' && type === 'space') {
      const { name, icon } = req.body;
      if (!name) return res.status(400).json({ error: 'Name required' });
      const sid = id();
      const space = { id: sid, name, icon: icon || '📁', createdAt: Date.now() };
      await redis.set(`${u}:space:${sid}`, space);
      await redis.sadd(`${u}:spaces`, sid);
      return res.status(200).json({ ...space, pages: [] });
    }

    // POST create page
    if (method === 'POST' && type === 'page') {
      const { spaceId, title } = req.body;
      if (!spaceId || !title) return res.status(400).json({ error: 'spaceId and title required' });
      const pid = id();
      const page = { id: pid, spaceId, title, content: '', images: [], comments: [], createdAt: Date.now(), updatedAt: Date.now() };
      await redis.set(`${u}:page:${pid}`, page);
      await redis.sadd(`${u}:space:${spaceId}:pages`, pid);
      return res.status(200).json(page);
    }

    // POST add comment
    if (method === 'POST' && type === 'comment' && itemId) {
      const { text, author } = req.body;
      if (!text) return res.status(400).json({ error: 'Text required' });
      const page = await redis.get(`${u}:page:${itemId}`);
      if (!page) return res.status(404).json({ error: 'Page not found' });
      if (!page.comments) page.comments = [];
      const comment = { id: id(), text, author, createdAt: Date.now() };
      page.comments.push(comment);
      await redis.set(`${u}:page:${itemId}`, page);
      return res.status(200).json({ comments: page.comments });
    }

    // PUT update page
    if (method === 'PUT' && type === 'page' && itemId) {
      const existing = await redis.get(`${u}:page:${itemId}`);
      if (!existing) return res.status(404).json({ error: 'Page not found' });
      const { title, content, images } = req.body;
      const updated = {
        ...existing,
        title: title ?? existing.title,
        content: content ?? existing.content,
        images: images ?? existing.images,
        updatedAt: Date.now()
      };
      await redis.set(`${u}:page:${itemId}`, updated);
      return res.status(200).json(updated);
    }

    // DELETE comment
    if (method === 'DELETE' && type === 'comment' && itemId && commentId) {
      const page = await redis.get(`${u}:page:${itemId}`);
      if (!page) return res.status(404).json({ error: 'Page not found' });
      page.comments = (page.comments || []).filter(c => c.id !== commentId);
      await redis.set(`${u}:page:${itemId}`, page);
      return res.status(200).json({ comments: page.comments });
    }

    // DELETE page
    if (method === 'DELETE' && type === 'page' && itemId) {
      const page = await redis.get(`${u}:page:${itemId}`);
      if (page) {
        await redis.del(`${u}:page:${itemId}`);
        await redis.srem(`${u}:space:${page.spaceId}:pages`, itemId);
      }
      return res.status(200).json({ ok: true });
    }

    // DELETE space
    if (method === 'DELETE' && type === 'space' && itemId) {
      const pageIds = await redis.smembers(`${u}:space:${itemId}:pages`) || [];
      await Promise.all(pageIds.map(pid => redis.del(`${u}:page:${pid}`)));
      await redis.del(`${u}:space:${itemId}:pages`);
      await redis.del(`${u}:space:${itemId}`);
      await redis.srem(`${u}:spaces`, itemId);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid request' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
