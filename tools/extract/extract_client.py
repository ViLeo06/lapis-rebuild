#!/usr/bin/env python3
"""Statically carve the embedded 7z payload from the 2.2 installer.

The installer is never executed.  Exact archive length is derived from the 7z
Signature Header, so NSIS trailer bytes are not included in the carved file.
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import struct
import subprocess
from pathlib import Path

SEVEN_Z_SIGNATURE = b"7z\xbc\xaf\x27\x1c"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def locate_payload(installer: Path) -> tuple[int, int]:
    data = installer.read_bytes()
    offset = data.find(SEVEN_Z_SIGNATURE)
    if offset < 0:
        raise ValueError("embedded 7z signature not found")
    if offset + 32 > len(data):
        raise ValueError("truncated 7z Signature Header")
    header = data[offset : offset + 32]
    next_header_offset = struct.unpack_from("<Q", header, 12)[0]
    next_header_size = struct.unpack_from("<Q", header, 20)[0]
    archive_size = 32 + next_header_offset + next_header_size
    if offset + archive_size > len(data):
        raise ValueError("7z archive extends beyond installer")
    return offset, archive_size


def carve(installer: Path, output: Path) -> dict:
    offset, size = locate_payload(installer)
    output.parent.mkdir(parents=True, exist_ok=True)
    with installer.open("rb") as src, output.open("wb") as dst:
        src.seek(offset)
        remaining = size
        while remaining:
            chunk = src.read(min(8 * 1024 * 1024, remaining))
            if not chunk:
                raise ValueError("unexpected EOF while carving 7z")
            dst.write(chunk)
            remaining -= len(chunk)
    return {
        "installer_size": installer.stat().st_size,
        "installer_sha256": sha256(installer),
        "payload_offset": offset,
        "payload_size": size,
        "payload_sha256": sha256(output),
    }


def extract_with_7zip(payload: Path, output_dir: Path) -> str:
    exe = next((shutil.which(name) for name in ("7zz", "7z", "7za") if shutil.which(name)), None)
    if not exe:
        raise RuntimeError("7-Zip executable not found; install 7zz/7z/7za or use carving only")
    output_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run([exe, "x", "-y", f"-o{output_dir}", str(payload)], check=True)
    return exe


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("installer", type=Path)
    parser.add_argument("--payload", type=Path, default=Path("_ybcs_payload.7z"))
    parser.add_argument("--extract-dir", type=Path)
    parser.add_argument("--expected-installer-sha256")
    args = parser.parse_args()

    result = carve(args.installer, args.payload)
    if args.expected_installer_sha256 and result["installer_sha256"].lower() != args.expected_installer_sha256.lower():
        raise SystemExit("installer SHA-256 mismatch")
    if args.extract_dir:
        result["extractor"] = extract_with_7zip(args.payload, args.extract_dir)
    for key, value in result.items():
        print(f"{key}={value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
