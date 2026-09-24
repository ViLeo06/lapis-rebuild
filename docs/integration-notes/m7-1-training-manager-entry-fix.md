# M7.1 Training Manager Entry Fix — 2026-09-24

## Trigger

User playtest of the first M7.1 private standalone could not locate the 15-battle training entry.

## Root cause

The 15-battle registry and dialog were present, but the primary world entry was not discoverable at spawn.

- field spawn: `(22,24)`
- previous training-manager cell: `(25,23)`
- Manhattan distance: `4`
- manager interaction radius: `2`

The legacy training guide therefore remained the obvious nearby interaction while the new 15-battle manager did not expose its interaction prompt at spawn.

## Production fix

PR #66 / `codex/m7-1-training-manager-entry-fix`:

- changes the desired manager placement to the nearest distinct walkable cell two cells left of the compatibility guide;
- on the real Map 1 collision this resolves to `(20,24)`;
- keeps the manager within interaction radius at initial spawn;
- changes the world label to `训练管理员 · 15关`;
- changes the initial runtime notice to explicitly direct the player to press `E` or tap the manager interaction;
- adds an initialization invariant that throws if future map/collision changes make the manager unreachable from the initial spawn.

The B4023 visual remains `VERIFIED-STATIC-ORIGINAL`; binding it to the offline training-manager role remains `RECONSTRUCTION_POLICY`.

## Validation

GitHub Actions run `35936533115`:

- parser: pass
- TypeScript/typecheck: pass
- Node unit tests: pass
- production build: pass
- standalone synthetic: pass
- ordinary Chromium/offline E2E: `86 passed / 9 skipped / 0 failed`

PR #66 merged to `main` at:

`fb738eec6d519bccd5c06f46b87d02282a26de6e`

## Private standalone handoff

Repacked current code with the previously fixed-hash-verified private derived pack:

- file: `lapis-m7-1-training-manager-fixed.html`
- SHA-256: `15a8414ca3264a217447209b1fd6ff4c6649c31dcb8c4b09558e4c271b83c5db`
- embedded private entries: `3,908`
- approved installer SHA-256: `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`

## Remaining gate

This follow-up run did not execute a new `private-original` browser job. The repaired standalone therefore remains pending direct user playtest:

`spawn -> 训练管理员 · 15关 -> 15 battle list -> launch training -> progression/save loop`

Do not mark `USER-ACCEPTED` until the user explicitly confirms this repaired standalone.
