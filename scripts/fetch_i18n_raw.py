#!/usr/bin/env python3
"""Fetch PokeAPI raw cache for Champions i18n slugs."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
CHAMPIONS = ROOT / "data" / "champions" / "reg-mb"
BASE_URL = "https://pokeapi.co/api/v2"
MAX_RETRIES = 5
RETRY_DELAY = 2.0


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def fetch_json(url: str) -> dict:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "pokemon-calc-i18n-fetch/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(RETRY_DELAY * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def cached_fetch(url: str, cache_path: Path) -> dict:
    if cache_path.exists():
        return load_json(cache_path)
    payload = fetch_json(url)
    save_json(cache_path, payload)
    time.sleep(0.08)
    return payload


def load_champions_slugs() -> dict[str, list[str]]:
    return {
        "pokemon": [entry["name"] for entry in load_json(CHAMPIONS / "pokemon.json")],
        "moves": [entry["name"] for entry in load_json(CHAMPIONS / "moves.json")],
        "items": [entry["name"] for entry in load_json(CHAMPIONS / "items.json")],
        "abilities": [entry["name"] for entry in load_json(CHAMPIONS / "abilities.json")],
        "types": load_json(CHAMPIONS / "type-chart.json")["types"],
        "natures": [entry["name"] for entry in load_json(CHAMPIONS / "natures.json")],
    }


def fetch_resource(resource: str, slugs: list[str]) -> None:
    total = len(slugs)
    fetched = 0
    for index, slug in enumerate(slugs, start=1):
        cache_path = RAW / resource / f"{slug}.json"
        if not cache_path.exists():
            cached_fetch(f"{BASE_URL}/{resource}/{slug}", cache_path)
            fetched += 1
        if index % 50 == 0 or index == total:
            print(f"  {resource}: {index}/{total} ({fetched} fetched this run)")


def fetch_pokemon(slugs: list[str]) -> None:
    total = len(slugs)
    fetched = 0
    for index, slug in enumerate(slugs, start=1):
        cache_path = RAW / "pokemon" / f"{slug}.json"
        if cache_path.exists():
            raw = load_json(cache_path)
        else:
            raw = cached_fetch(f"{BASE_URL}/pokemon/{slug}", cache_path)
            fetched += 1

        species_name = raw["species"]["name"]
        species_path = RAW / "pokemon-species" / f"{species_name}.json"
        if not species_path.exists():
            cached_fetch(raw["species"]["url"], species_path)
            fetched += 1

        if raw.get("forms") and not raw.get("is_default", True):
            form_url = raw["forms"][0]["url"]
            form_id = form_url.rstrip("/").split("/")[-1]
            form_path = RAW / "pokemon-form" / f"{form_id}.json"
            if not form_path.exists():
                cached_fetch(form_url, form_path)
                fetched += 1

        if index % 50 == 0 or index == total:
            print(f"  pokemon: {index}/{total} ({fetched} fetched this run)")


def main() -> None:
    if not (CHAMPIONS / "pokemon.json").exists():
        raise FileNotFoundError("Run scripts/build_champions.py before fetch_i18n_raw.py")

    slug_sets = load_champions_slugs()
    print("Fetching PokeAPI raw cache for Champions i18n...")
    fetch_resource("type", slug_sets["types"])
    fetch_resource("nature", slug_sets["natures"])
    fetch_resource("move", slug_sets["moves"])
    fetch_resource("ability", slug_sets["abilities"])
    fetch_resource("item", slug_sets["items"])
    fetch_pokemon(slug_sets["pokemon"])
    print("PokeAPI raw cache ready under data/raw/")


if __name__ == "__main__":
    main()
