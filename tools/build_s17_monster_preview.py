#!/usr/bin/env python3
"""Build a private S17 battle-visual gallery from fixed original ANI/SPR assets.

The gallery is diagnostic evidence only. Candidate families come from the S17
inventory's story-model numeric correlations; equality is visibly labelled as
UNVERIFIED and does not become a battle-unit binding.
"""
from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "convert"))
sys.path.insert(0, str(ROOT / "tools"))
from ani import parse_ani  # type: ignore
from spr import write_png  # type: ignore
from probe_monster_visuals import parse_spr_evidence  # type: ignore

SEMANTIC = {
    "00": ("idle", "RECOVERED_SECONDARY"),
    "01": ("move", "RECOVERED_SECONDARY"),
    "02": ("attack", "RECOVERED_SECONDARY"),
    "03": ("hit", "VERIFIED_STATIC_ORIGINAL"),
}


def ci_index(root: Path) -> dict[str, Path]:
    return {p.name.lower(): p for p in root.iterdir() if p.is_file()}


def alpha_blit(target: bytearray, tw: int, th: int, source: bytes, sw: int, sh: int, x0: int, y0: int) -> None:
    for y in range(sh):
        ty = y0 + y
        if not 0 <= ty < th:
            continue
        for x in range(sw):
            tx = x0 + x
            if not 0 <= tx < tw:
                continue
            so = (y * sw + x) * 4
            a = source[so + 3]
            if not a:
                continue
            to = (ty * tw + tx) * 4
            target[to:to + 4] = source[so:so + 4]


def union_for_indices(spr, indices: list[int]) -> tuple[int, int, int, int]:
    frames = [spr.frames[i] for i in sorted(set(indices))]
    return (
        min(f.left for f in frames), min(f.top for f in frames),
        max(f.right for f in frames), max(f.bottom for f in frames),
    )


def normalized_frames(spr, indices: list[int], out: Path, pad: int = 4) -> tuple[dict[int, str], dict[str, int]]:
    left, top, right, bottom = union_for_indices(spr, indices)
    width, height = right - left + pad * 2, bottom - top + pad * 2
    files: dict[int, str] = {}
    out.mkdir(parents=True, exist_ok=True)
    for index in sorted(set(indices)):
        frame = spr.frames[index]
        rgba = bytearray(width * height * 4)
        alpha_blit(rgba, width, height, frame.rgba, frame.width, frame.height, pad + frame.left - left, pad + frame.top - top)
        name = f"frame-{index:03d}.png"
        write_png(out / name, width, height, bytes(rgba))
        files[index] = name
    return files, {"left": left, "top": top, "right": right, "bottom": bottom, "width": width, "height": height}


def compose_sheet(spr, rows: list[list[int]], out: Path, pad: int = 4) -> dict[str, int | str]:
    indices = [i for row in rows for i in row]
    left, top, right, bottom = union_for_indices(spr, indices)
    cell_w, cell_h = right - left + pad * 2, bottom - top + pad * 2
    cols = max(len(row) for row in rows)
    width, height = cols * cell_w, len(rows) * cell_h
    rgba = bytearray(width * height * 4)
    for row_i, row in enumerate(rows):
        for col_i, index in enumerate(row):
            frame = spr.frames[index]
            alpha_blit(
                rgba, width, height, frame.rgba, frame.width, frame.height,
                col_i * cell_w + pad + frame.left - left,
                row_i * cell_h + pad + frame.top - top,
            )
    out.parent.mkdir(parents=True, exist_ok=True)
    write_png(out, width, height, bytes(rgba))
    return {"png": out.name, "width": width, "height": height, "cell_width": cell_w, "cell_height": cell_h}


def build_family(client_root: Path, family_id: str, slots: list[str], out: Path) -> dict[str, object]:
    char_dir = client_root / "Char"
    files = ci_index(char_dir)
    actions: dict[str, object] = {}
    sheets = []
    for slot in slots:
        stem = f"{family_id}_{slot}"
        ani_path = files.get((stem + ".ani").lower())
        spr_path = files.get((stem + ".spr").lower())
        if not ani_path or not spr_path:
            continue
        ani = parse_ani(ani_path)
        spr, spr_decode_status, spr_strict_error, spr_meta = parse_spr_evidence(spr_path)
        rows = [list(row) for row in ani.directions]
        semantic, provenance = SEMANTIC.get(slot, (None, "UNVERIFIED"))
        if spr is None:
            actions[slot] = {
                "slot": slot,
                "semantic": semantic,
                "semantic_provenance": provenance,
                "raw_timing": ani.raw_timing,
                "frame_interval_ms_common_consumer": 1000.0 / ani.raw_timing if ani.raw_timing > 0 else None,
                "rows": [[] for _ in rows],
                "bounds": spr_meta["bounds_union"],
                "contact_sheet": None,
                "renderable": False,
                "spr_decode_status": spr_decode_status,
                "spr_strict_error": spr_strict_error,
            }
            continue
        indices = [i for row in rows for i in row]
        slot_dir = out / family_id / slot
        frame_files, bounds = normalized_frames(spr, indices, slot_dir / "frames")
        sheet = compose_sheet(spr, rows, slot_dir / "contact-8rows.png")
        actions[slot] = {
            "slot": slot,
            "semantic": semantic,
            "semantic_provenance": provenance,
            "raw_timing": ani.raw_timing,
            "frame_interval_ms_common_consumer": 1000.0 / ani.raw_timing if ani.raw_timing > 0 else None,
            "rows": [[f"{family_id}/{slot}/frames/{frame_files[i]}" for i in row] for row in rows],
            "bounds": bounds,
            "contact_sheet": f"{family_id}/{slot}/contact-8rows.png",
            "renderable": True,
            "spr_decode_status": spr_decode_status,
            "spr_strict_error": spr_strict_error,
        }
        sheets.append({"slot": slot, "semantic": semantic, "provenance": provenance, "path": f"{family_id}/{slot}/contact-8rows.png", **sheet})
    return {
        "visual_id": family_id,
        "label": family_id,
        "binding": "UNVERIFIED_NUMERIC_CORRELATION",
        "actions": actions,
        "contact_sheets": sheets,
        "death": {"slot": None, "status": "UNVERIFIED", "fallback": "RECONSTRUCTION_POLICY"},
    }


