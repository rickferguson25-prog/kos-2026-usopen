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
  if (s === "E" || s === "EVEN" || s === "PAR" || s === "-") return 0;
  const n = Number(s.replace("+", ""));
  return Number.isFinite(n) ? n : 0;
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

function firstValue(obj, paths) {
  for (const path of paths) {
    const value = getPath(obj, path);
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function fullNameFrom(obj) {
  if (!obj || typeof obj !== "object") return "";
  const direct = firstValue(obj, [
    "name", "Name", "full_name", "FullName", "fullName", "player_name", "PlayerName", "playerName",
    "display_name", "displayName", "DisplayName", "participant_name", "participantName", "competitor_name", "competitorName",
    "golfer", "Golfer", "golfer_name", "golferName"
  ]);
  if (direct) return String(direct).trim();
  for (const k of ["player", "Player", "participant", "Participant", "competitor", "Competitor", "athlete", "Athlete", "contestant", "Contestant", "person", "Person", "entry", "Entry"]) {
    if (obj[k] && typeof obj[k] === "object") {
      const nested = fullNameFrom(obj[k]);
      if (nested) return nested;
    }
  }
  const first = firstValue(obj, ["first_name", "FirstName", "firstName", "given_name", "givenName", "player.first_name", "player.FirstName", "player.firstName", "Player.FirstName", "participant.firstName", "competitor.firstName"]);
  const last = firstValue(obj, ["last_name", "LastName", "lastName", "family_name", "familyName", "player.last_name", "player.LastName", "player.lastName", "Player.LastName", "participant.lastName", "competitor.lastName"]);
  return [first, last].filter(Boolean).join(" ").trim();
}

function status(p) {
  const raw = String(firstValue(p, [
    "status", "Status", "player_status", "PlayerStatus", "playerStatus",
    "result.status", "scores.status", "current_status", "currentStatus",
    "round.status", "today.status", "leaderboard.status"
  ])).trim().toLowerCase();

  const normalized = raw.replace(/[^a-z]/g, "");

  if (
    p.IsWithdrawn || p.withdrawn || p.Withdrawn ||
    ["wd", "w/d", "withdrawn", "withdraw", "withdrew"].includes(raw) ||
    normalized.includes("withdraw")
  ) {
    return "Withdrawn";
  }

  if (
    p.MadeCut === false || p.madeCut === false ||
    ["cut", "mc", "missedcut", "missed cut", "didnotmakecut", "dnmc"].includes(raw) ||
    normalized === "cut" ||
    normalized === "mc" ||
    normalized.includes("missedcut") ||
    normalized.includes("didnotmakecut")
  ) {
    return "Missed Cut";
  }

  if (
    ["finished", "finish", "final", "complete", "completed", "done"].includes(raw) ||
    normalized.includes("finish") ||
    normalized.includes("complete") ||
    normalized.includes("final")
  ) {
    return "Finished";
  }

  return "Active";
}

function findCandidateArrays(obj, out = [], path = "root", depth = 0) {
  if (!obj || depth > 8) return out;
  if (Array.isArray(obj)) {
    if (obj.some(item => item && typeof item === "object")) out.push({ path, rows: obj });
    obj.slice(0, 3).forEach((item, i) => findCandidateArrays(item, out, `${path}[${i}]`, depth + 1));
    return out;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) findCandidateArrays(v, out, `${path}.${k}`, depth + 1);
  }
  return out;
}

function hasPlayerShape(row) {
  if (!row || typeof row !== "object") return false;
  if (fullNameFrom(row)) return true;
  const keys = JSON.stringify(Object.keys(row).slice(0, 50)).toLowerCase();
  return keys.includes("player") || keys.includes("golfer") || keys.includes("participant") || keys.includes("competitor");
}

function rowScore(row) {
  return firstValue(row, ["total", "Total", "score", "Score", "to_par", "toPar", "ToPar", "total_to_par", "totalToPar", "TotalToPar", "total_score", "totalScore", "TotalScore", "tournament_score", "TournamentScore", "result.total", "result.score", "result.to_par", "result.toPar", "scores.total", "scores.score", "scores.to_par", "scores.toPar", "leaderboard.total", "leaderboard.score"]);
}
function rowThru(row) {
  const value = firstValue(row, [
    "holes_played", "holesPlayed", "HolesPlayed",
    "holes_played_today", "holesPlayedToday", "HolesPlayedToday",
    "thru", "Thru", "holes", "Holes", "holes_thru", "holesThru", "HolesThrough",
    "current_hole", "currentHole", "CurrentHole",
    "round.holes_played", "round.holesPlayed", "round.HolesPlayed",
    "round.holes", "round.thru",
    "scores.holes_played", "scores.holesPlayed", "scores.HolesPlayed",
    "scores.thru", "scores.holes",
    "today.holes_played", "today.holesPlayed", "today.thru"
  ]);

  if (value === 0 || value === "0") return "0";
  return value || "—";
}
function rowPosition(row, index) {
  return firstValue(row, ["position", "Position", "rank", "Rank", "pos", "Pos", "place", "Place", "leaderboard.position", "result.position"]) || String(index + 1);
}

function normalize(raw) {
  const directArrays = [raw && raw.players, raw && raw.Players, raw && raw.leaderboard, raw && raw.Leaderboard, raw && raw.data, raw && raw.Data, raw && raw.results, raw && raw.Results, raw && raw.TournamentPlayers, raw && raw.leaderboardRows, raw && raw.entries, raw && raw.Entries, raw && raw.participants, raw && raw.Participants, raw && raw.competitors, raw && raw.Competitors, raw && raw.tournament && raw.tournament.leaderboard, raw && raw.fixture && raw.fixture.leaderboard].filter(Array.isArray);
  let rows = directArrays[0] || (Array.isArray(raw) ? raw : []);
  if (!rows.length || !rows.some(hasPlayerShape)) {
    const candidates = findCandidateArrays(raw).map(c => ({ ...c, score: c.rows.filter(hasPlayerShape).length })).filter(c => c.score > 0).sort((a, b) => b.score - a.score);
    if (candidates.length) rows = candidates[0].rows;
  }
  return rows.map((row, i) => {
    const nm = fullNameFrom(row);
    if (!nm) return null;
    return { id: String(firstValue(row, ["id", "ID", "player_id", "playerId", "PlayerID", "player.id", "Player.ID", "participant.id", "competitor.id"]) || nm), name: String(nm).trim(), total: score(rowScore(row)), thru: String(rowThru(row)), position: String(rowPosition(row, i)), status: status(row), raw: row };
  }).filter(Boolean).sort((a, b) => a.total - b.total);
}

function demo() {
  const names = ["Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Collin Morikawa", "Ludvig Aberg", "Brooks Koepka", "Bryson DeChambeau", "Viktor Hovland", "Patrick Cantlay", "Tommy Fleetwood", "Max Homa", "Jon Rahm", "Hideki Matsuyama", "Jordan Spieth", "Tony Finau", "Sahith Theegala", "Justin Rose", "Shane Lowry"];
  const now = Date.now();
  const players = names.map((nm, i) => ({ id: `demo-${i}`, name: nm, total: Math.round(((i % 7) - 3) + Math.sin(now / 600000 + i) * 2), thru: String((Math.floor(now / 60000) + i) % 18 || 18), position: String(i + 1), status: "Active" })).sort((a, b) => a.total - b.total).map((p, i) => ({ ...p, position: String(i + 1) }));
  return { provider: "demo", eventName: "Demo Golf Feed", updatedAt: new Date().toISOString(), players };
}

async function fetchJson(url, options) {
  const r = await fetch(url, options);
  const text = await r.text();
  if (!r.ok) throw new Error(`Feed request failed: ${r.status}. ${text.slice(0, 250)}`);
  try { return JSON.parse(text); } catch { throw new Error(`Feed did not return JSON. First 250 chars: ${text.slice(0, 250)}`); }
}

exports.handler = async function() {
  const ttl = Number(process.env.CACHE_SECONDS || 60);
  const provider = String(process.env.LIVE_GOLF_PROVIDER || "demo").toLowerCase();
  if (cache.data && Date.now() - cache.at < ttl * 1000) return send(200, { ...cache.data, cached: true }, Math.min(ttl, 60));
  try {
    let data;
    if (provider === "custom") {
      if (!process.env.CUSTOM_FEED_URL) throw new Error("CUSTOM_FEED_URL is required.");
      const raw = await fetchJson(process.env.CUSTOM_FEED_URL);
      const players = normalize(raw);
      data = { provider, eventName: raw.eventName || raw.EventName || "Custom Golf Feed", updatedAt: raw.updatedAt || new Date().toISOString(), players, debug: { playerCount: players.length } };
    } else if (provider === "rapidapi") {
      if (!process.env.RAPIDAPI_URL || !process.env.RAPIDAPI_KEY) throw new Error("RAPIDAPI_URL and RAPIDAPI_KEY are required.");
      const headers = { "x-rapidapi-key": process.env.RAPIDAPI_KEY };
      if (process.env.RAPIDAPI_HOST) headers["x-rapidapi-host"] = process.env.RAPIDAPI_HOST;
      const raw = await fetchJson(process.env.RAPIDAPI_URL, { headers });
      const players = normalize(raw);
      data = { provider, eventName: raw.eventName || raw.EventName || raw.name || raw.Name || "RapidAPI Golf Feed", updatedAt: raw.updatedAt || raw.updated || new Date().toISOString(), players, debug: { playerCount: players.length, topLevelKeys: raw && typeof raw === "object" ? Object.keys(raw).slice(0, 20) : [] } };
    } else if (provider === "sportsdataio") {
      if (!process.env.SPORTSDATAIO_URL) throw new Error("SPORTSDATAIO_URL is required.");
      const url = new URL(process.env.SPORTSDATAIO_URL);
      if (process.env.SPORTSDATAIO_KEY && !url.searchParams.has("key")) url.searchParams.set("key", process.env.SPORTSDATAIO_KEY);
      const raw = await fetchJson(url.toString());
      const players = normalize(raw);
      data = { provider, eventName: raw.Name || raw.TournamentName || "SportsDataIO Golf Feed", updatedAt: new Date().toISOString(), players, debug: { playerCount: players.length } };
    } else {
      data = demo();
    }
    cache = { at: Date.now(), data };
    return send(200, data, Math.min(ttl, 60));
  } catch (err) {
    return send(500, { error: err.message, provider });
  }
};
