const PORTAL = "https://mods.factorio.com/mod/";
const BELT_SPEED = 40; // px per second
const OFFICIAL = { base: "Factorio", "space-age": "Space Age", quality: "Quality", "elevated-rails": "Elevated Rails" };
const STAGES = ["Concept", "Development", "Testing", "Released"];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = n => n.toLocaleString("en-US");
const date = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–";
const shortDate = d => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const thumb = m => m.thumbnail
  ? `<img src="${esc(m.thumbnail)}" alt="">`
  : `<span class="noimg">${esc(m.title[0])}</span>`;
const modUrl = m => `mod.html?m=${encodeURIComponent(m.name)}`;

// Dependency strings from info.json: "! name", "? name >= 1.0", "(?) name", "~ name", "+ name".
function parseDep(d) {
  const [, prefix = "", name] = d.trim().match(/^(!|\?|\(\?\)|~|\+)?\s*([^\s<>=]+)/) || [];
  const kind = prefix === "!" ? "incompatible" : ["?", "(?)", "+"].includes(prefix) ? "optional" : "required";
  return { kind, name };
}

// Name of a dependency, linking to my own mod page when it is one of mine.
function depLink(name, mods, titles) {
  if (OFFICIAL[name]) return OFFICIAL[name];
  const mine = mods.find(m => m.name === name);
  const href = mine ? modUrl(mine) : PORTAL + encodeURIComponent(name);
  return `<a href="${href}">${esc(mine?.title || titles[name] || name)}</a>`;
}

/* ---------- home ---------- */

// The belt keeps moving under the mouse. Browsers don't refresh :hover when an
// element slides under a still cursor, so the card under it is marked each frame.
function trackHover(belt) {
  let pointer = null, hot = null, running = false;
  const tick = () => {
    const card = pointer && document.elementFromPoint(pointer.x, pointer.y)?.closest(".card");
    if (card !== hot) {
      hot?.classList.remove("hot");
      (hot = card)?.classList.add("hot");
    }
    running = Boolean(pointer || hot);
    if (running) requestAnimationFrame(tick);
  };
  belt.addEventListener("pointermove", e => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!running) { running = true; requestAnimationFrame(tick); }
  });
  belt.addEventListener("pointerleave", () => pointer = null);
}

function renderHome(mods) {
  const total = mods.reduce((s, m) => s + m.downloads, 0);
  document.getElementById("stats").innerHTML = [
    [mods.length, "mods"],
    [num(total), "downloads"],
    [date(mods[0]?.updated), "last update"],
  ].map(([v, l]) => `<div class="stat deep"><b>${v}</b><span>${l}</span></div>`).join("");

  // The belt shows the set twice and slides by exactly one set, so it loops seamlessly.
  // Short lists get repeated first so one set is always wider than the screen.
  const reps = Math.max(1, Math.ceil(screen.width * 1.2 / (mods.length * 150)));
  const set = Array.from({ length: reps }, () => mods).flat();
  const card = (m, hidden) => `
    <a class="card" href="${modUrl(m)}"${hidden ? ' aria-hidden="true" tabindex="-1"' : ""}>
      <span class="slot deep">${thumb(m)}</span>
      <span class="name">${esc(m.title)}</span>
    </a>`;
  const track = document.getElementById("track");
  track.innerHTML = set.map((m, i) => card(m, i >= mods.length)).join("")
    + set.map(m => card(m, true)).join("");
  // Cards scale with the viewport, so the loop time is recomputed on resize.
  const setSpeed = () => {
    const speed = Math.max(BELT_SPEED, innerWidth / 30);
    track.style.setProperty("--belt-time", `${track.scrollWidth / 2 / speed}s`);
  };
  setSpeed();
  addEventListener("resize", setSpeed);
  trackHover(document.getElementById("belt"));

  document.getElementById("upcoming").innerHTML = (window.UPCOMING || []).map(u => `
    <li class="upcoming-card deep">
      ${u.image ? `<img src="${esc(u.image)}" alt="">` : `<span class="noimg">${esc(u.title[0])}</span>`}
      <div>
        <h3>${esc(u.title)}${u.version ? ` <small>v${esc(u.version)}</small>` : ""}</h3>
        <ol class="stages" aria-label="Stage: ${STAGES[u.stage - 1]}">${STAGES.map((s, i) =>
          `<li class="${i < u.stage ? "done" : ""}${i === u.stage - 1 ? " now" : ""}">${s}</li>`).join("")}</ol>
        <p>${esc(u.summary)}</p>
        ${u.needs ? `<p class="needs"><b>Needs:</b> ${esc(u.needs)}</p>` : ""}
      </div>
    </li>`).join("");

  document.getElementById("list").innerHTML = mods.map(m => `
    <li><a class="row" href="${modUrl(m)}">
      ${thumb(m)}
      <div><div class="t">${esc(m.title)}</div><div class="s">${esc(m.summary)}</div></div>
      <div class="meta"><b>${num(m.downloads)}</b> downloads<br>v${esc(m.version)} · ${date(m.updated)}</div>
    </a></li>`).join("");
}

