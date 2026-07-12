#!/usr/bin/env python3
"""Fetch Regulation M-B meta usage for doubles/singles tournament and ladder sources."""

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
LIMITLESS_API = "https://play.limitlesstcg.com/api"
PIKALYTICS_DOUBLES_LADDER = "https://www.pikalytics.com/ai/pokedex/battledataregmbs3"
USER_AGENT = "pokemon-calc-meta-fetch/1.0"
REQUEST_DELAY = 0.05
MAX_RETRIES = 4

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

PIKALYTICS_ALIASES: dict[str, str] = {
    **ALIASES,
    "floette-mega": "floette",
    "charizard-mega-y": "charizard",
    "charizard-mega-x": "charizard",
    "raichu-mega-x": "raichu-mega-x",
    "raichu-mega-y": "raichu-mega-y",
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
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError(f"Failed to fetch {url}") from last_error


def fetch_text(url: str) -> str:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read().decode("utf-8")
        except (urllib.error.URLError, TimeoutError) as exc:
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

    mapping.setdefault("charizardite-y", "charizard")
    mapping.setdefault("charizardite-x", "charizard")
    mapping.setdefault("raichunite-x", "raichu-mega-x")
    mapping.setdefault("raichunite-y", "raichu-mega-y")
    return mapping


def resolve_limitless_slug(
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

    for candidate in (pokemon_id, ALIASES.get(pokemon_id, pokemon_id)):
        if candidate in legal_names:
            return candidate

    base = pokemon_id.split("-")[0]
    mega_slug = f"{base}-mega"
    if mega_slug in legal_names and item_slug and item_slug.endswith("ite"):
        return mega_slug

    return None


def resolve_display_slug(name: str, legal_names: set[str], aliases: dict[str, str]) -> str | None:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    candidates = [slug, aliases.get(slug, slug)]

    if slug.endswith("-mega"):
        candidates.append(slug)
        candidates.append(slug.rsplit("-mega", 1)[0])

    for candidate in candidates:
        if candidate in legal_names:
            return candidate

    base = slug.split("-")[0]
    mega_slug = f"{base}-mega"
    if mega_slug in legal_names:
        return mega_slug
    if base in legal_names:
        return base

    return None


def build_rankings(
    counts: Counter[str],
    *,
    metric: str,
    total: int | None = None,
) -> list[dict[str, Any]]:
    if total is None:
        total = sum(counts.values())

    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    rankings: list[dict[str, Any]] = []

    for index, (name, count) in enumerate(ranked, start=1):
        entry: dict[str, Any] = {
            "rank": index,
            "name": name,
            "count": count,
        }
        if metric == "team_rate":
            entry["usage_pct"] = round(count / total * 100, 1) if total else 0.0
        elif metric == "battle_rate":
            entry["usage_pct"] = round(count / total * 100, 1) if total else 0.0
        rankings.append(entry)

    return rankings


def fetch_doubles_tournament(legal_names: set[str], mega_items: dict[str, str]) -> dict[str, Any]:
    print("Fetching doubles tournament meta from Limitless (VGC/M-B)...")
    tournaments = fetch_json(f"{LIMITLESS_API}/tournaments?game=VGC&format=M-B&limit=200")
    counts: Counter[str] = Counter()
    teams = 0

    for index, tournament in enumerate(tournaments, start=1):
        standings = fetch_json(f"{LIMITLESS_API}/tournaments/{tournament['id']}/standings")
        for player in standings:
            decklist = player.get("decklist")
            if not decklist:
                continue
            teams += 1
            for mon in decklist:
                slug = resolve_limitless_slug(mon.get("id", ""), mon.get("item"), legal_names, mega_items)
                if slug:
                    counts[slug] += 1
        if index % 20 == 0:
            print(f"  processed {index}/{len(tournaments)} tournaments ({teams} teams)")
        time.sleep(REQUEST_DELAY)

    return {
        "id": "doubles-tournament",
        "label": "Doubles · Tournaments",
        "battle_type": "doubles",
        "source_type": "tournament",
        "available": True,
        "source": {
            "name": "Limitless TCG",
            "url": "https://play.limitlesstcg.com",
            "game": "VGC",
            "format": "M-B",
            "description": "Usage across public Reg M-B tournament team lists.",
        },
        "usage_metric": "team_rate",
        "teams_tracked": teams,
        "tournaments": len(tournaments),
        "rankings": build_rankings(counts, metric="team_rate", total=teams),
    }


def fetch_doubles_ladder(legal_names: set[str]) -> dict[str, Any]:
    print("Fetching doubles ladder meta from Pikalytics (battledataregmbs3)...")
    markdown = fetch_text(PIKALYTICS_DOUBLES_LADDER)
    section = markdown.split("## Best 50 Pokemon by Usage", 1)[1].split("\n## ", 1)[0]

    parsed_rows: list[tuple[int, str, int]] = []

    for line in section.splitlines():
        match = re.match(
            r"\|\s*(\d+)\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|",
            line,
        )
        if not match:
            continue
        rank, display_name, _, _, record = match.groups()
        record_match = re.match(r"\s*(\d+)-(\d+)-(\d+)", record)
        battles = sum(map(int, record_match.groups())) if record_match else 0
        slug = resolve_display_slug(display_name.strip(), legal_names, PIKALYTICS_ALIASES)
        if slug:
            parsed_rows.append((int(rank), slug, battles))

    total_battles = sum(battles for _, _, battles in parsed_rows)
    rankings: list[dict[str, Any]] = []
    seen: set[str] = set()

    for rank, slug, battles in parsed_rows:
        if slug in seen:
            continue
        seen.add(slug)
        rankings.append(
            {
                "rank": rank,
                "name": slug,
                "count": battles,
                "usage_pct": round(battles / total_battles * 100, 1) if total_battles else 0.0,
            }
        )

    return {
        "id": "doubles-ladder",
        "label": "Doubles · Ladder",
        "battle_type": "doubles",
        "source_type": "ladder",
        "available": True,
        "source": {
            "name": "Pikalytics",
            "url": "https://www.pikalytics.com/pokedex/battledataregmbs3",
            "format_code": "battledataregmbs3",
            "description": "Reg M-B S3 ranked battle data. Usage derived from total battle counts because Pikalytics does not publish usage percentages for this format.",
        },
        "usage_metric": "battle_rate",
        "battles_tracked": total_battles,
        "rankings": rankings,
    }


def unavailable_dataset(
    dataset_id: str,
    label: str,
    battle_type: str,
    source_type: str,
    reason: str,
) -> dict[str, Any]:
    return {
        "id": dataset_id,
        "label": label,
        "battle_type": battle_type,
        "source_type": source_type,
        "available": False,
        "reason": reason,
        "rankings": [],
    }


def main() -> None:
    pokemon = load_json(POKEMON_PATH)
    items = load_json(ITEMS_PATH)
    legal_names = {entry["name"] for entry in pokemon}
    mega_items = build_mega_item_map(items, legal_names)

    datasets = {
        "doubles-tournament": fetch_doubles_tournament(legal_names, mega_items),
        "doubles-ladder": fetch_doubles_ladder(legal_names),
        "singles-tournament": unavailable_dataset(
            "singles-tournament",
            "Singles · Tournaments",
            "singles",
            "tournament",
            "No public Reg M-B singles tournament dataset was found. Limitless only tracks VGC doubles for this regulation.",
        ),
        "singles-ladder": unavailable_dataset(
            "singles-ladder",
            "Singles · Ladder",
            "singles",
            "ladder",
            "No Reg M-B Battle Stadium Singles ladder dataset is published yet. Pikalytics only exposes BSS singles for Regulation M-A (gen9championsbssregma).",
        ),
    }

    payload = {
        "regulation": "reg-mb",
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "defaults": {
            "doubles": "doubles-tournament",
            "singles": "singles-ladder",
        },
        "datasets": datasets,
    }
    save_json(OUT, payload)

    print(f"Wrote {OUT}")
    for dataset_id, dataset in datasets.items():
        if dataset["available"]:
            top = dataset["rankings"][:3]
            summary = ", ".join(f"{entry['name']} ({entry['usage_pct']}%)" for entry in top)
            print(f"  {dataset_id}: {summary}")
        else:
            print(f"  {dataset_id}: unavailable")


if __name__ == "__main__":
    main()
