# Mobile cache fix

This version adds:
- /public/_headers to prevent stale mobile browser caching
- app.js?v=104 and styles.css?v=104
- A Force Reload Pool + Scores button
- A debug line showing app version and number of groups loaded from /api/pool

Deploy:
1. Replace repo contents with this ZIP's contents.
2. Keep your environment variables:
   ADMIN_PIN
   LIVE_GOLF_PROVIDER=demo
   NETLIFY_BLOBS_SITE_ID
   NETLIFY_BLOBS_TOKEN
3. Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.
4. On phone, open a private/incognito tab or add ?v=104 to the URL once.

Test on phone:
- /api/pool should show groups in JSON.
- /app.js?v=104 should show this JS file.
