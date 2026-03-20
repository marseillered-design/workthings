// api/_kv.js — Vercel KV (Redis) wrapper via REST API

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function kv(cmd, ...args) {
  const url = `${BASE}/${[cmd, ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : encodeURIComponent(String(a)))].join('/')}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export const redis = {
  get: (key) => kv('get', key).then(v => v ? JSON.parse(v) : null),
  set: (key, val, ex) => kv('set', key, JSON.stringify(val), ...(ex ? ['ex', ex] : [])),
  del: (key) => kv('del', key),
  keys: (pattern) => kv('keys', pattern),
  sadd: (key, ...members) => kv('sadd', key, ...members),
  smembers: (key) => kv('smembers', key),
  srem: (key, member) => kv('srem', key, member),
};
