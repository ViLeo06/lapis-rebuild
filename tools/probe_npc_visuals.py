#!/usr/bin/env python3
"""Build a static NPC/world-character visual inventory from the fixed client.

This probe intentionally separates:
  NPCScript block != world entity != visual archetype.
It inventories visual resources but never numeric-joins those layers.
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
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "convert"))

from convert.ani import parse_ani, validate_frame_indices  # type: ignore
from convert.tip import parse_tip, summarize as summarize_tip  # type: ignore
from npc_visual_core import BODY_DIRECTIONS, body_action_semantic, fast_spr_metadata, sha256_file, visual_fingerprint

INSTALLER_SHA256 = "c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88"
UNPACKED_NEODARK_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"
BODY_RE = re.compile(r"^B(\d+)_([0-9]{2})\.ani$", re.IGNORECASE)


def _read_at_va(data: bytes, va: int) -> bytes:
    if data[:2] != b"MZ":
        raise ValueError("not PE/MZ")
    peoff = struct.unpack_from("<I", data, 0x3C)[0]
    if data[peoff:peoff + 4] != b"PE\0\0":
        raise ValueError("not PE32")
    coff = peoff + 4
    sections = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    image_base = struct.unpack_from("<I", data, opt + 28)[0]
    sec = opt + opt_size
    rva = va - image_base
    for i in range(sections):
        off = sec + i * 40
        vsize, vaddr, raw_size, raw_off = struct.unpack_from("<IIII", data, off + 8)
        span = max(vsize, raw_size)
        if vaddr <= rva < vaddr + span:
            file_off = raw_off + (rva - vaddr)
            return data[file_off:]
    raise ValueError(f"VA not mapped: 0x{va:08x}")


def probe_portrait_loader(image: Path) -> dict:
    data = image.read_bytes()
    actual_hash = hashlib.sha256(data).hexdigest()
    if actual_hash != UNPACKED_NEODARK_SHA256:
        raise ValueError(f"unexpected unpacked NeoDark hash: {actual_hash}")
    signatures = {
        "range_and_default": (0x00412710, "3beb56894c24147c0881fd960000007e0cc744244464000000"),
        "source_switch_100": (0x00412760, "83fd64895c243c7d0768a8494f00eb056898494f00"),
        "modulo_100_frame": (0x0041282B, "8bc58d148d29000000b9640000008954243099f7f98bea"),
    }
    checked = []
    for name, (va, expected_hex) in signatures.items():
        expected = bytes.fromhex(expected_hex)
        got = _read_at_va(data, va)[:len(expected)]
        if got != expected:
            raise ValueError(f"portrait loader signature mismatch at 0x{va:08x}: {name}")
        checked.append({"name": name, "va": f"0x{va:08x}", "bytes": expected_hex})
    for literal in (b"NRes\\Npc350.TIP\0", b"NRes\\Char350.TIP\0"):
        if literal not in data:
            raise ValueError(f"missing portrait resource literal {literal!r}")
    return {
        "evidence": "VERIFIED_STATIC_ORIGINAL",
        "image_sha256": actual_hash,
        "accepted_input_range": "0..150 inclusive; out-of-range input is replaced with 100",
        "source_rule": [
            {"ids": "0..99", "resource": "NRes/Char350.Tip"},
            {"ids": "100..149", "resource": "NRes/NPC350.Tip"},
        ],
        "frame_rule": "frame_index = portrait_id % 100",
        "edge_note": "ID 150 passes the observed range gate but would produce remainder 50; NPC350 has frames 0..49, so ID 150 is intentionally not claimed as a valid portrait mapping.",
        "signatures": checked,
    }


def _tip_inventory(client_root: Path) -> list[dict]:
    tips = sorted(
        (p for p in client_root.rglob("*") if p.is_file() and p.suffix.lower() == ".tip"),
        key=lambda p: p.relative_to(client_root).as_posix().lower(),
    )
    rows = []
    for path in tips:
        lib = parse_tip(path)
        summary = summarize_tip(lib)
        dims = Counter((f.width, f.height) for f in lib.frames)
        rows.append({
            "path": path.relative_to(client_root).as_posix(),
            "resource_family": "TIP_SPRITE_LIBRARY",
            "size": path.stat().st_size,
            "sha256": sha256_file(path),
            "canvas": summary["canvas"],
            "frame_count": summary["frame_count"],
            "frame_dimension_histogram": [
                {"width": w, "height": h, "count": count}
                for (w, h), count in sorted(dims.items())
            ],
            "run_counts": summary["run_counts"],
            "palette_format": "run-coded RGB565-compatible payloads; run kinds 2/3/4 visual semantics not VERIFIED",
            "confidence": "VERIFIED_STATIC_STRUCTURE",
        })
    return rows


def _paired_case_insensitive(directory: Path, filename: str) -> Path | None:
    wanted = filename.lower()
    hits = [p for p in directory.iterdir() if p.is_file() and p.name.lower() == wanted]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        raise ValueError(f"ambiguous case-insensitive resource: {directory}/{filename}")
    return None


def _body_inventory(client_root: Path) -> tuple[list[dict], dict]:
    char_dir = client_root / "Char"
    if not char_dir.is_dir():
        raise ValueError(f"missing Char directory: {char_dir}")
    grouped: dict[int, list[tuple[int, Path]]] = defaultdict(list)
    for path in char_dir.iterdir():
        if not path.is_file():
            continue
        match = BODY_RE.match(path.name)
        if match:
            grouped[int(match.group(1))].append((int(match.group(2)), path))
    families = []
    action_set_counts: Counter[tuple[int, ...]] = Counter()
    duplicate_groups: dict[str, list[int]] = defaultdict(list)
    range_counts = Counter()
    for visual_id in sorted(grouped):
        actions = {}
        for action, ani_path in sorted(grouped[visual_id]):
            spr_path = _paired_case_insensitive(char_dir, f"B{visual_id}_{action:02d}.spr")
            if spr_path is None:
                raise ValueError(f"missing paired SPR for {ani_path.name}")
            ani = parse_ani(ani_path)
            spr = fast_spr_metadata(spr_path)
            errors = validate_frame_indices(ani, int(spr["frame_count"]))
            if errors:
                raise ValueError(f"ANI/SPR index errors for {ani_path.name}: {errors[:3]}")
            semantics = body_action_semantic(action)
            action_meta = {
                **semantics,
                "ani": ani_path.relative_to(client_root).as_posix(),
                "spr": spr_path.relative_to(client_root).as_posix(),
                "ani_sha256": ani.sha256,
                "spr_sha256": spr["sha256"],
                "layer_name": ani.layer_name,
                "frames_per_direction": ani.frames_per_direction,
                "spr_frame_count": spr["frame_count"],
                "raw_timing": ani.raw_timing,
                "dimensions": {
                    "bounds_union": spr["bounds_union"],
                    "max_frame_width": spr["max_frame_width"],
                    "max_frame_height": spr["max_frame_height"],
                    "empty_frame_count": spr["empty_frame_count"],
                    "inverted_frame_count": spr["inverted_frame_count"],
                    "non_renderable_frame_count": spr["non_renderable_frame_count"],
                },
            }
            actions[action] = action_meta
        action_set = tuple(sorted(actions))
        action_set_counts[action_set] += 1
        fingerprint = visual_fingerprint(actions)
        duplicate_groups[fingerprint].append(visual_id)
        if visual_id < 300:
            range_name = "100-299-player-class-space"
        elif visual_id < 1000:
            range_name = "300-999-unclassified"
        elif visual_id < 4000:
            range_name = "1000-3999-unclassified"
        elif visual_id < 5000:
            range_name = "4000-4999-unclassified"
        elif visual_id < 6000:
            range_name = "5000-5999-unclassified"
        else:
            range_name = "6000+-unclassified"
        range_counts[range_name] += 1
        body_layer = all(str(meta["layer_name"]).startswith("Body") for meta in actions.values())
        families.append({
            "visual_id": f"body-b{visual_id}",
            "character_resource_id": visual_id,
            "resource_family": "CHAR_BODY_ANI_SPR",
            "classification": "WORLD_CHARACTER_VISUAL_UNCLASSIFIED",
            "classification_evidence": "UNVERIFIED",
            "classification_note": "This family is not called an NPC or monster without an independent runtime/world binding.",
            "range_bucket": range_name,
            "possible_directions": list(BODY_DIRECTIONS) if body_layer else [],
            "direction_evidence": "VERIFIED_BODY_DIRECTION_MAPPING" if body_layer else "UNVERIFIED",
            "actions": [actions[k] for k in sorted(actions)],
            "visual_fingerprint": fingerprint,
            "provenance": {
                "source": "hash-pinned 2.2 client Char/Bxxxx_NN.ani+.spr",
                "npc_script_binding": "NONE",
                "world_entity_binding": "NONE",
            },
        })
    duplicates = [ids for ids in duplicate_groups.values() if len(ids) > 1]
    stats = {
        "family_count": len(families),
        "ani_count": sum(len(f["actions"]) for f in families),
        "action_set_distribution": [
            {"actions": list(actions), "count": count}
            for actions, count in sorted(action_set_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        ],
        "range_distribution": dict(sorted(range_counts.items())),
        "duplicate_visual_fingerprint_group_count": len(duplicates),
        "duplicate_visual_fingerprint_groups": sorted(duplicates, key=lambda x: (-len(x), x))[:300],
    }
    return families, stats


def build_report(client_root: Path, image: Path | None) -> dict:
    tips = _tip_inventory(client_root)
    bodies, body_stats = _body_inventory(client_root)
    npc350 = next((row for row in tips if row["path"].lower() == "nres/npc350.tip"), None)
    if npc350 is None:
        raise ValueError("NRes/NPC350.Tip not found in inventory")
    portrait_runtime = probe_portrait_loader(image) if image else {
        "evidence": "NOT_PROBED",
        "note": "Provide --image with the fixed-hash UPX-decompressed NeoDark image to verify portrait source/frame selection.",
    }
    return {
        "schema": 1,
        "evidence": "S16_STATIC_VISUAL_INVENTORY",
        "scope": "Static client visual resources only; no original executable is executed and no NPCScript/world-entity numeric join is performed.",
        "installer_sha256": INSTALLER_SHA256,
        "separation_rule": {
            "npc_script_block": "quest/dialogue layer",
            "world_entity": "runtime/spatial layer",
            "visual_archetype": "presentation layer",
            "numeric_equality_binding": "PROHIBITED_WITHOUT_INDEPENDENT_EVIDENCE",
        },
        "tip_inventory": {
            "file_count": len(tips),
            "frame_count": sum(int(x["frame_count"]) for x in tips),
            "files": tips,
        },
        "npc350": {
            "resource": npc350,
            "verified_visual_entry_count": 50,
            "role": "NPC/character portrait sprite library",
            "role_evidence": "VERIFIED_STATIC_ORIGINAL via portrait loader source switch when --image probe passes; individual character identities remain unbound unless separately proven",
        },
        "portrait_runtime": portrait_runtime,
        "world_character_visuals": {
            "warning": "Family count is not NPC count. Player classes, monsters and special character visuals can coexist in Char/.",
            "stats": body_stats,
            "families": bodies,
        },
        "npc_world_sprite_count_claim": "UNRESOLVED_NO_RETAIL_BINDING",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--image", type=Path, help="fixed-hash UPX-decompressed NeoDark image")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    report = build_report(args.client_root.resolve(), args.image.resolve() if args.image else None)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "tip_files": report["tip_inventory"]["file_count"],
        "tip_frames": report["tip_inventory"]["frame_count"],
        "npc350_entries": report["npc350"]["verified_visual_entry_count"],
        "body_families": report["world_character_visuals"]["stats"]["family_count"],
        "body_ani": report["world_character_visuals"]["stats"]["ani_count"],
        "portrait_runtime": report["portrait_runtime"]["evidence"],
        "out": str(args.out),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
