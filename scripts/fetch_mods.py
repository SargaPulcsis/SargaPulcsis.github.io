"""Download every mod of OWNER from the Factorio Mod Portal into data/mods.js.

The portal API sends no CORS headers, so the site cannot query it from the
browser; this script runs in GitHub Actions before each deploy instead.
The data is a script (not JSON) so the pages also work opened from disk.

The portal only reports the current download count, so data/history.json keeps
one [date, downloads] point per mod per day; the workflow commits it back.
"""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OWNER = "SargaPulcsis"
API = "https://mods.factorio.com/api/mods"
ASSETS = "https://assets-mod.factorio.com"
DATA = Path(__file__).resolve().parent.parent / "data"
OUT = DATA / "mods.js"
HISTORY = DATA / "history.json"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"{OWNER}-mod-site"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def asset(path):
    # Mods without a thumbnail report "/assets/.thumb.png".
    if not path or path.startswith("/assets/."):
        return None
    return path if path.startswith("http") else ASSETS + path


def slim(m):
    releases = m.get("releases", [])
    latest = releases[-1] if releases else {}
    info = latest.get("info_json", {})
    return {
        "name": m["name"],
        "title": m["title"],
        "summary": m.get("summary", ""),
        "description": m.get("description", ""),
        "changelog": m.get("changelog", ""),
        "category": m.get("category"),
        "tags": m.get("tags", []),
        "downloads": m.get("downloads_count", 0),
        "created": m.get("created_at"),
        "updated": latest.get("released_at") or m.get("updated_at"),
        "version": latest.get("version"),
        "factorio": sorted({r["info_json"].get("factorio_version") for r in releases} - {None}),
        "dependencies": info.get("dependencies", []),
        "license": (m.get("license") or {}).get("title"),
        "source": m.get("source_url") or m.get("github_path") or m.get("homepage") or "",
        "thumbnail": asset(m.get("thumbnail")),
        "images": [i["url"] for i in m.get("images", [])],
        "releases": [
            {"version": r["version"], "date": r["released_at"],
             "factorio": r["info_json"].get("factorio_version")}
            for r in reversed(releases)
        ],
    }


def record_history(mods):
    """Add today's count for each mod (first run of the day wins) and attach the series."""
    history = json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {}
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for m in mods:
        points = history.setdefault(m["name"], [])
        if not points or points[-1][0] != today:
            points.append([today, m["downloads"]])
        m["history"] = points
    # one line per mod keeps the daily commits readable
    lines = [f" {json.dumps(k)}: {json.dumps(v)}" for k, v in sorted(history.items())]
    HISTORY.write_text("{\n" + ",\n".join(lines) + "\n}\n", encoding="utf-8")


def main():
    listing = get(f"{API}?page_size=max")["results"]
    names = [m["name"] for m in listing if m.get("owner") == OWNER]
    if not names:
        sys.exit(f"No mods found for {OWNER}; refusing to overwrite {OUT}")
    mods = [slim(get(f"{API}/{n}/full")) for n in names]
    mods.sort(key=lambda m: m["updated"] or "", reverse=True)
    record_history(mods)

    # Titles of the mods mine depend on, for the compatibility table.
    deps = {d.lstrip("!?()~+ ").split()[0] for m in mods for d in m["dependencies"] if d.strip()}
    titles = {m["name"]: m["title"] for m in listing if m["name"] in deps}

    DATA.mkdir(parents=True, exist_ok=True)
    data = json.dumps({"owner": OWNER, "mods": mods, "titles": titles}, ensure_ascii=False, indent=1)
    OUT.write_text(f"window.MOD_DATA = {data};\n", encoding="utf-8")
    print(f"Wrote {len(mods)} mods to {OUT}")


if __name__ == "__main__":
    main()
