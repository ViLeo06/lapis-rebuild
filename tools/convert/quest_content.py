#!/usr/bin/env python3
"""Parse recovered Lapis Quest.lib text members into deterministic JSON.

This module recovers file grammar only. Numeric fields and command names remain
raw unless their meaning is directly encoded in the source text. Full dialogue
output is intended for private generated assets, not repository source control.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

QUEST_STEP_RE = re.compile(r'^STEP([1-9][0-9]*)$')
NPC_HEADER_RE = re.compile(r'^(\d+),(\d+),(.*)$')
QUEST_ACTIONS = {'CANCEL', 'SELECT', 'SCRIPT'}


def decode_legacy_text(data: bytes) -> str:
    """Decode known 2.2 content text while rejecting silent corruption."""
    for encoding in ('gb18030', 'utf-8-sig'):
        try:
            text = data.decode(encoding)
        except UnicodeDecodeError:
            continue
        if '\x00' not in text:
            return text
    raise ValueError('content is not valid GB18030/UTF-8 text')


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_speaker(token: str) -> int | str:
    token = token.strip()
    if token.isdigit():
        return int(token)
    if token == 'ID':
        return token
    raise ValueError(f'invalid quest speaker token {token!r}')


def parse_quest_text(text: str, source_name: str = '<memory>') -> dict[str, Any]:
    lines = text.splitlines()
    steps: list[dict[str, Any]] = []
    comments: list[dict[str, Any]] = []
    current_step: dict[str, Any] | None = None
    speaker: int | str | None = None
    i = 0
    while i < len(lines):
        line_no = i + 1
        raw = lines[i].strip()
        i += 1
        if not raw:
            continue
        if raw.startswith(';'):
            comments.append({'line': line_no, 'value': raw[1:]})
            continue
        match = QUEST_STEP_RE.fullmatch(raw)
        if match:
            number = int(match.group(1))
            if current_step is not None and number != current_step['number'] + 1:
                raise ValueError(f'{source_name}:{line_no}: non-sequential step {number}')
            if current_step is None and number != 1:
                raise ValueError(f'{source_name}:{line_no}: first step is not STEP1')
            current_step = {'number': number, 'events': []}
            steps.append(current_step)
            speaker = None
            continue
        if current_step is None:
            raise ValueError(f'{source_name}:{line_no}: content before STEP1')
        if raw == 'NAME':
            if i >= len(lines):
                raise ValueError(f'{source_name}:{line_no}: NAME missing speaker')
            speaker_line = i + 1
            speaker_raw = lines[i].strip()
            i += 1
            if not speaker_raw or speaker_raw.startswith(';'):
                raise ValueError(f'{source_name}:{speaker_line}: invalid speaker')
            speaker = parse_speaker(speaker_raw)
            current_step['events'].append({'kind': 'speaker', 'speaker': speaker})
            continue
        if raw in QUEST_ACTIONS:
            if speaker is None:
                raise ValueError(f'{source_name}:{line_no}: {raw} has no active speaker')
            if i >= len(lines):
                raise ValueError(f'{source_name}:{line_no}: {raw} missing text')
            text_line_no = i + 1
            value = lines[i].strip()
            i += 1
            if value.startswith(';'):
                raise ValueError(f'{source_name}:{text_line_no}: action text unexpectedly commented')
            current_step['events'].append({'kind': 'line', 'command': raw, 'speaker': speaker, 'text': value})
            continue
        raise ValueError(f'{source_name}:{line_no}: unknown token {raw!r}')

    if not steps:
        raise ValueError(f'{source_name}: no quest steps')
    if comments and comments[-1]['value'] != '999':
        raise ValueError(f'{source_name}: unexpected trailing comment marker')
    action_counts = Counter(
        event['command']
        for step in steps
        for event in step['events']
        if event['kind'] == 'line'
    )
    speakers = sorted(
        {str(event['speaker']) for step in steps for event in step['events'] if event['kind'] == 'speaker'}
    )
    return {
        'schema': 1,
        'source': source_name,
        'steps': steps,
        'comments': comments,
        'summary': {
            'step_count': len(steps),
            'event_count': sum(len(step['events']) for step in steps),
            'dialogue_line_count': sum(action_counts.values()),
            'action_counts': dict(sorted(action_counts.items())),
            'speaker_tokens': speakers,
        },
    }


def parse_npc_script_text(text: str, source_name: str = 'NPCScript.txt') -> dict[str, Any]:
    lines = text.splitlines()
    blocks: list[dict[str, Any]] = []
    comments: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    def finish() -> None:
        nonlocal current
        if current is None:
            return
        active = sum(not entry['disabled'] for entry in current['entries'])
        if active != current['declared_entry_count']:
            raise ValueError(
                f"{source_name}:{current['line']}: NPC {current['npc_id']} declared "
                f"{current['declared_entry_count']} active entries but parsed {active}"
            )
        current['active_entry_count'] = active
        current['disabled_entry_count'] = sum(entry['disabled'] for entry in current['entries'])
        blocks.append(current)
        current = None

    for index, original in enumerate(lines, 1):
        raw = original.strip()
        if not raw:
            continue
        disabled = raw.startswith(';')
        clean = raw[1:].strip() if disabled else raw
        if disabled and clean == '999':
            comments.append({'line': index, 'value': '999'})
            continue
        header = NPC_HEADER_RE.fullmatch(clean) if not disabled else None
        if header and clean.count(',') == 2:
            finish()
            current = {
                'line': index,
                'npc_id': int(header.group(1)),
                'declared_entry_count': int(header.group(2)),
                'name': header.group(3).strip(),
                'entries': [],
            }
            continue
        if current is None:
            raise ValueError(f'{source_name}:{index}: entry before NPC header')
        parts = clean.split(',', 5)
        if len(parts) != 6:
            raise ValueError(f'{source_name}:{index}: expected 5 numeric fields plus text')
        try:
            nums = [int(value.strip()) for value in parts[:5]]
        except ValueError as exc:
            raise ValueError(f'{source_name}:{index}: non-integer NPC entry field') from exc
        current['entries'].append({
            'line': index,
            'disabled': disabled,
            'record_type': nums[0],
            'raw_numeric': nums[1:],
            'text': parts[5].strip(),
        })
    finish()
    if not blocks:
        raise ValueError(f'{source_name}: no NPC blocks')
    ids = [block['npc_id'] for block in blocks]
    if len(ids) != len(set(ids)):
        raise ValueError(f'{source_name}: duplicate NPC id')
    if comments and comments[-1]['value'] != '999':
        raise ValueError(f'{source_name}: unexpected comment marker')
    return {
        'schema': 1,
        'source': source_name,
        'npcs': blocks,
        'comments': comments,
        'summary': {
            'npc_count': len(blocks),
            'npc_ids': ids,
            'active_entry_count': sum(block['active_entry_count'] for block in blocks),
            'disabled_entry_count': sum(block['disabled_entry_count'] for block in blocks),
            'record_types': sorted({entry['record_type'] for block in blocks for entry in block['entries']}),
        },
    }


def parse_member(path: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    parsed = parse_npc_script_text(decode_legacy_text(raw), path.name) if path.name.lower() == 'npcscript.txt' else parse_quest_text(decode_legacy_text(raw), path.name)
    parsed['source_sha256'] = sha256_bytes(raw)
    parsed['source_size'] = len(raw)
    return parsed


def parse_extracted_dir(root: Path, out: Path, include_text: bool = True) -> dict[str, Any]:
    npc_path = root / 'NPCScript.txt'
    if not npc_path.is_file():
        raise FileNotFoundError('NPCScript.txt')
    quests = sorted(root.glob('Quest*.TXT')) + sorted(p for p in root.glob('Quest*.txt') if p.name.lower() != 'npcscript.txt')
    quests = sorted({p.resolve(): p for p in quests}.values(), key=lambda p: p.name.lower())
    if not quests:
        raise FileNotFoundError('Quest*.TXT')
    npc = parse_member(npc_path)
    quest_docs = [parse_member(path) for path in quests]
    summary = {
        'schema': 1,
        'evidence': 'VERIFIED_STATIC_CONTENT_STRUCTURE',
        'scope': 'Structure recovered from hash-pinned 2.2 Quest.lib text members; command semantics remain raw unless separately verified.',
        'npc': {**npc['summary'], 'source_sha256': npc['source_sha256'], 'source_size': npc['source_size']},
        'quests': [
            {
                'source': q['source'],
                'source_sha256': q['source_sha256'],
                'source_size': q['source_size'],
                **q['summary'],
            }
            for q in quest_docs
        ],
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if include_text:
        (out / 'npc-script.json').write_text(json.dumps(npc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        quest_dir = out / 'quests'
        quest_dir.mkdir(exist_ok=True)
        for q in quest_docs:
            stem = Path(q['source']).stem.lower()
            (quest_dir / f'{stem}.json').write_text(json.dumps(q, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return summary


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--extracted-dir', type=Path, required=True, help='Directory containing extracted Quest.lib members')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--summary-only', action='store_true')
    args = ap.parse_args()
    summary = parse_extracted_dir(args.extracted_dir, args.out, include_text=not args.summary_only)
    print(json.dumps({'npc_count': summary['npc']['npc_count'], 'quest_count': len(summary['quests']), 'out': str(args.out)}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
