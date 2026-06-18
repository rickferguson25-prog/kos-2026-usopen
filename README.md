# Kings of Swing Golf Pool Live App

This is the complete replacement repo for the Netlify app.

## Branding updates

- Adds KOS_Logo.jpeg to the header
- Adds a smaller KOS logo in the footer
- Adds "Powered by TRG" in the header and footer
- App version: v106

## Features

- $20 per 4-player group
- Multiple groups per entrant
- CSV upload for entrant groups
- CSV template download
- Export current groups to CSV
- Netlify Blobs storage for saved groups
- Public leaderboard
- Demo live golf feed
- Later support for RapidAPI, SportsDataIO, or custom JSON feed

## CSV format

Required columns:

entrant,group_label,golfer1,golfer2,golfer3,golfer4

Example:

Joe Brown,Group 1,Scottie Scheffler,Rory McIlroy,Xander Schauffele,Collin Morikawa

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

https://your-site-name.netlify.app/?v=106

## Test endpoints

/api/pool
/api/live-leaderboard
/app.js?v=106
/assets/KOS_Logo.jpeg?v=106
