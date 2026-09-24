# M7.1 Training Manager Entry Fix Validation — 2026-09-24

## User-reported issue

The user could not find where to trigger the 15 training battles in the M7.1 private standalone.

## Reproduced root cause

The 15-battle registry and training-manager dialog were present. The failure was discoverability/world placement:

- field map: Map 1 / 布日古斯_外城;
- player spawn: `(22,24)`;
- previous training-manager resolved cell: `(25,23)`;
- Manhattan distance: `4`;
- training-manager interaction radius: `2`.

The legacy guide remained the obvious nearby interaction while the intended 15-battle primary entry did not expose the normal interaction prompt at spawn.

## Fix

PR #66:

- resolves the manager to the nearest distinct real Map 1 walkable cell near `(20,24)`;
- requires `canInteract(trainingManager.entity, start) === true` during world creation;
- exposes label `训练管理员 · 15关`;
- changes the field-start notice to explain `E` / tap access;
- retains one shared interaction authority for keyboard, pointer and touch;
- adds browser acceptance for desktop `E` and mobile tap opening all 15 training actions.

The B4023 pixels remain fixed-client evidence. Binding that visual to the offline training-manager role remains `RECONSTRUCTION_POLICY`.

## Automated validation

- PR: #66
- source head: `721dca21c998561021f261cd597663e63c4595a5`
- GitHub Actions: `35936533115`
- result: `success`
- main merge: `fb738eec6d519bccd5c06f46b87d02282a26de6e`

The follow-up run passed parser, typecheck, unit tests, production build, standalone synthetic build and ordinary Chromium/offline acceptance. The dedicated `S41_M7_1_FINAL` and `private-original` jobs were skipped for this follow-up and are not claimed as new evidence.

## Repaired private handoff

- file: `lapis-m7-1-training-manager-fixed.html`
- size: `122,549,933` bytes
- SHA-256: `15a8414ca3264a217447209b1fd6ff4c6649c31dcb8c4b09558e4c271b83c5db`
- code source PR: #66
- code source head: `721dca21c998561021f261cd597663e63c4595a5`
- fixed installer SHA-256: `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`
- private pack SHA-256: `6a2108ffbd636587f3aa6cb8fa3a7c3c590df58e2b9dd2cf8ec221c27ab85434`
- indexed private files: `3,907`
- embedded entries: `3,908`

## Human gate

The user explicitly authorized merging the fix and updating project documentation. That authorization is not recorded as playability acceptance.

The remaining manual gate is:

1. open the repaired standalone;
2. confirm the training manager is immediately discoverable at spawn;
3. open the 15-battle list through normal keyboard/touch interaction;
4. launch at least one training battle;
5. explicitly accept or report further defects.
