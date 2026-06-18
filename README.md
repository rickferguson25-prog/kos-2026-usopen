# 2026 U.S. Open Golf Pool Live App

This patched version uses Netlify Functions 2.0 syntax (`export default` with `Response`) so Netlify Blobs can be automatically configured in the runtime.

## Deploy

Repo root must contain:

- package.json
- netlify.toml
- public/
- netlify/functions/

Netlify settings:

- Build command: `npm run build`
- Publish directory: `public`
- Functions directory: `netlify/functions`

Environment variables:

```env
ADMIN_PIN=your-private-pin
LIVE_GOLF_PROVIDER=demo
CACHE_SECONDS=60
REFRESH_SECONDS=60
```

After changing the files, redeploy with **Clear cache and deploy site**.

Test:

- `/api/pool` should return JSON.
- `/api/live-leaderboard` should return demo leaderboard JSON.
