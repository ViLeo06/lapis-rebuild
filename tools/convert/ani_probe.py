#!/usr/bin/env python3
"""Conservative structural probe for NeoDark/Lapis .ani files.

This tool deliberately does *not* assign gameplay semantics to fields.  It is
intended for the archaeology phase: preserve byte offsets, inspect candidate
fixed-width records, and export machine-readable observations that can later be
cross-checked against .spr frame counts and captured client behaviour.

Examples:
    python tools/convert/ani_probe.py path/to/file.ani
    python tools/convert/ani_probe.py path/to/file.ani --json out.json
    python tools/convert/ani_probe.py path/to/file.ani --record-size 16 --spr-frames 87
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
from typing import Iterable


COMMON_RECORD_SIZES = (4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 48, 64)


@dataclass
class CandidateLayout:
    record_size: int
    record_count: int
    remainder: int
    score: float
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


def chunked(data: bytes, size: int) -> Iterable[bytes]:
    for offset in range(0, len(data) - size + 1, size):
        yield data[offset : offset + size]


def bounded_ratio(values: list[int], upper_bound: int | None) -> float | None:
    if upper_bound is None or not values:
        return None
    return sum(0 <= v < upper_bound for v in values) / len(values)


def score_layout(data: bytes, record_size: int, spr_frames: int | None) -> CandidateLayout:
    count, remainder = divmod(len(data), record_size)
    records = list(chunked(data, record_size))
    freq = Counter(records)
    repeated_records = sum(n for n in freq.values() if n > 1)
    zero_records = sum(rec == b"\x00" * record_size for rec in records)

    u16_values: list[int] = []
    u32_values: list[int] = []
    for rec in records:
        usable16 = len(rec) - (len(rec) % 2)
        usable32 = len(rec) - (len(rec) % 4)
        if usable16:
            u16_values.extend(struct.unpack(f"<{usable16 // 2}H", rec[:usable16]))
        if usable32:
            u32_values.extend(struct.unpack(f"<{usable32 // 4}I", rec[:usable32]))

    u16_ratio = bounded_ratio(u16_values, spr_frames)
    u32_ratio = bounded_ratio(u32_values, spr_frames)

    # Ranking heuristic only; never evidence of the actual format by itself.
    divisibility = 1.0 if remainder == 0 else max(0.0, 1.0 - remainder / record_size)
    repetition = repeated_records / count if count else 0.0
    zero_penalty = zero_records / count if count else 0.0
    bounded = max([r for r in (u16_ratio, u32_ratio) if r is not None], default=0.0)
    score = 0.55 * divisibility + 0.20 * repetition + 0.25 * bounded - 0.10 * zero_penalty

    return CandidateLayout(
        record_size=record_size,
        record_count=count,
        remainder=remainder,
        score=round(score, 6),
        repeated_records=repeated_records,
        zero_records=zero_records,
        u16_bounded_ratio=None if u16_ratio is None else round(u16_ratio, 6),
        u32_bounded_ratio=None if u32_ratio is None else round(u32_ratio, 6),
    )


def decode_record(record: bytes, offset: int) -> dict:
    result: dict = {
        "offset": offset,
        "hex": record.hex(),
    }
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
    candidates.sort(key=lambda item: (-item.score, item.remainder, item.record_size))

    selected = record_size
    if selected is None and candidates:
        # Auto-selection is intentionally conservative: require exact divisibility.
        exact = [c for c in candidates if c.remainder == 0 and c.record_count >= 2]
        selected = exact[0].record_size if exact else None

    records: list[dict] = []
    if selected:
        for index, rec in enumerate(chunked(data, selected)):
            if index >= max_records:
                break
            records.append(decode_record(rec, index * selected))

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


def render_text(report: ProbeReport) -> str:
    lines = [
        f"file: {report.path}",
        f"size: {report.size}",
        f"sha256: {report.sha256}",
        f"entropy: {report.entropy_bits_per_byte:.6f} bits/byte",
        f"selected_record_size: {report.selected_record_size}",
        "",
        "candidate layouts:",
        "  size  count  rem  score     repeated  zero  u16<frames  u32<frames",
    ]
    for item in report.candidates:
        lines.append(
            f"  {item.record_size:>4}  {item.record_count:>5}  {item.remainder:>3}  "
            f"{item.score:>8.6f}  {item.repeated_records:>8}  {item.zero_records:>4}  "
            f"{str(item.u16_bounded_ratio):>10}  {str(item.u32_bounded_ratio):>10}"
        )
    if report.selected_records:
        lines.extend(["", "first records:"])
        for rec in report.selected_records:
            lines.append(json.dumps(rec, ensure_ascii=False, separators=(",", ":")))
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ani", type=Path, help="input .ani file")
    parser.add_argument("--record-size", type=int, help="force candidate record size")
    parser.add_argument("--spr-frames", type=int, help="known frame count of paired .spr, used only as a ranking hint")
    parser.add_argument("--max-records", type=int, default=32, help="maximum decoded records in report")
    parser.add_argument("--json", type=Path, help="write full JSON report")
    args = parser.parse_args()

    if args.record_size is not None and args.record_size <= 0:
        parser.error("--record-size must be positive")
    if args.spr_frames is not None and args.spr_frames <= 0:
        parser.error("--spr-frames must be positive")
    if not args.ani.is_file():
        parser.error(f"not a file: {args.ani}")

    report = probe(args.ani, args.record_size, args.spr_frames, args.max_records)
    print(render_text(report))

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(asdict(report), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
