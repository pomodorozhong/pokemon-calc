#!/usr/bin/env python3
"""Build Champions Regulation M-B filtered datasets from full PokeAPI exports."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "champions" / "reg-mb"
REGULATION = DATA / "regulations" / "reg-mb-legality.json"


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def index_by_name(entries: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {entry["name"]: entry for entry in entries}


def build_champions_mechanics(regulation: dict[str, Any]) -> dict[str, Any]:
    return {
        "game": "Pokemon Champions",
        "regulation": regulation["id"],
        "regulation_name": regulation["name"],
        "description": "Battle mechanics for mid-battle damage and survival calculations in Pokemon Champions.",
        "format": regulation["format"],
        "stat_formula": {
            "level": 50,
            "iv": 31,
            "note": "All Pokemon auto-level to 50 with 31 IVs in Champions.",
            "hp": "floor(((2 * base + iv + sp) * level / 100) + level + 10)",
            "other": "floor(((2 * base + iv + sp) * level / 100 + 5) * nature * stage)",
            "stat_points_per_point": 1,
            "ev_conversion": {
                "first_sp_cost_in_ev": 4,
                "additional_sp_cost_in_ev": 8,
                "max_sp_per_stat": 32,
                "total_sp_cap": 66
            }
        },
        "stat_stages": {
            "-6": 0.25, "-5": 0.2857, "-4": 0.3333, "-3": 0.4, "-2": 0.5, "-1": 0.6667,
            "0": 1.0, "1": 1.5, "2": 2.0, "3": 2.5, "4": 3.0, "5": 3.5, "6": 4.0
        },
        "nature_multipliers": {"boosted": 1.1, "lowered": 0.9, "neutral": 1.0},
        "doubles_modifiers": {
            "spread_move_damage": 0.75,
            "description": "Spread moves hit both opponents at 0.75x in doubles."
        },
        "weather": {
            "sun": {"fire": 1.5, "water": 0.5},
            "rain": {"fire": 0.5, "water": 1.5},
            "sand": {},
            "snow": {},
            "harsh-sunshine": {"fire": 1.5, "water": 0.0},
            "heavy-rain": {"fire": 0.25, "water": 1.5}
        },
        "terrain": {
            "electric": {"grounded_electric_boost": 1.3},
            "grassy": {"grounded_grass_boost": 1.3, "grounded_heal_fraction": 0.0625},
            "misty": {"grounded_dragon_reduction": 0.5},
            "psychic": {"grounded_psychic_boost": 1.3}
        },
        "screens": {"reflect": 0.5, "light-screen": 0.5, "aurora-veil": 0.5},
        "burn": {"physical_attack_multiplier": 0.5},
        "critical_hit": {"default_multiplier": 1.5, "default_chance": 0.0417},
        "mega_evolution": {
            "limit_per_battle": regulation["format"]["mega_evolution_limit_per_battle"],
            "new_in_reg_mb": regulation["mega_evolutions_new_in_mb"]
        }
    }


def main() -> None:
    regulation = load_json(REGULATION)
    legal_pokemon = set(regulation["legal_pokemon"])
    legal_items = set(regulation["legal_items"])
    legal_moves = set(regulation["legal_moves"])

    all_pokemon = load_json(DATA / "pokemon.json")
    all_moves = load_json(DATA / "moves.json")
    all_items = load_json(DATA / "items.json")
    all_abilities = load_json(DATA / "abilities.json")
    type_chart = load_json(DATA / "type-chart.json")
    natures = load_json(DATA / "natures.json")

    pokemon_by_name = index_by_name(all_pokemon)
    moves_by_name = index_by_name(all_moves)
    items_by_name = index_by_name(all_items)
    abilities_by_name = index_by_name(all_abilities)

    missing_pokemon = sorted(name for name in legal_pokemon if name not in pokemon_by_name)
    missing_items = sorted(name for name in legal_items if name not in items_by_name)
    missing_moves = sorted(name for name in legal_moves if name not in moves_by_name)

    pokemon = [pokemon_by_name[name] for name in regulation["legal_pokemon"] if name in pokemon_by_name]
    items = [items_by_name[name] for name in regulation["legal_items"] if name in items_by_name]
    moves = [moves_by_name[name] for name in regulation["legal_moves"] if name in moves_by_name]

    ability_names = {
        ability["name"]
        for mon in pokemon
        for ability in mon["abilities"]
    }
    abilities = [abilities_by_name[name] for name in sorted(ability_names) if name in abilities_by_name]

    for mon in pokemon:
        mon["regulation"] = {
            "legal": True,
            "is_mega": mon["name"].endswith("-mega") or "-mega-" in mon["name"],
            "mega_new_in_mb": mon["name"] in regulation["mega_evolutions_new_in_mb"]
        }

    save_json(OUT / "pokemon.json", pokemon)
    save_json(OUT / "moves.json", moves)
    save_json(OUT / "items.json", items)
    save_json(OUT / "abilities.json", abilities)
    save_json(OUT / "type-chart.json", type_chart)
    save_json(OUT / "natures.json", natures)
    save_json(OUT / "mechanics.json", build_champions_mechanics(regulation))
    save_json(OUT / "regulation.json", regulation)

    manifest = {
        "version": "1.0.0",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "regulation": "reg-mb",
        "game": "Pokemon Champions",
        "counts": {
            "pokemon": len(pokemon),
            "moves": len(moves),
            "items": len(items),
            "abilities": len(abilities),
            "types": len(type_chart["types"]),
            "natures": len(natures)
        },
        "missing_frompokeapi": {
            "pokemon": missing_pokemon,
            "items": missing_items,
            "moves": missing_moves
        },
        "files": {
            "pokemon": "data/champions/reg-mb/pokemon.json",
            "moves": "data/champions/reg-mb/moves.json",
            "items": "data/champions/reg-mb/items.json",
            "abilities": "data/champions/reg-mb/abilities.json",
            "type_chart": "data/champions/reg-mb/type-chart.json",
            "natures": "data/champions/reg-mb/natures.json",
            "mechanics": "data/champions/reg-mb/mechanics.json",
            "regulation": "data/champions/reg-mb/regulation.json",
            "i18n": "data/champions/reg-mb/i18n/",
            "sprites_pokemon": "assets/sprites/pokemon/",
            "sprites_types": "assets/sprites/types/"
        },
        "i18n": {
            "locales": ["en", "zh-Hans", "zh-Hant", "ja"],
            "config": "data/i18n/config.json",
            "catalog": "data/champions/reg-mb/i18n/catalog.json"
        },
        "notes": [
            "Filtered for Pokemon Champions Regulation Set M-B (current as of July 2026).",
            "Legal lists sourced from MetaVGC snapshot cross-checked with Serebii and Pokemon HOME.",
            "Stat Points (66 cap, 32 max/stat) replace traditional EV spreads.",
            "Full unfiltered PokeAPI exports remain in data/ for reference.",
            "Run scripts/build_i18n.py after building to generate locale files."
        ]
    }
    save_json(OUT / "manifest.json", manifest)
    save_json(DATA / "manifest.json", manifest)

    print(f"Champions Reg M-B datasets written to {OUT}")
    print(f"  pokemon: {len(pokemon)} (missing {len(missing_pokemon)})")
    print(f"  moves:   {len(moves)} (missing {len(missing_moves)})")
    print(f"  items:   {len(items)} (missing {len(missing_items)})")
    print(f"  abilities: {len(abilities)}")
    if missing_pokemon:
        print(f"  missing pokemon: {missing_pokemon}")
    if missing_items:
        print(f"  missing items: {missing_items}")
    if missing_moves:
        print(f"  missing moves: {missing_moves}")


if __name__ == "__main__":
    main()
