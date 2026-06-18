import { getStore } from "@netlify/blobs";

const defaultPool = {
  eventName: "2026 U.S. Open Golf Pool",
  feePerGroup: 20,
  golfersPerGroup: 4,
  missedCutPenalty: 10,
  withdrawnPenalty: 15,
  groups: [],
  updatedAt: null
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function authorized(request) {
  const requiredPin = process.env.ADMIN_PIN || "";
  if (!requiredPin) return true;
  return request.headers.get("x-admin-pin") === requiredPin;
}

function normalizePool(body) {
  const groups = Array.isArray(body.groups) ? body.groups.map((g, i) => ({
    id: g.id || `group-${Date.now()}-${i}`,
    entrant: String(g.entrant || "").trim(),
    label: String(g.label || `Group ${i + 1}`).trim(),
    golfers: Array.isArray(g.golfers) ? g.golfers.map(x => String(x || "").trim()).filter(Boolean).slice(0, 4) : []
  })).filter(g => g.entrant && g.golfers.length === 4) : [];

  return {
    ...defaultPool,
    feePerGroup: Number(body.feePerGroup || 20),
    golfersPerGroup: 4,
    missedCutPenalty: Number(body.missedCutPenalty || 10),
    withdrawnPenalty: Number(body.withdrawnPenalty || 15),
    groups,
    updatedAt: new Date().toISOString()
  };
}

export default async function handler(request) {
  try {
    const store = getStore("us-open-golf-pool");
    const existing = await store.get("pool", { type: "json" });
    const current = existing || defaultPool;

    if (request.method === "GET") return json(current);

    if (request.method === "POST") {
      if (!authorized(request)) {
        return json({ error: "Invalid admin PIN. It must match ADMIN_PIN in Netlify environment variables." }, 401);
      }
      const body = await request.json();
      const pool = normalizePool(body || {});
      await store.setJSON("pool", pool);
      return json(pool);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({
      error: "Save failed inside Netlify function.",
      detail: err.message,
      note: "This version uses Netlify Functions 2.0 syntax. If this still fails, redeploy after clearing cache."
    }, 500);
  }
}

export const config = { path: "/api/pool" };
