#!/usr/bin/env python3
"""Fetch Regulation M-B meta usage from Limitless TCG tournament data."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "champions" / "reg-mb" / "meta-usage.json"
POKEMON_PATH = ROOT / "data" / "champions" / "reg-mb" / "pokemon.json"
ITEMS_PATH = ROOT / "data" / "champions" / "reg-mb" / "items.json"
API_BASE = "https://play.limitlesstcg.com/api"
GAME = "VGC"
FORMAT = "M-B"
REQUEST_DELAY = 0.05
MAX_RETRIES = 4

# Limitless pokemon ids that differ from our canonical slugs.
ALIASES: dict[str, str] = {
    "aegislash": "aegislash-shield",
    "basculegion": "basculegion-male",
    "basculegion-f": "basculegion-female",
    "floette-eternal": "floette",
    "maushold": "maushold-family-of-three",
    "meowstic": "meowstic-male",
    "meowstic-f": "meowstic-female",
    "mimikyu": "mimikyu-disguised",
    "morpeko": "morpeko-full-belly",
    "palafin": "palafin-hero",
    "pyroar": "pyroar-male",
    "ninetales-alola": "ninetales",
    "rotom-wash": "rotom",
    "rotom-heat": "rotom",
    "rotom-mow": "rotom",
    "rotom-frost": "rotom",
}


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def fetch_json(url: str) -> Any:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "pokemon-calc-meta-fetch/1.0"})
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def normalize_item_name(item: str | None) -> str | None:
    if not item:
        return None
    slug = re.sub(r"[^a-z0-9]+", "-", item.strip().lower()).strip("-")
    return slug or None


def build_mega_item_map(items: list[dict[str, Any]], legal_names: set[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}

    for entry in items:
        if entry.get("category") != "mega-stones":
            continue
        item_slug = entry["name"]
        effect = entry.get("short_effect") or entry.get("effect") or ""
        match = re.search(r"Mega Evolve into Mega ([A-Za-z0-9- ]+)", effect)
        if not match:
            continue
        mega_label = match.group(1).strip().lower().replace(" ", "-")
        candidate = f"{mega_label}-mega" if not mega_label.endswith("-mega") else mega_label
        if candidate in legal_names:
            mapping[item_slug] = candidate
            continue
        if mega_label in legal_names:
            mapping[item_slug] = mega_label

    # Limitless display names that do not slug-match our item keys.
    mapping.setdefault("charizardite-y", "charizard")
    mapping.setdefault("charizardite-x", "charizard")
    mapping.setdefault("raichunite-x", "raichu-mega-x")
    mapping.setdefault("raichunite-y", "raichu-mega-y")
    return mapping


def resolve_slug(
    pokemon_id: str,
    item: str | None,
    legal_names: set[str],
    mega_items: dict[str, str],
) -> str | None:
    item_slug = normalize_item_name(item)
    if item_slug and item_slug in mega_items:
        slug = mega_items[item_slug]
        if slug in legal_names:
            return slug

    candidates = [pokemon_id, ALIASES.get(pokemon_id, pokemon_id)]
    for candidate in candidates:
        if candidate in legal_names:
            return candidate

    base = pokemon_id.split("-")[0]
    mega_slug = f"{base}-mega"
    if mega_slug in legal_names and item_slug and item_slug.endswith("ite"):
        return mega_slug

    return None


def aggregate_usage(legal_names: set[str], mega_items: dict[str, str]) -> tuple[Counter[str], int, int]:
    tournaments = fetch_json(f"{API_BASE}/tournaments?game={GAME}&format={FORMAT}&limit=200")
    counts: Counter[str] = Counter()
    teams = 0

    for index, tournament in enumerate(tournaments, start=1):
        standings = fetch_json(f"{API_BASE}/tournaments/{tournament['id']}/standings")
        for player in standings:
            decklist = player.get("decklist")
            if not decklist:
                continue
            teams += 1
            for mon in decklist:
                slug = resolve_slug(mon.get("id", ""), mon.get("item"), legal_names, mega_items)
                if slug:
                    counts[slug] += 1
        if index % 20 == 0:
            print(f"  processed {index}/{len(tournaments)} tournaments ({teams} teams)")
        time.sleep(REQUEST_DELAY)

    return counts, teams, len(tournaments)


def build_payload(counts: Counter[str], teams: int, tournaments: int) -> dict[str, Any]:
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    rankings = [
        {
            "rank": index,
            "name": name,
            "count": count,
            "usage_pct": round(count / teams * 100, 1) if teams else 0.0,
        }
        for index, (name, count) in enumerate(ranked, start=1)
    ]

    return {
        "regulation": "reg-mb",
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "source": {
            "name": "Limitless TCG",
            "url": "https://play.limitlesstcg.com",
            "game": GAME,
            "format": FORMAT,
            "description": "Tournament team usage aggregated from public Reg M-B standings.",
        },
        "teams_tracked": teams,
        "tournaments": tournaments,
        "rankings": rankings,
    }


def main() -> None:
    pokemon = load_json(POKEMON_PATH)
    items = load_json(ITEMS_PATH)
    legal_names = {entry["name"] for entry in pokemon}
    mega_items = build_mega_item_map(items, legal_names)

    print(f"Fetching Reg M-B usage from Limitless ({GAME}/{FORMAT})...")
    counts, teams, tournament_count = aggregate_usage(legal_names, mega_items)
    payload = build_payload(counts, teams, tournament_count)
    save_json(OUT, payload)

    print(f"Wrote {OUT}")
    print(f"  teams: {teams}")
    print(f"  tournaments: {tournament_count}")
    print(f"  ranked species: {len(payload['rankings'])}")
    if payload["rankings"]:
        top = payload["rankings"][:5]
        print("  top 5:")
        for entry in top:
            print(f"    {entry['rank']}. {entry['name']} ({entry['usage_pct']}%)")


if __name__ == "__main__":
    main()
