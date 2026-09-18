#!/usr/bin/env python3
"""Verify fixed-hash battle roster -> character visual resource binding.

Static byte inspection only. The original client is never executed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"))
from probe_ai_binding import EXPECTED_SHA256,parse_sections,verify  # type: ignore

SPECS=[
    ("roster_unit_key_and_visual_model_are_distinct_args",0x004B3E5B,
     "8b4d088b550051528bcee856ccffff8b450083cfff894624"),
    ("roster_visual_model_arg2_resolves_visual_cache",0x004B0AD1,
     "8b7c2410b938f3990057e830fafeff85c0740c8b80ac0200008986cc0200008b0de03ca70057e844ebf5ff85c00f84ac00000085ff7d0c81ff581b00007c0433c0eb0a8b0de03ca7008b44b90489460c"),
    ("visual_cache_object_records_model_id_at_234",0x0040F661,
     "3d581b00007d768b4c860485c975578b866c6d00008d8e646d00008d542418526a0150e8b7da00006838020000e8d0e20b0083c4048944240485c0c74424100000000074098bc8e883000000eb0233c08b4c241889448e048b4424188b548604898234020000"),
    ("live_unit_visual_object_drives_action_loader",0x004B2037,
     "8b4e0885c90f85b70000008b7e0c83f80a8986ec0200007c0433ffeb388d0cc5000000002bc88b54cf088d0ccf85d274058d7904eb1f6a006a01508bcfe847dcf5ff"),
    ("visual_loader_preserves_original_ecx_object",0x0040FCDC,
     "8bb4243001000085f6894c240c0f8cb203000083fe0a0f8da90300008d04f500000000532bc655578d3cc1"),
    ("visual_loader_formats_model_234_and_action_state",0x0040FD4E,
     "8b6c2418568d5424308b8d3402000051506850484f0052e863020b008d04f5000000008d5424402bc68d4cc50c5152e87e8a0600"),
]


def binding_facts()->dict:
    return {
        "battle_roster_record":{
            "unit_program_key_offset":"0x00",
            "visual_model_id_offset":"0x08",
            "status":"VERIFIED_STATIC_ORIGINAL",
            "note":"The two fields are distinct. +0x00 remains the S2 unit/program key; +0x08 is passed to the character visual cache.",
        },
        "live_battle_unit":{
            "visual_object_pointer_offset":"0x0C",
            "unit_program_key_offset":"0x24",
            "status":"VERIFIED_STATIC_ORIGINAL",
        },
        "visual_cache_object":{
            "model_id_offset":"0x234",
            "status":"VERIFIED_STATIC_ORIGINAL",
            "source":"cache index supplied from battle roster +0x08",
        },
        "ani_binding":{
            "format":"B%03d_%02d.ani",
            "model_argument":"visual object +0x234",
            "action_argument":"character action state",
            "status":"VERIFIED_STATIC_ORIGINAL",
        },
        "chain":"battle roster +0x08 -> visual cache/model object +0x234 -> live unit +0x0C visual object -> action loader -> B%03d_%02d.ani",
        "boundary":"This proves the retail client visual-model binding field. It does not assign names/species to model IDs and does not make roster +0x00 equal to the visual model ID.",
    }


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("image",type=Path)
    ap.add_argument("--out",type=Path,required=True)
    args=ap.parse_args()
    data=args.image.read_bytes()
    digest=hashlib.sha256(data).hexdigest()
    if digest!=EXPECTED_SHA256:
        raise ValueError(f"unpacked image hash mismatch: {digest}")
    sections=parse_sections(data)
    signatures=[verify(data,sections,*spec) for spec in SPECS]
    payload={
        "schema":1,
        "evidence":"VERIFIED_STATIC_ORIGINAL_FIXED_HASH",
        "input_sha256":digest,
        "signatures":signatures,
        "facts":binding_facts(),
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"signatures":len(signatures),"visual_model_offset":"0x08","output":str(args.out)}))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
