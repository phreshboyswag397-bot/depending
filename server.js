// ============================================================
//  depend — website server (flat layout)
//  Keep this file in the SAME folder as index.html, styles.css, etc.
//  Run:  node server.js   ->  http://localhost:3000
//
//  .env keys:
//    DISCORD_TOKEN     bot token (server list + REST fallback latency)
//    CLIENT_ID         OAuth client id        (dashboard login)
//    CLIENT_SECRET     OAuth client secret    (dashboard login)
//    BASE_URL          public base url, e.g. https://depend.example.com
//    SESSION_SECRET    random string used to sign the login cookie
//    PORT              default 3000
//    BOT_STATS_URL     default http://localhost:3001/stats
//    STATS_SECRET      optional shared secret for the bot stats endpoint
// ============================================================
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || '1510219788964593756';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BASE_URL = (process.env.BASE_URL || 'http://localhost:' + PORT).replace(/\/$/, '');
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-' + CLIENT_ID;
const REDIRECT_URI = BASE_URL + '/auth/callback';
const API = 'https://discord.com/api/v10';
const BOT_STATS_URL = process.env.BOT_STATS_URL || 'http://localhost:3001/stats';
const STATS_SECRET = process.env.STATS_SECRET || null;
const BOOT = Date.now();
const HERE = __dirname;
const MANAGE_GUILD = 0x20; // MANAGE_GUILD permission bit

if (!TOKEN) console.error('[depend-site] Missing DISCORD_TOKEN — server list will be empty.');
if (!CLIENT_SECRET) console.warn('[depend-site] No CLIENT_SECRET — dashboard login disabled until set.');

app.use(express.static(HERE));

// ── helpers ────────────────────────────────────────────────
async function discord(route) {
  const t0 = Date.now();
  const res = await fetch(API + route, { headers: { Authorization: 'Bot ' + TOKEN } });
  const latency = Date.now() - t0;
  if (!res.ok) throw new Error('Discord API ' + res.status + ' on ' + route);
  return { data: await res.json(), latency };
}
async function botStats() {
  const headers = STATS_SECRET ? { 'x-stats-secret': STATS_SECRET } : {};
  const signal = AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined;
  const res = await fetch(BOT_STATS_URL, { headers, signal });
  if (!res.ok) throw new Error('bot stats ' + res.status);
  return res.json();
}

// tiny signed-cookie session (no external deps) -------------
function sign(json) {
  const data = Buffer.from(JSON.stringify(json)).toString('base64url');
  const mac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return data + '.' + mac;
}
function unsign(cookie) {
  if (!cookie) return null;
  const [data, mac] = cookie.split('.');
  if (!data || !mac) return null;
  const expect = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  try {
    const obj = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch { return null; }
}
function getSession(req) {
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim())
    .find(s => s.startsWith('depend_sess='));
  return raw ? unsign(decodeURIComponent(raw.split('=').slice(1).join('='))) : null;
}
function setSession(res, obj) {
  const secure = BASE_URL.startsWith('https') ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    'depend_sess=' + encodeURIComponent(sign(obj)) +
    '; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800' + secure);
}

