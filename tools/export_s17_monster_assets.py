#!/usr/bin/env python3
"""Export S17 reviewed monster visuals into a private generated runtime pack.

The source pixels stay outside Git. This adapter consumes the sanitized
`manifests/s17-monster-visual-catalog.json`, verifies source hashes, and emits
the same basic animation/frame shape already used by the Web prototype.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"tools"/"convert"))
from ani import parse_ani, validate_frame_indices  # type: ignore
from spr import parse_spr, export_spr  # type: ignore


def sha256(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda:fh.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def find_ci(root:Path,name:str)->Path:
    hits=[p for p in root.iterdir() if p.is_file() and p.name.lower()==name.lower()]
    if len(hits)!=1:
        raise FileNotFoundError(f"expected exactly one {name} in {root}, got {len(hits)}")
    return hits[0]


def export_archetype(client_root:Path,out:Path,row:dict)->dict:
    char_dir=client_root/"Char"
    source_id=int(row["source_numeric_id"])
    visual_id=str(row["visual_id"])
    actions={}
    hashes=row.get("source_hashes",{})
    for slot in row["available_slots"]:
        stem=f"B{source_id}_{slot}"
        ani_path=find_ci(char_dir,stem+".ani")
        spr_path=find_ci(char_dir,stem+".spr")
        expected=hashes.get(slot,{})
        ani_hash=sha256(ani_path)
        spr_hash=sha256(spr_path)
        if expected.get("ani") and ani_hash!=expected["ani"]:
            raise ValueError(f"{stem}.ani hash mismatch")
        if expected.get("spr") and spr_hash!=expected["spr"]:
            raise ValueError(f"{stem}.spr hash mismatch")
        ani=parse_ani(ani_path)
        spr=parse_spr(spr_path)
        errors=validate_frame_indices(ani,spr.frame_count)
        if errors:
            raise ValueError(f"{stem}: {errors[0]}")
        rel=Path("monsters")/visual_id/slot
        export_spr(spr,out/rel/"frames")
        payload={
            "visual_id":visual_id,
            "source_family":f"B{source_id}",
            "action_slot":slot,
            "semantic":next((s["semantic"] for s in row.get("slots",[]) if s.get("slot")==slot),None),
            "frames_per_direction":ani.frames_per_direction,
            "raw_timing":ani.raw_timing,
            "directions":ani.directions,
            "spr_frame_count":spr.frame_count,
            "frame_bounds":[
                {"index":f.index,"left":f.left,"top":f.top,"right":f.right,"bottom":f.bottom}
                for f in spr.frames
            ],
            "ani_sha256":ani_hash,
            "spr_sha256":spr_hash,
        }
        (out/rel/"animation.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        actions[slot]={
            "animation":(rel/"animation.json").as_posix(),
            "frames_dir":(rel/"frames").as_posix(),
        }
    return {
        "visual_id":visual_id,
        "source_family":f"B{source_id}",
        "source_numeric_id":source_id,
        "manual_visual_descriptor":row["manual_visual_descriptor"],
        "identity_status":row["identity_status"],
        "direction_rows":row["direction_rows"],
        "direction_semantics":row["direction_semantics"],
        "row_equivalence_groups_by_slot":row["row_equivalence_groups_by_slot"],
        "death":row["death"],
        "actions":actions,
    }


def main()->int:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root",type=Path,required=True)
    ap.add_argument("--manifest",type=Path,default=ROOT/"manifests"/"s17-monster-visual-catalog.json")
    ap.add_argument("--out",type=Path,required=True)
    args=ap.parse_args()
    source=json.loads(args.manifest.read_text(encoding="utf-8"))
    args.out.mkdir(parents=True,exist_ok=True)
    archetypes=[export_archetype(args.client_root.resolve(),args.out,row) for row in source["reviewed_archetypes"]]
    pack={
        "schema":1,
        "provenance":{
            "kind":"private-original-derived",
            "fixed_client_sha256":source["fixed_client"]["installer_sha256"],
            "scope":"S17 reviewed monster pixels/actions only; canonical monster names and universal death remain unrecovered.",
        },
        "evidence_boundaries":source["evidence_boundaries"],
        "archetypes":archetypes,
        "battle_unit_bindings":source["reconstruction_training_bindings"],
    }
    (args.out/"monster-visuals.json").write_text(json.dumps(pack,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "out":str(args.out),
        "archetypes":[row["visual_id"] for row in archetypes],
        "binding_count":len(pack["battle_unit_bindings"]),
    },ensure_ascii=False))
    return 0


if __name__=="__main__":
    raise SystemExit(main())
