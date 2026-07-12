# Data & Assets Guide

This repository ships battle data and sprites for a **Pokemon Champions** mid-battle calculator, scoped to **Regulation Set M-B** (June 17 – September 2, 2026).

No application code is included yet — only datasets, assets, and scripts to regenerate them.

## Primary dataset (use this for the app)

```
data/champions/reg-mb/
├── pokemon.json      # 231 legal species/forms (includes Megas)
├── moves.json        # 502 legal moves
├── items.json        # 148 legal held items (incl. Mega Stones)
├── abilities.json    # Abilities used by legal Pokemon
├── type-chart.json   # Type effectiveness matrix
├── natures.json      # Nature stat modifiers
├── mechanics.json    # Champions format rules (Stat Points, doubles, timers)
├── regulation.json   # Full Reg M-B legality + format metadata
├── meta-usage.json   # Tournament + ladder usage (doubles/singles datasets)
└── manifest.json     # Counts, file paths, generation notes
```

## Assets

```
assets/sprites/
├── pokemon/{id}.png  # Official artwork keyed by PokeAPI id
├── types/{name}.png  # Gen 8 type icons
└── index.json        # Sprite path conventions
```

Sprites are downloaded for all Reg M-B legal Pokemon only (~231 files).

## Champions format highlights

| Rule | Value |
|------|-------|
| Battle type | Doubles (Bring 6, Pick 4) |
| Level | 50 (auto-leveled) |
| IVs | 31 (fixed) |
| Stat budget | **66 Stat Points** total, max **32 per stat** |
| Mega Evolution | 1 per battle |
| Team preview | 90s · Turn 45s · Player clock 7min · Game cap 20min |

**Banned categories:** box legendaries, restricted legendaries, Paradox Pokemon, Treasures of Ruin.

Stat Points replace EVs. Each SP adds 1 to the final Lv50 stat; 32 SP ≈ the old 252 EV ceiling for a single stat.

## Data sources

| Source | Used for | License |
|--------|----------|---------|
| [PokeAPI](https://pokeapi.co/) | Base stats, moves, items, abilities, types | MIT |
| [PokeAPI Sprites](https://github.com/PokeAPI/sprites) | Pokemon & type artwork | See repo (mixed CC0/CC-BY) |
| [MetaVGC Reg M-B snapshot](https://metavgc.com/guides/pokemon-champions-regulation-m-b-legal-pokemon-items-moves) | Legal Pokemon/items/moves list | Reference only |
| [Limitless TCG](https://play.limitlesstcg.com) | Reg M-B doubles tournament team usage | Reference only |
| [Pikalytics](https://www.pikalytics.com/pokedex/battledataregmbs3) | Reg M-B doubles ranked ladder usage | Reference only |
| [Serebii Reg M-B](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-b.shtml) | Regulation dates & new additions | Reference only |
| [Pokemon HOME Reg M-B](https://news.pokemon-home.com/en/page/776.html) | Official regulation announcement | Reference only |

Legality lists live in `data/regulations/reg-mb-legality.json`. PokeAPI slug aliases (e.g. `mawilite` vs `mawileite`, `kings-shield` vs `king's-shield`) are normalized there.

## Regenerating data

```bash
# 1. Fetch full PokeAPI exports (cached under data/raw/, gitignored)
python3 scripts/fetch_data.py

# 2. Filter to Champions Reg M-B
python3 scripts/build_champions.py

# 3. Download sprites for legal Pokemon
python3 scripts/download_sprites.py

# 4. Fetch PokeAPI name cache, then build locale files (en, zh-Hans, zh-Hant, ja)
python3 scripts/fetch_i18n_raw.py
python3 scripts/build_i18n.py

# 5. Refresh Reg M-B tournament usage rankings
python3 scripts/fetch_meta_usage.py
```

If `fetch_data.py` fails partway, run `python3 scripts/finish_fetch.py` to complete natures/manifest from cache.

## Internationalization (i18n)

Supported locales: **English** (`en`), **Chinese Simplified** (`zh-Hans`), **Chinese Traditional** (`zh-Hant`), **Japanese** (`ja`).

```
data/i18n/
├── config.json              # Locale metadata and fallback rules
├── catalog.json             # Generation summary
└── overrides/common.json    # Manual names for Champions-only content

data/champions/reg-mb/i18n/
├── catalog.json
├── en/
│   ├── ui.json              # App UI strings (dotted keys)
│   ├── pokemon.json         # slug -> "Pikachu"
│   ├── moves.json
│   ├── items.json
│   ├── abilities.json
│   ├── types.json
│   ├── natures.json
│   ├── stats.json
│   ├── damageClasses.json
│   ├── weather.json
│   └── terrain.json
├── zh-Hans/
├── zh-Hant/
└── ja/
```

### Design conventions

- **Canonical keys** remain English slugs everywhere (`pikachu`, `close-combat`, `leftovers`). Logic and data files never branch on locale.
- **Locale files** provide display names only. Look up `i18n/{locale}/pokemon.json[name]` at render time.
- **UI strings** use dotted keys (`battle.attacker`, `effectiveness.super`) with `{placeholder}` interpolation where needed.
- **Fallback**: missing translation → English → humanized slug.
- **Overrides**: Champions-exclusive Megas, items, and abilities missing from PokeAPI are in `data/i18n/overrides/common.json`.

### App integration sketch

```javascript
const locale = "zh-Hans";
const t = (key) => ui[key];
const pokemonName = (slug) => i18n.pokemon[slug] ?? i18n.pokemon.en?.[slug] ?? slug;
```

Run `python3 scripts/fetch_i18n_raw.py` to cache PokeAPI responses under `data/raw/` (gitignored), then `python3 scripts/build_i18n.py` after updating Champions data. Pass `--full` to also build the complete (unfiltered) locale set under `data/i18n/{locale}/`.

## Full (unfiltered) exports

`data/pokemon.json`, `data/moves.json`, etc. contain the complete PokeAPI snapshot (~1.3k Pokemon, ~900 moves) kept for reference and future regulations. These are **not** filtered to Champions legality.

Raw API responses in `data/raw/` are gitignored but preserved locally for reproducibility.

## Notes for app implementation

- Use `data/champions/reg-mb/mechanics.json` for Stat Point caps and doubles modifiers.
- Pokemon entries include `regulation.is_mega` and `regulation.mega_new_in_mb` flags.
- Form-specific species (e.g. `aegislash-shield`, `palafin-hero`, `mimikyu-disguised`) are separate entries with distinct stats.
- Held-item battle effects still need interpretation logic — PokeAPI provides text descriptions only.
- Damage formula validation against Showdown/ChampDex is recommended before competitive use.
