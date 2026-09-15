#!/usr/bin/env python3
"""Cross-validate paired character .ani/.spr resources."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
CONVERT = HERE.parents[1] / "convert"
sys.path.insert(0, str(CONVERT))

from ani import parse_ani, validate_frame_indices  # noqa: E402
from spr import parse_spr  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("char_dir", type=Path)
    parser.add_argument("--prefix", action="append", default=[])
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()

    pairs = []
    errors = []
    for ani_path in sorted(args.char_dir.glob("*.ani")):
        if args.prefix and not any(ani_path.stem.startswith(prefix) for prefix in args.prefix):
            continue
        spr_path = ani_path.with_suffix(".spr")
        if not spr_path.exists():
            errors.append({"base": ani_path.stem, "error": "missing paired .spr"})
            continue
        try:
            ani = parse_ani(ani_path)
            spr = parse_spr(spr_path)
            index_errors = validate_frame_indices(ani, spr.frame_count)
            if index_errors:
                errors.append({"base": ani_path.stem, "error": "frame index out of range", "details": index_errors})
            pairs.append({
                "base": ani_path.stem,
                "frames_per_direction": ani.frames_per_direction,
                "raw_timing": ani.raw_timing,
                "spr_frame_count": spr.frame_count,
                "used_frame_count": len({f for row in ani.directions for f in row}),
                "ani_sha256": ani.sha256,
                "spr_sha256": spr.sha256,
            })
        except Exception as exc:
            errors.append({"base": ani_path.stem, "error": str(exc)})

    result = {"pair_count": len(pairs), "error_count": len(errors), "pairs": pairs, "errors": errors}
    text = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(text, encoding="utf-8")
    else:
        print(text, end="")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
