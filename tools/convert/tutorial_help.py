#!/usr/bin/env python3
"""Parse recovered Tutorial.txt and HelpScript.txt grammar from Quest.lib.

Only file structure is interpreted. Inline rich-text tags, tutorial transitions,
help numeric records, and other engine semantics remain raw unless the source
syntax itself makes the relationship explicit. Full text output is intended for
private generated assets, not repository source control.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

TALK_START_RE = re.compile(r'^<TALK([1-9][0-9]*)>$')
TALK_END_RE = re.compile(r'^</TALK>(?:<(Tutorial_NextStep|Tutorial_End|LinkTalk_([1-9][0-9]*))>)?$')
TUTORIAL_NAME_RE = re.compile(r'^<NAME([0-9]+)>$')
TUTORIAL_RGB_RE = re.compile(r'^<RGB([0-9]+),([0-9]+),([0-9]+)>$')
HELP_RE = re.compile(r'^HELP([1-9][0-9]*)$')
HELP_STEP_RE = re.compile(r'^STEP([1-9][0-9]*)$')
TUTORIAL_SIMPLE_CONTROLS = {'<NEXT>', '<BR>', '<NOTCLOSE>', '<DRAWTOP>'}


def decode_legacy_text(data: bytes) -> str:
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


def parse_tutorial_text(text: str, source_name: str = 'Tutorial.txt') -> dict[str, Any]:
    talks: list[dict[str, Any]] = []
    comments: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    ids: set[int] = set()
    controls: Counter[str] = Counter()
    transitions: Counter[str] = Counter()
    text_lines = 0

    for line_no, original in enumerate(text.splitlines(), 1):
        raw = original.strip()
        if not raw:
            continue
        if raw.startswith(';'):
            comments.append({'line': line_no, 'value': raw[1:]})
            continue

        match = TALK_START_RE.fullmatch(raw)
        if match:
            if current is not None:
                raise ValueError(f'{source_name}:{line_no}: nested TALK')
            talk_id = int(match.group(1))
            if talk_id in ids:
                raise ValueError(f'{source_name}:{line_no}: duplicate TALK {talk_id}')
            ids.add(talk_id)
            current = {'talk_id': talk_id, 'line': line_no, 'events': [], 'transition': None}
            continue

        match = TALK_END_RE.fullmatch(raw)
        if match:
            if current is None:
                raise ValueError(f'{source_name}:{line_no}: closing TALK without open block')
            tag = match.group(1)
            if tag:
                transition: dict[str, Any]
                if tag.startswith('LinkTalk_'):
                    transition = {'kind': 'LinkTalk', 'target': int(match.group(2))}
                else:
                    transition = {'kind': tag}
                current['transition'] = transition
                transitions[transition['kind']] += 1
            current['end_line'] = line_no
            talks.append(current)
            current = None
            continue

        if current is None:
            raise ValueError(f'{source_name}:{line_no}: content outside TALK')

        match = TUTORIAL_NAME_RE.fullmatch(raw)
        if match:
            current['events'].append({'kind': 'speaker', 'speaker': int(match.group(1))})
            controls['NAME'] += 1
            continue

        match = TUTORIAL_RGB_RE.fullmatch(raw)
        if match:
            rgb = [int(match.group(index)) for index in range(1, 4)]
            if any(value > 255 for value in rgb):
                raise ValueError(f'{source_name}:{line_no}: RGB value out of range')
            current['events'].append({'kind': 'control', 'command': 'RGB', 'value': rgb})
            controls['RGB'] += 1
            continue

        if raw in TUTORIAL_SIMPLE_CONTROLS:
            command = raw[1:-1]
            current['events'].append({'kind': 'control', 'command': command})
            controls[command] += 1
            continue

        # Lines containing inline tags such as <CL0>, <L2>, <F4> or localized
        # angle-bracket text remain verbatim. Their rendering semantics are not
        # inferred by this structural parser.
        current['events'].append({'kind': 'text', 'text': original.rstrip()})
        text_lines += 1

    if current is not None:
        raise ValueError(f"{source_name}: unterminated TALK {current['talk_id']}")
    if not talks:
        raise ValueError(f'{source_name}: no TALK blocks')
    if comments and comments[-1]['value'].strip() != '999':
        raise ValueError(f'{source_name}: unexpected trailing comment marker')

    return {
        'schema': 1,
        'source': source_name,
        'talks': talks,
        'comments': comments,
        'summary': {
            'talk_count': len(talks),
            'talk_ids': [talk['talk_id'] for talk in talks],
            'text_line_count': text_lines,
            'control_counts': dict(sorted(controls.items())),
            'transition_counts': dict(sorted(transitions.items())),
        },
    }


def parse_help_script_text(text: str, source_name: str = 'HelpScript.txt') -> dict[str, Any]:
    helps: list[dict[str, Any]] = []
    comments: list[dict[str, Any]] = []
    current_help: dict[str, Any] | None = None
    current_step: dict[str, Any] | None = None
    help_ids: set[int] = set()

    def finish_help() -> None:
        nonlocal current_help, current_step
        if current_help is None:
            return
        if not current_help['steps']:
            raise ValueError(f"{source_name}:{current_help['line']}: HELP {current_help['help_id']} has no steps")
        helps.append(current_help)
        current_help = None
        current_step = None

    for line_no, original in enumerate(text.splitlines(), 1):
        raw = original.strip()
        if not raw:
            continue
        if raw.startswith(';'):
            comments.append({'line': line_no, 'value': raw[1:]})
            continue

        match = HELP_RE.fullmatch(raw)
        if match:
            finish_help()
            help_id = int(match.group(1))
            if help_id in help_ids:
                raise ValueError(f'{source_name}:{line_no}: duplicate HELP {help_id}')
            help_ids.add(help_id)
            current_help = {'help_id': help_id, 'line': line_no, 'steps': []}
            current_step = None
            continue

        match = HELP_STEP_RE.fullmatch(raw)
        if match:
            if current_help is None:
                raise ValueError(f'{source_name}:{line_no}: STEP outside HELP')
            number = int(match.group(1))
            expected = len(current_help['steps']) + 1
            if number != expected:
                raise ValueError(
                    f"{source_name}:{line_no}: HELP {current_help['help_id']} non-sequential STEP {number}, expected {expected}"
                )
            current_step = {'number': number, 'line': line_no, 'records': []}
            current_help['steps'].append(current_step)
            continue

        if current_step is None:
            raise ValueError(f'{source_name}:{line_no}: record outside STEP')
        fields = raw.split()
        if len(fields) != 4:
            raise ValueError(f'{source_name}:{line_no}: expected four integer fields')
        try:
            record = [int(field) for field in fields]
        except ValueError as exc:
            raise ValueError(f'{source_name}:{line_no}: invalid integer record') from exc
        current_step['records'].append(record)

    finish_help()
    if not helps:
        raise ValueError(f'{source_name}: no HELP blocks')
    if comments and comments[-1]['value'].strip() != '999':
        raise ValueError(f'{source_name}: unexpected trailing comment marker')

    return {
        'schema': 1,
        'source': source_name,
        'helps': helps,
        'comments': comments,
        'summary': {
            'help_count': len(helps),
            'help_ids': [help_block['help_id'] for help_block in helps],
            'step_count': sum(len(help_block['steps']) for help_block in helps),
            'record_count': sum(len(step['records']) for help_block in helps for step in help_block['steps']),
            'comment_count': len(comments),
        },
    }


def parse_file(path: Path, kind: str) -> dict[str, Any]:
    raw = path.read_bytes()
    text = decode_legacy_text(raw)
    if kind == 'tutorial':
        parsed = parse_tutorial_text(text, path.name)
    elif kind == 'help':
        parsed = parse_help_script_text(text, path.name)
    else:
        raise ValueError(f'unknown kind {kind!r}')
    parsed['source_sha256'] = sha256_bytes(raw)
    parsed['source_size'] = len(raw)
    return parsed


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--tutorial', type=Path, required=True)
    ap.add_argument('--help-script', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    tutorial = parse_file(args.tutorial, 'tutorial')
    help_script = parse_file(args.help_script, 'help')
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / 'tutorial.json').write_text(json.dumps(tutorial, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    (args.out / 'help-script.json').write_text(json.dumps(help_script, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    summary = {
        'schema': 1,
        'evidence': 'VERIFIED_STATIC_CONTENT_STRUCTURE',
        'tutorial': {**tutorial['summary'], 'source_sha256': tutorial['source_sha256'], 'source_size': tutorial['source_size']},
        'help_script': {**help_script['summary'], 'source_sha256': help_script['source_sha256'], 'source_size': help_script['source_size']},
    }
    (args.out / 'tutorial-help-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'talk_count': tutorial['summary']['talk_count'], 'help_count': help_script['summary']['help_count'], 'out': str(args.out)}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
