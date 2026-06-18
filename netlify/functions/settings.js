exports.handler = async function() {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    },
    body: JSON.stringify({
      provider: process.env.LIVE_GOLF_PROVIDER || "demo",
      refreshSeconds: Number(process.env.REFRESH_SECONDS || 60),
      hasRapidApiKey: Boolean(process.env.RAPIDAPI_KEY),
      hasSportsDataIOKey: Boolean(process.env.SPORTSDATAIO_KEY),
      hasCustomFeed: Boolean(process.env.CUSTOM_FEED_URL || process.env.RAPIDAPI_URL || process.env.SPORTSDATAIO_URL)
    })
  };
};
