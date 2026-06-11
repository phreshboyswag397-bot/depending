// ============================================================
//  Stats endpoint for the website (real gateway latency)
//  Paste this near the bottom of index.js, AFTER client.login(...).
//  Exposes GET /stats with the SAME numbers `,ping` reports.
//  The website reads this instead of probing the REST API.
// ============================================================
(() => {
  const http = require('http');
  const STATS_PORT = process.env.STATS_PORT || 3001;
  // Optional shared secret. Set STATS_SECRET in BOTH the bot's .env and the
  // website's .env to lock the endpoint down. Leave unset to allow open access.
  const SECRET = process.env.STATS_SECRET || null;

  http.createServer((req, res) => {
    if (!req.url.startsWith('/stats')) { res.writeHead(404); return res.end('not found'); }
    if (SECRET && req.headers['x-stats-secret'] !== SECRET) { res.writeHead(401); return res.end('unauthorized'); }

    // Per-shard data, mirroring the ,ping command exactly.
    const shards = [...client.ws.shards.values()].map(s => {
      const guildsOnShard = client.guilds.cache.filter(g => g.shardId === s.id);
      const users = guildsOnShard.reduce((n, g) => n + (g.memberCount || 0), 0);
      const ping = Math.round(s.ping);
      return {
        id: s.id,
        // discord.js status: 0 = READY. Anything else = not fully connected.
        status: s.status === 0 ? 'operational' : 'degraded',
        latency: ping >= 0 ? ping : null,        // real gateway heartbeat, matches ,ping
        servers: guildsOnShard.size,
        users
      };
    });

    const body = JSON.stringify({
      operational: shards.every(s => s.status === 'operational'),
      avgLatency: Math.round(client.ws.ping),
      totalGuilds: client.guilds.cache.size,
      totalUsers: client.guilds.cache.reduce((n, g) => n + (g.memberCount || 0), 0),
      uptime: client.uptime,                      // ms the bot has been connected
      shards,
      checkedAt: Date.now()
    });

    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(body);
  }).listen(STATS_PORT, () => console.log('[stats] live on http://localhost:' + STATS_PORT + '/stats'));
})();
