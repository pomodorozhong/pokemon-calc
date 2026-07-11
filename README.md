# pokemon-calc

A Pokemon calculator designed for mid-battle decisions.

## Web app (GitHub Pages)

The UI lives in [`web/`](web/) and is built for static hosting on GitHub Pages.

**Stack:** Vite + React + TypeScript + Tailwind CSS + Zustand

| Why this stack | Detail |
|----------------|--------|
| GitHub Pages fit | Pure static `dist/` output, no server required |
| Fast iteration | Vite HMR and small bundle (~205 KB JS) |
| Interactive UI | React components for team slots, picker modal, chips |
| Simple deploy | GitHub Actions builds with `base: /pokemon-calc/` |

### Run locally

```bash
cd web
npm install
npm run dev
```

### Build for GitHub Pages

```bash
cd web
npm run build:pages
```

Push to `main` and the [Deploy to GitHub Pages](.github/workflows/deploy-pages.yml) workflow publishes `web/dist`.

## Data (Regulation M-B · Pokemon Champions)

Battle data and sprites for the current **Pokemon Champions Regulation Set M-B** format are included — no app code yet.

| Resource | Location |
|----------|----------|
| Legal Pokemon, moves, items | `data/champions/reg-mb/` |
| Format rules & Stat Points | `data/champions/reg-mb/mechanics.json` |
| Sprites | `assets/sprites/` |
| Full documentation | [`docs/DATA.md`](docs/DATA.md) |

Regenerate with:

```bash
python3 scripts/fetch_data.py
python3 scripts/build_champions.py
python3 scripts/build_i18n.py
python3 scripts/download_sprites.py
```

## Internationalization

Locale files for **English**, **简体中文**, **繁體中文**, and **日本語** live under `data/champions/reg-mb/i18n/`:

| Locale | Code | Path |
|--------|------|------|
| English | `en` | `data/champions/reg-mb/i18n/en/` |
| Chinese (Simplified) | `zh-Hans` | `data/champions/reg-mb/i18n/zh-Hans/` |
| Chinese (Traditional) | `zh-Hant` | `data/champions/reg-mb/i18n/zh-Hant/` |
| Japanese | `ja` | `data/champions/reg-mb/i18n/ja/` |

Each locale folder contains `ui.json`, `pokemon.json`, `moves.json`, `items.json`, `abilities.json`, `types.json`, `natures.json`, and field labels (`stats`, `weather`, `terrain`). Entity keys stay as English slugs; locale files map slug → display name. See [`docs/DATA.md`](docs/DATA.md) for details.
