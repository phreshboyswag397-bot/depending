// ============================================================
//  depend — bot bridge for the website
//  Paste this block near the bottom of index.js, AFTER client.login(...).
//
//  It exposes two things over a small local HTTP server:
//    GET /stats          -> real per-shard gateway latency (status page)
//    GET /guild/:id      -> snapshot for one server (member count, channels…)
//    GET /events/:id     -> Server-Sent Events stream of LIVE activity
//                           (bans, kicks, joins/leaves, VoiceMaster, etc.)
//
//  The website (server.js) proxies these so browsers never talk to the bot
//  directly. Set STATS_SECRET in BOTH .env files to lock it down.
// ============================================================
(() => {
  const http = require('http');
  const STATS_PORT = process.env.STATS_PORT || 3001;
  const SECRET = process.env.STATS_SECRET || null;

  // ---- in-memory ring buffer of recent events, per guild ----
  const FEED = new Map();          // guildId -> [{t,type,icon,text,...}]
  const SUBS = new Map();          // guildId -> Set(res)  (open SSE streams)
  const MAX = 60;                  // keep last 60 events per guild

  function push(guildId, ev) {
    if (!guildId) return;
    ev.t = Date.now();
    const arr = FEED.get(guildId) || [];
    arr.push(ev); while (arr.length > MAX) arr.shift();
    FEED.set(guildId, arr);
    const subs = SUBS.get(guildId);
    if (subs) for (const res of subs) {
      try { res.write('data: ' + JSON.stringify(ev) + '\n\n'); } catch {}
    }
  }
  const tag = u => u ? (u.tag || (u.username ? u.username : 'unknown')) : 'unknown';

  // ---- listen to gateway events and turn them into feed items ----
  client.on('guildBanAdd', b => push(b.guild.id,
    { type: 'ban', icon: '⛔', text: `**${tag(b.user)}** was banned` }));
  client.on('guildBanRemove', b => push(b.guild.id,
    { type: 'unban', icon: '✅', text: `**${tag(b.user)}** was unbanned` }));
  client.on('guildMemberRemove', m => push(m.guild.id,
    { type: 'leave', icon: '👋', text: `**${tag(m.user)}** left or was removed` }));
  client.on('guildMemberAdd', m => push(m.guild.id,
    { type: 'join', icon: '🟢', text: `**${tag(m.user)}** joined` }));

  // timeouts (mutes) show up as member updates to communicationDisabledUntil
  client.on('guildMemberUpdate', (oldM, newM) => {
    const was = oldM.communicationDisabledUntilTimestamp || 0;
    const now = newM.communicationDisabledUntilTimestamp || 0;
    if (!was && now > Date.now()) push(newM.guild.id,
      { type: 'mute', icon: '🔇', text: `**${tag(newM.user)}** was timed out` });
    else if (was && !now) push(newM.guild.id,
      { type: 'unmute', icon: '🔈', text: `**${tag(newM.user)}** timeout removed` });
  });

  // VoiceMaster / voice activity
  client.on('voiceStateUpdate', (oldS, newS) => {
    const g = (newS.guild || oldS.guild); if (!g) return;
    const who = tag((newS.member || oldS.member || {}).user);
    if (!oldS.channelId && newS.channelId)
      push(g.id, { type: 'voice_join', icon: '🔊', text: `**${who}** joined voice **${newS.channel?.name || ''}**` });
    else if (oldS.channelId && !newS.channelId)
      push(g.id, { type: 'voice_leave', icon: '🔇', text: `**${who}** left voice` });
    else if (oldS.channelId !== newS.channelId)
      push(g.id, { type: 'voice_move', icon: '🔀', text: `**${who}** moved to **${newS.channel?.name || ''}**` });
  });

  client.on('messageDelete', msg => { if (msg.guild && !msg.author?.bot) push(msg.guild.id,
    { type: 'msg_delete', icon: '🗑️', text: `message by **${tag(msg.author)}** deleted in #${msg.channel?.name || '?'}` }); });
  client.on('channelCreate', ch => { if (ch.guild) push(ch.guild.id,
    { type: 'channel_add', icon: '➕', text: `channel **#${ch.name}** created` }); });
  client.on('channelDelete', ch => { if (ch.guild) push(ch.guild.id,
    { type: 'channel_del', icon: '➖', text: `channel **#${ch.name}** deleted` }); });
  client.on('roleCreate', r => push(r.guild.id,
    { type: 'role_add', icon: '🎭', text: `role **${r.name}** created` }));
  client.on('roleDelete', r => push(r.guild.id,
    { type: 'role_del', icon: '🎭', text: `role **${r.name}** deleted` }));

  // ---- helper: one guild snapshot ----
  function snapshot(id) {
    const g = client.guilds.cache.get(id);
    if (!g) return null;
    let voice = 0;
    g.voiceStates?.cache?.forEach(v => { if (v.channelId) voice++; });
    return {
      id: g.id, name: g.name,
      icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null,
      members: g.memberCount,
      channels: g.channels?.cache?.size || 0,
      roles: g.roles?.cache?.size || 0,
      voiceActive: voice,
      boosts: g.premiumSubscriptionCount || 0,
      ownerId: g.ownerId
    };
  }

  // ---- HTTP server ----
  http.createServer((req, res) => {
    if (SECRET && req.headers['x-stats-secret'] !== SECRET) { res.writeHead(401); return res.end('unauthorized'); }
    const u = new URL(req.url, 'http://localhost');
    const parts = u.pathname.split('/').filter(Boolean);

    // /stats
    if (parts[0] === 'stats') {
      const shards = [...client.ws.shards.values()].map(s => {
        const gs = client.guilds.cache.filter(g => g.shardId === s.id);
        return { id: s.id, status: s.status === 0 ? 'operational' : 'degraded',
          latency: Math.max(0, Math.round(s.ping)),
          servers: gs.size, users: gs.reduce((n, g) => n + (g.memberCount || 0), 0) };
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({
        operational: shards.every(s => s.status === 'operational'),
        avgLatency: Math.round(client.ws.ping),
        totalGuilds: client.guilds.cache.size,
        totalUsers: client.guilds.cache.reduce((n, g) => n + (g.memberCount || 0), 0),
        uptime: client.uptime, shards, checkedAt: Date.now()
      }));
    }

    // /guild/:id  -> snapshot + recent events
    if (parts[0] === 'guild' && parts[1]) {
      const snap = snapshot(parts[1]);
      if (!snap) { res.writeHead(404); return res.end('{"error":"bot not in guild"}'); }
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ guild: snap, recent: (FEED.get(parts[1]) || []).slice(-30).reverse() }));
    }

    // /events/:id -> SSE live stream
    if (parts[0] === 'events' && parts[1]) {
      const id = parts[1];
      if (!client.guilds.cache.has(id)) { res.writeHead(404); return res.end('bot not in guild'); }
      res.writeHead(200, {
        'content-type': 'text/event-stream', 'cache-control': 'no-cache',
        'connection': 'keep-alive', 'x-accel-buffering': 'no'
      });
      res.write('retry: 4000\n\n');
      // backfill recent
      for (const ev of (FEED.get(id) || []).slice(-15)) res.write('data: ' + JSON.stringify(ev) + '\n\n');
      const set = SUBS.get(id) || new Set(); set.add(res); SUBS.set(id, set);
      const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25000);
      req.on('close', () => { clearInterval(ping); set.delete(res); });
      return;
    }

    res.writeHead(404); res.end('not found');
  }).listen(STATS_PORT, () => console.log('[bridge] live on http://localhost:' + STATS_PORT));
})();
