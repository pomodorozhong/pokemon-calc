#!/usr/bin/env python3
"""Fetch and normalize Pokemon battle data from PokeAPI."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

BASE_URL = "https://pokeapi.co/api/v2"
ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data"
MAX_WORKERS = 8
RETRY_DELAY = 2.0
MAX_RETRIES = 5


def fetch_json(url: str) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "pokemon-calc-data-fetch/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(RETRY_DELAY * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def cached_fetch(url: str, cache_path: Path) -> dict[str, Any]:
    if cache_path.exists():
        with cache_path.open(encoding="utf-8") as handle:
            return json.load(handle)
    payload = fetch_json(url)
    save_json(cache_path, payload)
    time.sleep(0.05)
    return payload


def list_resources(resource: str) -> list[dict[str, Any]]:
    index = fetch_json(f"{BASE_URL}/{resource}?limit=10000")
    return index["results"]


def fetch_many(
    resource: str,
    names: list[str],
    on_result: Any,
) -> list[Any]:
    results: list[Any] = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(
                cached_fetch,
                f"{BASE_URL}/{resource}/{name}",
                RAW_DIR / resource / f"{name}.json",
            ): name
            for name in names
        }
        for index, future in enumerate(as_completed(futures), start=1):
            name = futures[future]
            try:
                results.append(on_result(future.result()))
            except Exception as error:
                print(f"  error fetching {resource}/{name}: {error}", file=sys.stderr)
            if index % 100 == 0:
                print(f"  {resource}: {index}/{len(names)}")
    return results


def normalize_pokemon(raw: dict[str, Any]) -> dict[str, Any]:
    stats = {entry["stat"]["name"]: entry["base_stat"] for entry in raw["stats"]}
    return {
        "id": raw["id"],
        "name": raw["name"],
        "height": raw["height"],
        "weight": raw["weight"],
        "types": [entry["type"]["name"] for entry in raw["types"]],
        "abilities": [
            {
                "name": entry["ability"]["name"],
                "is_hidden": entry["is_hidden"],
                "slot": entry["slot"],
            }
            for entry in raw["abilities"]
        ],
        "stats": {
            "hp": stats.get("hp", 0),
            "attack": stats.get("attack", 0),
            "defense": stats.get("defense", 0),
            "special-attack": stats.get("special-attack", 0),
            "special-defense": stats.get("special-defense", 0),
            "speed": stats.get("speed", 0),
        },
        "sprites": {
            "official_artwork": f"assets/sprites/pokemon/{raw['id']}.png",
            "front_default": raw.get("sprites", {}).get("front_default"),
        },
    }


def normalize_move(raw: dict[str, Any]) -> dict[str, Any]:
    meta = raw.get("meta") or {}
    return {
        "id": raw["id"],
        "name": raw["name"],
        "type": raw["type"]["name"],
        "power": raw["power"],
        "accuracy": raw["accuracy"],
        "pp": raw["pp"],
        "priority": raw["priority"],
        "damage_class": raw["damage_class"]["name"],
        "target": raw["target"]["name"],
        "meta": {
            "ailment": meta.get("ailment", {}).get("name"),
            "ailment_chance": meta.get("ailment_chance"),
            "category": meta.get("category", {}).get("name"),
            "crit_rate": meta.get("crit_rate"),
            "drain": meta.get("drain"),
            "flinch_chance": meta.get("flinch_chance"),
            "healing": meta.get("healing"),
            "max_hits": meta.get("max_hits"),
            "min_hits": meta.get("min_hits"),
            "stat_chance": meta.get("stat_chance"),
        },
    }


def normalize_ability(raw: dict[str, Any]) -> dict[str, Any]:
    english = next(
        (
            entry
            for entry in raw.get("effect_entries", [])
            if entry["language"]["name"] == "en"
        ),
        None,
    )
    short_effect = next(
        (
            entry["short_effect"]
            for entry in raw.get("effect_entries", [])
            if entry["language"]["name"] == "en"
        ),
        None,
    )
    return {
        "id": raw["id"],
        "name": raw["name"],
        "short_effect": short_effect,
        "effect": english["effect"] if english else None,
    }


def normalize_item(raw: dict[str, Any]) -> dict[str, Any]:
    english = next(
        (
            entry
            for entry in raw.get("effect_entries", [])
            if entry["language"]["name"] == "en"
        ),
        None,
    )
    attributes = {entry["name"] for entry in raw.get("attributes", [])}
    category = raw.get("category", {}).get("name")
    return {
        "id": raw["id"],
        "name": raw["name"],
        "category": category,
        "cost": raw.get("cost"),
        "fling_power": raw.get("fling_power"),
        "holdable": "holdable" in attributes or "holdable-active" in attributes,
        "effect": english["effect"] if english else None,
        "short_effect": english["short_effect"] if english else None,
    }


def build_type_chart(type_names: list[str]) -> dict[str, Any]:
    chart: dict[str, dict[str, float]] = {name: {} for name in type_names}
    relations: dict[str, dict[str, list[str]]] = {}

    for type_name in type_names:
        raw = cached_fetch(
            f"{BASE_URL}/type/{type_name}",
            RAW_DIR / "type" / f"{type_name}.json",
        )
        damage = raw["damage_relations"]
        relations[type_name] = {
            "double_damage_to": [entry["name"] for entry in damage["double_damage_to"]],
            "half_damage_to": [entry["name"] for entry in damage["half_damage_to"]],
            "no_damage_to": [entry["name"] for entry in damage["no_damage_to"]],
            "double_damage_from": [
                entry["name"] for entry in damage["double_damage_from"]
            ],
            "half_damage_from": [entry["name"] for entry in damage["half_damage_from"]],
            "no_damage_from": [entry["name"] for entry in damage["no_damage_from"]],
        }

        for defender in type_names:
            chart[type_name][defender] = 1.0

        for defender in relations[type_name]["double_damage_to"]:
            chart[type_name][defender] = 2.0
        for defender in relations[type_name]["half_damage_to"]:
            chart[type_name][defender] = 0.5
        for defender in relations[type_name]["no_damage_to"]:
            chart[type_name][defender] = 0.0

    return {"types": type_names, "relations": relations, "matrix": chart}


def build_natures() -> list[dict[str, Any]]:
    raw = fetch_json(f"{BASE_URL}/nature?limit=100")
    natures = []
    for entry in raw["results"]:
        detail = cached_fetch(
            entry["url"],
            RAW_DIR / "nature" / f"{entry['name']}.json",
        )
        increased = detail.get("increased_stat")
        decreased = detail.get("decreased_stat")
        likes_flavor = detail.get("likes_flavor")
        hates_flavor = detail.get("hates_flavor")
        natures.append(
            {
                "id": detail["id"],
                "name": detail["name"],
                "likes_flavor": likes_flavor.get("name") if likes_flavor else None,
                "hates_flavor": hates_flavor.get("name") if hates_flavor else None,
                "increased_stat": increased["name"] if increased else None,
                "decreased_stat": decreased["name"] if decreased else None,
            }
        )
    return sorted(natures, key=lambda item: item["id"])


def write_mechanics() -> None:
    mechanics = {
        "game": "Pokemon Champions",
        "regulation": "reg-mb",
        "description": "Static battle mechanics constants for Pokemon Champions mid-battle calculations.",
        "stat_stages": {
            "-6": 0.25,
            "-5": 0.2857,
            "-4": 0.3333,
            "-3": 0.4,
            "-2": 0.5,
            "-1": 0.6667,
            "0": 1.0,
            "1": 1.5,
            "2": 2.0,
            "3": 2.5,
            "4": 3.0,
            "5": 3.5,
            "6": 4.0,
        },
        "nature_multipliers": {"boosted": 1.1, "lowered": 0.9, "neutral": 1.0},
        "weather": {
            "sun": {"fire": 1.5, "water": 0.5},
            "rain": {"fire": 0.5, "water": 1.5},
            "sand": {},
            "snow": {},
            "harsh-sunshine": {"fire": 1.5, "water": 0.0},
            "heavy-rain": {"fire": 0.25, "water": 1.5},
        },
        "terrain": {
            "electric": {"grounded_electric_boost": 1.3},
            "grassy": {"grounded_grass_boost": 1.3, "grounded_heal": 0.0625},
            "misty": {"grounded_dragon_reduction": 0.5},
            "psychic": {"grounded_psychic_boost": 1.3},
        },
        "screens": {"reflect": 0.5, "light-screen": 0.5, "aurora-veil": 0.5},
        "burn": {"physical_attack_multiplier": 0.5},
        "critical_hit": {"default_multiplier": 1.5, "default_chance": 0.0417},
    }
    save_json(OUT_DIR / "mechanics" / "gen9-battle-mechanics.json", mechanics)


def write_manifest(counts: dict[str, int]) -> None:
    manifest = {
        "version": "1.0.0",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sources": [
            {
                "name": "PokeAPI",
                "url": "https://pokeapi.co/",
                "license": "MIT",
                "resources": [
                    "pokemon",
                    "move",
                    "type",
                    "ability",
                    "item",
                    "nature",
                ],
            },
            {
                "name": "PokeAPI Sprites",
                "url": "https://github.com/PokeAPI/sprites",
                "license": "See repository (mixed; generally CC0/CC-BY for artwork)",
                "resources": ["pokemon official artwork", "type icons"],
            },
        ],
        "counts": counts,
        "files": {
            "pokemon": "data/pokemon.json",
            "moves": "data/moves.json",
            "abilities": "data/abilities.json",
            "items": "data/items.json",
            "held_items": "data/held-items.json",
            "type_chart": "data/type-chart.json",
            "natures": "data/natures.json",
            "mechanics": "data/mechanics/gen9-battle-mechanics.json",
            "sprites_pokemon": "assets/sprites/pokemon/",
            "sprites_types": "assets/sprites/types/",
        },
        "notes": [
            "Processed datasets are normalized for a mid-battle damage/survival calculator.",
            "Raw API responses are cached under data/raw/ for reproducibility.",
            "Mechanics constants are curated for Gen 9 and may need validation against Showdown.",
            "Held-item battle effects still require interpretation logic in the app layer.",
        ],
    }
    save_json(OUT_DIR / "manifest.json", manifest)


def main() -> None:
    print("Fetching resource lists...")
    pokemon_names = [entry["name"] for entry in list_resources("pokemon")]
    move_names = [entry["name"] for entry in list_resources("move")]
    ability_names = [entry["name"] for entry in list_resources("ability")]
    item_names = [entry["name"] for entry in list_resources("item")]
    type_names = [entry["name"] for entry in list_resources("type") if entry["name"] != "unknown" and entry["name"] != "stellar"]

    print(f"Fetching {len(pokemon_names)} pokemon...")
    pokemon = fetch_many("pokemon", pokemon_names, normalize_pokemon)
    pokemon.sort(key=lambda item: item["id"])
    save_json(OUT_DIR / "pokemon.json", pokemon)

    print(f"Fetching {len(move_names)} moves...")
    moves = fetch_many("move", move_names, normalize_move)
    moves.sort(key=lambda item: item["id"])
    save_json(OUT_DIR / "moves.json", moves)

    print(f"Fetching {len(ability_names)} abilities...")
    abilities = fetch_many("ability", ability_names, normalize_ability)
    abilities.sort(key=lambda item: item["id"])
    save_json(OUT_DIR / "abilities.json", abilities)

    print(f"Fetching {len(item_names)} items...")
    items = fetch_many("item", item_names, normalize_item)
    items.sort(key=lambda item: item["id"])
    save_json(OUT_DIR / "items.json", items)
    held_items = [item for item in items if item["holdable"]]
    save_json(OUT_DIR / "held-items.json", held_items)

    print(f"Building type chart for {len(type_names)} types...")
    type_chart = build_type_chart(type_names)
    save_json(OUT_DIR / "type-chart.json", type_chart)

    print("Fetching natures...")
    natures = build_natures()
    save_json(OUT_DIR / "natures.json", natures)

    write_mechanics()
    write_manifest(
        {
            "pokemon": len(pokemon),
            "moves": len(moves),
            "abilities": len(abilities),
            "items": len(items),
            "held_items": len(held_items),
            "types": len(type_names),
            "natures": len(natures),
        }
    )
    print("Done.")


if __name__ == "__main__":
    main()