// ── server list cache (REST) ───────────────────────────────
let cache = { at: 0, servers: [], totalGuilds: 0, totalUsers: 0, latency: 0, ids: new Set() };
async function refreshServers() {
  if (Date.now() - cache.at < 60000) return cache;
  if (!TOKEN) return cache;
  const guilds = [];
  let after = null, latency = 0;
  for (let page = 0; page < 25; page++) {
    const route = '/users/@me/guilds?with_counts=true&limit=200' + (after ? '&after=' + after : '');
    const r = await discord(route);
    latency = r.latency;
    guilds.push(...r.data);
    if (r.data.length < 200) break;
    after = r.data[r.data.length - 1].id;
  }
  const totalUsers = guilds.reduce((n, g) => n + (g.approximate_member_count || 0), 0);
  const servers = guilds
    .filter(g => (g.approximate_member_count || 0) >= 50)
    .sort((a, b) => b.approximate_member_count - a.approximate_member_count)
    .map(g => ({
      name: g.name, members: g.approximate_member_count,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}?size=128` : null
    }));
  cache = { at: Date.now(), servers, totalGuilds: guilds.length, totalUsers, latency, ids: new Set(guilds.map(g => g.id)) };
  return cache;
}

// ── data APIs ──────────────────────────────────────────────
app.get('/api/servers', async (_req, res) => {
  try { const c = await refreshServers(); res.json({ servers: c.servers, totalGuilds: c.totalGuilds, totalUsers: c.totalUsers }); }
  catch (e) { res.status(502).json({ error: e.message, servers: [] }); }
});

app.get('/api/status', async (_req, res) => {
  try {
    const s = await botStats();
    return res.json({ operational: s.operational, shards: s.shards, avgLatency: s.avgLatency,
      uptime: s.uptime, source: 'gateway', checkedAt: s.checkedAt || Date.now() });
  } catch (_) { /* fall back to REST */ }
  try {
    const c = await refreshServers();
    let latency = c.latency;
    try { latency = (await discord('/users/@me')).latency; } catch {}
    return res.json({ operational: true,
      shards: [{ id: 0, status: 'operational', latency, servers: c.totalGuilds, users: c.totalUsers }],
      uptime: Date.now() - BOOT, source: 'rest', checkedAt: Date.now() });
  } catch (e) { return res.status(502).json({ operational: false, error: e.message, shards: [] }); }
});

app.get('/api/commands', (_req, res) => res.sendFile(path.join(HERE, 'commands.json')));
app.get('/api/changelogs', (_req, res) => res.sendFile(path.join(HERE, 'changelogs.json')));

// ── OAuth2 dashboard login ─────────────────────────────────
// Resolve the redirect URI the SAME way for both legs of the flow.
// Prefer an explicit BASE_URL; otherwise derive it from the incoming
// request (works behind nginx / Cloudflare via x-forwarded-* headers).
function redirectUri(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '') + '/auth/callback';
  const proto = (req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || ('localhost:' + PORT)).split(',')[0].trim();
  return proto + '://' + host + '/auth/callback';
}

app.get('/auth/discord', (req, res) => {
  if (!CLIENT_SECRET) return res.redirect('/dashboard?error=config');
  const state = crypto.randomBytes(16).toString('hex');
  const ru = redirectUri(req);
  setSession(res, { state, ru, exp: Date.now() + 600000 }); // remember the exact URI used
  const url = 'https://discord.com/oauth2/authorize?' + new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: ru,
    scope: 'identify guilds', state, prompt: 'consent'
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const sess = getSession(req);
    if (!code || !state || !sess || sess.state !== state) return res.redirect('/dashboard?error=state');
    const ru = sess.ru || redirectUri(req);

    const tokenRes = await fetch(API + '/oauth2/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code',
        code, redirect_uri: ru
      })
    });
    if (!tokenRes.ok) {
      console.error('[oauth] token exchange failed:', tokenRes.status, await tokenRes.text());
      throw new Error('token exchange failed');
    }
    const tok = await tokenRes.json();

    const [meRes, gRes] = await Promise.all([
      fetch(API + '/users/@me', { headers: { Authorization: 'Bearer ' + tok.access_token } }),
      fetch(API + '/users/@me/guilds', { headers: { Authorization: 'Bearer ' + tok.access_token } })
    ]);
    const user = await meRes.json();
    const guilds = await gRes.json();

    // keep only guilds the user can manage; store a slim version in the cookie
    const manage = (Array.isArray(guilds) ? guilds : [])
      .filter(g => g.owner || (BigInt(g.permissions || 0) & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD))
      .map(g => ({ id: g.id, name: g.name, icon: g.icon, owner: !!g.owner }));

    setSession(res, {
      user: { id: user.id, username: user.username, global_name: user.global_name, avatar: user.avatar },
      guilds: manage, exp: Date.now() + 604800000 // 7 days
    });
    res.redirect('/dashboard');
  } catch (e) {
    console.error('[oauth]', e.message);
    res.redirect('/dashboard?error=oauth');
  }
});

app.get('/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'depend_sess=; HttpOnly; Path=/; Max-Age=0');
  res.redirect('/dashboard');
});

app.get('/api/me', async (req, res) => {
  const sess = getSession(req);
  if (!sess || !sess.user) return res.status(401).json({ error: 'not signed in' });
  // mark which of the user's manageable guilds the bot is actually in
  let ids = cache.ids;
  try { if (Date.now() - cache.at > 60000) ids = (await refreshServers()).ids; } catch {}
  const guilds = (sess.guilds || []).map(g => ({ ...g, botIn: ids.has(g.id) }));
  res.json({ user: sess.user, guilds });
});

// Diagnostic: what redirect URI must be registered in the Developer Portal.
app.get('/api/config', (req, res) => {
  res.json({
    clientId: CLIENT_ID,
    hasSecret: !!CLIENT_SECRET,
    redirectUri: redirectUri(req),
    baseUrlSet: !!process.env.BASE_URL
  });
});

// --- Per-server live view (only for guilds the user manages) ---------
function userManages(req, guildId) {
  const sess = getSession(req);
  if (!sess || !sess.user) return false;
  return (sess.guilds || []).some(g => g.id === guildId);
}
const STATS_BASE = BOT_STATS_URL.replace(/\/stats$/, '');
function botHeaders() { return STATS_SECRET ? { 'x-stats-secret': STATS_SECRET } : {}; }

// snapshot + recent events for one guild
app.get('/api/guild/:id', async (req, res) => {
  const id = req.params.id;
  if (!userManages(req, id)) return res.status(403).json({ error: 'forbidden' });
  try {
    const r = await fetch(STATS_BASE + '/guild/' + id, { headers: botHeaders() });
    if (!r.ok) return res.status(r.status).json({ error: 'bot offline or not in server' });
    res.json(await r.json());
  } catch (e) { res.status(502).json({ error: 'bot bridge unreachable' }); }
});

// live event stream (SSE) — proxied through so the bot stays internal
app.get('/api/guild/:id/events', async (req, res) => {
  const id = req.params.id;
  if (!userManages(req, id)) return res.status(403).end();
  let upstream;
  try {
    upstream = await fetch(STATS_BASE + '/events/' + id, { headers: botHeaders() });
  } catch { return res.status(502).end(); }
  if (!upstream.ok || !upstream.body) return res.status(upstream.status || 502).end();
  res.writeHead(200, {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no'
  });
  const reader = upstream.body.getReader();
  const pump = () => reader.read().then(({ done, value }) => {
    if (done) return res.end();
    res.write(Buffer.from(value));
    pump();
  }).catch(() => res.end());
  pump();
  req.on('close', () => { try { reader.cancel(); } catch {} });
});

// ── simple pages for footer links ──────────────────────────
function legal(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — depend</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css"></head><body><script src="/shared.js"></script>
    <main class="wrap" style="max-width:760px"><div class="page-head"><h1>${title}</h1></div>
    <div style="color:var(--txt-dim);font-size:16px;line-height:1.7">${body}</div></main>
    <script>mountChrome('')</script></body></html>`;
}
app.get('/privacy', (_req, res) => res.type('html').send(legal('Privacy',
  `<p>depend stores only what it needs to operate: your Discord server settings and the IDs required to apply them. The dashboard requests the <b>identify</b> and <b>guilds</b> OAuth scopes — it reads your username, avatar and the list of servers you manage, and never posts on your behalf.</p>
   <p>Login sessions are kept in a signed, HttpOnly cookie on your device; we don't sell or share your data. To remove depend's data, remove the bot from your server.</p>`)));
app.get('/terms', (_req, res) => res.type('html').send(legal('Terms',
  `<p>depend is provided as-is, without warranty. Don't use it to break Discord's Terms of Service or to harass others. We may change or discontinue features at any time.</p>
   <p>By adding depend to your server you agree to these terms and to Discord's own Terms of Service and Community Guidelines.</p>`)));

// pretty routes
for (const p of ['commands', 'embeds', 'status', 'docs', 'changelogs', 'dashboard']) {
  app.get('/' + p, (_req, res) => res.sendFile(path.join(HERE, p + '.html')));
}
// per-server live view: /dashboard/<guildId>
app.get('/dashboard/:id', (_req, res) => res.sendFile(path.join(HERE, 'server.html')));
app.get('/invite', (_req, res) => res.redirect('https://discord.gg/depend'));
app.get('/', (_req, res) => res.sendFile(path.join(HERE, 'index.html')));

app.listen(PORT, () => console.log('[depend-site] live on ' + BASE_URL));
