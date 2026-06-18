export default async function handler() {
  return Response.json({
    provider: process.env.LIVE_GOLF_PROVIDER || "demo",
    refreshSeconds: Number(process.env.REFRESH_SECONDS || 60)
  }, { headers: { "cache-control": "no-store" } });
}
export const config = { path: "/api/settings" };
