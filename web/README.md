# Web Lab

Private Web-first diagnostic and provisional training implementation. Not V1.

## Development

Node>=22.12 andPython>=3.12. From the repository root:

```sh
python tools/prepare_web.py --client-root /path/to/extracted/client
cd web
npm ci --ignore-scripts
npm run dev
```

The generator validates29source hashes and refuses to overwrite existing output. CI without private resources uses `python tools/testing/make_web_fixture.py --out web/public/game-data` on a clean checkout. The page labels synthetic packs.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Private no-install preview

```sh
python tools/package_web_preview.py --dist web/dist --pack web/public/game-data --out /path/to/private-preview.html
```

Open theHTML in a desktop browser. Runtime andassets are embedded without externalCDN requests. Keep this file private. IndexedDB on file origins can vary; JSON export/import is the portable fallback. Third-party software licenses are included; original game art remains subject to its own rights.

## Controls and limits

Selectcharacter,rawaction anddirection;pause orstepframes. Clickwalkable map points oruseWASD. Togglegrid,collisionprojection andbounds. Starttraining,clicka dummy,attack/use skills,returnandsave.

Training enemies/effects are synthetic; mechanics/timings are UNVERIFIED. Map is flattened;foregroundocclusion,authenticMagicRes,originaldeathanimations,inventory andfullprogression are notimplemented. No login,telemetry,cloudsave ormultiplayer.
