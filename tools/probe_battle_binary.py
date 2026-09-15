#!/usr/bin/env python3
"""Locate battle-resource references in the hash-pinned NeoDark.exe statically.

The probe does not execute, load, inject into, or modify the binary. It parses
only enough PE32 metadata to map file offsets to virtual addresses, finds
battle-related strings, and scans executable sections for absolute 32-bit
references to those strings. Results are addresses/bytes for archaeology, not
claims about higher-level semantics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
from dataclasses import dataclass
from pathlib import Path

EXPECTED_SHA256 = "c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd"
TARGET_STRINGS = [
    "CombatMap.Tip",
    "NRes/CombatMap.Tip",
    "CombatSelect.Tdg",
    "Dlg/CombatSelect.Tdg",
    "Combat",
    "combat",
    "Battle",
    "battle",
    "Tick",
    "tick",
]
KEYWORDS = ("combat", "battle", "tick", "turn", "attack", "move", "range", "target")


@dataclass(frozen=True)
class Section:
    name: str
    virtual_size: int
    virtual_address: int
    raw_size: int
    raw_pointer: int
    characteristics: int

    @property
    def executable(self) -> bool:
        return bool(self.characteristics & 0x20000000)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse_pe(data: bytes) -> tuple[dict[str, int], list[Section]]:
    if len(data) < 0x100 or data[:2] != b"MZ":
        raise ValueError("not an MZ executable")
    pe_off = struct.unpack_from("<I", data, 0x3C)[0]
    if pe_off + 24 > len(data) or data[pe_off : pe_off + 4] != b"PE\0\0":
        raise ValueError("missing PE signature")
    coff = pe_off + 4
    machine, section_count, timestamp, _ptr_symbols, _num_symbols, opt_size, characteristics = struct.unpack_from("<HHIIIHH", data, coff)
    opt = coff + 20
    if opt + opt_size > len(data):
        raise ValueError("truncated optional header")
    magic = struct.unpack_from("<H", data, opt)[0]
    if magic != 0x10B:
        raise ValueError(f"expected PE32 optional header, got 0x{magic:04x}")
    entry_rva = struct.unpack_from("<I", data, opt + 16)[0]
    image_base = struct.unpack_from("<I", data, opt + 28)[0]
    section_alignment = struct.unpack_from("<I", data, opt + 32)[0]
    file_alignment = struct.unpack_from("<I", data, opt + 36)[0]
    size_of_image = struct.unpack_from("<I", data, opt + 56)[0]
    section_table = opt + opt_size
    sections: list[Section] = []
    for i in range(section_count):
        off = section_table + i * 40
        if off + 40 > len(data):
            raise ValueError("truncated section table")
        raw_name = data[off : off + 8].split(b"\0", 1)[0]
        name = raw_name.decode("ascii", errors="replace")
        virtual_size, virtual_address, raw_size, raw_pointer = struct.unpack_from("<IIII", data, off + 8)
        characteristics_s = struct.unpack_from("<I", data, off + 36)[0]
        if raw_pointer + raw_size > len(data) and raw_size:
            raise ValueError(f"section {name} exceeds file")
        sections.append(Section(name, virtual_size, virtual_address, raw_size, raw_pointer, characteristics_s))
    return {
        "pe_offset": pe_off,
        "machine": machine,
        "section_count": section_count,
        "timestamp": timestamp,
        "optional_header_size": opt_size,
        "characteristics": characteristics,
        "entry_rva": entry_rva,
        "entry_va": image_base + entry_rva,
        "image_base": image_base,
        "section_alignment": section_alignment,
        "file_alignment": file_alignment,
        "size_of_image": size_of_image,
    }, sections


def file_offset_to_va(offset: int, image_base: int, sections: list[Section]) -> int | None:
    for s in sections:
        if s.raw_pointer <= offset < s.raw_pointer + s.raw_size:
            return image_base + s.virtual_address + (offset - s.raw_pointer)
    return None


def find_all(data: bytes, needle: bytes) -> list[int]:
    out = []
    start = 0
    while True:
        pos = data.find(needle, start)
        if pos < 0:
            return out
        out.append(pos)
        start = pos + 1


def context_hex(data: bytes, offset: int, before: int = 20, after: int = 24) -> dict[str, object]:
    start = max(0, offset - before)
    end = min(len(data), offset + after)
    return {"start_file_offset": start, "focus_file_offset": offset, "hex": data[start:end].hex()}


def xrefs_to_va(data: bytes, target_va: int, image_base: int, sections: list[Section]) -> list[dict[str, object]]:
    encoded = struct.pack("<I", target_va)
    refs: list[dict[str, object]] = []
    for section in sections:
        if not section.executable or not section.raw_size:
            continue
        body = data[section.raw_pointer : section.raw_pointer + section.raw_size]
        for local in find_all(body, encoded):
            file_off = section.raw_pointer + local
            refs.append({
                "section": section.name,
                "file_offset": file_off,
                "va": image_base + section.virtual_address + local,
                "preceding_opcode_byte": data[file_off - 1] if file_off else None,
                "context": context_hex(data, file_off),
            })
    return refs


def printable_keyword_strings(data: bytes, limit: int = 200) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    for m in re.finditer(rb"[\x20-\x7e]{4,}", data):
        text = m.group().decode("ascii", errors="strict")
        lower = text.lower()
        hits = [k for k in KEYWORDS if k in lower]
        if not hits:
            continue
        out.append({"file_offset": m.start(), "text": text[:240], "keyword_hits": hits})
        if len(out) >= limit:
            break
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("exe", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    data = args.exe.read_bytes()
    digest = sha256(data)
    if digest != EXPECTED_SHA256:
        raise ValueError(f"NeoDark.exe hash mismatch: {digest}")
    pe, sections = parse_pe(data)
    image_base = pe["image_base"]

    targets = []
    for text in TARGET_STRINGS:
        for encoding, needle in (("ascii", text.encode("ascii")), ("utf16le", text.encode("utf-16le"))):
            for offset in find_all(data, needle):
                va = file_offset_to_va(offset, image_base, sections)
                targets.append({
                    "text": text,
                    "encoding": encoding,
                    "file_offset": offset,
                    "va": va,
                    "xrefs": xrefs_to_va(data, va, image_base, sections) if va is not None else [],
                })

    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_PE_XREF_PROBE",
        "scope": "Hash-pinned NeoDark.exe; no execution; xrefs are exact immediate-byte matches and do not by themselves prove function semantics.",
        "input": {"path": args.exe.name, "size": len(data), "sha256": digest},
        "pe": pe,
        "sections": [
            {
                "name": s.name,
                "virtual_size": s.virtual_size,
                "virtual_address": s.virtual_address,
                "raw_size": s.raw_size,
                "raw_pointer": s.raw_pointer,
                "characteristics": f"0x{s.characteristics:08x}",
                "executable": s.executable,
            }
            for s in sections
        ],
        "target_strings": targets,
        "keyword_strings": printable_keyword_strings(data),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "sha256": digest,
        "entry_va": f"0x{pe['entry_va']:08x}",
        "sections": len(sections),
        "target_occurrences": len(targets),
        "absolute_xrefs": sum(len(t["xrefs"]) for t in targets),
        "keyword_strings": len(payload["keyword_strings"]),
        "output": str(args.out),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
