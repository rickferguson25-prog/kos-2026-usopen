# Kings of Swing Golf Pool Live App

Complete replacement repo for the Netlify app.

## Version

v107

## Changes in this version

- Removed the large KOS logo from the top/header.
- Removed "Powered by TRG" from the top/header.
- Kept KOS logo and "Powered by TRG" in the footer.
- Removed the on-page CSV column instruction text.
- Requires Admin PIN before CSV upload is allowed.
- CSV upload now auto-saves imported groups to Netlify storage.
- Auto-refresh no longer overwrites unsaved local changes.
- Force Reload button can still reload saved pool data from storage.

## CSV format

The CSV still uses this header:

entrant,group_label,golfer1,golfer2,golfer3,golfer4

## Replace your GitHub repo

Upload these files at the repo root:

package.json
netlify.toml
public/
netlify/functions/
README.md
.env.example
us_open_pool_entrants_template.csv

Do not upload a parent wrapper folder. The package.json file must be visible immediately at the GitHub repo root.

## Netlify settings

Build command:
npm run build

Publish directory:
public

Functions directory:
netlify/functions

## Required Netlify environment variables

ADMIN_PIN=your-private-pin
LIVE_GOLF_PROVIDER=demo
CACHE_SECONDS=60
REFRESH_SECONDS=60

If you previously received the Netlify Blobs siteID/token error, also set:

NETLIFY_BLOBS_SITE_ID=your-netlify-site-id
NETLIFY_BLOBS_TOKEN=your-netlify-personal-access-token

## Deploy

After replacing the repo contents:

Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site

Then open:

https://your-site-name.netlify.app/?v=107

## Test endpoints

/api/pool
/api/live-leaderboard
/app.js?v=107
/assets/KOS_Logo.jpeg?v=107
