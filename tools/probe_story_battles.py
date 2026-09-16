#!/usr/bin/env python3
"""Catalog authored battle-scene .lib files without retaining story dialogue text.

The probe uses the project-owned Lapis .lib decoder, extracts members in memory,
and records hashes plus structural script facts such as commands, formations and
scene tokens. It never executes client code and intentionally omits MESSAGE bodies.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "extract"))
from lib_archive import read_archive  # noqa: E402
from pkware_blast import blast  # noqa: E402

STEM_RE = re.compile(r"^sz-(\d{4})$", re.I)
SCRIPT_EXTS = {"DEO", "DEE"}


def member_bytes(data: bytes, base: int, entry) -> bytes:
    raw = blast(data[base + entry.offset : base + entry.offset + entry.packed_size])
    if len(raw) != entry.unpacked_size:
        raise ValueError(f"{entry.name}: size mismatch")
    return raw


def decode_text(raw: bytes) -> str:
    for encoding in ("gb18030", "cp949"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            pass
    return raw.decode("latin1", "replace")


def parse_script(text: str) -> dict[str, object]:
    counts: Counter[str] = Counter()
    loadscenes: list[str] = []
    char_models: list[str] = []
    recruit_ids: list[str] = []
    positions: list[tuple[int, int]] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith(";"):
            continue
        parts = line.split()
        command = parts[0].upper()
        counts[command] += 1
        if command == "LOADSCENE" and len(parts) > 1:
            loadscenes.append(parts[1])
        elif command == "CHARPOS" and len(parts) >= 6:
            char_models.append(parts[1])
            try:
                positions.append((int(parts[3]), int(parts[4])))
            except ValueError:
                pass
        elif command == "GETGENERAL" and len(parts) > 1:
            recruit_ids.append(parts[1])

    bbox = None
    if positions:
        bbox = {
            "min_x": min(p[0] for p in positions),
            "max_x": max(p[0] for p in positions),
            "min_y": min(p[1] for p in positions),
            "max_y": max(p[1] for p in positions),
        }
    return {
        "command_count": sum(counts.values()),
        "command_histogram": dict(sorted(counts.items())),
        "loadscene_tokens": loadscenes,
        "charpos_count": counts.get("CHARPOS", 0),
        "distinct_char_models": sorted(set(char_models)),
        "recruit_ids": recruit_ids,
        "formation_bbox": bbox,
    }


def parse_srf(text: str) -> dict[str, object]:
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith(";")
    ]
    return {
        "title": lines[0] if lines else "",
        "nonempty_line_count": len(lines),
        "has_victory_condition": any("胜利条件" in line for line in lines),
    }


def inspect_archive(path: Path) -> dict[str, object]:
    match = STEM_RE.match(path.stem)
    if not match:
        raise ValueError(f"unexpected scene archive name {path.name}")
    data, base, check, entries = read_archive(path)
    members = []
    scripts: dict[str, object] = {}
    srf = None

    for entry in entries:
        raw = member_bytes(data, base, entry)
        suffix = Path(entry.name).suffix.lstrip(".").upper()
        members.append(
            {
                "name": entry.name,
                "unpacked_size": entry.unpacked_size,
                "packed_size": entry.packed_size,
                "sha256": hashlib.sha256(raw).hexdigest(),
            }
        )
        if suffix in SCRIPT_EXTS:
            scripts[suffix] = parse_script(decode_text(raw))
        elif suffix == "SRF":
            srf = parse_srf(decode_text(raw))

    return {
        "zone_id": int(match.group(1)),
        "archive": path.name,
        "archive_size": len(data),
        "archive_sha256": hashlib.sha256(data).hexdigest(),
        "archive_check": f"0x{check:08x}",
        "member_count": len(entries),
        "member_names": [entry.name for entry in entries],
        "members": members,
        "srf": srf,
        "scripts": scripts,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("sgres", type=Path, help="client/SGRes directory")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--zones", nargs="*", type=int)
    args = ap.parse_args()

    wanted = set(args.zones or [])
    paths = sorted(args.sgres.glob("sz-*.lib"))
    if wanted:
        paths = [p for p in paths if int(p.stem.split("-")[1]) in wanted]
    scenes = [inspect_archive(path) for path in paths]
    payload = {
        "schema": 1,
        "classification": "VERIFIED_STATIC_RESOURCE",
        "scope": (
            "Hashable authored scene-library metadata only; MESSAGE bodies omitted; "
            "no original executable run. A scene archive proves authored battle "
            "content for that zone, not the field/server predicate that selects it."
        ),
        "scene_count": len(scenes),
        "zones": [scene["zone_id"] for scene in scenes],
        "scenes": scenes,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "scene_count": len(scenes),
                "zones": [scene["zone_id"] for scene in scenes],
                "output": str(args.out),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
