function demo() {
  const names = [
    "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Collin Morikawa",
    "Ludvig Aberg", "Brooks Koepka", "Bryson DeChambeau", "Viktor Hovland",
    "Patrick Cantlay", "Tommy Fleetwood", "Max Homa", "Jon Rahm",
    "Hideki Matsuyama", "Jordan Spieth", "Tony Finau", "Sahith Theegala"
  ];
  const now = Date.now();
  const players = names.map((name, i) => ({
    id: `demo-${i}`,
    name,
    total: Math.round(((i % 7) - 3) + Math.sin(now / 600000 + i) * 2),
    thru: String((Math.floor(now / 60000) + i) % 18 || 18),
    position: String(i + 1),
    status: "Active"
  })).sort((a, b) => a.total - b.total).map((p, i) => ({ ...p, position: String(i + 1) }));
  return { provider: "demo", eventName: "Demo Golf Feed", updatedAt: new Date().toISOString(), players };
}

export default async function handler() {
  return Response.json(demo(), { headers: { "cache-control": "no-store" } });
}
export const config = { path: "/api/live-leaderboard" };
