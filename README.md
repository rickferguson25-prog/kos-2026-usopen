# Netlify deployment

The repo root must contain package.json, netlify.toml, public/, and netlify/functions/.

Do not upload the parent folder into GitHub. Upload the contents of this folder to the root of the repo.

Netlify settings:
- Build command: npm run build
- Publish directory: public
- Functions directory: netlify/functions

Environment variables:
ADMIN_PIN=your-private-pin
LIVE_GOLF_PROVIDER=demo
CACHE_SECONDS=60
REFRESH_SECONDS=60
