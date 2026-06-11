# depend — website

A complete site for the **depend** Discord bot: live server list, an interactive embed
builder, full command docs, and a real-time status page that reads shard latency straight
from the Discord gateway.

## Pages
| Route | What it does |
|-------|--------------|
| `/` | Hero + **live reliability console** (status, communities, members, latency) and the **live server grid** (servers ≥ 50 members, real data) |
| `/commands` | All 400+ commands, searchable, grouped by the bot's real 23 categories |
| `/embeds` | Working embed builder with a true Discord-style preview + script export for `,embed builder` |
| `/status` | Live shard health, auto-refreshing every 20s |
| `/docs` | Per-category documentation with copy-to-clipboard syntax |
| `/changelogs` | Release timeline (edit `changelogs.json`) |

## Run it

```bash
npm install
# put your bot token in .env  (see .env.example)
npm start
# → http://localhost:3000
```

The invite button everywhere points to **https://discord.gg/depend**.

## ⚠ Security
Your bot **token and client secret were shared in chat** — regenerate both now:
- **Bot → Reset Token** and **OAuth2 → Reset Secret** in the
  [Developer Portal](https://discord.com/developers/applications).
- Drop the new token into `.env`. Nothing else changes.

The token only lives server-side (`.env`); it is never exposed to the browser.
The site calls Discord with it to fetch guilds (`/users/@me/guilds?with_counts=true`)
and to measure gateway latency, caching results for 60s so you stay well within rate limits.

## Where data comes from
- **Servers / member counts** — `GET /users/@me/guilds?with_counts=true` (live, paginated)
- **Shard count** — `GET /gateway/bot`
- **Latency** — measured round-trip on `GET /users/@me`
- **Commands** — `commands.json`, extracted verbatim from your bot's `,help` categories

## Editing content
- **Commands** — regenerate `commands.json` from the bot's help `CATEGORIES`, or edit by hand.
- **Changelogs** — edit `changelogs.json` (newest first; `tag` is `new` or `improved`).
- **Docs intros** — the per-category blurbs live in the `INTROS` map in `public/docs.html`.
