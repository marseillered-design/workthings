// api/auth.js — Register & Login
import { redis } from './_kv.js';
import { signToken } from './_jwt.js';
import { createHash } from 'crypto';

function hashPwd(pwd) {
    return createHash('sha256').update(pwd + process.env.JWT_SECRET).digest('hex');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();
    
    const { action, username, password, adminSecret } = req.body || {};
    
    // ── REGISTER ─
    if (action === 'register') {
        // Проверка admin secret (если переменная установлена)
        if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ error: 'Invalid admin secret' });
        }
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        if (username.length < 2 || password.length < 4) {
            return res.status(400).json({ error: 'Username min 2 chars, password min 4 chars' });
        }
        
        const key = `user:${username.toLowerCase()}`;
        const exists = await redis.get(key);
        if (exists) return res.status(409).json({ error: 'Username already taken' });

        await redis.set(key, { 
            username: username.toLowerCase(), 
            passwordHash: hashPwd(password), 
            createdAt: Date.now() 
        });
        await redis.sadd('users', username.toLowerCase());

        const token = signToken({ username: username.toLowerCase() });
        
        // ✅ ИСПРАВЛЕНО: возвращаем user объект как ожидает фронтенд
        return res.status(200).json({ 
            token, 
            user: { username: username.toLowerCase() } 
        });
    }
    
    // ── LOGIN ──
    if (action === 'login') {
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        
        const key = `user:${username.toLowerCase()}`;
        const user = await redis.get(key);
        
        if (!user || user.passwordHash !== hashPwd(password)) {
            return res.status(401).json({ error: 'Wrong username or password' });
        }
        
        const token = signToken({ username: username.toLowerCase() });
        
        // ✅ ИСПРАВЛЕНО: возвращаем user объект как ожидает фронтенд
        return res.status(200).json({ 
            token, 
            user: { username: username.toLowerCase() } 
        });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
}