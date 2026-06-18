# Kings of Swing Golf Pool Live App

Complete replacement repo for the Netlify app.

## Version

v109

## Changes in this version

- Admin functions are unavailable until an Admin PIN is entered: CSV upload, Add Group, Save Pool, Clear Groups, Remove, fee/penalty fields.
- The Admin PIN is still verified by the Netlify function when Save Pool/CSV upload saves.
- Replaced the Risk hover/focus bubble with a click/tap info button that works in Chrome and mobile browsers.
- Risk means the number of golfers in the group with status Missed Cut, Withdrawn, or Not Found.
- Group labels from CSV upload are preserved exactly, including camelCase header `groupLabel`.
- The Pool Leaderboard no longer auto-increments missing/displayed group numbers.
- Missing group labels display as "Unlabeled Group" instead of Group 1, Group 2, etc.

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

https://your-site-name.netlify.app/?v=108

## Test endpoints

/api/pool
/api/live-leaderboard
/app.js?v=108
/assets/KOS_Logo.jpeg?v=108


## CSV header compatibility

This version accepts any of these group label headers:

- group_label
- groupLabel
- group label
- group
- label

The uploaded value is displayed exactly on the leaderboard.
