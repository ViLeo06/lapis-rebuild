#!/usr/bin/env python3
"""Inventory fixed-client battle/monster visual candidates without inventing ID bindings.

This probe is intentionally conservative. `Char/B<id>_<state>.ani/.spr` is a
verified visual resource family, while story `CHARPOS` model tokens are a
separate authored script namespace. Equal numbers are recorded as correlation
only and are never promoted to a runtime binding by this tool.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))
from ani import parse_ani, validate_frame_indices  # type: ignore
from spr import parse_spr  # type: ignore
from tip import parse_tip, summarize as summarize_tip  # type: ignore

VISUAL_RE = re.compile(r"^B(?P<id>\d+)_(?P<slot>\d{2})\.ani$", re.I)

SLOT_SEMANTICS = {
    "00": {"label": "idle", "provenance": "RECOVERED_SECONDARY"},
    "01": {"label": "move", "provenance": "RECOVERED_SECONDARY"},
    "02": {"label": "attack", "provenance": "RECOVERED_SECONDARY"},
    "03": {"label": "hit", "provenance": "VERIFIED_STATIC_ORIGINAL"},
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ci_files(root: Path) -> dict[str, Path]:
    return {p.name.lower(): p for p in root.iterdir() if p.is_file()}


def union_bounds(frames) -> dict[str, int]:
    return {
        "left": min(f.left for f in frames),
        "top": min(f.top for f in frames),
        "right": max(f.right for f in frames),
        "bottom": max(f.bottom for f in frames),
    }


def inspect_spr_header(path: Path) -> dict[str, object]:
    """Read only the frame table so malformed/unrecovered payloads stay inventory-visible."""
    data = path.read_bytes()
    if len(data) < 4:
        raise ValueError(f"truncated .spr: {path}")
    frame_count = struct.unpack_from("<I", data, 0)[0]
    table_end = 4 + frame_count * 16
    if table_end > len(data):
        raise ValueError(f"frame table exceeds file size: {path}")
    raw_bounds = [struct.unpack_from("<4i", data, 4 + i * 16) for i in range(frame_count)]
    valid = [(i, b) for i, b in enumerate(raw_bounds) if b[2] > b[0] and b[3] > b[1]]
    invalid = [i for i, b in enumerate(raw_bounds) if b[2] <= b[0] or b[3] <= b[1]]
    union = None
    max_width = None
    max_height = None
    if valid:
        union = {
            "left": min(b[0] for _, b in valid),
            "top": min(b[1] for _, b in valid),
            "right": max(b[2] for _, b in valid),
            "bottom": max(b[3] for _, b in valid),
        }
        max_width = max(b[2] - b[0] for _, b in valid)
        max_height = max(b[3] - b[1] for _, b in valid)
    return {
        "frame_count": frame_count,
        "sha256": hashlib.sha256(data).hexdigest(),
        "bounds_union": union,
        "max_frame_width": max_width,
        "max_frame_height": max_height,
        "invalid_bound_indices": invalid,
    }


def parse_spr_evidence(path: Path):
    """Prefer verified decoding, then lossy decoding, then header-only structural evidence."""
    header = inspect_spr_header(path)
    try:
        return parse_spr(path), "STRICT", None, header
    except ValueError as strict_exc:
        try:
            # Full-client inventory contains families outside the B100/B109
            # strict corpus. This mode can still preserve RGB565 span pixels.
            return parse_spr(path, strict=False), "NON_STRICT_FALLBACK", str(strict_exc), header
        except ValueError as fallback_exc:
            # Some resources contain zero/negative frame rectangles. Their
            # frame table remains evidence, but current pixel semantics are not
            # sufficiently recovered to render them safely.
            error = f"strict: {strict_exc}; non-strict: {fallback_exc}"
            return None, "HEADER_ONLY_UNRENDERED", error, header


def story_model_uses(path: Path) -> dict[str, list[dict[str, object]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    uses: dict[str, list[dict[str, object]]] = defaultdict(list)
    if isinstance(data.get("zones"), list):
        for zone in data["zones"]:
            for script_name, script in (zone.get("scripts") or {}).items():
                for token in script.get("models", []):
                    uses[str(token)].append({"zone": zone.get("zone_id"), "script": script_name})
    if isinstance(data.get("scenes"), list):
        for scene in data["scenes"]:
            for script_name, script in (scene.get("scripts") or {}).items():
                for token in script.get("distinct_char_models", []):
                    uses[str(token)].append({"zone": scene.get("zone_id"), "script": script_name})
    return dict(uses)


def scan_visual_families(client_root: Path) -> list[dict[str, object]]:
    char_dir = client_root / "Char"
    if not char_dir.is_dir():
        raise FileNotFoundError(f"missing Char directory: {char_dir}")
    files = ci_files(char_dir)
    grouped: dict[int, list[dict[str, object]]] = defaultdict(list)
    for ani_path in sorted(char_dir.iterdir(), key=lambda p: p.name.lower()):
        if not ani_path.is_file():
            continue
        m = VISUAL_RE.match(ani_path.name)
        if not m:
            continue
        numeric_id = int(m.group("id"))
        slot = m.group("slot")
        spr_path = files.get((ani_path.stem + ".spr").lower())
        if spr_path is None:
            raise FileNotFoundError(f"missing paired SPR for {ani_path.name}")
        ani = parse_ani(ani_path)
        spr, spr_decode_status, spr_strict_error, spr_meta = parse_spr_evidence(spr_path)
        errors = validate_frame_indices(ani, int(spr_meta["frame_count"]))
        bounds = spr_meta["bounds_union"]
        grouped[numeric_id].append({
            "slot": slot,
            "semantic": SLOT_SEMANTICS.get(slot, {"label": None, "provenance": "UNVERIFIED"}),
            "ani": ani_path.relative_to(client_root).as_posix(),
            "spr": spr_path.relative_to(client_root).as_posix(),
            "layer_name": ani.layer_name,
            "frames_per_direction": ani.frames_per_direction,
            "direction_rows": len(ani.directions),
            "raw_timing": ani.raw_timing,
            "active_frame_indices": len({i for row in ani.directions for i in row}),
            "spr_frame_count": spr_meta["frame_count"],
            "bounds_union": bounds,
            "max_frame_width": spr_meta["max_frame_width"],
            "max_frame_height": spr_meta["max_frame_height"],
            "invalid_bound_indices": spr_meta["invalid_bound_indices"],
            "frame_index_errors": errors,
            "ani_sha256": ani.sha256,
            "spr_sha256": spr_meta["sha256"],
            "spr_decode_status": spr_decode_status,
            "spr_strict_error": spr_strict_error,
        })
    families = []
    for numeric_id, slots in sorted(grouped.items()):
        slots.sort(key=lambda row: str(row["slot"]))
        families.append({
            "visual_family_id": f"B{numeric_id}",
            "numeric_id": numeric_id,
            "resource_family": "Char/Body_ ANI+SPR",
            "format": {"ani": "NeoDark ANI", "spr": "NeoDark SPR RGB565 spans"},
            "slot_count": len(slots),
            "action_slots": [row["slot"] for row in slots],
            "slots": slots,
            "direction_semantics": {
                "row_count": 8,
                "status": "UNVERIFIED_FOR_UNCHECKED_FAMILY",
                "note": "S/SW/W/NW/N/NE/E/SE is verified for checked B100/B109 Body_ families only; this inventory does not extrapolate it universally.",
            },
            "death_semantic": {
                "slot": None,
                "status": "UNVERIFIED",
                "note": "No universal retail death state has been recovered. _05 is explicitly not treated as death.",
            },
            "confidence": "VERIFIED_RESOURCE_FAMILY",
        })
    return families


def scan_tip_libraries(client_root: Path) -> list[dict[str, object]]:
    rows = []
    for path in sorted(
        (p for p in client_root.rglob("*") if p.is_file() and p.suffix.lower() == ".tip"),
        key=lambda p: p.as_posix().lower(),
    ):
        lib = parse_tip(path)
        info = summarize_tip(lib)
        rows.append({
            "path": path.relative_to(client_root).as_posix(),
            "sha256": sha256(path),
            "canvas": info["canvas"],
            "frame_count": info["frame_count"],
            "flag": info["flag"],
            "classification": "UNCLASSIFIED_TIP_SPRITE_LIBRARY",
            "monster_binding": "UNVERIFIED",
        })
    return rows


def build_report(client_root: Path, story_manifest: Path) -> dict[str, object]:
    families = scan_visual_families(client_root)
    tips = scan_tip_libraries(client_root)
    story = story_model_uses(story_manifest)
    by_id = {str(row["numeric_id"]): row for row in families}
    numeric_story = {k: v for k, v in story.items() if k.isdigit()}
    correlations = []
    for token, uses in sorted(numeric_story.items(), key=lambda item: int(item[0])):
        family = by_id.get(token)
        correlations.append({
            "story_model_token": token,
            "uses": uses,
            "same_numeric_visual_family": family["visual_family_id"] if family else None,
            "binding_status": "UNVERIFIED_NUMERIC_CORRELATION" if family else "NO_SAME_NUMERIC_VISUAL_FAMILY",
            "warning": "Numeric equality is not a recovered runtime binding." if family else "Story model token has no same-number Char/B visual family.",
        })
    matched = [row for row in correlations if row["same_numeric_visual_family"]]
    action_sets = Counter(",".join(row["action_slots"]) for row in families)
    decode_statuses = Counter(
        slot["spr_decode_status"] for family in families for slot in family["slots"]
    )
    return {
        "schema": 1,
        "scope": "S17 Monster Visual Recovery: fixed-client resource inventory and battle-script correlation only",
        "evidence_policy": {
            "resource_structure": "VERIFIED_STATIC_ORIGINAL",
            "slot_03_hit": "VERIFIED_STATIC_ORIGINAL",
            "slot_00_01_02_labels": "RECOVERED_SECONDARY",
            "story_model_to_visual_numeric_match": "UNVERIFIED_NUMERIC_CORRELATION",
            "universal_death_slot": "UNVERIFIED",
            "fallback_death_presentation": "RECONSTRUCTION_POLICY",
        },
        "summary": {
            "visual_family_count": len(families),
            "ani_resource_count": sum(row["slot_count"] for row in families),
            "tip_library_count": len(tips),
            "story_numeric_model_token_count": len(numeric_story),
            "same_numeric_story_visual_count": len(matched),
            "story_tokens_without_same_numeric_visual": len(numeric_story) - len(matched),
            "action_slot_sets": dict(sorted(action_sets.items(), key=lambda item: (-item[1], item[0]))),
            "spr_decode_statuses": dict(sorted(decode_statuses.items())),
        },
        "story_model_correlations": correlations,
        "preview_candidate_visual_ids": [row["same_numeric_visual_family"] for row in matched],
        "tip_libraries": tips,
        "visual_families": families,
        "warnings": [
            "This report does not decide which visual family is a monster. Human visual review and/or an independent runtime binding is required.",
            "Do not bind battle roster IDs, story CHARPOS model tokens, NPCScript IDs or world entity IDs to visual families solely because numbers match.",
            "Death remains unresolved; any fade/collapse fallback must be labelled RECONSTRUCTION_POLICY.",
        ],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--story-manifest", type=Path, default=ROOT / "manifests" / "story-battle-scenes.json")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    report = build_report(args.client_root.resolve(), args.story_manifest.resolve())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"out": str(args.out), **report["summary"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
