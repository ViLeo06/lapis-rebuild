#!/usr/bin/env python3
"""Static-only probe for NeoDark visual fidelity resources and runtime clues.

The probe never executes or imports the original game binary. It parses project-
owned ANI/SMF structures from an extracted client tree and inspects the pinned
UPX-decompressed PE image as bytes. Output is intentionally structural: authored
ANI cadence values, MagicRes row organization, SMF layer/flag distributions,
audio resource inventory, PE imports/call sites and bounded string xrefs.

It does *not* assign milliseconds/FPS to ANI timing, treat FOCUS rows as Body_
directions, or claim an audio/occlusion trigger without an exact code/data link.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import struct
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))

EXPECTED_UNPACKED_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"
EXPECTED_PACKED_SHA256 = "c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd"
EXPECTED_INSTALLER_SHA256 = "c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88"

AUDIO_SUFFIXES = {".wav", ".mp3", ".ogg", ".mid", ".midi", ".wma", ".snd"}
TIMING_IMPORTS = {
    "timegettime",
    "gettickcount",
    "gettickcount64",
    "queryperformancecounter",
    "queryperformancefrequency",
    "sleep",
}
AUDIO_IMPORTS = {
    "directsoundcreate",
    "directsoundcreate8",
    "playsounda",
    "playsoundw",
    "sndplaysounda",
    "sndplaysoundw",
    "mcisendstringa",
    "mcisendstringw",
    "mcisendcommanda",
    "mcisendcommandw",
    "waveoutopen",
    "waveoutwrite",
    "waveoutprepareheader",
    "waveoutreset",
    "waveoutclose",
}
BLIT_IMPORTS = {"alphablend", "transparentblt", "bitblt", "stretchblt"}
STRING_TOKENS = ("MagicRes", "FOCUS", "Body_", ".ani", ".spr", ".wav", ".mp3", ".mid", "sound", "bgm")
TARGET_BASES = {
    *(f"B{x}" for x in range(100, 200, 10)),
    *(f"B{x}" for x in range(109, 200, 10)),
}
TARGET_ACTIONS = {"00", "01", "02", "03", "05"}


@dataclass(frozen=True)
class Section:
    name: str
    rva: int
    vsize: int
    raw: int
    rsize: int
    characteristics: int

    @property
    def executable(self) -> bool:
        return bool(self.characteristics & 0x20000000)


@dataclass(frozen=True)
class PeInfo:
    image_base: int
    sections: tuple[Section, ...]
    import_rva: int
    import_size: int


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _counter_dict(values: Iterable[object]) -> dict[str, int]:
    c = collections.Counter(str(v) for v in values)

    def key(item: tuple[str, int]):
        k = item[0]
        try:
            return (0, float(k))
        except ValueError:
            return (1, k)

    return {k: v for k, v in sorted(c.items(), key=key)}


def _format_float(value: float) -> str:
    return str(int(value)) if value.is_integer() else repr(value)


def _paired_spr_count(path: Path) -> int | None:
    candidates = [path.with_suffix(".spr"), path.with_suffix(".SPR")]
    target = path.stem.lower() + ".spr"
    candidates.extend(p for p in path.parent.iterdir() if p.is_file() and p.name.lower() == target)
    seen: set[Path] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.is_file():
            data = candidate.read_bytes()[:4]
            if len(data) == 4:
                return struct.unpack("<I", data)[0]
    return None


def summarize_animations(client_root: Path) -> dict[str, object]:
    from ani import parse_ani  # type: ignore

    paths = sorted(client_root.rglob("*.ani"), key=lambda p: p.as_posix().lower())
    seen = {p.resolve() for p in paths}
    for p in client_root.rglob("*"):
        if p.is_file() and p.suffix.lower() == ".ani" and p.resolve() not in seen:
            paths.append(p)
    paths.sort(key=lambda p: p.as_posix().lower())

    timing: list[str] = []
    layers: list[str] = []
    layer_timing: dict[str, list[str]] = collections.defaultdict(list)
    target_rows: list[dict[str, object]] = []
    magic_rows: list[dict[str, object]] = []

    for path in paths:
        ani = parse_ani(path)
        rel = path.relative_to(client_root).as_posix()
        t = _format_float(float(ani.raw_timing))
        timing.append(t)
        layers.append(ani.layer_name)
        layer_timing[ani.layer_name].append(t)
        spr_count = _paired_spr_count(path)

        stem = path.stem
        m = re.fullmatch(r"(B\d+)_([0-9]{2})", stem, re.IGNORECASE)
        if m and m.group(1).upper() in TARGET_BASES and m.group(2) in TARGET_ACTIONS:
            target_rows.append(
                {
                    "path": rel,
                    "layer": ani.layer_name,
                    "frames_per_direction": ani.frames_per_direction,
                    "raw_timing": t,
                    "spr_frame_count": spr_count,
                    "row_unique_count": len({tuple(row) for row in ani.directions}),
                }
            )

        if "magicres" in {part.lower() for part in path.relative_to(client_root).parts[:-1]} or stem.lower().startswith("magic-"):
            rows = [tuple(row) for row in ani.directions]
            flat = [frame for row in rows for frame in row]
            row0 = list(rows[0]) if rows else []
            resource_match = re.search(r"(\d+)$", stem)
            magic_rows.append(
                {
                    "resource_id": int(resource_match.group(1)) if resource_match else None,
                    "path": rel,
                    "layer": ani.layer_name,
                    "frames_per_direction": ani.frames_per_direction,
                    "raw_timing": t,
                    "spr_frame_count": spr_count,
                    "unique_direction_rows": len(set(rows)),
                    "all_direction_rows_identical": len(set(rows)) == 1,
                    "row0_is_zero_based_sequence": row0 == list(range(len(row0))),
                    "unique_frame_index_count": len(set(flat)),
                    "max_active_frame_index": max(flat) if flat else None,
                    "all_active_indices_in_spr": (
                        all(frame < spr_count for frame in flat) if spr_count is not None else None
                    ),
                    "row0": row0,
                }
            )

    magic_rows.sort(key=lambda r: (r["resource_id"] is None, r["resource_id"] or 0, str(r["path"])))
    target_rows.sort(key=lambda r: str(r["path"]).lower())
    return {
        "ani_count": len(paths),
        "raw_timing_distribution": _counter_dict(timing),
        "layer_distribution": _counter_dict(layers),
        "timing_by_layer": {layer: _counter_dict(values) for layer, values in sorted(layer_timing.items())},
        "target_character_actions": target_rows,
        "magicres_count": len(magic_rows),
        "magicres": magic_rows,
        "facts": {
            "raw_timing_field_is_authored_and_variable": True,
            "raw_timing_unit": "UNVERIFIED",
            "body_direction_semantics_apply_to_focus": False,
        },
    }


def summarize_maps(client_root: Path) -> dict[str, object]:
    from map_bundle import parse_smf  # type: ignore

    sgres = client_root / "SGRes"
    if not sgres.is_dir():
        return {"smf_count": 0, "error": "SGRes directory missing"}
    paths = sorted((p for p in sgres.iterdir() if p.is_file() and p.suffix.lower() == ".smf"), key=lambda p: p.name.lower())
    layer_counter: collections.Counter[int] = collections.Counter()
    flags_counter: collections.Counter[int] = collections.Counter()
    map_rows: list[dict[str, object]] = []
    non_default_examples: list[dict[str, object]] = []
    total_records = 0
    parse_errors: list[str] = []

    for path in paths:
        try:
            model = parse_smf(path)
        except Exception as exc:
            parse_errors.append(f"{path.name}: {type(exc).__name__}: {exc}")
            continue
        records = model["records"]
        total_records += len(records)
        layers = collections.Counter(int(r["layer"]) for r in records)
        flags = collections.Counter(int(r["flags"]) for r in records)
        layer_counter.update(layers)
        flags_counter.update(flags)
        m = re.fullmatch(r"sz-(\d{4})\.smf", path.name, re.IGNORECASE)
        map_id = int(m.group(1)) if m else None
        if map_id in {0, 1, 450, 451, 452, 453, 454, 455}:
            map_rows.append(
                {
                    "map_id": map_id,
                    "path": path.relative_to(client_root).as_posix(),
                    "record_count": len(records),
                    "layer_distribution": _counter_dict(layers.elements()),
                    "flags_distribution": _counter_dict(flags.elements()),
                }
            )
        if len(non_default_examples) < 80:
            for record in records:
                if int(record["layer"]) != 0 or int(record["flags"]) != 0:
                    non_default_examples.append(
                        {
                            "map_id": map_id,
                            "record_offset": record["file_offset"],
                            "x": record["x"],
                            "y": record["y"],
                            "extent_x": record["extent_x"],
                            "extent_y": record["extent_y"],
                            "kind": record["kind"],
                            "object_id": record["object_id"],
                            "name": record["name"],
                            "layer": record["layer"],
                            "flags": record["flags"],
                        }
                    )
                    if len(non_default_examples) >= 80:
                        break

    map_rows.sort(key=lambda r: (r["map_id"] is None, r["map_id"] or 0))
    return {
        "smf_count": len(paths),
        "parsed_smf_count": len(paths) - len(parse_errors),
        "parse_errors": parse_errors[:20],
        "record_count": total_records,
        "layer_distribution": _counter_dict(layer_counter.elements()),
        "flags_distribution": _counter_dict(flags_counter.elements()),
        "nonzero_layer_records": sum(v for k, v in layer_counter.items() if k != 0),
        "nonzero_flag_records": sum(v for k, v in flags_counter.items() if k != 0),
        "selected_maps": map_rows,
        "non_default_examples": non_default_examples,
        "interpretation": "SMF layer/flags are authored fields; exact retail occlusion semantics remain UNVERIFIED until consumer code is linked.",
    }


def classify_audio_path(rel: str) -> str:
    s = "/" + rel.lower().replace("\\", "/").strip("/")
    if any(token in s for token in ("/bgm", "music", "/midi", "/mid/")):
        return "BGM_NAME_HEURISTIC"
    if any(token in s for token in ("sound", "/sfx", "/se/", "effect", "wave")):
        return "SFX_NAME_HEURISTIC"
    return "UNCLASSIFIED"


def summarize_audio(client_root: Path, image: bytes | None = None) -> dict[str, object]:
    files = sorted(
        (p for p in client_root.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_SUFFIXES),
        key=lambda p: p.as_posix().lower(),
    )
    ext_counter = collections.Counter(p.suffix.lower() for p in files)
    role_counter = collections.Counter()
    inventory = []
    exact_binary_names: list[str] = []
    image_lower = image.lower() if image is not None else None
    for p in files:
        rel = p.relative_to(client_root).as_posix()
        role = classify_audio_path(rel)
        role_counter[role] += 1
        referenced = False
        try:
            raw_name = p.name.encode("ascii")
        except UnicodeEncodeError:
            raw_name = b""
        if image_lower is not None and raw_name and raw_name.lower() in image_lower:
            referenced = True
            exact_binary_names.append(rel)
        inventory.append({"path": rel, "size": p.stat().st_size, "extension": p.suffix.lower(), "name_role": role, "filename_in_binary": referenced})
    return {
        "resource_count": len(files),
        "extension_distribution": _counter_dict(ext_counter.elements()),
        "name_role_distribution": dict(sorted(role_counter.items())),
        "inventory": inventory,
        "exact_filename_references_in_binary": exact_binary_names,
        "warning": "BGM/SFX labels above are filename/path heuristics only; trigger semantics require code or runtime evidence.",
    }


def parse_pe32(data: bytes) -> PeInfo:
    if len(data) < 0x100 or data[:2] != b"MZ":
        raise ValueError("not MZ")
    pe = struct.unpack_from("<I", data, 0x3C)[0]
    if pe + 24 > len(data) or data[pe : pe + 4] != b"PE\0\0":
        raise ValueError("not PE")
    coff = pe + 4
    count = struct.unpack_from("<H", data, coff + 2)[0]
    opt_size = struct.unpack_from("<H", data, coff + 16)[0]
    opt = coff + 20
    if opt + opt_size > len(data) or struct.unpack_from("<H", data, opt)[0] != 0x10B:
        raise ValueError("not PE32")
    image_base = struct.unpack_from("<I", data, opt + 28)[0]
    number_of_rva_and_sizes = struct.unpack_from("<I", data, opt + 92)[0]
    import_rva = import_size = 0
    if number_of_rva_and_sizes > 1 and opt + 112 <= len(data):
        import_rva, import_size = struct.unpack_from("<II", data, opt + 104)
    table = opt + opt_size
    sections: list[Section] = []
    for index in range(count):
        off = table + index * 40
        if off + 40 > len(data):
            raise ValueError("truncated section table")
        name = data[off : off + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        vsize, rva, rsize, raw = struct.unpack_from("<IIII", data, off + 8)
        characteristics = struct.unpack_from("<I", data, off + 36)[0]
        if raw + rsize > len(data):
            raise ValueError(f"section {name} exceeds file")
        sections.append(Section(name, rva, vsize, raw, rsize, characteristics))
    return PeInfo(image_base, tuple(sections), import_rva, import_size)


def rva_to_offset(rva: int, pe: PeInfo) -> int:
    for section in pe.sections:
        size = max(section.vsize, section.rsize)
        if section.rva <= rva < section.rva + size:
            delta = rva - section.rva
            if delta >= section.rsize:
                raise ValueError(f"RVA 0x{rva:x} not file-backed")
            return section.raw + delta
    if 0 <= rva < min((s.raw for s in pe.sections), default=0x7fffffff):
        return rva
    raise ValueError(f"RVA 0x{rva:x} not mapped")


def offset_to_va(offset: int, pe: PeInfo) -> int | None:
    for section in pe.sections:
        if section.raw <= offset < section.raw + section.rsize:
            return pe.image_base + section.rva + (offset - section.raw)
    return pe.image_base + offset if offset >= 0 else None


def _cstr(data: bytes, offset: int, limit: int = 512) -> str:
    if not 0 <= offset < len(data):
        return ""
    end = data.find(b"\0", offset, min(len(data), offset + limit))
    if end < 0:
        end = min(len(data), offset + limit)
    return data[offset:end].decode("ascii", "replace")


def parse_imports(data: bytes, pe: PeInfo) -> list[dict[str, object]]:
    if not pe.import_rva:
        return []
    pos = rva_to_offset(pe.import_rva, pe)
    imports: list[dict[str, object]] = []
    for _ in range(4096):
        if pos + 20 > len(data):
            break
        oft, ts, fc, name_rva, ft = struct.unpack_from("<IIIII", data, pos)
        pos += 20
        if not any((oft, ts, fc, name_rva, ft)):
            break
        dll = _cstr(data, rva_to_offset(name_rva, pe), 256)
        thunk_rva = oft or ft
        try:
            thunk_off = rva_to_offset(thunk_rva, pe)
        except ValueError:
            continue
        for idx in range(8192):
            if thunk_off + idx * 4 + 4 > len(data):
                break
            thunk = struct.unpack_from("<I", data, thunk_off + idx * 4)[0]
            if thunk == 0:
                break
            if thunk & 0x80000000:
                func = f"ordinal:{thunk & 0xffff}"
            else:
                try:
                    name_off = rva_to_offset(thunk, pe)
                    func = _cstr(data, name_off + 2, 256)
                except ValueError:
                    func = "<bad-name-rva>"
            imports.append({"dll": dll, "function": func, "iat_va": pe.image_base + ft + idx * 4})
    return imports


def scan_iat_calls(data: bytes, pe: PeInfo, imports: list[dict[str, object]], wanted: set[str]) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    wanted_lower = {x.lower() for x in wanted}
    for item in imports:
        func = str(item["function"])
        if func.lower() not in wanted_lower:
            continue
        needle = b"\xff\x15" + struct.pack("<I", int(item["iat_va"]))
        callsites: list[str] = []
        for section in pe.sections:
            if not section.executable:
                continue
            blob = data[section.raw : section.raw + section.rsize]
            start = 0
            while True:
                i = blob.find(needle, start)
                if i < 0:
                    break
                callsites.append(f"0x{pe.image_base + section.rva + i:08x}")
                start = i + 1
                if len(callsites) >= 128:
                    break
            if len(callsites) >= 128:
                break
        out.append({**item, "direct_iat_calls": callsites})
    return out


def scan_ascii_token_xrefs(data: bytes, pe: PeInfo) -> list[dict[str, object]]:
    strings: list[tuple[int, str]] = []
    for m in re.finditer(rb"[ -~]{4,}\x00", data):
        text = m.group(0)[:-1].decode("ascii", "replace")
        low = text.lower()
        if any(token.lower() in low for token in STRING_TOKENS):
            strings.append((m.start(), text))
    strings = strings[:400]
    out: list[dict[str, object]] = []
    for off, text in strings:
        va = offset_to_va(off, pe)
        refs: list[str] = []
        if va is not None:
            needle = struct.pack("<I", va)
            for section in pe.sections:
                if not section.executable:
                    continue
                blob = data[section.raw : section.raw + section.rsize]
                start = 0
                while True:
                    i = blob.find(needle, start)
                    if i < 0:
                        break
                    refs.append(f"0x{pe.image_base + section.rva + i:08x}")
                    start = i + 1
                    if len(refs) >= 24:
                        break
                if len(refs) >= 24:
                    break
        out.append({"va": f"0x{va:08x}" if va is not None else None, "text": text, "code_absolute_refs": refs})
    return out


def code_windows(data: bytes, pe: PeInfo, call_rows: list[dict[str, object]], radius: int = 48) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    for row in call_rows:
        for va_text in row.get("direct_iat_calls", [])[:20]:
            va = int(str(va_text), 16)
            rva = va - pe.image_base
            try:
                off = rva_to_offset(rva, pe)
            except ValueError:
                continue
            a = max(0, off - radius)
            b = min(len(data), off + 6 + radius)
            out.append({"function": row["function"], "call_va": va_text, "window_start_va": f"0x{(offset_to_va(a, pe) or 0):08x}", "hex": data[a:b].hex()})
    return out


def summarize_binary(image_path: Path) -> tuple[dict[str, object], bytes]:
    data = image_path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_UNPACKED_SHA256:
        raise ValueError(f"unpacked image hash mismatch: {digest}")
    pe = parse_pe32(data)
    imports = parse_imports(data, pe)
    timing_calls = scan_iat_calls(data, pe, imports, TIMING_IMPORTS)
    audio_calls = scan_iat_calls(data, pe, imports, AUDIO_IMPORTS)
    blit_calls = scan_iat_calls(data, pe, imports, BLIT_IMPORTS)
    return (
        {
            "input": {"file": image_path.name, "size": len(data), "sha256": digest, "expected_packed_sha256": EXPECTED_PACKED_SHA256, "expected_installer_sha256": EXPECTED_INSTALLER_SHA256},
            "pe": {"image_base": f"0x{pe.image_base:08x}", "sections": [{"name": s.name, "rva": f"0x{s.rva:08x}", "raw_size": s.rsize, "executable": s.executable} for s in pe.sections]},
            "timing_import_calls": timing_calls,
            "audio_import_calls": audio_calls,
            "blit_import_calls": blit_calls,
            "candidate_code_windows": code_windows(data, pe, timing_calls + audio_calls + blit_calls),
            "visual_audio_strings": scan_ascii_token_xrefs(data, pe),
            "interpretation": {
                "api_callsite_status": "VERIFIED_STATIC_IMPORT_XREF",
                "ani_timing_consumer": "UNVERIFIED_UNTIL_DATAFLOW_LINKED",
                "audio_trigger_semantics": "UNVERIFIED_UNTIL_RESOURCE_AND_ACTION_PATH_LINKED",
                "blend_semantics": "UNVERIFIED_UNTIL_DRAW_CALL_ARGUMENTS_LINKED",
            },
        },
        data,
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--image", type=Path, required=True, help="Hash-pinned UPX-decompressed NeoDark.exe image")
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    client = args.client_root.resolve()
    if not client.is_dir():
        raise FileNotFoundError(client)
    binary, image = summarize_binary(args.image.resolve())
    payload = {
        "schema": 1,
        "evidence": "VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "safety": "Static parsing/byte inspection only. Original executable and DLLs were not loaded or executed.",
        "animations": summarize_animations(client),
        "maps": summarize_maps(client),
        "audio": summarize_audio(client, image),
        "binary": binary,
        "boundaries": [
            "ANI raw timing is demonstrably authored and variable; its time unit and exact consumer formula are not assigned without a dataflow link.",
            "FOCUS/_FOCUS rows are structural ANI rows only; Body_ direction semantics are not applied.",
            "SMF layer/flags are retained as authored fields; their retail foreground/character ordering semantics require consumer-code evidence.",
            "Audio filenames/resources and imported playback APIs do not by themselves prove attack/hit/magic/death trigger mapping.",
        ],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"out": str(args.out), "ani": payload["animations"]["ani_count"], "magic": payload["animations"]["magicres_count"], "smf": payload["maps"]["smf_count"], "audio": payload["audio"]["resource_count"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
