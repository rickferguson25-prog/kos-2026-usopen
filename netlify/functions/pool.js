const { getStore } = require("@netlify/blobs");

const defaultPool = {
  eventName: "2026 U.S. Open Golf Pool",
  feePerGroup: 20,
  golfersPerGroup: 4,
  missedCutPenalty: 10,
  withdrawnPenalty: 15,
  groups: [],
  updatedAt: null
};

function send(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body)
  };
}

function makeStore() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) return getStore({ name: "us-open-golf-pool", siteID, token });
  return getStore("us-open-golf-pool");
}

function authorized(event) {
  const requiredPin = process.env.ADMIN_PIN || "";
  if (!requiredPin) return true;
  const supplied = event.headers["x-admin-pin"] || event.headers["X-Admin-Pin"] || "";
  return supplied === requiredPin;
}

exports.handler = async function(event) {
  try {
    const store = makeStore();
    const current = await store.get("pool", { type: "json" }) || defaultPool;

    if (event.httpMethod === "GET") return send(200, current);

    if (event.httpMethod === "POST") {
      if (!authorized(event)) return send(401, { error: "Invalid admin PIN." });

      const body = JSON.parse(event.body || "{}");
      const groups = Array.isArray(body.groups) ? body.groups.map((g, i) => ({
        id: g.id || `group-${Date.now()}-${i}`,
        entrant: String(g.entrant || "").trim(),
        label: String(g.label || `Group ${i + 1}`).trim(),
        golfers: Array.isArray(g.golfers) ? g.golfers.map(x => String(x || "").trim()).filter(Boolean).slice(0, 4) : []
      })).filter(g => g.entrant && g.golfers.length === 4) : [];

      const pool = {
        ...defaultPool,
        feePerGroup: Number(body.feePerGroup || 20),
        golfersPerGroup: 4,
        missedCutPenalty: Number(body.missedCutPenalty || 10),
        withdrawnPenalty: Number(body.withdrawnPenalty || 15),
        groups,
        updatedAt: new Date().toISOString()
      };

      await store.setJSON("pool", pool);
      return send(200, pool);
    }

    return send(405, { error: "Method not allowed." });
  } catch (err) {
    return send(500, { error: "Save failed inside Netlify function.", detail: err.message });
  }
};