/* ---------- compatibility page ---------- */

function renderCompat(mods, titles) {
  const versions = [...new Set(mods.flatMap(m => m.factorio))].sort((a, b) => parseFloat(b) - parseFloat(a));
  const k2 = ["Krastorio2", "Krastorio2-spaced-out"];
  const cell = (deps, names) => {
    const d = deps.find(x => names.includes(x.name));
    if (!d || d.kind === "incompatible") return `<td class="na">–</td>`;
    const what = names.length > 1 ? (d.name === "Krastorio2" ? "K2" : "K2SO") : "";
    return d.kind === "required"
      ? `<td><span class="pill req">Required${what ? ` · ${what}` : ""}</span></td>`
      : `<td><span class="pill opt">Supported</span></td>`;
  };
  const list = (deps, kind) => {
    const names = deps.filter(d => d.kind === kind && !OFFICIAL[d.name] && !k2.includes(d.name)).map(d => d.name);
    return names.length ? names.map(n => depLink(n, mods, titles)).join(", ") : `<span class="na">–</span>`;
  };
  const sorted = [...mods].sort((a, b) => a.title.localeCompare(b.title));

  document.getElementById("compat").innerHTML = `
    <table class="compat">
      <thead><tr>
        <th>Mod</th>${versions.map(v => `<th class="v">${esc(v)}</th>`).join("")}
        <th>Space Age</th><th>Krastorio 2</th><th>Also requires</th><th>Optional support</th><th>Not compatible with</th>
      </tr></thead>
      <tbody>${sorted.map(m => {
        const deps = m.dependencies.map(parseDep).filter(d => d.name);
        return `<tr>
          <th scope="row"><a href="${modUrl(m)}">${esc(m.title)}</a></th>
          ${versions.map(v => m.factorio.includes(v)
            ? `<td class="v yes" title="Factorio ${esc(v)}">✔</td>` : `<td class="v na">–</td>`).join("")}
          ${cell(deps, ["space-age"])}${cell(deps, k2)}
          <td class="deps">${list(deps, "required")}</td><td class="deps">${list(deps, "optional")}</td><td class="deps">${list(deps, "incompatible")}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
}

/* ---------- mod page ---------- */

// Factorio changelog.txt format: dashed separators, "Version:", "Date:",
// two-space category lines and four-space "- " entries.
function parseChangelog(text) {
  return text.split(/^-{5,}\s*$/m).map(b => b.trim()).filter(Boolean).map(block => {
    const out = { version: "", date: "", groups: [] };
    let group = null, entry = null;
    for (const line of block.split(/\r?\n/)) {
      let m;
      if ((m = line.match(/^Version:\s*(.+)/))) out.version = m[1];
      else if ((m = line.match(/^Date:\s*(.+)/))) out.date = m[1];
      else if ((m = line.match(/^\s{1,3}(\S.*?):\s*$/))) out.groups.push(group = { name: m[1], items: [] });
      else if ((m = line.match(/^\s*-\s+(.*)/))) {
        if (!group) out.groups.push(group = { name: "", items: [] });
        group.items.push(entry = m[1]);
      } else if (line.trim() && group?.items.length) {
        group.items[group.items.length - 1] = entry += " " + line.trim();
      }
    }
    return out;
  });
}

const niceStep = raw => {
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map(k => k * p).find(s => s >= raw);
};