def page(data: dict[str, object]) -> str:
    payload = html.escape(json.dumps(data, ensure_ascii=False), quote=False)
    return """<!doctype html><html><head><meta charset="utf-8"><title>S17 Monster Visual Gallery</title>
<style>
:root{color-scheme:dark}body{font:14px system-ui;background:#11151b;color:#e7edf4;margin:0}header,main{max-width:1100px;margin:auto;padding:18px}header{position:sticky;top:0;background:#11151bee;backdrop-filter:blur(8px);z-index:2}.controls{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px}label{display:grid;gap:4px}select,input,button{font:inherit;padding:8px;background:#202833;color:#fff;border:1px solid #465363;border-radius:6px}.stage{min-height:360px;display:grid;place-items:center;background:#29313b;border-radius:10px;overflow:hidden}#sprite{image-rendering:pixelated;max-width:90%;max-height:340px;transform:scale(2)}.bad{color:#ffca7a}pre{white-space:pre-wrap;background:#1a2028;padding:12px;border-radius:8px}.sheets img{max-width:100%;image-rendering:pixelated;background:#29313b;margin:8px 0}@media(max-width:700px){.controls{grid-template-columns:1fr 1fr}}
</style></head><body><header><h1>S17 private battle-visual gallery</h1><p class="bad">Candidate ≠ binding. Story CHARPOS token ↔ same-number B family is UNVERIFIED numeric correlation. Death has no verified universal ANI state.</p><div class="controls">
<label>Visual family<select id="family"></select></label><label>Action<select id="action"></select></label><label>Raw direction row<select id="direction"></select></label><label>Frame speed (ms)<input id="speed" type="number" min="20" max="2000" step="10" value="200"></label>
<button id="toggle">Pause</button><button id="step">Next frame</button></div></header><main><section class="stage"><img id="sprite" alt="diagnostic sprite"></section><h2 id="title"></h2><pre id="meta"></pre><section class="sheets" id="sheets"></section></main>
<script id="gallery-data" type="application/json">""" + payload + """</script><script>
const data=JSON.parse(document.querySelector('#gallery-data').textContent);const fam=document.querySelector('#family'),act=document.querySelector('#action'),dir=document.querySelector('#direction'),img=document.querySelector('#sprite'),meta=document.querySelector('#meta'),title=document.querySelector('#title'),sheets=document.querySelector('#sheets'),speed=document.querySelector('#speed');let cursor=0,playing=true,last=performance.now();
for(const f of data.families)fam.add(new Option(f.visual_id,f.visual_id));for(let i=0;i<8;i++)dir.add(new Option('raw row '+i,String(i)));
function F(){return data.families.find(x=>x.visual_id===fam.value)}function A(){return F().actions[act.value]}
function actions(){act.innerHTML='';for(const [slot,a] of Object.entries(F().actions))act.add(new Option(slot+' / '+(a.semantic??'unlabelled')+' / '+a.semantic_provenance,slot));cursor=0;renderMeta();render()}
function renderMeta(){const f=F(),a=A();title.textContent=f.visual_id+' · '+(a?.semantic??'raw state');meta.textContent=JSON.stringify({binding:f.binding,action:a&&{slot:a.slot,semantic:a.semantic,semantic_provenance:a.semantic_provenance,raw_timing:a.raw_timing},direction:'raw ANI row '+dir.value,death:f.death},null,2);sheets.innerHTML='';for(const s of f.contact_sheets){const h=document.createElement('h3');h.textContent=s.slot+' / '+(s.semantic??'unlabelled')+' / '+s.provenance;const im=document.createElement('img');im.src=s.path;sheets.append(h,im)}}
function render(){const a=A();if(!a)return;const row=a.rows[Number(dir.value)]??[];if(!row.length)return;cursor=(cursor+row.length)%row.length;img.src=row[cursor]}
fam.onchange=actions;act.onchange=()=>{cursor=0;renderMeta();render()};dir.onchange=()=>{cursor=0;renderMeta();render()};document.querySelector('#toggle').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play'};document.querySelector('#step').onclick=()=>{cursor++;render()};
function tick(now){if(playing&&now-last>=Number(speed.value||200)){cursor++;render();last=now}requestAnimationFrame(tick)}actions();requestAnimationFrame(tick);
</script></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--report", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--ids", nargs="*", default=None, help="Optional B-family IDs; defaults to report preview candidates")
    args = ap.parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    family_rows = {row["visual_family_id"]: row for row in report["visual_families"]}
    ids = args.ids or report["preview_candidate_visual_ids"]
    ids = [str(value) for value in ids if str(value) in family_rows]
    args.out.mkdir(parents=True, exist_ok=True)
    families = [build_family(args.client_root.resolve(), family_id, family_rows[family_id]["action_slots"], args.out) for family_id in ids]
    data = {
        "schema": 1,
        "candidate_policy": "same-number story model correlation only; not a recovered runtime binding",
        "families": families,
    }
    (args.out / "gallery-data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "index.html").write_text(page(data), encoding="utf-8")
    print(json.dumps({"out": str(args.out), "family_count": len(families), "visual_ids": ids}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
