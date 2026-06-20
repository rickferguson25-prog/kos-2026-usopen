(() => {
  const VERSION = "v113";
  console.log("US Open Golf Pool app.js " + VERSION + " loaded");

  let pool = {
    feePerGroup: 20,
    golfersPerGroup: 4,
    missedCutPenalty: 10,
    withdrawnPenalty: 15,
    groups: []
  };

  let live = { players: [], provider: "loading" };
  let hasUnsavedChanges = false;

  const $ = id => document.getElementById(id);
  const setText = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };
  const setDebug = text => setText("debugLine", `${VERSION} • ${text}`);

  function norm(v) {
    return String(v || "").trim().replace(/\s+/g, " ");
  }

  function normalizeHeaderName(v) {
    return String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function key(v) {
    return norm(v)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[.'’,-]/g, "")
      .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function nameParts(v) {
    const parts = key(v).split(" ").filter(Boolean);
    return {
      parts,
      first: parts[0] || "",
      last: parts[parts.length - 1] || ""
    };
  }

  function findLivePlayer(poolGolferName) {
    const poolKey = key(poolGolferName);
    const poolParts = nameParts(poolGolferName);
    const players = live.players || [];

    if (!poolKey || !players.length) return null;

    // 1. Exact normalized full-name match.
    let match = players.find(p => key(p.name) === poolKey);
    if (match) return match;

    // 2. Contains match, useful when feed includes country/suffix/extra text.
    match = players.find(p => {
      const liveKey = key(p.name);
      return liveKey && (liveKey.includes(poolKey) || poolKey.includes(liveKey));
    });
    if (match) return match;

    // 3. Last name + first initial match.
    const lastInitialMatches = players.filter(p => {
      const lp = nameParts(p.name);
      if (!lp.last || lp.last !== poolParts.last) return false;
      if (!poolParts.first || !lp.first) return true;
      return lp.first[0] === poolParts.first[0] || lp.first === poolParts.first;
    });
    if (lastInitialMatches.length === 1) return lastInitialMatches[0];

    // 4. Unique last-name match.
    const lastOnlyMatches = players.filter(p => nameParts(p.name).last === poolParts.last);
    if (lastOnlyMatches.length === 1) return lastOnlyMatches[0];

    return null;
  }

  function money(n) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(n || 0));
  }

  function scoreText(n) {
    const v = Number(n || 0);
    return v < 0 ? String(v) : v > 0 ? "+" + v : "E";
  }

  function scoreClass(n) {
    const v = Number(n || 0);
    return v < 0 ? "score-under" : v > 0 ? "score-over" : "score-even";
  }

  function html(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function show(msg, err = false) {
    const el = $("message");
    if (!el) return;
    el.textContent = msg;
    el.className = err ? "message error" : "message";
  }

  function adminPinProvided() {
    return Boolean(norm($("adminPin")?.value));
  }

  function updateAdminAvailability() {
    const enabled = adminPinProvided();
    document.querySelectorAll(".admin-only").forEach(el => {
      el.disabled = !enabled;
    });

    if (!enabled) {
      show("Enter the Admin PIN to enable admin functions.", false);
    } else {
      const msg = $("message")?.textContent || "";
      if (msg === "Enter the Admin PIN to enable admin functions.") {
        show("Admin functions enabled. The PIN will be verified when you save or upload.");
      }
    }
  }

  function requireAdminPin(actionName = "this admin function") {
    if (adminPinProvided()) return true;
    show(`Admin PIN is required to use ${actionName}.`, true);
    updateAdminAvailability();
    return false;
  }

  async function parseResponse(res) {
    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || res.statusText };
    }

    if (!res.ok) {
      throw new Error(data.error + (data.detail ? ` Detail: ${data.detail}` : ""));
    }

    return data;
  }

  async function apiGet(url) {
    const sep = url.includes("?") ? "&" : "?";
    return parseResponse(await fetch(url + sep + "_=" + Date.now(), {
      cache: "no-store"
    }));
  }

  async function apiPost(url, data) {
    const headers = { "content-type": "application/json" };
    if ($("adminPin") && $("adminPin").value) {
      headers["x-admin-pin"] = $("adminPin").value;
    }

    return parseResponse(await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      cache: "no-store"
    }));
  }

  async function loadPool(options = {}) {
    const preserveUnsaved = options.preserveUnsaved !== false;

    if (hasUnsavedChanges && preserveUnsaved) {
      setDebug("Skipped pool reload because there are unsaved local changes.");
      return;
    }

    try {
      pool = await apiGet("/api/pool");

      if ($("feePerGroup")) $("feePerGroup").value = pool.feePerGroup ?? 20;
      if ($("missedCutPenalty")) $("missedCutPenalty").value = pool.missedCutPenalty ?? 10;
      if ($("withdrawnPenalty")) $("withdrawnPenalty").value = pool.withdrawnPenalty ?? 15;

      setDebug(`Pool loaded: ${(pool.groups || []).length} group(s), updated ${pool.updatedAt ? new Date(pool.updatedAt).toLocaleString() : "not yet saved"}`);
    } catch (e) {
      console.warn("Pool load failed:", e);
      setDebug("Pool load failed: " + e.message);
      show("Pool storage is not available on this device yet. " + e.message, true);
    }
  }

  async function loadLive() {
    setText("feedStatus", "Loading feed…");
    setText("lastUpdated", "Calling /api/live-leaderboard");

    try {
      live = await apiGet("/api/live-leaderboard");
      setText("feedStatus", `${live.provider || "demo"} feed`);
      setText("lastUpdated", live.updatedAt ? `Updated ${new Date(live.updatedAt).toLocaleString()}` : "Updated now");
    } catch (e) {
      console.error("Live feed failed:", e);
      setText("feedStatus", "Feed error");
      setText("lastUpdated", e.message);
    }
  }

  function effectiveGolfer(name) {
    const p = (typeof findLivePlayer === "function")
      ? findLivePlayer(name)
      : (live.players || []).find(x => key(x.name) === key(name));

    if (!p) {
      return { name, total: 0, status: "Not Found", thru: "—" };
    }

    let total = Number(p.total || 0);
    if (p.status === "Missed Cut") total += Number(pool.missedCutPenalty || 10);
    if (p.status === "Withdrawn") total += Number(pool.withdrawnPenalty || 15);
    return { ...p, total };
  }

  function displayGroupLabel(group) {
    return norm(group.label) || "Unlabeled Group";
  }

  function leaderboardRows() {
    return (pool.groups || []).map((g, i) => {
      const golfers = (g.golfers || []).map(effectiveGolfer);
      const total = golfers.reduce((sum, p) => sum + Number(p.total || 0), 0);
      const risk = golfers.filter(p => ["Missed Cut", "Withdrawn", "Not Found"].includes(p.status)).length;

      return {
        ...g,
        i,
        golfers,
        total,
        risk
      };
    }).sort((a, b) => a.total - b.total || String(a.entrant).localeCompare(String(b.entrant)));
  }

  function renderDashboard(rows) {
    const leader = rows[0];

    setText("leaderName", leader ? `${leader.entrant} - ${displayGroupLabel(leader)}` : "—");
    setText("leaderScore", leader ? scoreText(leader.total) : "—");
    setText("groupCount", (pool.groups || []).length);
    setText("prizePool", money((pool.groups || []).length * Number(pool.feePerGroup || 20)));
  }

  function renderLeaderboard() {
    const body = $("leaderboardBody");
    if (!body) return;

    const rows = leaderboardRows();
    renderDashboard(rows);

    body.innerHTML = rows.map((g, i) => `
      <tr class="${i === 0 ? "leader" : g.risk ? "risk" : ""}">
        <td><strong>${i + 1}</strong></td>
        <td>
          <strong>${html(g.entrant)}</strong><br>
          <span class="muted">${html(displayGroupLabel(g))}</span>
        </td>
        <td class="${scoreClass(g.total)}">${scoreText(g.total)}</td>
        <td>
          ${g.golfers.map(p => `
            <div>
              ${html(p.name)}
              <span class="${scoreClass(p.total)}">${scoreText(p.total)}</span>
              <span class="muted">${html(p.status)} • thru ${html(p.thru)}</span>
            </div>
          `).join("")}
        </td>
        <td>${g.risk}</td>
      </tr>
    `).join("") || `<tr><td colspan="5" class="muted">No groups entered yet.</td></tr>`;
  }

  function renderGolfers() {
    const body = $("golferBody");
    if (!body) return;

    body.innerHTML = (live.players || []).map(p => `
      <tr>
        <td>${html(p.position || "—")}</td>
        <td><strong>${html(p.name)}</strong></td>
        <td class="${scoreClass(p.total)}">${scoreText(p.total)}</td>
        <td>${html(p.thru || "—")}</td>
        <td><span class="pill">${html(p.status || "Active")}</span></td>
      </tr>
    `).join("") || `<tr><td colspan="5" class="muted">No scores loaded.</td></tr>`;
  }

  function renderGroups() {
    const list = $("groupsList");
    if (!list) return;

    list.innerHTML = (pool.groups || []).map((g, i) => `
      <div class="group-card">
        <strong>${html(g.entrant)} - ${html(displayGroupLabel(g))}</strong>
        <button class="danger admin-action" onclick="window.removeGroup(${i})" ${adminPinProvided() ? "" : "disabled"}>Remove</button>
        <ul>
          ${(g.golfers || []).map(x => `<li>${html(x)}</li>`).join("")}
        </ul>
      </div>
    `).join("") || `<p class="muted">No groups saved.</p>`;
  }

  function render() {
    renderLeaderboard();
    renderGolfers();
    renderGroups();
  }

  function markUnsaved(message) {
    hasUnsavedChanges = true;
    show(message);
  }

  function addGroup() {
    if (!requireAdminPin("Add Group")) return;

    const entrant = norm($("entrantName")?.value);
    const golfers = ($("golfers")?.value || "").split(/\n|,/).map(norm).filter(Boolean);

    if (!entrant) return show("Enter the entrant name.", true);
    if (golfers.length !== 4) return show("Each paid group must have exactly 4 golfers.", true);

    const label = norm($("groupLabel")?.value);

    pool.groups = pool.groups || [];
    pool.groups.push({
      id: String(Date.now()),
      entrant,
      label,
      golfers
    });

    $("entrantName").value = "";
    $("groupLabel").value = "";
    $("golfers").value = "";

    markUnsaved("Group added. Click Save Pool to publish it.");
    render();
  }

  window.removeGroup = function(i) {
    if (!requireAdminPin("Remove")) return;
    if (!confirm("Remove this group?")) return;
    pool.groups.splice(i, 1);
    markUnsaved("Group removed. Click Save Pool to publish it.");
    render();
  };

  async function savePool(customSuccessMessage) {
    if (!requireAdminPin("Save Pool")) return false;

    pool.feePerGroup = Number($("feePerGroup")?.value || 20);
    pool.missedCutPenalty = Number($("missedCutPenalty")?.value || 10);
    pool.withdrawnPenalty = Number($("withdrawnPenalty")?.value || 15);
    pool.golfersPerGroup = 4;

    try {
      pool = await apiPost("/api/pool", pool);
      hasUnsavedChanges = false;
      show(customSuccessMessage || "Pool saved successfully.");
      setDebug(`Pool saved: ${(pool.groups || []).length} group(s), updated ${new Date(pool.updatedAt).toLocaleString()}`);
      render();
      return true;
    } catch (e) {
      show(e.message, true);
      setDebug("Save failed: " + e.message);
      return false;
    }
  }

  function clearGroups() {
    if (!requireAdminPin("Clear Groups")) return;
    if (!confirm("Clear groups on screen? Click Save Pool afterward to publish the change.")) return;
    pool.groups = [];
    markUnsaved("Groups cleared on screen. Click Save Pool to publish the change.");
    render();
  }

  async function reloadAll(forcePoolReload = false) {
    setDebug("Force reload started...");
    await loadLive();
    await loadPool({ preserveUnsaved: !forcePoolReload });
    render();
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"' && inQuotes && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !inQuotes) {
        if (field || row.length) {
          row.push(field);
          rows.push(row);
        }
        field = "";
        row = [];
        if (c === "\r" && next === "\n") i++;
      } else {
        field += c;
      }
    }

    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function csvEscape(value) {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replaceAll('"', '""') + '"';
    }
    return s;
  }

  async function uploadEntrantGroupsCsv(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!requireAdminPin("CSV Upload")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const rows = parseCsv(reader.result);

      if (!rows.length) {
        show("CSV file is empty.", true);
        return;
      }

      const header = rows[0].map(normalizeHeaderName);

      const getValue = (row, ...columnNames) => {
        for (const columnName of columnNames) {
          const idx = header.indexOf(normalizeHeaderName(columnName));
          if (idx >= 0) return String(row[idx] || "").trim();
        }
        return "";
      };

      const importedGroups = [];
      const skippedRows = [];

      for (const [rowIndex, row] of rows.slice(1).entries()) {
        const entrant = getValue(row, "entrant", "name");
        const groupLabel = getValue(row, "group_label", "groupLabel", "group label", "group", "label");

        const golfers = [
          getValue(row, "golfer1", "golfer_1", "golfer 1"),
          getValue(row, "golfer2", "golfer_2", "golfer 2"),
          getValue(row, "golfer3", "golfer_3", "golfer 3"),
          getValue(row, "golfer4", "golfer_4", "golfer 4")
        ].map(norm).filter(Boolean);

        if (!entrant || golfers.length !== 4) {
          skippedRows.push(rowIndex + 2);
          continue;
        }

        importedGroups.push({
          id: String(Date.now()) + "-" + Math.random().toString(36).slice(2),
          entrant: norm(entrant),
          label: norm(groupLabel),
          golfers
        });
      }

      if (!importedGroups.length) {
        show("No valid 4-player groups were found in the CSV.", true);
        event.target.value = "";
        return;
      }

      pool.groups = pool.groups || [];
      pool.groups.push(...importedGroups);
      hasUnsavedChanges = true;
      render();

      const skipText = skippedRows.length ? ` Skipped row(s): ${skippedRows.join(", ")}.` : "";
      show(`${importedGroups.length} group(s) imported. Saving now...${skipText}`);
      setDebug(`CSV import complete: ${importedGroups.length} group(s). Saving...`);

      await savePool(`${importedGroups.length} group(s) imported and saved successfully.${skipText}`);

      event.target.value = "";
    };

    reader.readAsText(file);
  }

  function downloadCsv(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const lines = [
      ["entrant", "group_label", "golfer1", "golfer2", "golfer3", "golfer4"],
      ["Joe Brown", "Group 10", "Scottie Scheffler", "Rory McIlroy", "Xander Schauffele", "Collin Morikawa"],
      ["Joe Brown", "Group 22", "Ludvig Aberg", "Brooks Koepka", "Bryson DeChambeau", "Viktor Hovland"],
      ["Randy", "Group 7", "Patrick Cantlay", "Tommy Fleetwood", "Max Homa", "Jon Rahm"]
    ].map(row => row.map(csvEscape).join(",")).join("\n");

    downloadCsv("us_open_pool_entrants_template.csv", lines);
  }

  function exportCurrentGroupsCsv() {
    const header = ["entrant", "group_label", "golfer1", "golfer2", "golfer3", "golfer4"];
    const rows = [header];

    (pool.groups || []).forEach(g => {
      rows.push([
        g.entrant || "",
        g.label || "",
        (g.golfers || [])[0] || "",
        (g.golfers || [])[1] || "",
        (g.golfers || [])[2] || "",
        (g.golfers || [])[3] || ""
      ]);
    });

    downloadCsv("us_open_pool_current_groups.csv", rows.map(row => row.map(csvEscape).join(",")).join("\n"));
  }

  function setupRiskInfoPanel() {
    const btn = $("riskInfoBtn");
    const panel = $("riskInfoPanel");
    if (!btn || !panel) return;

    const closePanel = () => {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", event => {
      event.stopPropagation();
      const opening = panel.hidden;
      panel.hidden = !opening;
      btn.setAttribute("aria-expanded", opening ? "true" : "false");
    });

    document.addEventListener("click", event => {
      if (!panel.hidden && !panel.contains(event.target) && event.target !== btn) {
        closePanel();
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closePanel();
    });
  }

  async function init() {
    setDebug("Script loaded. Initializing...");

    if ($("adminPin")) {
      $("adminPin").addEventListener("input", () => {
        updateAdminAvailability();
        renderGroups();
      });
    }

    updateAdminAvailability();
    setupRiskInfoPanel();

    if ($("addGroup")) $("addGroup").onclick = addGroup;
    if ($("savePool")) $("savePool").onclick = () => savePool();
    if ($("clearGroups")) $("clearGroups").onclick = clearGroups;
    if ($("refreshNow")) $("refreshNow").onclick = async () => { await loadLive(); render(); };
    if ($("forceReload")) $("forceReload").onclick = () => reloadAll(true);
    if ($("csvUpload")) $("csvUpload").addEventListener("change", uploadEntrantGroupsCsv);
    if ($("downloadTemplate")) $("downloadTemplate").onclick = downloadTemplate;
    if ($("exportCsv")) $("exportCsv").onclick = exportCurrentGroupsCsv;

    await reloadAll(true);
    setInterval(() => reloadAll(false), 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
