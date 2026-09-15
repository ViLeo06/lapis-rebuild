#!/usr/bin/env python3
"""Parse the verified NeoDark/Lapis 1,236-byte .ani animation index format."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from dataclasses import asdict, dataclass
from pathlib import Path

ANI_SIZE = 1236
DIRECTION_COUNT = 8
SLOTS_PER_DIRECTION = 32
LAYER_COUNT_OFFSET = 0x040
LAYER_NAME_OFFSET = 0x044
FRAMES_PER_DIRECTION_OFFSET = 0x084
FRAME_TABLE_OFFSET = 0x088
DIRECTION_STRIDE = SLOTS_PER_DIRECTION * 4
TIMING_OFFSET = 0x488
RESERVED_U32_OFFSET = 0x48C
RESERVED_TAIL_OFFSET = 0x490


@dataclass(frozen=True)
class AniData:
    path: str
    sha256: str
    description: str
    layer_count: int
    layer_name: str
    frames_per_direction: int
    directions: list[list[int]]
    raw_timing: float
    reserved_u32: int
    reserved_tail_hex: str


def _decode_c_string(raw: bytes) -> str:
    raw = raw.split(b"\x00", 1)[0]
    for encoding in ("cp949", "utf-8", "gb18030", "latin1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            pass
    return raw.decode("latin1", errors="replace")


def parse_ani(path: str | Path, *, strict: bool = True) -> AniData:
    path = Path(path)
    data = path.read_bytes()
    if len(data) != ANI_SIZE:
        raise ValueError(f"unexpected .ani size {len(data)}; expected {ANI_SIZE}: {path}")

    layer_count = struct.unpack_from("<I", data, LAYER_COUNT_OFFSET)[0]
    frames_per_direction = struct.unpack_from("<I", data, FRAMES_PER_DIRECTION_OFFSET)[0]
    if strict and layer_count != 1:
        raise ValueError(f"unsupported layer_count={layer_count}: {path}")
    if frames_per_direction > SLOTS_PER_DIRECTION:
        raise ValueError(f"frames_per_direction={frames_per_direction} exceeds {SLOTS_PER_DIRECTION}: {path}")

    directions: list[list[int]] = []
    for direction in range(DIRECTION_COUNT):
        base = FRAME_TABLE_OFFSET + direction * DIRECTION_STRIDE
        directions.append([
            struct.unpack_from("<I", data, base + i * 4)[0]
            for i in range(frames_per_direction)
        ])

    return AniData(
        path=str(path),
        sha256=hashlib.sha256(data).hexdigest(),
        description=_decode_c_string(data[:LAYER_COUNT_OFFSET]),
        layer_count=layer_count,
        layer_name=_decode_c_string(data[LAYER_NAME_OFFSET:FRAMES_PER_DIRECTION_OFFSET]),
        frames_per_direction=frames_per_direction,
        directions=directions,
        raw_timing=struct.unpack_from("<f", data, TIMING_OFFSET)[0],
        reserved_u32=struct.unpack_from("<I", data, RESERVED_U32_OFFSET)[0],
        reserved_tail_hex=data[RESERVED_TAIL_OFFSET:].hex(),
    )


def validate_frame_indices(ani: AniData, spr_frame_count: int) -> list[str]:
    errors: list[str] = []
    for direction, frames in enumerate(ani.directions):
        for slot, frame in enumerate(frames):
            if frame >= spr_frame_count:
                errors.append(f"direction {direction} slot {slot}: frame {frame} >= spr frame count {spr_frame_count}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ani", type=Path)
    parser.add_argument("--spr", type=Path, help="paired .spr for direct frame-index validation")
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()

    ani = parse_ani(args.ani)
    payload = asdict(ani)
    if args.spr:
        spr_bytes = args.spr.read_bytes()
        if len(spr_bytes) < 4:
            raise ValueError(f"truncated .spr: {args.spr}")
        spr_frame_count = struct.unpack_from("<I", spr_bytes, 0)[0]
        payload["paired_spr"] = str(args.spr)
        payload["spr_frame_count"] = spr_frame_count
        payload["frame_index_errors"] = validate_frame_indices(ani, spr_frame_count)

    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
