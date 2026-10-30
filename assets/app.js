const PORTAL = "https://mods.factorio.com/mod/";
const BELT_SPEED = 40; // px per second

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = n => n.toLocaleString("en-US");
const date = d => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–";
const thumb = m => m.thumbnail
  ? `<img src="${esc(m.thumbnail)}" alt="">`
  : `<span class="noimg">${esc(m.title[0])}</span>`;
const modUrl = m => `mod.html?m=${encodeURIComponent(m.name)}`;

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

  document.getElementById("list").innerHTML = mods.map(m => `
    <li><a class="row" href="${modUrl(m)}">
      ${thumb(m)}
      <div><div class="t">${esc(m.title)}</div><div class="s">${esc(m.summary)}</div></div>
      <div class="meta"><b>${num(m.downloads)}</b> downloads<br>v${esc(m.version)} · ${date(m.updated)}</div>
    </a></li>`).join("");
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

const requiredDeps = deps => deps
  .filter(d => !/^\s*(\?|\(\?\)|!)/.test(d))
  .map(d => d.replace(/^\s*~\s*/, "").split(/\s|>|<|=/)[0])
  .filter(n => n && n !== "base");

function renderMod(mods) {
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

  const deps = requiredDeps(m.dependencies);
  const facts = [
    ["Version", m.version],
    ["Factorio", m.factorio.join(", ")],
    ["Downloads", num(m.downloads)],
    ["Released", date(m.created)],
    ["Last update", date(m.updated)],
    ["Category", m.category ? m.category[0].toUpperCase() + m.category.slice(1) : "–"],
    m.tags.length && ["Tags", `<span class="tags">${m.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span>`, true],
    ["License", m.license || "–"],
    deps.length && ["Requires", deps.map(d => `<a href="${PORTAL}${encodeURIComponent(d)}">${esc(d)}</a>`).join(", "), true],
  ].filter(Boolean);

  const source = m.source && !m.source.includes("mods.factorio.com") ? m.source : "";
  const changes = parseChangelog(m.changelog || "");
  const tabs = [
    ["Description", `<div class="md">${DOMPurify.sanitize(marked.parse(m.description || m.summary))}</div>`],
    m.images.length && ["Gallery", `<div class="gallery">${m.images.map(u =>
      `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="" loading="lazy"></a>`).join("")}</div>`],
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

  content.querySelectorAll(".tab").forEach((tab, i) => tab.addEventListener("click", () => {
    content.querySelectorAll(".tab").forEach((t, j) => t.setAttribute("aria-selected", i === j));
    content.querySelectorAll(".panel").forEach((p, j) => p.hidden = i !== j);
  }));
}

(document.body.dataset.page === "home" ? renderHome : renderMod)(window.MOD_DATA.mods);