// Download history: one point per day (see scripts/fetch_mods.py). Single series,
// so no legend; crosshair + tooltip on hover, data table underneath.
function renderDownloads(box, m) {
  const pts = (m.history || []).map(([d, n]) => ({ t: Date.parse(d), d, n }));
  const releasedOn = Object.fromEntries(m.releases.map(r => [r.date.slice(0, 10), r.version]));
  const since = pts[0]?.d;
  const week = pts.length > 1 ? pts.at(-1).n - (pts.find(p => p.t >= pts.at(-1).t - 7 * 864e5)?.n ?? pts[0].n) : null;

  box.innerHTML = `
    <div class="stats">
      <div class="stat deep2"><b>${num(m.downloads)}</b><span>downloads</span></div>
      ${week !== null ? `<div class="stat deep2"><b>+${num(week)}</b><span>last 7 days</span></div>` : ""}
      <div class="stat deep2"><b>${since ? date(since) : "–"}</b><span>tracked since</span></div>
    </div>
    ${pts.length < 2
      ? `<p class="chart-empty">The Mod Portal only shows the current total, so this site records it once a day. The chart fills in from tomorrow.</p>`
      : `<div class="chart" role="img" aria-label="Total downloads of ${esc(m.title)} over time"></div>
         <details class="chart-table"><summary>Show as table</summary>
           <table class="versions"><thead><tr><th>Date</th><th>Downloads</th><th>Change</th></tr></thead><tbody>${
             pts.map((p, i) => `<tr><td>${date(p.d)}</td><td>${num(p.n)}</td><td>${i ? `+${num(p.n - pts[i - 1].n)}` : "–"}</td></tr>`).reverse().join("")
           }</tbody></table></details>`}`;
  if (pts.length < 2) return;

  const chart = box.querySelector(".chart");
  const draw = () => {
    const W = chart.clientWidth, H = 260, L = 52, R = 16, T = 14, B = 28;
    if (!W) return;
    const t0 = pts[0].t, t1 = pts.at(-1).t;
    const step = niceStep(Math.max(...pts.map(p => p.n)) / 4);
    const top = step * Math.ceil(Math.max(...pts.map(p => p.n)) / step || 1);
    const x = t => L + (t - t0) / (t1 - t0) * (W - L - R);
    const y = n => T + (1 - n / top) * (H - T - B);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.n).toFixed(1)}`).join("");
    const yTicks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    const xCount = Math.min(pts.length, Math.max(2, Math.floor((W - L - R) / 90)));
    const xTicks = Array.from({ length: xCount }, (_, i) => pts[Math.round(i * (pts.length - 1) / (xCount - 1))]);
    const last = pts.at(-1);
    chart.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        ${yTicks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>
          <text class="axis" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`).join("")}
        ${xTicks.map(p => `<text class="axis" x="${x(p.t)}" y="${H - 8}" text-anchor="middle">${shortDate(p.d)}</text>`).join("")}
        <path class="area" d="${line}L${x(t1)},${y(0)}L${x(t0)},${y(0)}Z"/>
        <path class="line" d="${line}"/>
        <circle class="dot" cx="${x(last.t)}" cy="${y(last.n)}" r="4"/>
        <g class="hover" visibility="hidden"><line class="cross" y1="${T}" y2="${H - B}"/><circle class="dot" r="5"/></g>
      </svg>
      <div class="tip" hidden></div>`;

    const hover = chart.querySelector(".hover"), tip = chart.querySelector(".tip");
    chart.onpointermove = e => {
      const px = e.clientX - chart.getBoundingClientRect().left;
      const i = pts.reduce((best, p, j) => Math.abs(x(p.t) - px) < Math.abs(x(pts[best].t) - px) ? j : best, 0);
      const p = pts[i], cx = x(p.t);
      hover.setAttribute("visibility", "visible"); // `hidden` doesn't apply to SVG
      tip.hidden = false;
      hover.querySelector(".cross").setAttribute("x1", cx);
      hover.querySelector(".cross").setAttribute("x2", cx);
      hover.querySelector(".dot").setAttribute("cx", cx);
      hover.querySelector(".dot").setAttribute("cy", y(p.n));
      tip.innerHTML = `<b>${num(p.n)}</b> downloads<br>${date(p.d)}${i ? ` · +${num(p.n - pts[i - 1].n)}` : ""}${
        releasedOn[p.d] ? `<br><span class="rel">v${esc(releasedOn[p.d])} released</span>` : ""}`;
      tip.style.left = `${Math.min(Math.max(cx, 70), W - 70)}px`;
      tip.style.top = `${y(p.n) - 12}px`;
    };
    chart.onpointerleave = () => { hover.setAttribute("visibility", "hidden"); tip.hidden = true; };
  };
  draw();
  addEventListener("resize", draw);
  return draw;
}

function renderMod(mods, titles) {
  const name = new URLSearchParams(location.search).get("m");
  if (!name) return location.replace("index.html");
  const m = mods.find(x => x.name === name);
  const content = document.getElementById("content");
  if (!m) {
    document.getElementById("title").textContent = "Mod not found";
    content.innerHTML = `<div class="deep missing">No mod called “${esc(name)}” here. <a href="index.html">Back to all mods</a></div>`;
    return;
  }
  document.title = `${m.title} · SargaPulcsis`;
  document.getElementById("title").textContent = m.title;

  const deps = m.dependencies.map(parseDep).filter(d => d.kind === "required" && d.name !== "base");
  const facts = [
    ["Version", m.version],
    ["Factorio", m.factorio.join(", ")],
    ["Downloads", num(m.downloads)],
    ["Released", date(m.created)],
    ["Last update", date(m.updated)],
    ["Category", m.category ? m.category[0].toUpperCase() + m.category.slice(1) : "–"],
    m.tags.length && ["Tags", `<span class="tags">${m.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span>`, true],
    ["License", m.license || "–"],
    deps.length && ["Requires", deps.map(d => depLink(d.name, mods, titles)).join(", "), true],
  ].filter(Boolean);

  const source = m.source && !m.source.includes("mods.factorio.com") ? m.source : "";
  const changes = parseChangelog(m.changelog || "");
  const tabs = [
    ["Description", `<div class="md">${DOMPurify.sanitize(marked.parse(m.description || m.summary))}</div>`],
    m.images.length && ["Gallery", `<div class="gallery">${m.images.map(u =>
      `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="" loading="lazy"></a>`).join("")}</div>`],
    ["Downloads", `<div class="downloads"></div>`],
    changes.length && ["Changelog", `<div class="changes">${changes.map(c => `
      <article>
        <header><h3>${esc(c.version)}</h3><time>${esc(c.date)}</time></header>
        ${c.groups.map(g => `${g.name ? `<h4>${esc(g.name)}</h4>` : ""}<ul>${g.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`).join("")}
      </article>`).join("")}</div>`],
    ["Versions", `<table class="versions"><thead><tr><th>Version</th><th>Factorio</th><th>Released</th></tr></thead><tbody>${
      m.releases.map(r => `<tr><td>${esc(r.version)}</td><td>${esc(r.factorio)}</td><td>${date(r.date)}</td></tr>`).join("")}</tbody></table>`],
  ].filter(Boolean);

  content.innerHTML = `
    <div class="mod">
      <aside class="side">
        <div class="slot deep">${thumb(m)}</div>
        <p class="summary">${esc(m.summary)}</p>
        <dl class="facts deep">${facts.map(([k, v, raw]) => `<div><dt>${k}</dt><dd>${raw ? v : esc(v)}</dd></div>`).join("")}</dl>
        <div class="actions">
          <a class="btn green" href="${PORTAL}${encodeURIComponent(m.name)}">Open on Mod Portal</a>
          ${source ? `<a class="btn" href="${esc(source)}">Source code</a>` : ""}
          <a class="btn" href="compat.html">Compatibility table</a>
        </div>
        <p class="ai-note"><b>AI disclosure:</b> this mod was made with the help of AI (Claude by Anthropic).</p>
      </aside>
      <section>
        <div class="tabs" role="tablist">${tabs.map(([t], i) =>
          `<button class="tab" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}">${t}</button>`).join("")}</div>
        ${tabs.map(([, html], i) =>
          `<div class="panel deep" role="tabpanel" id="panel-${i}" aria-labelledby="tab-${i}"${i ? " hidden" : ""}>${html}</div>`).join("")}
      </section>
    </div>`;

  // The chart needs a visible panel to measure, so it is drawn when its tab opens.
  const redraw = renderDownloads(content.querySelector(".downloads"), m);
  content.querySelectorAll(".tab").forEach((tab, i) => tab.addEventListener("click", () => {
    content.querySelectorAll(".tab").forEach((t, j) => t.setAttribute("aria-selected", i === j));
    content.querySelectorAll(".panel").forEach((p, j) => p.hidden = i !== j);
    redraw?.();
  }));
}

const { mods, titles = {} } = window.MOD_DATA;
({ home: renderHome, mod: renderMod, compat: renderCompat })[document.body.dataset.page](mods, titles);
