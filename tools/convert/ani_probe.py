#!/usr/bin/env python3
"""Conservative archaeology probe for unknown NeoDark/Lapis .ani variants.

For the verified 2.2-client format use ``tools/convert/ani.py`` instead.  This
probe intentionally never auto-selects a candidate record width: divisibility,
repetition, or a high bounded-value ratio are useful observations but are not
proof of a binary layout.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path

COMMON_RECORD_SIZES = (4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64)


@dataclass
class CandidateLayout:
    record_size: int
    record_count: int
    remainder: int
    repeated_records: int
    zero_records: int
    u16_bounded_ratio: float | None
    u32_bounded_ratio: float | None


@dataclass
class ProbeReport:
    path: str
    size: int
    sha256: str
    entropy_bits_per_byte: float
    head_hex: str
    tail_hex: str
    candidates: list[CandidateLayout]
    selected_record_size: int | None
    selected_records: list[dict]


def entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    total = len(data)
    return -sum((n / total) * math.log2(n / total) for n in counts.values())


def bounded_ratio(values: list[int], upper_bound: int | None) -> float | None:
    if upper_bound is None or not values:
        return None
    return sum(v < upper_bound for v in values) / len(values)


def score_layout(data: bytes, record_size: int, spr_frames: int | None) -> CandidateLayout:
    count, remainder = divmod(len(data), record_size)
    records = [data[i : i + record_size] for i in range(0, count * record_size, record_size)]
    freq = Counter(records)
    repeated_records = sum(n for n in freq.values() if n > 1)
    zero_records = sum(rec == b"\x00" * record_size for rec in records)

    u16_values: list[int] = []
    u32_values: list[int] = []
    for rec in records:
        usable16 = len(rec) - len(rec) % 2
        usable32 = len(rec) - len(rec) % 4
        if usable16:
            u16_values.extend(struct.unpack(f"<{usable16 // 2}H", rec[:usable16]))
        if usable32:
            u32_values.extend(struct.unpack(f"<{usable32 // 4}I", rec[:usable32]))

    return CandidateLayout(
        record_size=record_size,
        record_count=count,
        remainder=remainder,
        repeated_records=repeated_records,
        zero_records=zero_records,
        u16_bounded_ratio=bounded_ratio(u16_values, spr_frames),
        u32_bounded_ratio=bounded_ratio(u32_values, spr_frames),
    )


def decode_record(record: bytes, offset: int) -> dict:
    result = {"offset": offset, "hex": record.hex()}
    if len(record) % 2 == 0:
        result["u16le"] = list(struct.unpack(f"<{len(record) // 2}H", record))
        result["i16le"] = list(struct.unpack(f"<{len(record) // 2}h", record))
    if len(record) % 4 == 0:
        result["u32le"] = list(struct.unpack(f"<{len(record) // 4}I", record))
        result["i32le"] = list(struct.unpack(f"<{len(record) // 4}i", record))
    return result


def probe(path: Path, record_size: int | None, spr_frames: int | None, max_records: int) -> ProbeReport:
    data = path.read_bytes()
    candidates = [score_layout(data, size, spr_frames) for size in COMMON_RECORD_SIZES if size <= max(len(data), 1)]

    # Deliberately no auto-selection.  Several widths can divide the same file,
    # and repetition can make a wrong width look more plausible than the real one.
    selected = record_size
    records: list[dict] = []
    if selected:
        for index, offset in enumerate(range(0, len(data) - selected + 1, selected)):
            if index >= max_records:
                break
            records.append(decode_record(data[offset : offset + selected], offset))

    return ProbeReport(
        path=str(path),
        size=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        entropy_bits_per_byte=round(entropy(data), 6),
        head_hex=data[:64].hex(),
        tail_hex=data[-64:].hex() if data else "",
        candidates=candidates,
        selected_record_size=selected,
        selected_records=records,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ani", type=Path)
    parser.add_argument("--record-size", type=int)
    parser.add_argument("--spr-frames", type=int)
    parser.add_argument("--max-records", type=int, default=32)
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    if args.record_size is not None and args.record_size <= 0:
        parser.error("--record-size must be positive")
    if args.spr_frames is not None and args.spr_frames <= 0:
        parser.error("--spr-frames must be positive")
    report = probe(args.ani, args.record_size, args.spr_frames, args.max_records)
    text = json.dumps(asdict(report), ensure_ascii=False, indent=2) + "\n"
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
