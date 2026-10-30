"""Download every mod of OWNER from the Factorio Mod Portal into data/mods.js.

The portal API sends no CORS headers, so the site cannot query it from the
browser; this script runs in GitHub Actions before each deploy instead.
The data is a script (not JSON) so the pages also work opened from disk.
"""
import json
import sys
import urllib.request
from pathlib import Path

OWNER = "SargaPulcsis"
API = "https://mods.factorio.com/api/mods"
ASSETS = "https://assets-mod.factorio.com"
OUT = Path(__file__).resolve().parent.parent / "data" / "mods.js"


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


def main():
    listing = get(f"{API}?page_size=max")["results"]
    names = [m["name"] for m in listing if m.get("owner") == OWNER]
    if not names:
        sys.exit(f"No mods found for {OWNER}; refusing to overwrite {OUT}")
    mods = [slim(get(f"{API}/{n}/full")) for n in names]
    mods.sort(key=lambda m: m["updated"] or "", reverse=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps({"owner": OWNER, "mods": mods}, ensure_ascii=False, indent=1)
    OUT.write_text(f"window.MOD_DATA = {data};\n", encoding="utf-8")
    print(f"Wrote {len(mods)} mods to {OUT}")


if __name__ == "__main__":
    main()
