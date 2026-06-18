# 2026 U.S. Open Golf Pool - Manual Blobs Credentials Patch

This version fixes MissingBlobsEnvironmentError by explicitly passing siteID and token to Netlify Blobs.

Required environment variables:

ADMIN_PIN=your-private-pin
LIVE_GOLF_PROVIDER=demo
CACHE_SECONDS=60
REFRESH_SECONDS=60
NETLIFY_BLOBS_SITE_ID=your-site-id
NETLIFY_BLOBS_TOKEN=your-personal-access-token

Find Site ID in Netlify: Site configuration > General > Site details > Site ID.
Create token in Netlify: User settings > Applications > Personal access tokens.

Deploy settings:
Build command: npm run build
Publish directory: public
Functions directory: netlify/functions

After adding variables, use Trigger deploy > Clear cache and deploy site.
