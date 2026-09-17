#!/usr/bin/env python3
"""Build a private, browser-playable S16 visual archaeology gallery.

Original-derived PNGs stay in the private CI artifact/Drive. The generated HTML
labels every heuristic/inferred interpretation explicitly and never binds a
visual family to NPCScript solely by equal numbers.
"""
from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "convert"))

from convert.ani import parse_ani  # type: ignore
from convert.spr import parse_spr  # type: ignore
from convert.tip import parse_tip  # type: ignore
from npc_visual_core import (
    BODY_DIRECTIONS,
    TIP_RENDER_POLICY,
    body_action_semantic,
    build_action_atlas,
    choose_gallery_ids,
    make_tip_contact_sheet,
    sha256_file,
)


def _ci_file(directory: Path, name: str) -> Path:
    hits = [p for p in directory.iterdir() if p.is_file() and p.name.lower() == name.lower()]
    if len(hits) != 1:
        raise FileNotFoundError(f"expected exactly one {name} in {directory}, got {len(hits)}")
    return hits[0]


def build(client_root: Path, inventory_path: Path, out: Path, limit: int) -> dict:
    if out.exists():
        raise FileExistsError(f"refusing existing gallery output: {out}")
    out.mkdir(parents=True)
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    families = inventory["world_character_visuals"]["families"]
    family_by_id = {int(f["character_resource_id"]): f for f in families}
    selected_ids = choose_gallery_ids(sorted(family_by_id), limit=limit)

    npc350_path = _ci_file(client_root / "NRes", "NPC350.Tip")
    npc350 = parse_tip(npc350_path)
    portrait_dir = out / "portraits"
    portrait_dir.mkdir()
    portrait_sheet = make_tip_contact_sheet(npc350, portrait_dir / "npc350-contact.png", columns=10, gap=4)

    entries = []
    char_dir = client_root / "Char"
    atlas_dir = out / "world"
    atlas_dir.mkdir()
    for visual_id in selected_ids:
        source = family_by_id[visual_id]
        action_rows = []
        omitted_actions = []
        for action in source["actions"]:
            action_id = int(action["action"])
            if int(action["dimensions"].get("non_renderable_frame_count", 0)):
                omitted_actions.append({"action": action_id, "reason": "paired SPR contains non-renderable original frame bounds"})
                continue
            ani_path = _ci_file(char_dir, f"B{visual_id}_{action_id:02d}.ani")
            spr_path = _ci_file(char_dir, f"B{visual_id}_{action_id:02d}.spr")
            ani = parse_ani(ani_path)
            spr = parse_spr(spr_path)
            filename = f"B{visual_id}_{action_id:02d}.png"
            atlas = build_action_atlas(ani, spr, atlas_dir / filename)
            semantics = body_action_semantic(action_id)
            action_rows.append({
                **semantics,
                **atlas,
                "png": f"world/{filename}",
                "ani": ani_path.name,
                "spr": spr_path.name,
                "ani_sha256": ani.sha256,
                "spr_sha256": spr.sha256,
            })
        entries.append({
            "visual_id": f"npc-visual-b{visual_id}",
            "character_resource_id": visual_id,
            "classification": "NPC_CANDIDATE_VISUAL_ONLY",
            "classification_evidence": "UNVERIFIED_VISUAL_ROLE",
            "directions": list(BODY_DIRECTIONS),
            "actions": action_rows,
            "omitted_actions": omitted_actions,
            "provenance": {
                "source": "fixed-hash 2.2 client Char/Bxxxx_NN",
                "npc_script_binding": "NONE",
                "world_entity_binding": "NONE",
            },
        })

    catalog = {
        "schema": 1,
        "purpose": "S16 private visual archaeology gallery",
        "warning": "Displayed Bxxxx entries are visual candidates, not proven retail NPC identities. NPCScript/world entity/visual archetype are separate layers.",
        "portrait": {
            "source": "NRes/NPC350.Tip",
            "entry_count": len(npc350.frames),
            "contact_sheet": f"portraits/{portrait_sheet['png']}",
            "render_policy": TIP_RENDER_POLICY,
            "source_sha256": sha256_file(npc350_path),
        },
        "selected_world_visual_count": len(entries),
        "entries": entries,
    }
    (out / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "index.html").write_text(_html(catalog), encoding="utf-8")
    return catalog


def _html(catalog: dict) -> str:
    payload = json.dumps(catalog, ensure_ascii=False).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>S16 NPC visual gallery</title>
