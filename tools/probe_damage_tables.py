#!/usr/bin/env python3
"""Summarize damage-relevant Set.lib tables without inventing combat formulas.

The report is structural evidence only: source hashes, comment/header candidates,
row widths, numeric domains, and bounded sample rows. It deliberately does not
combine fields into a damage, hit, critical, defence, or elemental formula.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
from pathlib import Path

TABLE_ENCODINGS = {
    "ability.atr": "gb18030",
    "itemtbl.atr": "gb18030",
    "Magictbl.atr": "gb18030",
    "Magicptn.atr": "cp949",
    "solskill.atr": "cp949",
}
TARGET_IDS = {
    "ability.atr": {100, 109, 110, 119, 190, 199},
    "Magictbl.atr": {1101, 1201, 1301, 19101, 19201, 19301},
}
IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_./-]*$")


def _parse_int(value: str) -> int | None:
    try:
        return int(value, 0)
    except ValueError:
        return None


def _read_table(path: Path, encoding: str) -> tuple[list[str], list[list[str]]]:
    text = path.read_bytes().decode(encoding, "replace")
    comments: list[str] = []
    rows: list[list[str]] = []
    for raw in text.splitlines():
        line = raw.strip("\ufeff\r\n")
        if not line:
            continue
        if line.startswith(";"):
            comments.append(line[1:].lstrip())
            continue
        rows.append(line.split("\t"))
    return comments, rows


def _header_candidates(comments: list[str], dominant_width: int) -> list[dict[str, object]]:
    out = []
    for line in comments:
        fields = line.split("\t")
        if len(fields) == dominant_width:
            out.append(
                {
                    "raw": line,
                    "fields": fields,
                    "identifier_like": sum(bool(IDENT.match(x)) for x in fields),
                }
            )
    out.sort(key=lambda x: int(x["identifier_like"]), reverse=True)
    return out[:5]


def summarize(path: Path, encoding: str) -> dict[str, object]:
    raw = path.read_bytes()
    comments, rows = _read_table(path, encoding)
    widths = collections.Counter(map(len, rows))
    dominant_width = widths.most_common(1)[0][0] if widths else 0
    max_width = max(widths, default=0)

    numeric_columns = []
    for index in range(max_width):
        values = [row[index] for row in rows if index < len(row)]
        ints = [v for v in (_parse_int(value) for value in values) if v is not None]
        if not values:
            continue
        entry: dict[str, object] = {
            "index": index,
            "value_count": len(values),
            "numeric_count": len(ints),
            "numeric_ratio": round(len(ints) / len(values), 6),
        }
        if ints:
            entry.update({"min": min(ints), "max": max(ints)})
            distinct = sorted(set(ints))
            if len(distinct) <= 24:
                entry["distinct"] = distinct
        numeric_columns.append(entry)

    samples: list[dict[str, object]] = []
    wanted = TARGET_IDS.get(path.name, set())
    for idx, row in enumerate(rows):
        rid = _parse_int(row[0]) if row else None
        if idx < 3 or rid in wanted:
            samples.append({"row_index": idx, "id": rid, "fields": row})
    seen: set[int] = set()
    bounded = []
    for sample in samples:
        idx = int(sample["row_index"])
        if idx in seen:
            continue
        seen.add(idx)
        bounded.append(sample)
        if len(bounded) >= 12:
            break

    return {
        "file": path.name,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "size": len(raw),
        "encoding": encoding,
        "row_count": len(rows),
        "width_histogram": {str(k): v for k, v in sorted(widths.items())},
        "dominant_width": dominant_width,
        "comment_count": len(comments),
        "comment_preview": comments[:16],
        "header_candidates": _header_candidates(comments, dominant_width),
        "numeric_columns": numeric_columns,
        "sample_rows": bounded,
    }


def build_report(root: Path) -> dict[str, object]:
    tables = []
    missing = []
    for name, encoding in TABLE_ENCODINGS.items():
        path = root / name
        if not path.is_file():
            missing.append(name)
            continue
        tables.append(summarize(path, encoding))
    if missing:
        raise FileNotFoundError(f"missing expected Set.lib members: {', '.join(missing)}")
    return {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH_WHEN_SOURCE_HASHES_MATCH",
        "scope": (
            "Structural summary of extracted Set.lib damage-relevant tables. "
            "No table fields are combined into a retail combat formula."
        ),
        "tables": tables,
        "formula_claim": "NONE",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("setlib_dir", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    report = build_report(args.setlib_dir)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "tables": len(report["tables"]),
                "output": str(args.out),
                "formula_claim": report["formula_claim"],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
