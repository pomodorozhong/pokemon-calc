#!/usr/bin/env python3
"""Build i18n locale files for English, Chinese (Simplified & Traditional), and Japanese."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
I18N = ROOT / "data" / "i18n"
CHAMPIONS = ROOT / "data" / "champions" / "reg-mb"
LOCALES = ("en", "zh-Hans", "zh-Hant", "ja")
API_LANG = {"en": "en", "zh-Hans": "zh-hans", "zh-Hant": "zh-hant", "ja": "ja"}
REVERSE_LANG = {value: key for key, value in API_LANG.items()}
MAX_RETRIES = 5
RETRY_DELAY = 2.0


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def fetch_json(url: str) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            request = urllib.request.Request(
                url,
                headers={"User-Agent": "pokemon-calc-i18n/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode())
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            last_error = error
            time.sleep(RETRY_DELAY * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def cached_fetch(url: str, cache_path: Path) -> dict[str, Any]:
    if cache_path.exists():
        return load_json(cache_path)
    payload = fetch_json(url)
    save_json(cache_path, payload)
    time.sleep(0.08)
    return payload


def extract_localized_names(names: list[dict[str, Any]]) -> dict[str, str]:
    result: dict[str, str] = {}
    for entry in names:
        api_lang = entry["language"]["name"]
        locale = REVERSE_LANG.get(api_lang)
        if locale:
            result[locale] = entry["name"]
    return result


def humanize_slug(slug: str) -> str:
    text = slug.replace("-", " ")
    text = re.sub(r"\bx\b", "X", text, flags=re.IGNORECASE)
    text = re.sub(r"\by\b", "Y", text, flags=re.IGNORECASE)
    return text.title()


def merge_names(
    slug: str,
    extracted: dict[str, str],
    overrides: dict[str, dict[str, str]],
    category: str,
) -> dict[str, str]:
    merged = {locale: extracted.get(locale, "") for locale in LOCALES}
    override = overrides.get(category, {}).get(slug, {})
    for locale in LOCALES:
        if override.get(locale):
            merged[locale] = override[locale]
    english = merged.get("en") or humanize_slug(slug)
    for locale in LOCALES:
        if not merged[locale]:
            merged[locale] = english if locale == "en" else english
    return merged


def load_overrides() -> dict[str, dict[str, dict[str, str]]]:
    path = I18N / "overrides" / "common.json"
    if not path.exists():
        return {}
    return load_json(path)


def build_ui_strings() -> dict[str, dict[str, str]]:
    return {
        "en": {
            "app.title": "Pokemon Calc",
            "app.subtitle": "Mid-battle decisions for Pokemon Champions",
            "regulation.current": "Regulation M-B",
            "nav.calculator": "Calculator",
            "nav.typeChart": "Type Chart",
            "nav.settings": "Settings",
            "settings.language": "Language",
            "battle.doubles": "Doubles",
            "battle.singles": "Singles",
            "battle.attacker": "Attacker",
            "battle.defender": "Defender",
            "battle.move": "Move",
            "battle.item": "Item",
            "battle.ability": "Ability",
            "battle.nature": "Nature",
            "battle.level": "Level",
            "battle.weather": "Weather",
            "battle.terrain": "Terrain",
            "battle.field.none": "None",
            "battle.mega": "Mega Evolution",
            "battle.tera": "Tera Type",
            "battle.statPoints": "Stat Points",
            "battle.statPoints.remaining": "{used} / {total} SP used",
            "battle.result.damage": "Damage",
            "battle.result.koChance": "KO Chance",
            "battle.result.min": "Min",
            "battle.result.max": "Max",
            "battle.result.average": "Average",
            "battle.result.survival": "Can survive?",
            "battle.result.yes": "Yes",
            "battle.result.no": "No",
            "effectiveness.super": "Super effective",
            "effectiveness.notVery": "Not very effective",
            "effectiveness.immune": "No effect",
            "effectiveness.neutral": "Neutral",
            "format.bring6pick4": "Bring 6, Pick 4",
            "format.openTeamSheet": "Open Team Sheet",
            "format.spCap": "66 SP cap (32 max/stat)"
        },
        "zh-Hans": {
            "app.title": "宝可梦计算器",
            "app.subtitle": "宝可梦冠军赛 对战中的快速决策",
            "regulation.current": "规则 M-B",
            "nav.calculator": "计算器",
            "nav.typeChart": "属性相克",
            "nav.settings": "设置",
            "settings.language": "语言",
            "battle.doubles": "双打",
            "battle.singles": "单打",
            "battle.attacker": "攻击方",
            "battle.defender": "防御方",
            "battle.move": "招式",
            "battle.item": "道具",
            "battle.ability": "特性",
            "battle.nature": "性格",
            "battle.level": "等级",
            "battle.weather": "天气",
            "battle.terrain": "场地",
            "battle.field.none": "无",
            "battle.mega": "超级进化",
            "battle.tera": "太晶属性",
            "battle.statPoints": "能力点数",
            "battle.statPoints.remaining": "已用 {used} / {total} 点",
            "battle.result.damage": "伤害",
            "battle.result.koChance": "击倒概率",
            "battle.result.min": "最低",
            "battle.result.max": "最高",
            "battle.result.average": "平均",
            "battle.result.survival": "能否承受？",
            "battle.result.yes": "能",
            "battle.result.no": "不能",
            "effectiveness.super": "效果绝佳",
            "effectiveness.notVery": "效果不佳",
            "effectiveness.immune": "没有效果",
            "effectiveness.neutral": "一般",
            "format.bring6pick4": "携带6选4",
            "format.openTeamSheet": "公开队伍表",
            "format.spCap": "66点上限（单项最多32）"
        },
        "zh-Hant": {
            "app.title": "寶可夢計算器",
            "app.subtitle": "寶可夢冠軍賽 對戰中的快速決策",
            "regulation.current": "規則 M-B",
            "nav.calculator": "計算器",
            "nav.typeChart": "屬性相剋",
            "nav.settings": "設定",
            "settings.language": "語言",
            "battle.doubles": "雙打",
            "battle.singles": "單打",
            "battle.attacker": "攻擊方",
            "battle.defender": "防禦方",
            "battle.move": "招式",
            "battle.item": "道具",
            "battle.ability": "特性",
            "battle.nature": "性格",
            "battle.level": "等級",
            "battle.weather": "天氣",
            "battle.terrain": "場地",
            "battle.field.none": "無",
            "battle.mega": "超級進化",
            "battle.tera": "太晶屬性",
            "battle.statPoints": "能力點數",
            "battle.statPoints.remaining": "已用 {used} / {total} 點",
            "battle.result.damage": "傷害",
            "battle.result.koChance": "擊倒機率",
            "battle.result.min": "最低",
            "battle.result.max": "最高",
            "battle.result.average": "平均",
            "battle.result.survival": "能否承受？",
            "battle.result.yes": "能",
            "battle.result.no": "不能",
            "effectiveness.super": "效果絕佳",
            "effectiveness.notVery": "效果不佳",
            "effectiveness.immune": "沒有效果",
            "effectiveness.neutral": "一般",
            "format.bring6pick4": "攜帶6選4",
            "format.openTeamSheet": "公開隊伍表",
            "format.spCap": "66點上限（單項最多32）"
        },
        "ja": {
            "app.title": "ポケモン計算機",
            "app.subtitle": "ポケモンチャンピオンズ バトル中の判断支援",
            "regulation.current": "レギュレーション M-B",
            "nav.calculator": "計算機",
            "nav.typeChart": "タイプ相性",
            "nav.settings": "設定",
            "settings.language": "言語",
            "battle.doubles": "ダブル",
            "battle.singles": "シングル",
            "battle.attacker": "攻撃側",
            "battle.defender": "防御側",
            "battle.move": "わざ",
            "battle.item": "どうぐ",
            "battle.ability": "特性",
            "battle.nature": "性格",
            "battle.level": "レベル",
            "battle.weather": "天気",
            "battle.terrain": "フィールド",
            "battle.field.none": "なし",
            "battle.mega": "メガシンカ",
            "battle.tera": "テラスタイプ",
            "battle.statPoints": "ステータスポイント",
            "battle.statPoints.remaining": "{used} / {total} SP 使用中",
            "battle.result.damage": "ダメージ",
            "battle.result.koChance": "撃破確率",
            "battle.result.min": "最小",
            "battle.result.max": "最大",
            "battle.result.average": "平均",
            "battle.result.survival": "耐えられる？",
            "battle.result.yes": "はい",
            "battle.result.no": "いいえ",
            "effectiveness.super": "効果ばつぐん",
            "effectiveness.notVery": "効果いまひとつ",
            "effectiveness.immune": "効果がない",
            "effectiveness.neutral": "普通",
            "format.bring6pick4": "6匹持ち4匹選出",
            "format.openTeamSheet": "オープンシート",
            "format.spCap": "66SP上限（1項目最大32）"
        },
    }


def build_static_labels() -> dict[str, dict[str, dict[str, str]]]:
    stats = {
        "hp": {"en": "HP", "zh-Hans": "HP", "zh-Hant": "HP", "ja": "HP"},
        "attack": {"en": "Attack", "zh-Hans": "攻击", "zh-Hant": "攻擊", "ja": "こうげき"},
        "defense": {"en": "Defense", "zh-Hans": "防御", "zh-Hant": "防禦", "ja": "ぼうぎょ"},
        "special-attack": {"en": "Sp. Atk", "zh-Hans": "特攻", "zh-Hant": "特攻", "ja": "とくこう"},
        "special-defense": {"en": "Sp. Def", "zh-Hans": "特防", "zh-Hant": "特防", "ja": "とくぼう"},
        "speed": {"en": "Speed", "zh-Hans": "速度", "zh-Hant": "速度", "ja": "すばやさ"},
    }
    damage_classes = {
        "physical": {"en": "Physical", "zh-Hans": "物理", "zh-Hant": "物理", "ja": "物理"},
        "special": {"en": "Special", "zh-Hans": "特殊", "zh-Hant": "特殊", "ja": "特殊"},
        "status": {"en": "Status", "zh-Hans": "变化", "zh-Hant": "變化", "ja": "変化"},
    }
    weather = {
        "sun": {"en": "Sun", "zh-Hans": "大晴天", "zh-Hant": "大晴天", "ja": "にほんばれ"},
        "rain": {"en": "Rain", "zh-Hans": "下雨", "zh-Hant": "下雨", "ja": "あめ"},
        "sand": {"en": "Sandstorm", "zh-Hans": "沙暴", "zh-Hant": "沙暴", "ja": "すなあらし"},
        "snow": {"en": "Snow", "zh-Hans": "下雪", "zh-Hant": "下雪", "ja": "ゆき"},
        "harsh-sunshine": {"en": "Harsh Sunshine", "zh-Hans": "大日照", "zh-Hant": "大日照", "ja": "かがやくにほんばれ"},
        "heavy-rain": {"en": "Heavy Rain", "zh-Hans": "大雨", "zh-Hant": "大雨", "ja": "おおあめ"},
    }
    terrain = {
        "electric": {"en": "Electric Terrain", "zh-Hans": "电气场地", "zh-Hant": "電氣場地", "ja": "エレキフィールド"},
        "grassy": {"en": "Grassy Terrain", "zh-Hans": "青草场地", "zh-Hant": "青草場地", "ja": "グラスフィールド"},
        "misty": {"en": "Misty Terrain", "zh-Hans": "薄雾场地", "zh-Hant": "薄霧場地", "ja": "ミストフィールド"},
        "psychic": {"en": "Psychic Terrain", "zh-Hans": "精神场地", "zh-Hant": "精神場地", "ja": "サイコフィールド"},
    }
    return {
        "stats": stats,
        "damageClasses": damage_classes,
        "weather": weather,
        "terrain": terrain,
    }


def pokemon_display_names(slug: str, raw: dict[str, Any], overrides: dict[str, Any]) -> dict[str, str]:
    names: dict[str, str] = {}

    if raw.get("forms") and not raw.get("is_default", True):
        form_url = raw["forms"][0]["url"]
        form_id = form_url.rstrip("/").split("/")[-1]
        form = cached_fetch(form_url, RAW / "pokemon-form" / f"{form_id}.json")
        names.update(extract_localized_names(form.get("names", [])))

    species_name = raw["species"]["name"]
    species = cached_fetch(
        raw["species"]["url"],
        RAW / "pokemon-species" / f"{species_name}.json",
    )
    species_names = extract_localized_names(species.get("names", []))

    if not names:
        names = species_names
    else:
        for locale in LOCALES:
            if locale not in names and locale in species_names:
                names[locale] = species_names[locale]

    return merge_names(slug, names, overrides, "pokemon")


def load_existing_names(category: str) -> dict[str, dict[str, str]]:
    """Reuse checked-in locale files when PokeAPI raw cache is unavailable."""
    existing: dict[str, dict[str, str]] = {}
    file_name = f"{category}.json"
    for locale in LOCALES:
        path = CHAMPIONS / "i18n" / locale / file_name
        if not path.exists():
            continue
        for slug, name in load_json(path).items():
            existing.setdefault(slug, {})[locale] = name
    return existing


def build_entity_names(
    slugs: list[str],
    raw_dir: Path,
    category: str,
    overrides: dict[str, Any],
    existing_names: dict[str, dict[str, str]] | None = None,
) -> dict[str, dict[str, str]]:
    existing_names = existing_names or {}
    result: dict[str, dict[str, str]] = {}
    total = len(slugs)
    for index, slug in enumerate(slugs, start=1):
        raw_path = raw_dir / f"{slug}.json"
        try:
            if not raw_path.exists():
                extracted = existing_names.get(slug, {})
                result[slug] = merge_names(slug, extracted, overrides, category)
            else:
                raw = load_json(raw_path)
                if category == "pokemon":
                    result[slug] = pokemon_display_names(slug, raw, overrides)
                else:
                    extracted = extract_localized_names(raw.get("names", []))
                    result[slug] = merge_names(slug, extracted, overrides, category)
        except Exception as error:
            print(f"  warning: {category}/{slug}: {error}", file=sys.stderr)
            extracted = existing_names.get(slug, {})
            result[slug] = merge_names(slug, extracted, overrides, category)
        if index % 50 == 0 or index == total:
            print(f"  {category}: {index}/{total}")
    return result


def load_champions_slugs() -> dict[str, list[str]]:
    return {
        "pokemon": [entry["name"] for entry in load_json(CHAMPIONS / "pokemon.json")],
        "moves": [entry["name"] for entry in load_json(CHAMPIONS / "moves.json")],
        "items": [entry["name"] for entry in load_json(CHAMPIONS / "items.json")],
        "abilities": [entry["name"] for entry in load_json(CHAMPIONS / "abilities.json")],
        "types": load_json(CHAMPIONS / "type-chart.json")["types"],
        "natures": [entry["name"] for entry in load_json(CHAMPIONS / "natures.json")],
    }


def flatten_for_locale(entity_map: dict[str, dict[str, str]], locale: str) -> dict[str, str]:
    return {slug: values[locale] for slug, values in entity_map.items()}


def write_locale_files(
    locale: str,
    bundles: dict[str, dict[str, str]],
    output_dir: Path,
) -> None:
    locale_dir = output_dir / locale
    for name, payload in bundles.items():
        save_json(locale_dir / f"{name}.json", payload)


def filter_entity_map(
    entity_map: dict[str, dict[str, str]],
    allowed: set[str],
) -> dict[str, dict[str, str]]:
    return {slug: value for slug, value in entity_map.items() if slug in allowed}


def main() -> None:
    champions_only = "--full" not in sys.argv
    overrides = load_overrides()
    ui = build_ui_strings()
    static = build_static_labels()

    if champions_only:
        if not (CHAMPIONS / "pokemon.json").exists():
            raise FileNotFoundError("Run scripts/build_champions.py before build_i18n.py")
        slug_sets = load_champions_slugs()
        print("Building Champions Reg M-B i18n only...")
        if not RAW.exists() or not any(RAW.iterdir()):
            print(
                "  warning: data/raw/ is empty; reusing checked-in locale files where API cache is missing",
                file=sys.stderr,
            )
    else:
        slug_sets = {
            "pokemon": [entry["name"] for entry in load_json(ROOT / "data" / "pokemon.json")],
            "moves": [entry["name"] for entry in load_json(ROOT / "data" / "moves.json")],
            "abilities": [entry["name"] for entry in load_json(ROOT / "data" / "abilities.json")],
            "items": [entry["name"] for entry in load_json(ROOT / "data" / "items.json")],
            "types": load_json(ROOT / "data" / "type-chart.json")["types"],
            "natures": [entry["name"] for entry in load_json(ROOT / "data" / "natures.json")],
        }
        print("Building full i18n name maps...")

    existing_by_category = {
        category: load_existing_names(category)
        for category in ("pokemon", "moves", "abilities", "items", "types", "natures")
    }

    all_entities = {
        "pokemon": build_entity_names(slug_sets["pokemon"], RAW / "pokemon", "pokemon", overrides, existing_by_category["pokemon"]),
        "moves": build_entity_names(slug_sets["moves"], RAW / "move", "moves", overrides, existing_by_category["moves"]),
        "abilities": build_entity_names(slug_sets["abilities"], RAW / "ability", "abilities", overrides, existing_by_category["abilities"]),
        "items": build_entity_names(slug_sets["items"], RAW / "item", "items", overrides, existing_by_category["items"]),
        "types": build_entity_names(slug_sets["types"], RAW / "type", "types", overrides, existing_by_category["types"]),
        "natures": build_entity_names(slug_sets["natures"], RAW / "nature", "natures", overrides, existing_by_category["natures"]),
    }

    output_roots = [CHAMPIONS / "i18n"] if champions_only else [I18N, CHAMPIONS / "i18n"]

    for locale in LOCALES:
        bundles = {
            "ui": ui[locale],
            "pokemon": flatten_for_locale(all_entities["pokemon"], locale),
            "moves": flatten_for_locale(all_entities["moves"], locale),
            "abilities": flatten_for_locale(all_entities["abilities"], locale),
            "items": flatten_for_locale(all_entities["items"], locale),
            "types": flatten_for_locale(all_entities["types"], locale),
            "natures": flatten_for_locale(all_entities["natures"], locale),
            "stats": {key: labels[locale] for key, labels in static["stats"].items()},
            "damageClasses": {key: labels[locale] for key, labels in static["damageClasses"].items()},
            "weather": {key: labels[locale] for key, labels in static["weather"].items()},
            "terrain": {key: labels[locale] for key, labels in static["terrain"].items()},
        }
        for output_root in output_roots:
            write_locale_files(locale, bundles, output_root)

    catalog = {
        "version": "1.0.0",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "locales": list(LOCALES),
        "config": "data/i18n/config.json",
        "scope": "champions-reg-mb" if champions_only else "full",
        "full": {locale: f"data/i18n/{locale}/" for locale in LOCALES},
        "champions_reg_mb": {locale: f"data/champions/reg-mb/i18n/{locale}/" for locale in LOCALES},
        "counts": {category: len(values) for category, values in all_entities.items()},
        "notes": [
            "Entity keys are English slugs; locale files map slug -> display name.",
            "UI strings use dotted keys (e.g. battle.attacker).",
            "Overrides in data/i18n/overrides/common.json cover Champions-only content missing from PokeAPI.",
        ],
    }
    save_json(I18N / "catalog.json", catalog)
    save_json(CHAMPIONS / "i18n" / "catalog.json", catalog)

    print("i18n build complete.")
    for locale in LOCALES:
        print(f"  {locale}: {CHAMPIONS / 'i18n' / locale}")


if __name__ == "__main__":
    main()
