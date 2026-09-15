#!/usr/bin/env python3
"""Parse Neohelp.txt and Prologue.txt recovered from Quest.lib.

Neohelp numeric fields are intentionally retained as raw values. The parser
verifies section/record framing only; it does not assign engine semantics to the
second, third, or fourth numeric fields. Prologue is preserved as ordered text
for private generated assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

HEADER_RE = re.compile(r'^([0-9]+)\s+([0-9]+)\s*$')
RECORD_RE = re.compile(r'^(-?[0-9]+)\s+(-?[0-9]+)\s+(-?[0-9]+)\s+(-?[0-9]+)(?:\s+(.*))?$')


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


def parse_neohelp_text(text: str, source_name: str = 'Neohelp.txt') -> dict[str, Any]:
    lines = text.splitlines()
    sections: list[dict[str, Any]] = []
    comments: list[dict[str, Any]] = []
    seen: set[int] = set()
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
        header = HEADER_RE.fullmatch(raw)
        if not header:
            raise ValueError(f'{source_name}:{line_no}: expected section header')
        section_id = int(header.group(1)); record_count = int(header.group(2))
        if section_id in seen:
            raise ValueError(f'{source_name}:{line_no}: duplicate section {section_id}')
        if record_count < 0 or record_count > 100000:
            raise ValueError(f'{source_name}:{line_no}: unreasonable record count')
        seen.add(section_id)
        records: list[dict[str, Any]] = []
        while len(records) < record_count:
            if i >= len(lines):
                raise ValueError(f'{source_name}:{line_no}: section {section_id} truncated')
            record_line = i + 1
            physical = lines[i].rstrip('\r\n')
            i += 1
            stripped = physical.strip()
            if not stripped:
                raise ValueError(f'{source_name}:{record_line}: blank line inside section {section_id}')
            if stripped.startswith(';'):
                raise ValueError(f'{source_name}:{record_line}: comment inside section {section_id}')
            match = RECORD_RE.fullmatch(stripped)
            if not match:
                raise ValueError(f'{source_name}:{record_line}: invalid record')
            fields = [int(match.group(index)) for index in range(1, 5)]
            if fields[0] != section_id:
                raise ValueError(f'{source_name}:{record_line}: record section id {fields[0]} != {section_id}')
            records.append({'line': record_line, 'raw_numeric': fields, 'text': match.group(5) or ''})
        sections.append({'section_id': section_id, 'line': line_no, 'declared_record_count': record_count, 'records': records})

    if not sections:
        raise ValueError(f'{source_name}: no sections')
    if comments and comments[-1]['value'].strip() != '999':
        raise ValueError(f'{source_name}: unexpected trailing comment marker')
    ids = {section['section_id'] for section in sections}
    third_nonnegative = [
        record['raw_numeric'][2]
        for section in sections for record in section['records']
        if record['raw_numeric'][2] >= 0
    ]
    style_counts = Counter(record['raw_numeric'][3] for section in sections for record in section['records'])
    return {
        'schema': 1,
        'source': source_name,
        'sections': sections,
        'comments': comments,
        'summary': {
            'section_count': len(sections),
            'section_ids': [section['section_id'] for section in sections],
            'record_count': sum(section['declared_record_count'] for section in sections),
            'fourth_field_counts': {str(key): value for key, value in sorted(style_counts.items())},
            'nonnegative_third_field_count': len(third_nonnegative),
            'nonnegative_third_fields_reference_existing_sections': all(value in ids for value in third_nonnegative),
        },
    }


def parse_prologue_text(text: str, source_name: str = 'Prologue.txt') -> dict[str, Any]:
    body: list[dict[str, Any]] = []
    comments: list[dict[str, Any]] = []
    for line_no, original in enumerate(text.splitlines(), 1):
        stripped = original.strip()
        if stripped.startswith(';'):
            comments.append({'line': line_no, 'value': stripped[1:]})
        else:
            body.append({'line': line_no, 'text': original.rstrip('\r\n')})
    if not body:
        raise ValueError(f'{source_name}: empty prologue')
    if not comments or comments[-1]['value'].strip() != '999':
        raise ValueError(f'{source_name}: missing trailing ;999 marker')
    return {
        'schema': 1,
        'source': source_name,
        'lines': body,
        'comments': comments,
        'summary': {
            'line_count': len(body),
            'nonempty_line_count': sum(bool(line['text'].strip()) for line in body),
            'comment_count': len(comments),
        },
    }


def parse_file(path: Path, kind: str) -> dict[str, Any]:
    raw = path.read_bytes(); text = decode_legacy_text(raw)
    if kind == 'neohelp': parsed = parse_neohelp_text(text, path.name)
    elif kind == 'prologue': parsed = parse_prologue_text(text, path.name)
    else: raise ValueError(f'unknown kind {kind!r}')
    parsed['source_sha256'] = sha256_bytes(raw); parsed['source_size'] = len(raw)
    return parsed


def main() -> int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--neohelp',type=Path,required=True);ap.add_argument('--prologue',type=Path,required=True);ap.add_argument('--out',type=Path,required=True)
    args=ap.parse_args();neohelp=parse_file(args.neohelp,'neohelp');prologue=parse_file(args.prologue,'prologue');args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'neohelp.json').write_text(json.dumps(neohelp,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    (args.out/'prologue.json').write_text(json.dumps(prologue,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    summary={'schema':1,'evidence':'VERIFIED_STATIC_CONTENT_STRUCTURE','neohelp':{**neohelp['summary'],'source_sha256':neohelp['source_sha256'],'source_size':neohelp['source_size']},'prologue':{**prologue['summary'],'source_sha256':prologue['source_sha256'],'source_size':prologue['source_size']}}
    (args.out/'neohelp-prologue-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'section_count':neohelp['summary']['section_count'],'record_count':neohelp['summary']['record_count'],'prologue_lines':prologue['summary']['line_count'],'out':str(args.out)},ensure_ascii=False));return 0


if __name__=='__main__':raise SystemExit(main())
