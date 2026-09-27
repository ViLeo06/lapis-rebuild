"""Internal ZIP32/STORE encoder for web/scripts/full-pack.ts (Python stdlib only).

The TypeScript caller validates/canonicalizes the schema-1 authority first and
verifies the completed archive afterwards. Never execute any source asset.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import zipfile


def write_pack(root_name: str, manifest_name: str, output_name: str) -> None:
    root = Path(root_name).resolve(strict=True)
    manifest_bytes = Path(manifest_name).read_bytes()
    manifest = json.loads(manifest_bytes)

    def put(archive: zipfile.ZipFile, name: str, data: bytes) -> None:
        info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_STORED
        info.create_system = 3
        info.external_attr = 0o100644 << 16
        info.internal_attr = 0
        info.extra = b""
        info.comment = b""
        archive.writestr(info, data)

    # 'x' refuses existing output. The caller owns this private staging directory.
    with zipfile.ZipFile(output_name, "x", compression=zipfile.ZIP_STORED,
                         allowZip64=False) as archive:
        put(archive, "resource-manifest.json", manifest_bytes)
        for asset in manifest["assets"]:
            relative = asset["path"]
            parts = relative.split("/")
            if not parts or any(p in ("", ".", "..") for p in parts):
                raise ValueError("Unsafe path")
            source = root
            for part in parts:
                source = source / part
                if source.is_symlink():
                    raise ValueError(f"Symlink source forbidden: {relative}")
            if not source.resolve(strict=True).is_relative_to(root):
                raise ValueError("Source escapes root")
            flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
            fd = os.open(source, flags)
            with os.fdopen(fd, "rb") as stream:
                info = os.fstat(stream.fileno())
                if not stat.S_ISREG(info.st_mode):
                    raise ValueError(f"Not a regular file: {relative}")
                if info.st_size != asset["size"]:
                    raise ValueError(f"SIZE_MISMATCH: {relative}")
                # Bounded even if another process grows the file while we read it.
                data = stream.read(asset["size"] + 1)
            if len(data) != asset["size"]:
                raise ValueError(f"SIZE_MISMATCH: {relative}")
            if hashlib.sha256(data).hexdigest() != asset["sha256"]:
                raise ValueError(f"HASH_MISMATCH: {relative}")
            put(archive, relative, data)


if __name__ == "__main__":
    try:
        if len(sys.argv) != 4:
            raise ValueError("Internal usage: write_lapispak.py ROOT CANONICAL_MANIFEST OUTPUT")
        write_pack(*sys.argv[1:])
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
