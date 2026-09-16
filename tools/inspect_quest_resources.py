#!/usr/bin/env python3
"""Inspect high-value Quest/NPC resources without executing original client code.

The report is intentionally metadata-first: hashes, container members, sizes,
byte statistics and bounded keyword counts. It never exports dialogue/story text.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools' / 'extract'))
from lib_archive import extract, read_archive  # noqa: E402

TARGET_HASHES = {
    'NRes/Quest.lib': '23fa524844be0c553c55e66e071e3c9190337d92b19745f242580008a63e7397',
    'NRes/NPC350.Tip': '212d00901464a31b9835dbeff844686e302aa0984dbefa842e534bd791696b38',
}
KEYWORDS = {
    'quest': ('quest', 'Quest', '任务', '퀘스트'),
    'npc': ('npc', 'NPC'),
    'dialog': ('dialog', 'Dialog', '对话', '대화'),
    'mission': ('mission', 'Mission', '使命', '임무'),
    'reward': ('reward', 'Reward', '奖励', '보상'),
    'map': ('map', 'Map', 'zone', 'Zone', '地图', '맵'),
    'item': ('item', 'Item', '道具', '物品', '아이템'),
}
MAX_MEMBER_PROFILE_BYTES = 8 * 1024 * 1024
MAX_TIP_TEXT_BYTES = 2 * 1024 * 1024


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def entropy(data: bytes) -> float:
    if not data:
        return 0.0
    counts = Counter(data)
    n = len(data)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def keyword_profile(data: bytes) -> dict[str, object]:
    result: dict[str, int] = {key: 0 for key in KEYWORDS}
    encoding_scores: dict[str, float] = {}
    for encoding in ('utf-8', 'gb18030', 'cp949'):
        text = data.decode(encoding, errors='ignore')
        if text:
            printable = sum(ch.isprintable() or ch in '\r\n\t' for ch in text)
            encoding_scores[encoding] = round(printable / len(text), 4)
        else:
            encoding_scores[encoding] = 0.0
        for key, tokens in KEYWORDS.items():
            result[key] = max(result[key], sum(text.count(token) for token in tokens))
    return {
        'encoding_printable_ratio': encoding_scores,
        'keyword_counts': {k: v for k, v in result.items() if v},
    }


def byte_profile(data: bytes, *, text_limit: int | None = None) -> dict[str, object]:
    sampled = data if text_limit is None else data[:text_limit]
    return {
        'size': len(data),
        'sha256': hashlib.sha256(data).hexdigest(),
        'first_32_bytes_hex': data[:32].hex(),
        'zero_ratio': round(data.count(0) / len(data), 6) if data else 0.0,
        'entropy_bits_per_byte': round(entropy(data), 4),
        **keyword_profile(sampled),
    }


def inspect_quest_lib(path: Path) -> dict[str, object]:
    result: dict[str, object] = {
        'path': 'NRes/Quest.lib',
        'size': path.stat().st_size,
        'sha256': sha256(path),
    }
    try:
        data, base, check, entries = read_archive(path)
        result.update({
            'parse_status': 'ok',
            'container_format': 'recovered_lapis_lib',
            'check': f'0x{check:08x}',
            'data_base': base,
            'entry_count': len(entries),
        })
        with tempfile.TemporaryDirectory(prefix='lapis-quest-lib-') as tmp:
            out = Path(tmp)
            _, manifest = extract(path, out)
            members = []
            for row in manifest:
                member = out / row['name']
                raw = member.read_bytes()
                entry = {
                    'name': row['name'],
                    'offset': row['offset'],
                    'unpacked_size': row['unpacked_size'],
                    'packed_size': row['packed_size'],
                    'sha256': row['sha256'],
                    'extension': Path(row['name']).suffix.lower(),
                }
                if len(raw) <= MAX_MEMBER_PROFILE_BYTES:
                    entry['profile'] = byte_profile(raw)
                else:
                    entry['profile'] = {'skipped': 'member exceeds profile byte limit'}
                members.append(entry)
            result['members'] = members
    except Exception as exc:  # Evidence probe: report failure rather than hiding it.
        data = path.read_bytes()
        result.update({
            'parse_status': 'not_recovered_lib',
            'error_type': type(exc).__name__,
            'file_profile': byte_profile(data, text_limit=MAX_TIP_TEXT_BYTES),
        })
    return result


def inspect_npc_tip(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    common_record_sizes = [8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96, 128, 160, 192, 256, 320, 384, 512]
    divisors = [size for size in common_record_sizes if len(data) % size == 0]
    return {
        'path': 'NRes/NPC350.Tip',
        'profile': byte_profile(data, text_limit=MAX_TIP_TEXT_BYTES),
        'common_record_size_divisors': divisors,
        'record_divisor_warning': 'Divisibility alone is not evidence of a record format.',
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--client-root', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    root = args.client_root.resolve()
    if not root.is_dir():
        raise ValueError(f'not a client directory: {root}')

    actual: dict[str, str] = {}
    for rel, expected in TARGET_HASHES.items():
        path = root / rel
        if not path.is_file():
            raise FileNotFoundError(rel)
        got = sha256(path)
        actual[rel] = got
        if got != expected:
            raise ValueError(f'input hash mismatch for {rel}')

    payload = {
        'schema': 1,
        'evidence': 'VERIFIED_STATIC_STRUCTURE_PROBE',
        'scope': 'Hash-pinned 2.2 resources; no executable run; no dialogue/story excerpts exported.',
        'inputs': actual,
        'quest_lib': inspect_quest_lib(root / 'NRes/Quest.lib'),
        'npc_tip': inspect_npc_tip(root / 'NRes/NPC350.Tip'),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'quest_parse_status': payload['quest_lib']['parse_status'],
        'quest_entries': payload['quest_lib'].get('entry_count'),
        'npc_tip_size': payload['npc_tip']['profile']['size'],
        'output': str(args.out),
    }, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
