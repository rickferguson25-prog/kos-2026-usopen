function send(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body)
  };
}

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

exports.handler = async function() { return send(200, demo()); };
