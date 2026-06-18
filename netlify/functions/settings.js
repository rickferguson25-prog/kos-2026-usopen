exports.handler = async function() {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify({
      provider: process.env.LIVE_GOLF_PROVIDER || "demo",
      refreshSeconds: Number(process.env.REFRESH_SECONDS || 60)
    })
  };
};
