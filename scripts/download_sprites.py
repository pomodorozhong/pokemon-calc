#!/usr/bin/env python3
"""Download Pokemon and type sprite assets."""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POKEMON_DIR = ROOT / "assets" / "sprites" / "pokemon"
TYPES_DIR = ROOT / "assets" / "sprites" / "types"
POKEMON_BASE = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork"
)
TYPE_BASE = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-viii/sword-shield"
)
MAX_WORKERS = 12
MAX_RETRIES = 5

TYPE_IDS = {
    "normal": 1,
    "fighting": 2,
    "flying": 3,
    "poison": 4,
    "ground": 5,
    "rock": 6,
    "bug": 7,
    "ghost": 8,
    "steel": 9,
    "fire": 10,
    "water": 11,
    "grass": 12,
    "electric": 13,
    "psychic": 14,
    "ice": 15,
    "dragon": 16,
    "dark": 17,
    "fairy": 18,
}


def download_file(url: str, destination: Path) -> bool:
    if destination.exists() and destination.stat().st_size > 0:
        return True

    destination.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "pokemon-calc-sprite-fetch/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                destination.write_bytes(response.read())
            return True
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
            time.sleep(1.0 * (attempt + 1))
    return False


def download_pokemon_sprites(pokemon_path: Path | None = None) -> tuple[int, int]:
    if pokemon_path is None:
        champions_path = ROOT / "data" / "champions" / "reg-mb" / "pokemon.json"
        pokemon_path = champions_path if champions_path.exists() else ROOT / "data" / "pokemon.json"
    if not pokemon_path.exists():
        raise FileNotFoundError("No pokemon.json found. Run fetch_data.py and build_champions.py first.")

    with pokemon_path.open(encoding="utf-8") as handle:
        pokemon = json.load(handle)

    success = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(
                download_file,
                f"{POKEMON_BASE}/{entry['id']}.png",
                POKEMON_DIR / f"{entry['id']}.png",
            ): entry["id"]
            for entry in pokemon
        }
        for index, future in enumerate(as_completed(futures), start=1):
            pokemon_id = futures[future]
            if future.result():
                success += 1
            else:
                failed += 1
                print(f"  failed pokemon sprite {pokemon_id}", file=sys.stderr)
            if index % 200 == 0:
                print(f"  pokemon sprites: {index}/{len(pokemon)}")

    return success, failed


def download_type_sprites() -> tuple[int, int]:
    success = 0
    failed = 0
    for type_name, type_id in TYPE_IDS.items():
        destination = TYPES_DIR / f"{type_name}.png"
        url = f"{TYPE_BASE}/{type_id}.png"
        if download_file(url, destination):
            success += 1
        else:
            failed += 1
            print(f"  failed type sprite {type_name}", file=sys.stderr)
    return success, failed


def write_sprite_index() -> None:
    index = {
        "pokemon": {
            "directory": "assets/sprites/pokemon",
            "pattern": "{id}.png",
            "source": POKEMON_BASE,
        },
        "types": {
            "directory": "assets/sprites/types",
            "pattern": "{name}.png",
            "source": TYPE_BASE,
            "mapping": TYPE_IDS,
        },
    }
    path = ROOT / "assets" / "sprites" / "index.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(index, handle, indent=2)


def main() -> None:
    print("Downloading type sprites...")
    type_success, type_failed = download_type_sprites()
    print(f"Type sprites: {type_success} ok, {type_failed} failed")

    print("Downloading pokemon sprites...")
    pokemon_success, pokemon_failed = download_pokemon_sprites()
    print(f"Pokemon sprites: {pokemon_success} ok, {pokemon_failed} failed")

    write_sprite_index()
    print("Done.")


if __name__ == "__main__":
    main()