<style>
html,body{{margin:0;background:#111;color:#eee;font:14px system-ui,sans-serif}}*{{box-sizing:border-box}}
header{{position:sticky;top:0;z-index:5;background:#191919;padding:10px 14px;border-bottom:1px solid #444;display:flex;gap:12px;align-items:center;flex-wrap:wrap}}
main{{display:grid;grid-template-columns:minmax(320px,44vw) 1fr;min-height:calc(100vh - 64px)}}
aside{{border-right:1px solid #444;padding:12px;overflow:auto}}section{{padding:16px;overflow:auto}}button,select,input{{background:#262626;color:#eee;border:1px solid #555;padding:6px}}button.active{{outline:2px solid #aaa}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px}}.tile{{padding:6px;text-align:left;min-height:44px}}
canvas{{image-rendering:pixelated;image-rendering:crisp-edges;background:repeating-conic-gradient(#333 0 25%,#222 0 50%) 50%/16px 16px;max-width:100%;border:1px solid #555}}
.meta{{white-space:pre-wrap;background:#181818;padding:10px;border:1px solid #333}}.warn{{color:#ffcc66}}.portrait{{max-width:100%;image-rendering:pixelated;border:1px solid #555}}
@media(max-width:800px){{main{{grid-template-columns:1fr}}aside{{border-right:0;border-bottom:1px solid #444;max-height:38vh}}}}
</style></head><body>
<header><strong>S16 NPC Visual Gallery</strong><span class="warn">visual candidates only; no NPCScript numeric binding</span>
<label>Action <select id="action"></select></label><label>Direction <select id="direction"></select></label>
<label>Frame ms <input id="speed" type="range" min="30" max="500" value="160"></label><button id="toggle">Pause</button></header>
<main><aside><p><b>NPC350 portrait source</b> — 50 entries. TIP alpha rendering is <code>{html.escape(TIP_RENDER_POLICY)}</code>, not VERIFIED semantics.</p>
<img class="portrait" src="{html.escape(catalog['portrait']['contact_sheet'])}"><hr><div id="list" class="grid"></div></aside>
<section><h2 id="title">Select a visual</h2><canvas id="canvas" width="320" height="240"></canvas><div id="meta" class="meta"></div></section></main>
<script>const CATALOG={payload};
const list=document.querySelector('#list'),action=document.querySelector('#action'),direction=document.querySelector('#direction'),speed=document.querySelector('#speed'),canvas=document.querySelector('#canvas'),ctx=canvas.getContext('2d'),meta=document.querySelector('#meta'),title=document.querySelector('#title');
let current=null,frame=0,last=0,playing=true,img=null;
for(const [i,e] of CATALOG.entries.entries()){{const b=document.createElement('button');b.className='tile';b.textContent='B'+e.character_resource_id;b.onclick=()=>select(i);list.appendChild(b)}}
for(const [i,d] of CATALOG.entries[0]?.directions.entries()||[]){{const o=document.createElement('option');o.value=i;o.textContent=i+' '+d;direction.appendChild(o)}}
action.onchange=loadAction;direction.onchange=()=>frame=0;document.querySelector('#toggle').onclick=e=>{{playing=!playing;e.target.textContent=playing?'Pause':'Play'}};
function select(i){{current=CATALOG.entries[i];title.textContent=current.visual_id;action.innerHTML='';for(const a of current.actions){{const o=document.createElement('option');o.value=a.action;o.textContent=a.action.toString().padStart(2,'0')+' '+a.semantic+' ['+a.evidence+']';action.appendChild(o)}};loadAction();document.querySelectorAll('.tile').forEach((b,j)=>b.classList.toggle('active',j===i));}}
function selectedAction(){{return current?.actions.find(a=>String(a.action)===action.value)||current?.actions[0]}}
function loadAction(){{const a=selectedAction();if(!a)return;frame=0;img=new Image();img.src=a.png;meta.textContent=JSON.stringify({{visual_id:current.visual_id,character_resource_id:current.character_resource_id,classification:current.classification,classification_evidence:current.classification_evidence,action:a.action,semantic:a.semantic,evidence:a.evidence,ani:a.ani,spr:a.spr,raw_timing:a.raw_timing,anchor:[a.anchor_x,a.anchor_y],provenance:current.provenance}},null,2)}}
function draw(ts){{requestAnimationFrame(draw);const a=selectedAction();if(!a||!img||!img.complete)return;if(playing&&ts-last>=Number(speed.value)){{frame++;last=ts}}const row=Number(direction.value)||0;const n=a.frame_counts_by_direction[row]||1;const col=frame%n;canvas.width=Math.max(1,a.cell_width*3);canvas.height=Math.max(1,a.cell_height*3);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,col*a.cell_width,row*a.cell_height,a.cell_width,a.cell_height,0,0,canvas.width,canvas.height)}}
requestAnimationFrame(draw);if(CATALOG.entries.length)select(0);
</script></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--inventory", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--limit", type=int, default=220)
    args = ap.parse_args()
    result = build(args.client_root.resolve(), args.inventory.resolve(), args.out.resolve(), args.limit)
    print(json.dumps({"world_visuals": result["selected_world_visual_count"], "portraits": result["portrait"]["entry_count"], "out": str(args.out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
