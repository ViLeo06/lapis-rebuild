#!/usr/bin/env python3
"""S20 fixed-hash Original UI asset inventory and private preview builder.

Scans Dlg/*.Tdg and NRes/*.Tip after static extraction, records structure and
bounded string references from the UPX-decompressed client image, and renders
archaeology contact sheets. Retail executables/DLLs are never executed.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "tools" / "convert"))

from convert.tdg import parse_tdg, summarize_tdg  # type: ignore  # noqa: E402
from convert.tip import parse_tip, summarize  # type: ignore  # noqa: E402
from npc_visual_core import (  # type: ignore  # noqa: E402
    TIP_RENDER_POLICY, alpha_blit, decode_tip_frame_inferred, write_rgba_png,
)

INSTALLER_SHA256 = "c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88"
UNPACKED_NEODARK_SHA256 = "432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7"

HISTORICAL = {
    "Dlg/MyInfo.Tdg": "2003 mainland guide: portrait/status access is anchored at the lower-left portrait; HP/MP/EXP are exposed there.",
    "Dlg/Myitem.Tdg": "2003 mainland guide: item window has equipment above, items below, with A/S/D/F quick slots on the equipment side.",
    "Dlg/Magic.Tdg": "2003 mainland guide: magic/skill window exposes skill points and Z/X/C/V quick slots.",
    "Dlg/SmallMap.Tdg": "2003 mainland guide/screenshots: minimap is upper-left and has a small-map toggle.",
    "Dlg/MessageBox.Tdg": "2003 mainland screenshot: NPC conversation uses a wide bottom-docked pane with portrait and response choices.",
    "Dlg/CombatSelect.Tdg": "Fixed client work already establishes a distinct combat-selection dialog resource; historical screenshots constrain surrounding battle HUD.",
    "Dlg/CommanderInfo.Tdg": "2003 guides document commander/sub-commander status and battle selection UI.",
    "Dlg/EnemyInfo.Tdg": "Client option strings include ENEMYINFO; battle guides document target/status presentation.",
    "Dlg/Option.Tdg": "Client option strings include BACKMUSIC, SCREENSIZE, WINDOW, SOUND, SMALLMAP, COMMANDERINFO and ENEMYINFO.",
}

ROLE_RULES = (
    (("myinfo",), "character-status"),
    (("commanderinfo", "allyinfo", "partyinfo", "enemyinfo", "hiredinfo", "yourinfo", "petinfo"), "party-target-status"),
    (("myitem", "itemdrag", "itemvariation"), "inventory-equipment"),
    (("magic", "magicdrag", "itemmagic"), "magic-skill"),
    (("smallmap", "zonename"), "map-minimap"),
    (("messagebox", "bigmessage", "message", "msg", "failyesno"), "dialogue-message"),
    (("combatselect",), "battle-selection"),
    (("employ",), "recruitment-dialogue"),
    (("warp",), "warp-dialogue"),
    (("repair", "buy", "bank", "exchange", "money", "howmany", "jewel"), "facility-economy"),
    (("option",), "system-options"),
    (("chat", "whisper", "setchat"), "chat"),
    (("help",), "help-tutorial"),
    (("login", "svselect", "newchar", "prologue", "waitmainmax"), "front-end-flow"),
    (("friend", "board", "g_", "join"), "social-community"),
)

TIP_ROLE = {
    "char350.tip": ("player-portrait-library", "VERIFIED", "Retail loader maps IDs 0..99 to Char350.Tip frame id%100."),
    "npc350.tip": ("npc-portrait-library", "VERIFIED", "Retail loader maps IDs 100..149 to NPC350.Tip frames 0..49."),
    "magicicon.tip": ("magic-icon-library", "INFERRED", "400 regular 32x32 frames strongly match an icon atlas; per-icon semantics still require binding."),
    "menu.tip": ("menu-controls", "INFERRED", "Name plus compact 19-frame geometry and historical command UI make this a high-priority candidate."),
    "mstatus.tip": ("compact-status-strip", "INFERRED", "40 frames on a 300x30 canvas are geometry-compatible with compact status markers/plates."),
    "tooltip.tip": ("tooltip-chrome", "INFERRED", "Three frames on a 160x20 canvas are geometry-compatible with tooltip chrome."),
    "chatroom.tip": ("chat-window-art", "INFERRED", "Eight compact frames plus fixed client chat dialogs make it a strong chat UI candidate."),
    "chatballoon.tip": ("chat-balloon-art", "INFERRED", "Twelve frames plus chat naming; runtime placement is not recovered."),
    "explanation.tip": ("help-explanation-art", "INFERRED", "Three tall frames, reinforced by Interface_Help resources."),
    "combatmap.tip": ("combat-selection-thumbnails", "RECOVERED_SECONDARY", "Fixed binary/resource work links it to combat selection; it is not a battle-world background."),
    "interface_help1.tip": ("interface-help-overlay", "INFERRED", "800x600 full-screen help-family frame."),
    "interface_help2.tip": ("interface-help-overlay", "INFERRED", "Multi-frame help asset family."),
    "interface_help3.tip": ("interface-help-overlay", "INFERRED", "Multi-frame help asset family."),
    "interface_help4.tip": ("interface-help-overlay", "INFERRED", "Multi-frame help asset family."),
    "interface_help5.tip": ("interface-help-overlay", "INFERRED", "Multi-frame help asset family."),
    "itemres.tip": ("item-icon-library", "INFERRED", "2500-frame regular atlas is compatible with item art; exact item binding belongs to authored tables."),
}

PREVIEW_TDG = {
    "MyInfo.Tdg", "Myitem.Tdg", "Magic.Tdg", "SmallMap.Tdg", "MessageBox.Tdg",
    "CombatSelect.Tdg", "CommanderInfo.Tdg", "EnemyInfo.Tdg", "Option.Tdg",
    "Employ.Tdg", "Warp.Tdg", "Repair.Tdg", "ChatRoom.Tdg",
}
PREVIEW_TIP = {
    "Menu.Tip", "MStatus.Tip", "ToolTip.Tip", "ChatRoom.Tip", "ChatBalloon.Tip",
    "Explanation.Tip", "CombatMap.Tip", "Interface_Help3.Tip", "NPC350.Tip",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def role_for_tdg(name: str) -> str:
    low = name.lower()
    for needles, role in ROLE_RULES:
        if any(needle in low for needle in needles):
            return role
    return "unclassified-dialog-resource"


def binary_reference(image_lower: bytes, relative: str) -> dict:
    exact = relative.replace("/", "\\").encode("ascii", errors="ignore").lower()
    base = Path(relative).name.encode("ascii", errors="ignore").lower()
    return {
        "exact_path_ascii_count": image_lower.count(exact),
        "basename_ascii_count": image_lower.count(base),
        "scope": "UPX-decompressed fixed-hash image; string presence only, not call semantics.",
    }


def frame_geometry(lib) -> dict:
    widths = [f.width for f in lib.frames]
    heights = [f.height for f in lib.frames]
    return {
        "min_width": min(widths), "max_width": max(widths),
        "min_height": min(heights), "max_height": max(heights),
        "rectangles": [
            {
                "index": f.index, "left": f.left, "top": f.top,
                "right": f.right, "bottom": f.bottom,
                "width": f.width, "height": f.height,
            }
            for f in lib.frames
        ],
    }


def nearest(src: bytes, sw: int, sh: int, dw: int, dh: int) -> bytes:
    if (sw, sh) == (dw, dh):
        return src
    out = bytearray(dw * dh * 4)
    for y in range(dh):
        sy = min(sh - 1, y * sh // dh)
        for x in range(dw):
            sx = min(sw - 1, x * sw // dw)
            si = (sy * sw + sx) * 4
            di = (y * dw + x) * 4
            out[di:di + 4] = src[si:si + 4]
    return bytes(out)


def render_contact(lib, output: Path, max_frames: int = 60, columns: int = 5) -> dict:
    frames = list(lib.frames[:max_frames])
    if not frames:
        raise ValueError("library has no frames")
    max_w = max(f.width for f in frames)
    max_h = max(f.height for f in frames)
    scale = min(1.0, 260 / max_w, 190 / max_h)
    cell_w = max(1, round(max_w * scale))
    cell_h = max(1, round(max_h * scale))
    gap = 6
    rows = math.ceil(len(frames) / columns)
    width = columns * cell_w + (columns + 1) * gap
    height = rows * cell_h + (rows + 1) * gap
    out = bytearray(width * height * 4)
    for i, frame in enumerate(frames):
        rgba = decode_tip_frame_inferred(frame)
        fw = max(1, round(frame.width * scale))
        fh = max(1, round(frame.height * scale))
        scaled = nearest(rgba, frame.width, frame.height, fw, fh)
        col, row = i % columns, i // columns
        dx = gap + col * (cell_w + gap) + (cell_w - fw) // 2
        dy = gap + row * (cell_h + gap) + (cell_h - fh) // 2
        alpha_blit(out, width, height, scaled, fw, fh, dx, dy)
    output.parent.mkdir(parents=True, exist_ok=True)
    write_rgba_png(output, width, height, bytes(out))
    return {
        "file": output.name, "width": width, "height": height,
        "shown_frames": len(frames), "total_frames": len(lib.frames),
        "scale": round(scale, 4), "render_policy": TIP_RENDER_POLICY,
        "provenance": "INFERRED_STATIC_RENDERING",
    }


def scan_tdg(path: Path, root: Path, image_lower: bytes, preview_dir: Path | None) -> dict:
    rel = path.relative_to(root).as_posix()
    row = {
        "path": rel, "size": path.stat().st_size, "sha256": sha256_file(path),
        "presence_provenance": "VERIFIED",
        "candidate_role": role_for_tdg(path.name), "role_provenance": "INFERRED",
        "binary_reference": binary_reference(image_lower, rel),
        "historical_crosscheck": HISTORICAL.get(rel),
        "historical_crosscheck_provenance": "VERIFIED-HISTORICAL" if rel in HISTORICAL else None,
    }
    try:
        lib = parse_tdg(path)
        summary = summarize_tdg(lib)
        row.update({
            "structure_provenance": "VERIFIED",
            "canvas": summary["canvas"], "frame_count": summary["frame_count"],
            "flag": summary["flag"], "run_counts": summary["run_counts"],
            "frame_geometry": frame_geometry(lib),
        })
        if preview_dir is not None and path.name in PREVIEW_TDG:
            row["private_preview"] = render_contact(lib, preview_dir / ("tdg-" + path.stem + ".png"))
    except Exception as exc:
        row["structure_provenance"] = "UNVERIFIED"
        row["parse_error"] = type(exc).__name__ + ": " + str(exc)[:280]
    return row


def scan_tip(path: Path, root: Path, image_lower: bytes, preview_dir: Path | None) -> dict:
    rel = path.relative_to(root).as_posix()
    lib = parse_tip(path)
    summary = summarize(lib)
    role, provenance, rationale = TIP_ROLE.get(
        path.name.lower(),
        ("unclassified-image-library", "UNVERIFIED", "No UI role is asserted from filename alone."),
    )
    row = {
        "path": rel, "size": path.stat().st_size, "sha256": sha256_file(path),
        "presence_provenance": "VERIFIED", "structure_provenance": "VERIFIED",
        "canvas": summary["canvas"], "frame_count": summary["frame_count"],
        "flag": summary["flag"], "run_counts": summary["run_counts"],
        "frame_geometry": frame_geometry(lib),
        "binary_reference": binary_reference(image_lower, rel),
        "candidate_role": role, "role_provenance": provenance, "role_rationale": rationale,
    }
    if preview_dir is not None and path.name in PREVIEW_TIP:
        row["private_preview"] = render_contact(lib, preview_dir / ("tip-" + path.stem + ".png"))
    return row


def write_index(out: Path, tdg_rows: list[dict], tip_rows: list[dict], historical_dir: Path | None) -> None:
    cards = []
    for row in tdg_rows + tip_rows:
        preview = row.get("private_preview")
        if not isinstance(preview, dict):
            continue
        cards.append(
            "<article><h3>" + html.escape(str(row["path"])) + "</h3>"
            "<p>" + html.escape(str(row.get("candidate_role"))) + " · role "
            + html.escape(str(row.get("role_provenance"))) + " · canvas "
            + html.escape(str(row.get("canvas"))) + " · frames "
            + html.escape(str(row.get("frame_count"))) + "</p>"
            "<img src=\"previews/" + html.escape(str(preview["file"])) + "\"></article>"
        )
    historical = []
    if historical_dir and historical_dir.is_dir():
        for image in sorted(historical_dir.iterdir()):
            if image.suffix.lower() not in {".jpg", ".jpeg", ".png", ".gif"}:
                continue
            historical.append(
                "<article><h3>" + html.escape(image.stem.replace("-", " ")) + "</h3>"
                "<p>VERIFIED-HISTORICAL source capture; not fixed-hash 2.2.</p>"
                "<img src=\"historical/" + html.escape(image.name) + "\"></article>"
            )
    body = """<!doctype html><meta charset="utf-8"><title>S20 Original UI Reference Pack</title>
