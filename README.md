# Front-end fix

This version cache-busts app.js and shows more precise feed status messages.

Deploy steps:
1. Replace the repo contents with this ZIP's contents.
2. Confirm package.json is at repo root.
3. Trigger Deploys -> Clear cache and deploy site.
4. Open the site in an incognito/private window or hard refresh with Ctrl+F5.

If /api/live-leaderboard works but the page says Loading, open:
https://your-site.netlify.app/app.js?v=103

You should see this app file, including:
US Open Golf Pool app.js v103 loaded
