#!/usr/bin/env python3
"""Finish incomplete fetch_data.py outputs without re-downloading cached raw data."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_data import (  # noqa: E402
    OUT_DIR,
    build_natures,
    save_json,
    write_manifest,
    write_mechanics,
)


def main() -> None:
    print("Building natures...")
    natures = build_natures()
    save_json(OUT_DIR / "natures.json", natures)

    print("Writing mechanics and manifest...")
    write_mechanics()
    write_manifest(
        {
            "pokemon": len(__import__("json").loads((OUT_DIR / "pokemon.json").read_text())),
            "moves": len(__import__("json").loads((OUT_DIR / "moves.json").read_text())),
            "abilities": len(__import__("json").loads((OUT_DIR / "abilities.json").read_text())),
            "items": len(__import__("json").loads((OUT_DIR / "items.json").read_text())),
            "held_items": len(__import__("json").loads((OUT_DIR / "held-items.json").read_text())),
            "types": len(__import__("json").loads((OUT_DIR / "type-chart.json").read_text())["types"]),
            "natures": len(natures),
        }
    )
    print("Done.")


if __name__ == "__main__":
    main()