<style>
body{margin:0;background:#151515;color:#eee;font:14px system-ui,sans-serif}
header{padding:20px;background:#202020;position:sticky;top:0;z-index:2}
main{padding:20px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
article{background:#242424;border:1px solid #555;padding:10px}
img{display:block;max-width:100%;max-height:680px;margin:auto;background:#111}
code{color:#f0d78c}h2{margin-top:30px}
</style>"""
    body += "<header><h1>S20 Original UI Reference Pack — private archaeology preview</h1>"
    body += "<p>2.2 derived previews use <code>" + html.escape(TIP_RENDER_POLICY) + "</code>; visual semantics are not promoted beyond their provenance.</p></header>"
    body += "<main><h2>Fixed-hash 2.2 candidate UI assets</h2><div class=\"grid\">" + "".join(cards) + "</div>"
    body += "<h2>Historical screenshot cross-checks</h2><div class=\"grid\">" + ("".join(historical) if historical else "<p>No historical downloads succeeded.</p>") + "</div></main>"
    out.write_text(body, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--client-root", type=Path, required=True)
    ap.add_argument("--image", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--preview-dir", type=Path)
    ap.add_argument("--historical-dir", type=Path)
    ap.add_argument("--html", type=Path)
    args = ap.parse_args()

    client = args.client_root.resolve()
    image = args.image.resolve()
    if not client.is_dir():
        raise ValueError("not a client root: " + str(client))
    if sha256_file(image) != UNPACKED_NEODARK_SHA256:
        raise ValueError("UPX-decompressed NeoDark SHA-256 mismatch")
    image_lower = image.read_bytes().lower()
    if args.preview_dir:
        args.preview_dir.mkdir(parents=True, exist_ok=True)

    tdg_paths = sorted(
        {p.resolve() for pattern in ("*.Tdg", "*.TDG") for p in (client / "Dlg").glob(pattern)},
        key=lambda p: p.name.lower(),
    )
    tip_paths = sorted(
        {p.resolve() for pattern in ("*.Tip", "*.TIP") for p in (client / "NRes").glob(pattern)},
        key=lambda p: p.name.lower(),
    )
    tdg_rows = [scan_tdg(p, client, image_lower, args.preview_dir) for p in tdg_paths]
    tip_rows = [scan_tip(p, client, image_lower, args.preview_dir) for p in tip_paths]
    parsed_tdg = sum(1 for row in tdg_rows if row.get("structure_provenance") == "VERIFIED")

    payload = {
        "schema": 1,
        "task": "S20 Original UI Archaeology",
        "scope": "Fixed-hash 2.2 client, static-only. No retail executable/DLL was executed.",
        "fixed_inputs": {
            "installer_sha256": INSTALLER_SHA256,
            "unpacked_neodark_sha256": UNPACKED_NEODARK_SHA256,
        },
        "provenance_policy": {
            "VERIFIED": "direct fixed-hash 2.2 resource/structure/static-byte fact",
            "VERIFIED-HISTORICAL": "dated external same-era/same-lineage evidence; not 2.2 byte truth",
            "RECOVERED_SECONDARY": "strong recovered project evidence short of direct UI behavior capture",
            "INFERRED": "candidate role/layout interpretation; must not be presented as retail fact",
            "UNVERIFIED": "not established",
        },
        "summary": {
            "tdg_file_count": len(tdg_rows),
            "tdg_structurally_parsed": parsed_tdg,
            "tdg_parse_failures": len(tdg_rows) - parsed_tdg,
            "tip_file_count": len(tip_rows),
            "private_preview_count": sum("private_preview" in row for row in tdg_rows + tip_rows),
        },
        "tdg_assets": tdg_rows,
        "tip_assets": tip_rows,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.html:
        args.html.parent.mkdir(parents=True, exist_ok=True)
        write_index(args.html, tdg_rows, tip_rows, args.historical_dir)
    print(json.dumps(payload["summary"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
