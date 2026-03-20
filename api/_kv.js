// api/_kv.js — Upstash Redis REST API wrapper

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function call(body) {
  const r = await fetch(BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export const redis = {
  get: async (key) => {
    const v = await call(['GET', key]);
    return v ? JSON.parse(v) : null;
  },
  set: async (key, val, ex) => {
    const cmd = ['SET', key, JSON.stringify(val)];
    if (ex) cmd.push('EX', ex);
    return call(cmd);
  },
  del: (key) => call(['DEL', key]),
  keys: (pattern) => call(['KEYS', pattern]),
  sadd: (key, ...members) => call(['SADD', key, ...members]),
  smembers: async (key) => {
    const v = await call(['SMEMBERS', key]);
    return v || [];
  },
  srem: (key, member) => call(['SREM', key, member]),
};
