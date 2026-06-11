// ============================================================
//  depend — website server (flat layout)
//  Keep this file in the SAME folder as index.html, styles.css, etc.
//  Run with: node server.js   ->  http://localhost:3000
//  .env: DISCORD_TOKEN, optional PORT, optional BOT_STATS_URL, STATS_SECRET
// ============================================================
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.DISCORD_TOKEN;
const API = 'https://discord.com/api/v10';
// Where the bot's stats endpoint lives (from bot-stats-endpoint.js).
const BOT_STATS_URL = process.env.BOT_STATS_URL || 'http://localhost:3001/stats';
const STATS_SECRET = process.env.STATS_SECRET || null;
const BOOT = Date.now();
const HERE = __dirname;

if (!TOKEN) {
  console.error('[depend-site] Missing DISCORD_TOKEN in .env — server list will be empty.');
}

app.use(express.static(HERE));

// -- Discord REST helper (used for the server list + fallback latency) --
async function discord(route) {
  const t0 = Date.now();
  const res = await fetch(API + route, { headers: { Authorization: 'Bot ' + TOKEN } });
  const latency = Date.now() - t0;
  if (!res.ok) throw new Error('Discord API ' + res.status + ' on ' + route);
  return { data: await res.json(), latency };
}

// -- Ask the bot for its REAL gateway latency (matches ,ping) --
async function botStats() {
  const headers = STATS_SECRET ? { 'x-stats-secret': STATS_SECRET } : {};
  const ctrl = AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined;
  const res = await fetch(BOT_STATS_URL, { headers, signal: ctrl });
  if (!res.ok) throw new Error('bot stats ' + res.status);
  return res.json();
}

// -- Cached server list (REST, refreshes at most once per 60s) --
let cache = { at: 0, servers: [], totalGuilds: 0, totalUsers: 0, latency: 0 };
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
      name: g.name,
      members: g.approximate_member_count,
      icon: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith('a_') ? 'gif' : 'png'}?size=128`
        : null
    }));
  cache = { at: Date.now(), servers, totalGuilds: guilds.length, totalUsers, latency };
  return cache;
}

// -- API routes --
app.get('/api/servers', async (_req, res) => {
  try { const c = await refreshServers(); res.json({ servers: c.servers, totalGuilds: c.totalGuilds, totalUsers: c.totalUsers }); }
  catch (e) { res.status(502).json({ error: e.message, servers: [] }); }
});

app.get('/api/status', async (_req, res) => {
  // 1) Try the bot's own stats — REAL per-shard gateway latency.
  try {
    const s = await botStats();
    return res.json({
      operational: s.operational,
      shards: s.shards,
      avgLatency: s.avgLatency,
      uptime: s.uptime,
      source: 'gateway',
      checkedAt: s.checkedAt || Date.now()
    });
  } catch (_) { /* bot endpoint not reachable — fall back below */ }

  // 2) Fallback: REST probe (note: this is REST latency, not gateway ping).
  try {
    const c = await refreshServers();
    let latency = c.latency;
    try { latency = (await discord('/users/@me')).latency; } catch {}
    return res.json({
      operational: true,
      shards: [{ id: 0, status: 'operational', latency, servers: c.totalGuilds, users: c.totalUsers }],
      uptime: Date.now() - BOOT,
      source: 'rest',
      checkedAt: Date.now()
    });
  } catch (e) {
    return res.status(502).json({ operational: false, error: e.message, shards: [] });
  }
});

app.get('/api/commands', (_req, res) => res.sendFile(path.join(HERE, 'commands.json')));
app.get('/api/changelogs', (_req, res) => res.sendFile(path.join(HERE, 'changelogs.json')));
app.get('/invite', (_req, res) => res.redirect('https://discord.gg/depend'));

for (const p of ['commands', 'embeds', 'status', 'docs', 'changelogs']) {
  app.get('/' + p, (_req, res) => res.sendFile(path.join(HERE, p + '.html')));
}
app.get('/', (_req, res) => res.sendFile(path.join(HERE, 'index.html')));

app.listen(PORT, () => console.log('[depend-site] live on http://localhost:' + PORT));