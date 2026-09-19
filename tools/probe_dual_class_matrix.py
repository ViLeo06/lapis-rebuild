#!/usr/bin/env python3
"""Build an evidence-bounded S25 dual-class ten-stage matrix from Set.lib tables.

This parser deliberately preserves authored values without inventing retail
progression, class eligibility, equipment formulas, or server-side combat rules.
Raw copyrighted tables stay outside Git; the generated matrix is a narrow typed
summary suitable for the reconstruction runtime and documentation.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

SWORDSMAN_IDS = list(range(100, 191, 10))
WIZARD_IDS = list(range(109, 200, 10))
TARGET_IDS = SWORDSMAN_IDS + WIZARD_IDS
ACTION_SLOTS = ("00", "01", "02", "03", "05")
ABILITY_SHA256 = "0bab4c622336378e52fb0d13b6e5d50a78f2c514d687332d47042c416a07c04b"
ITEM_SHA256 = "cf5c9786810b80619ae3133ad77a27d9fb51f2078c30c947c482483d1030eb2e"
MAGIC_SHA256 = "d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9"
MAGIC_PTN_SHA256 = "5affdd750873e7ccb5a364cc372870b98cde95df905140fa88aedd79155cfceb"

EVIDENCE = (
    "VERIFIED", "VERIFIED-STATIC-ORIGINAL", "VERIFIED-HISTORICAL",
    "RECOVERED_SECONDARY", "INFERRED", "SERVER-BOUNDARY",
    "RECONSTRUCTION_POLICY", "UNVERIFIED",
)

ABILITY_FIELDS = {
    "portrait_id": 1, "hp": 2, "mp": 3,
    "con": 4, "mcon": 5, "wis": 6, "mwis": 7,
    "str": 8, "mstr": 9, "dex": 10, "mdex": 11,
    "int": 12, "mint": 13, "reg": 14, "mreg": 15,
    "speed": 16, "move": 17, "hit": 18, "evasion": 19,
    "critical_like": 20, "magic_hit": 21, "magic_evasion": 22,
    "range": 23, "unit_class": 24, "cry": 25,
    "move_tick_cost": 26, "attack_tick_cost": 27,
    "rest_tick_cost": 28, "magic_tick_rate": 29,
    "command_range": 30, "command_attack": 31, "command_defence": 32,
    "authored_gold": 33, "authored_exp": 34, "attribute": 35,
    "weapon_damage": 36, "defence": 37, "magic_damage": 38,
    "magic_defence": 39, "sub_magic": 40, "price": 41,
    "face": 42, "shadow": 43,
    "class_name_raw": 44, "class_description_raw": 45,
}

MAGIC_FIELDS = (
    "magic_id", "name", "attack_type", "distance", "area", "mp_cost",
    "time_raw", "team_mask", "unit_mask", "effect_a", "effect_b",
    "effect_c", "tick", "skill_level", "magic_pattern_id", "icon_index",
    "iteration", "explanation",
)


def _rows(path: Path, encoding: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for raw in path.read_bytes().decode(encoding, "replace").splitlines():
        line = raw.strip("\ufeff\r\n")
        if not line or line.startswith(";"):
            continue
        rows.append(line.split("\t"))
    return rows


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _int(value: str) -> int:
    return int(value, 0)


def _parse_ability(root: Path) -> dict[int, dict[str, Any]]:
    path = root / "ability.atr"
    if _sha256(path) != ABILITY_SHA256:
        raise ValueError("ability.atr hash mismatch")
    out: dict[int, dict[str, Any]] = {}
    for row in _rows(path, "gb18030"):
        if len(row) < 46:
            continue
        try:
            cid = _int(row[0])
        except ValueError:
            continue
        if cid not in TARGET_IDS:
            continue
        typed: dict[str, Any] = {"class_id": cid}
        for name, index in ABILITY_FIELDS.items():
            typed[name] = row[index] if name.endswith("_raw") else _int(row[index])
        out[cid] = typed
    missing = [cid for cid in TARGET_IDS if cid not in out]
    if missing:
        raise ValueError(f"missing target ability rows: {missing}")
    return out


def _parse_levelabl(root: Path) -> tuple[dict[int, list[dict[str, Any]]], dict[int, int]]:
    by_class: dict[int, list[dict[str, Any]]] = {cid: [] for cid in TARGET_IDS}
    entry: dict[int, int] = {}
    for row in _rows(root / "levelabl.atr", "cp949"):
        if len(row) < 17:
            continue
        try:
            cid, level = _int(row[0]), _int(row[1])
        except ValueError:
            continue
        if cid not in by_class:
            continue
        skill_id = _int(row[14])
        record = {"level": level, "skill_id": skill_id, "raw": row}
        by_class[cid].append(record)
        if level == 1:
            entry[cid] = skill_id
    for cid in TARGET_IDS:
        by_class[cid].sort(key=lambda r: int(r["level"]))
        entry.setdefault(cid, 0)
    return by_class, entry


def _parse_magic(root: Path) -> dict[int, dict[str, Any]]:
    path = root / "Magictbl.atr"
    if _sha256(path) != MAGIC_SHA256:
        raise ValueError("Magictbl.atr hash mismatch")
    result: dict[int, dict[str, Any]] = {}
    for row in _rows(path, "gb18030"):
        if len(row) < 18:
            continue
        try:
            mid = _int(row[0])
        except ValueError:
            continue
        values: list[Any] = [mid, row[1]] + [_int(x) for x in row[2:17]] + [row[17]]
        result[mid] = dict(zip(MAGIC_FIELDS, values, strict=True))
    return result


def _inventory_resources(inventory_csv: Path | None = None, client_root: Path | None = None) -> dict[int, list[dict[str, Any]]]:
    out: dict[int, list[dict[str, Any]]] = {cid: [] for cid in TARGET_IDS}
    if client_root is not None:
        for cid in TARGET_IDS:
            for slot in ACTION_SLOTS:
                for ext in ("ani", "spr"):
                    path = client_root / "Char" / f"B{cid}_{slot}.{ext}"
                    if not path.is_file():
                        raise FileNotFoundError(f"missing target visual resource: {path}")
                    out[cid].append({
                        "slot": slot, "extension": ext,
                        "path": f"client/Char/B{cid}_{slot}.{ext}",
                        "size": path.stat().st_size, "sha256": _sha256(path),
                        "evidence": "VERIFIED-STATIC-ORIGINAL",
                    })
    elif inventory_csv is not None:
        with inventory_csv.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) < 4:
                    continue
                rel, kind, size, digest = row[:4]
                for cid in TARGET_IDS:
                    for slot in ACTION_SLOTS:
                        for ext in ("ani", "spr"):
                            suffix = f"Char/B{cid}_{slot}.{ext}"
                            if rel.replace("\\", "/").lower().endswith(suffix.lower()):
                                out[cid].append({
                                    "slot": slot, "extension": ext,
                                    "path": rel.replace("\\", "/"),
                                    "size": _int(size), "sha256": digest,
                                    "evidence": "VERIFIED-STATIC-ORIGINAL",
                                })
    for cid in TARGET_IDS:
        out[cid].sort(key=lambda x: (x["slot"], x["extension"]))
    return out


def build_matrix(setlib: Path, inventory_csv: Path | None = None, client_root: Path | None = None) -> dict[str, Any]:
    ability = _parse_ability(setlib)
    level_rows, stage_entry = _parse_levelabl(setlib)
    magic = _parse_magic(setlib)
    resources = _inventory_resources(inventory_csv, client_root)
    families = []
    for family, ids in (("swordsman", SWORDSMAN_IDS), ("wizard", WIZARD_IDS)):
        stages = []
        for ordinal, cid in enumerate(ids, 1):
            row = ability[cid]
            entry_id = stage_entry[cid]
            stages.append({
                "stage_id": cid,
                "ordinal": ordinal,
                "family": family,
                "display_name": row["class_name_raw"],
                "description": row["class_description_raw"],
                "visual": {
                    "body_family": f"B{cid}",
                    "required_action_slots": list(ACTION_SLOTS),
                    "resources": resources[cid],
                    "slot_semantics": {
                        "00": "RECOVERED_SECONDARY",
                        "01": "RECOVERED_SECONDARY",
                        "02": "RECOVERED_SECONDARY",
                        "03": "VERIFIED-STATIC-ORIGINAL",
                        "05": "UNVERIFIED",
                    },
                },
                "authored": {
                    key: row[key] for key in (
                        "portrait_id", "hp", "mp", "con", "mcon", "wis", "mwis",
                        "str", "mstr", "dex", "mdex", "int", "mint", "reg", "mreg",
                        "speed", "move", "hit", "evasion", "critical_like", "magic_hit",
                        "magic_evasion", "range", "unit_class", "cry", "move_tick_cost",
                        "attack_tick_cost", "rest_tick_cost", "magic_tick_rate",
                        "command_range", "command_attack", "command_defence",
                        "authored_gold", "authored_exp", "attribute", "weapon_damage",
                        "defence", "magic_damage", "magic_defence", "sub_magic", "price",
                        "face", "shadow",
                    )
                },
                "stage_entry_skill": {
                    "id": entry_id,
                    "evidence": "VERIFIED-STATIC-ORIGINAL",
                    "magic_table_row": magic.get(entry_id) if entry_id else None,
                    "row_evidence": "VERIFIED-STATIC-ORIGINAL" if entry_id in magic else ("UNVERIFIED" if entry_id else "VERIFIED-STATIC-ORIGINAL"),
                },
                "levelabl_rows": level_rows[cid],
                "equipment": {
                    "client_proven_class_stage_eligibility": None,
                    "evidence": "SERVER-BOUNDARY",
                    "note": "No class/stage equipment eligibility is asserted from numeric proximity or the current offline training policy.",
                },
                "promotion": {
                    "retail_level_requirement": None,
                    "retail_quest_requirement": None,
                    "retail_reward": None,
                    "evidence": "SERVER-BOUNDARY",
                },
            })
        families.append({"family": family, "stage_ids": ids, "stages": stages})
    return {
        "schema": 1,
        "title": "M6 Dual-class Ten-stage Canonical Matrix",
        "evidence_vocabulary": list(EVIDENCE),
        "source_hashes": {
            "ability.atr": ABILITY_SHA256,
            "levelabl.atr": _sha256(setlib / "levelabl.atr"),
            "itemtbl.atr": ITEM_SHA256,
            "Magictbl.atr": MAGIC_SHA256,
            "Magicptn.atr": MAGIC_PTN_SHA256,
        },
        "item_requirement_schema": {
            "equip_slot_column": 3,
            "equip_level_column": 5,
            "class_flag_columns": list(range(7, 17)),
            "stat_requirement_columns": {"con":47,"str":48,"dex":49,"int":50,"wis":51,"reg":52},
            "field_presence_evidence": "VERIFIED-STATIC-ORIGINAL",
            "swordsman_wizard_flag_mapping": "RECOVERED_SECONDARY",
            "note": "itemtbl.atr stat/equip-level requirements are authored. Mapping the abbreviated class flags to the localized swordsman/wizard families is not promoted to stronger retail truth by this probe.",
        },
        "authority_boundaries": {
            "retail_combat_formula": "SERVER-BOUNDARY",
            "exp_curve": "SERVER-BOUNDARY",
            "promotion_level": "SERVER-BOUNDARY",
            "promotion_quest": "SERVER-BOUNDARY",
            "quest_reward": "SERVER-BOUNDARY",
            "equipment_eligibility": "SERVER-BOUNDARY",
            "offline_fill": "RECONSTRUCTION_POLICY",
        },
        "families": families,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("setlib_dir", type=Path)
    ap.add_argument("--inventory-csv", type=Path)
    ap.add_argument("--client-root", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    payload = build_matrix(args.setlib_dir, args.inventory_csv, args.client_root)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"stages": sum(len(f["stages"]) for f in payload["families"]), "output": str(args.out)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
