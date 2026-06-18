let cache = { at: 0, data: null };

function send(statusCode, body, maxAge = 0) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": maxAge ? `public, max-age=${maxAge}` : "no-store, max-age=0"
    },
    body: JSON.stringify(body)
  };
}

function score(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  const s = String(value).trim().toUpperCase();
  if (s === "E" || s === "EVEN") return 0;

  return Number(s.replace("+", "")) || 0;
}

function status(p) {
  const raw = String(p.status || p.Status || p.player_status || p.PlayerStatus || "").toLowerCase();

  if (p.IsWithdrawn || p.withdrawn || raw.includes("withdraw")) return "Withdrawn";
  if (p.MadeCut === false || p.madeCut === false || raw.includes("missed cut")) return "Missed Cut";
  if (raw.includes("final") || raw.includes("finish") || raw.includes("complete")) return "Finished";

  return "Active";
}

function name(p) {
  return p.name || p.Name || p.player_name || p.PlayerName || p.full_name || p.FullName ||
    [p.FirstName || p.first_name || p.firstName, p.LastName || p.last_name || p.lastName]
      .filter(Boolean)
      .join(" ");
}

function normalize(raw) {
  const arrays = [
    raw && raw.players,
    raw && raw.Players,
    raw && raw.leaderboard,
    raw && raw.Leaderboard,
    raw && raw.data,
    raw && raw.Data,
    raw && raw.results,
    raw && raw.Results,
    raw && raw.TournamentPlayers,
    raw && raw.leaderboardRows,
    raw && raw.tournament && raw.tournament.leaderboard
  ].filter(Array.isArray);

  const rows = arrays[0] || (Array.isArray(raw) ? raw : []);

  return rows.map((p, i) => {
    const nm = name(p) || `Player ${i + 1}`;
    const total =
      p.total ?? p.Total ?? p.Score ?? p.score ?? p.TotalScore ??
      p.TournamentScore ?? p.ToPar ?? p.to_par ?? p.total_to_par ?? 0;

    return {
      id: String(p.id || p.ID || p.PlayerID || p.player_id || nm),
      name: String(nm).trim(),
      total: score(total),
      thru: String(p.thru || p.Thru || p.HolesThrough || p.current_hole || p.CurrentHole || "—"),
      position: String(p.position || p.Position || p.Rank || p.rank || "—"),
      status: status(p),
      raw: p
    };
  }).filter(p => p.name).sort((a, b) => a.total - b.total);
}

function demo() {
  const names = [
    "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Collin Morikawa",
    "Ludvig Aberg", "Brooks Koepka", "Bryson DeChambeau", "Viktor Hovland",
    "Patrick Cantlay", "Tommy Fleetwood", "Max Homa", "Jon Rahm",
    "Hideki Matsuyama", "Jordan Spieth", "Tony Finau", "Sahith Theegala"
  ];

  const now = Date.now();

  const players = names.map((nm, i) => ({
    id: `demo-${i}`,
    name: nm,
    total: Math.round(((i % 7) - 3) + Math.sin(now / 600000 + i) * 2),
    thru: String((Math.floor(now / 60000) + i) % 18 || 18),
    position: String(i + 1),
    status: "Active"
  })).sort((a, b) => a.total - b.total).map((p, i) => ({
    ...p,
    position: String(i + 1)
  }));

  return {
    provider: "demo",
    eventName: "Demo Golf Feed",
    updatedAt: new Date().toISOString(),
    players
  };
}

async function fetchJson(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`Feed request failed: ${r.status}`);
  return r.json();
}

exports.handler = async function() {
  const ttl = Number(process.env.CACHE_SECONDS || 60);
  const provider = String(process.env.LIVE_GOLF_PROVIDER || "demo").toLowerCase();

  if (cache.data && Date.now() - cache.at < ttl * 1000) {
    return send(200, { ...cache.data, cached: true }, Math.min(ttl, 60));
  }

  try {
    let data;

    if (provider === "custom") {
      if (!process.env.CUSTOM_FEED_URL) throw new Error("CUSTOM_FEED_URL is required.");
      const raw = await fetchJson(process.env.CUSTOM_FEED_URL);
      data = {
        provider,
        eventName: raw.eventName || raw.EventName || "Custom Golf Feed",
        updatedAt: raw.updatedAt || new Date().toISOString(),
        players: normalize(raw)
      };
    } else if (provider === "rapidapi") {
      if (!process.env.RAPIDAPI_URL || !process.env.RAPIDAPI_KEY) {
        throw new Error("RAPIDAPI_URL and RAPIDAPI_KEY are required.");
      }

      const headers = { "x-rapidapi-key": process.env.RAPIDAPI_KEY };
      if (process.env.RAPIDAPI_HOST) headers["x-rapidapi-host"] = process.env.RAPIDAPI_HOST;

      const raw = await fetchJson(process.env.RAPIDAPI_URL, { headers });
      data = {
        provider,
        eventName: raw.eventName || raw.EventName || "RapidAPI Golf Feed",
        updatedAt: raw.updatedAt || new Date().toISOString(),
        players: normalize(raw)
      };
    } else if (provider === "sportsdataio") {
      if (!process.env.SPORTSDATAIO_URL) throw new Error("SPORTSDATAIO_URL is required.");

      const url = new URL(process.env.SPORTSDATAIO_URL);
      if (process.env.SPORTSDATAIO_KEY && !url.searchParams.has("key")) {
        url.searchParams.set("key", process.env.SPORTSDATAIO_KEY);
      }

      const raw = await fetchJson(url.toString());
      data = {
        provider,
        eventName: raw.Name || raw.TournamentName || "SportsDataIO Golf Feed",
        updatedAt: new Date().toISOString(),
        players: normalize(raw)
      };
    } else {
      data = demo();
    }

    cache = { at: Date.now(), data };
    return send(200, data, Math.min(ttl, 60));
  } catch (err) {
    return send(500, {
      error: err.message,
      provider
    });
  }
};
