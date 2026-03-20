# WorkDocs — Deploy Guide

## Stack
- **Frontend**: Single HTML file
- **Backend**: Vercel Serverless Functions
- **Database**: Vercel KV (Redis) — free tier
- **Auth**: Username + password, JWT tokens

---

## Deploy in 5 minutes

### Step 1 — Push to GitHub
Upload this folder to a GitHub repo (public or private).

### Step 2 — Create Vercel KV
1. Go to https://vercel.com → your project → **Storage** tab
2. Click **Create Database** → **KV** → Create
3. Go to the KV dashboard → **.env.local** tab → copy all 4 variables

### Step 3 — Deploy on Vercel
1. vercel.com → **New Project** → import your GitHub repo
2. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `KV_URL` | from Vercel KV |
| `KV_REST_API_URL` | from Vercel KV |
| `KV_REST_API_TOKEN` | from Vercel KV |
| `KV_REST_API_READ_ONLY_TOKEN` | from Vercel KV |
| `JWT_SECRET` | any random 32+ char string |
| `ADMIN_SECRET` | secret key you share with users to let them register |

3. **Deploy!**

---

## First User
1. Open your site → click **Register**
2. Enter username, password, and the `ADMIN_SECRET` you set
3. Done — you're in!

## Adding More Users
Share the `ADMIN_SECRET` with teammates. They register with it once.
After registration, they only need username + password.

---

## File Structure
```
/
├── index.html          ← Full frontend (auth + editor)
├── api/
│   ├── _kv.js          ← Vercel KV (Redis) helper
│   ├── _jwt.js         ← JWT sign/verify
│   ├── auth.js         ← POST /api/auth (login + register)
│   └── pages.js        ← GET/POST/PUT/DELETE /api/pages
├── vercel.json         ← Routing
└── .env.example        ← Env vars template
```

## Redis Key Structure (per user)
```
user:{username}                     → user object (hash + createdAt)
users                               → set of all usernames
{user}:spaces                       → set of space IDs
{user}:space:{id}                   → space object
{user}:space:{id}:pages             → set of page IDs
{user}:page:{id}                    → page object (title, content, images)
```
