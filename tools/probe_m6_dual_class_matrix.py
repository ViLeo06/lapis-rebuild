#!/usr/bin/env python3
"""Build an evidence-first M6 dual-class ten-stage source matrix.

This probe is intentionally conservative. It inventories fixed-hash retail resources,
preserves raw authored rows, and assigns semantics only to columns that earlier static
work already proved. It does not invent promotion levels, skill unlock rules, equipment
eligibility, rewards, or combat formulas.
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

EXPECTED_HASHES = {
    "ability.atr": "0bab4c622336378e52fb0d13b6e5d50a78f2c514d687332d47042c416a07c04b",
    "itemtbl.atr": "cf5c9786810b80619ae3133ad77a27d9fb51f2078c30c947c482483d1030eb2e",
    "Magictbl.atr": "d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9",
    "Magicptn.atr": "5affdd750873e7ccb5a364cc372870b98cde95df905140fa88aedd79155cfceb",
}
TABLE_ENCODINGS = {
    "ability.atr": "gb18030",
    "levelabl.atr": "cp949",
    "itemtbl.atr": "gb18030",
    "Magictbl.atr": "gb18030",
    "Magicptn.atr": "cp949",
}

ABILITY_FIELDS = {
    0: "class_id",
    1: "portrait_id",
    2: "hp",
    3: "mp",
    17: "move",
    18: "hit",
    19: "evasion",
    20: "critical_like_blow",
    21: "magic_hit",
    22: "magic_evasion",
    23: "range",
    25: "cry_hit_reaction_selector",
    35: "attribute",
    36: "weapon_damage",
    37: "defence",
    38: "magic_damage",
    39: "magic_defence",
    44: "class_name_raw",
    45: "class_description_raw",
}
MAGIC_COLUMNS = [
    "skill_id", "name", "attack_type", "distance", "area", "mp_cost", "time_raw",
    "team_mask", "unit_mask", "effect_a", "effect_b", "effect_c", "tick",
    "skill_level", "magic_pattern_id", "icon_index", "iteration", "explanation",
]
ITEM_FIELDS = {
    21: "minimum_damage", 22: "maximum_damage", 23: "defence", 24: "attack_range",
    25: "magic_power", 26: "minimum_magic_damage", 27: "maximum_magic_damage",
    28: "magic_defence", 29: "magic_range", 31: "accuracy_rate", 32: "evasion_rate",
    33: "critical_rate_label_conservative", 34: "magic_accuracy_rate", 35: "magic_evasion_rate",
    44: "damage_field_semantics_unexpanded", 45: "damage_type_field_semantics_unexpanded",
}
TRAINING_ITEM_IDS = (1, 3, 10, 12, 25, 31)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_table(path: Path, encoding: str) -> tuple[list[str], list[list[str]]]:
    text = path.read_bytes().decode(encoding, "replace")
    comments: list[str] = []
    rows: list[list[str]] = []
    for raw in text.splitlines():
        line = raw.strip("\ufeff\r\n")
        if not line:
            continue
        if line.startswith(";"):
            comments.append(line[1:].lstrip())
        else:
            rows.append(line.split("\t"))
    return comments, rows


def int_or_raw(value: str) -> int | str:
    try:
        return int(value, 0)
    except ValueError:
        return value


def typed_fields(row: list[str], mapping: dict[int, str]) -> dict[str, Any]:
    return {name: int_or_raw(row[index]) for index, name in mapping.items() if index < len(row)}


def table_meta(path: Path, encoding: str) -> dict[str, Any]:
    comments, rows = read_table(path, encoding)
    widths: dict[str, int] = {}
    for row in rows:
        widths[str(len(row))] = widths.get(str(len(row)), 0) + 1
    candidates = []
    dominant = max((len(r) for r in rows), default=0)
    for c in comments:
        fields = c.split("\t")
        if len(fields) == dominant:
            candidates.append(fields)
    return {
        "file": path.name,
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "encoding": encoding,
        "row_count": len(rows),
        "width_histogram": widths,
        "header_candidates": candidates[:5],
    }


def verify_known_hashes(root: Path) -> None:
    for name, expected in EXPECTED_HASHES.items():
        path = root / name
        if not path.is_file():
            raise FileNotFoundError(path)
        actual = sha256(path)
        if actual != expected:
            raise ValueError(f"{name} hash mismatch: {actual}")


def visual_from_root(client_root: Path) -> dict[int, dict[str, Any]]:
    char = client_root / "Char"
    out: dict[int, dict[str, Any]] = {}
    for cid in TARGET_IDS:
        actions: dict[str, Any] = {}
        for slot in ACTION_SLOTS:
            pair: dict[str, Any] = {}
            for ext in ("ani", "spr"):
                p = char / f"B{cid}_{slot}.{ext}"
                if not p.is_file():
                    raise FileNotFoundError(p)
                pair[ext] = {"path": f"client/Char/{p.name}", "bytes": p.stat().st_size, "sha256": sha256(p)}
            actions[slot] = pair
        out[cid] = actions
    return out


def visual_from_csv(path: Path) -> dict[int, dict[str, Any]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    by_path = {r["path"].replace("\\", "/").lower(): r for r in rows}
    out: dict[int, dict[str, Any]] = {}
    for cid in TARGET_IDS:
        actions: dict[str, Any] = {}
        for slot in ACTION_SLOTS:
            pair: dict[str, Any] = {}
            for ext in ("ani", "spr"):
                key = f"client/char/b{cid}_{slot}.{ext}"
                r = by_path.get(key)
                if r is None:
                    raise FileNotFoundError(key)
                pair[ext] = {"path": r["path"].replace("\\", "/"), "bytes": int(r["size"]), "sha256": r["sha256"]}
            actions[slot] = pair
        out[cid] = actions
    return out


def build(setlib_dir: Path, *, client_root: Path | None = None, client_files_csv: Path | None = None) -> dict[str, Any]:
    for name in TABLE_ENCODINGS:
        if not (setlib_dir / name).is_file():
            raise FileNotFoundError(setlib_dir / name)
    verify_known_hashes(setlib_dir)

    table_info = {name: table_meta(setlib_dir / name, enc) for name, enc in TABLE_ENCODINGS.items()}
    _, ability_rows = read_table(setlib_dir / "ability.atr", "gb18030")
    _, level_rows = read_table(setlib_dir / "levelabl.atr", "cp949")
    _, magic_rows = read_table(setlib_dir / "Magictbl.atr", "gb18030")
    _, pattern_rows = read_table(setlib_dir / "Magicptn.atr", "cp949")
    _, item_rows = read_table(setlib_dir / "itemtbl.atr", "gb18030")

    ability_by_id: dict[int, list[str]] = {}
    for row in ability_rows:
        if len(row) < 46:
            continue
        try:
            cid = int(row[0])
        except ValueError:
            continue
        if cid in TARGET_IDS:
            ability_by_id[cid] = row
    if sorted(ability_by_id) != sorted(TARGET_IDS):
        raise ValueError(f"target ability rows incomplete: {sorted(ability_by_id)}")

    level_by_class: dict[int, list[dict[str, Any]]] = {cid: [] for cid in TARGET_IDS}
    skill_ids: set[int] = set()
    for row in level_rows:
        if len(row) < 15:
            continue
        try:
            cid = int(row[0]); level = int(row[1]); skill_id = int(row[14])
        except ValueError:
            continue
        if cid not in level_by_class:
            continue
        rec = {"level_field": level, "skill_id_column14": skill_id, "raw_fields": [int_or_raw(v) for v in row]}
        level_by_class[cid].append(rec)
        if skill_id > 0:
            skill_ids.add(skill_id)
    for rows in level_by_class.values():
        rows.sort(key=lambda r: (int(r["level_field"]), int(r["skill_id_column14"])))

    magic_by_id: dict[int, dict[str, Any]] = {}
    for row in magic_rows:
        if len(row) < 18:
            continue
        try:
            sid = int(row[0])
        except ValueError:
            continue
        if sid in skill_ids:
            magic_by_id[sid] = {name: int_or_raw(row[i]) for i, name in enumerate(MAGIC_COLUMNS)} | {"raw_fields": [int_or_raw(v) for v in row]}

    pattern_ids = {int(v["magic_pattern_id"]) for v in magic_by_id.values() if isinstance(v.get("magic_pattern_id"), int)}
    patterns: dict[int, dict[str, Any]] = {}
    for row in pattern_rows:
        if not row:
            continue
        try:
            pid = int(row[0])
        except ValueError:
            continue
        if pid in pattern_ids:
            patterns[pid] = {"raw_fields": [int_or_raw(v) for v in row]}

    items: dict[int, dict[str, Any]] = {}
    for row in item_rows:
        if len(row) < 55:
            continue
        try:
            iid = int(row[0])
        except ValueError:
            continue
        if iid in TRAINING_ITEM_IDS:
            items[iid] = {
                "item_id": iid,
                "known_authored_fields": typed_fields(row, ITEM_FIELDS),
                "name": row[53],
                "description": row[54],
                "raw_fields": [int_or_raw(v) for v in row],
            }

    if client_root is not None:
        visuals = visual_from_root(client_root)
        visual_source = {"kind": "fixed-client-root", "path": str(client_root)}
    elif client_files_csv is not None:
        visuals = visual_from_csv(client_files_csv)
        visual_source = {"kind": "verified-file-inventory-csv", "sha256": sha256(client_files_csv)}
    else:
        raise ValueError("client_root or client_files_csv is required")

    stages = []
    for family, ids in (("swordsman", SWORDSMAN_IDS), ("wizard", WIZARD_IDS)):
        for ordinal, cid in enumerate(ids, 1):
            row = ability_by_id[cid]
            stage_skills = level_by_class[cid]
            stage_skill_ids = sorted({int(r["skill_id_column14"]) for r in stage_skills if int(r["skill_id_column14"]) > 0})
            stages.append({
                "family": family,
                "stage_ordinal": ordinal,
                "stage_id": cid,
                "authored_ability": {
                    "evidence": "VERIFIED-STATIC-ORIGINAL",
                    "known_fields": typed_fields(row, ABILITY_FIELDS),
                    "raw_fields": [int_or_raw(v) for v in row],
                },
                "visual_family": {
                    "evidence": "VERIFIED-STATIC-ORIGINAL",
                    "actions": visuals[cid],
                    "semantics": {
                        "00": "RECOVERED_SECONDARY: idle label",
                        "01": "RECOVERED_SECONDARY: move label",
                        "02": "RECOVERED_SECONDARY: attack-or-cast label",
                        "03": "VERIFIED-STATIC-ORIGINAL: hit reaction",
                        "05": "UNVERIFIED: resource exists, universal meaning unknown",
                    },
                },
                "levelabl_rows": {
                    "evidence": "VERIFIED-STATIC-ORIGINAL",
                    "note": "Raw rows are preserved. column 0=class, column 1=level and column 14=skill id follow the existing project converter; this does not prove a server-side unlock/promotion condition.",
                    "rows": stage_skills,
                    "skill_ids": stage_skill_ids,
                },
                "skills": [magic_by_id[sid] for sid in stage_skill_ids if sid in magic_by_id],
                "missing_magic_rows": [sid for sid in stage_skill_ids if sid not in magic_by_id],
            })

    return {
        "schema": 1,
        "scope": "S25 fixed-hash 2.2 dual-class ten-stage static source matrix; no retail server formula/promotion/eligibility claims",
        "evidence_vocabulary": ["VERIFIED", "VERIFIED-STATIC-ORIGINAL", "VERIFIED-HISTORICAL", "RECOVERED_SECONDARY", "INFERRED", "SERVER-BOUNDARY", "RECONSTRUCTION_POLICY", "UNVERIFIED"],
        "table_sources": table_info,
        "visual_source": visual_source,
        "target_stage_ids": {"swordsman": SWORDSMAN_IDS, "wizard": WIZARD_IDS},
        "stages": stages,
        "skills_by_id": {str(k): magic_by_id[k] for k in sorted(magic_by_id)},
        "magic_patterns_by_id": {str(k): patterns[k] for k in sorted(patterns)},
        "representative_items": {str(k): items[k] for k in sorted(items)},
        "boundaries": {
            "promotion_level": "SERVER-BOUNDARY",
            "promotion_conditions": "SERVER-BOUNDARY",
            "retail_exp_curve": "SERVER-BOUNDARY",
            "skill_unlock_condition": "SERVER-BOUNDARY",
            "equipment_class_stage_eligibility": "UNVERIFIED",
            "retail_damage_formula": "SERVER-BOUNDARY",
            "retail_reward_formula": "SERVER-BOUNDARY",
            "quest_npc_class_stage_decision": "SERVER-BOUNDARY",
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("setlib_dir", type=Path)
    ap.add_argument("--client-root", type=Path)
    ap.add_argument("--client-files-csv", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    report = build(args.setlib_dir, client_root=args.client_root, client_files_csv=args.client_files_csv)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"stages": len(report["stages"]), "skills": len(report["skills_by_id"]), "out": str(args.out)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
