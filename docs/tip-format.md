# TIP sprite library format / 2.2 client

Status: **VERIFIED_STATIC_STRUCTURE** for the 27 `*.Tip` files in the hash-pinned 2.2 client. No original executable was run.

`NRes/NPC350.Tip` is a graphics/sprite library, not an NPC behavior/quest table. This corrects the earlier working hypothesis that its large binary body might contain NPC runtime records.

## Container

All observed files start with ASCII `NORMAL LIBRARY.\0`.

| Offset | Type | Observation |
| --- | --- | --- |
| `0x00` | 16 bytes | magic `NORMAL LIBRARY.\0` |
| `0x10` | `uint16` | raw flag; only `0x0200` and `0x0600` observed; semantic meaning unknown |
| `0x12` | 9 bytes | zero in all 27 files |
| `0x1b` | `uint16` | canvas width |
| `0x1d` | `uint16` | canvas height |
| `0x1f` | `uint8` | `0x20` in all 27 files; semantic meaning unknown |
| `0x20` | `uint8` | `0x08` in all 27 files; semantic meaning unknown |
| `0x21` | `uint32` | frame count |
| `0x25` | `uint32[frame_count+1]` | monotonic frame stream offsets, measured in 16-bit words; first offset is zero |

The compressed stream begins immediately after the offset table. Its byte size is exactly `2 * offsets[-1]`.

After the stream:

1. `uint32 frame_count` repeated.
2. `frame_count` descriptors of 16 bytes each.
3. EOF immediately after the final descriptor.

Each descriptor is `<4i>` in the order:

`left, top, bottom, right`

and describes a rectangle inside the canvas. Width is `right-left`; height is `bottom-top`.

The full-size identity is therefore:

`file_size = 0x25 + 4*(frame_count+1) + 2*offsets[-1] + 4 + 16*frame_count`

This identity holds for every observed 2.2 Tip file.

## Frame stream

Each frame occupies the word range `offsets[i] .. offsets[i+1]` and contains exactly `frame_height` rows.

Each row is:

1. `uint16 span_count`
2. `span_count` run codes plus run-specific payload words

A run code is:

- high 4 bits: run kind
- low 12 bits: run length in pixels

For each row, the sum of run lengths must equal the frame rectangle width exactly.

### Structurally verified payload sizes

| Kind | Payload words | Status |
| ---: | ---: | --- |
| 0 | `0` | framing verified; visual meaning not asserted by parser |
| 1 | `run_length` | framing verified; words are compatible with literal RGB565 evidence, but rendering is a separate claim |
| 2 | `1` | framing verified; visual meaning **UNVERIFIED** |
| 3 | `2 * run_length` | framing verified; visual meaning **UNVERIFIED** |
| 4 | `2` | framing verified; visual meaning **UNVERIFIED** |

The kind-2 rule was the final missing framing rule. `Char400.Tip` contains 36,308 kind-2 runs; treating each kind-2 run as consuming one payload word makes every row, frame offset, descriptor, and EOF boundary close exactly. With this rule, all 27 Tip files parse without structural error.

Do not infer alpha/blend/constant-color semantics for kinds 2/3/4 solely from payload size.

## Representative resources

- `NPC350.Tip`: canvas `3000×1125`, 50 frames; descriptors form 300×225 sprite cells in a 10×5 arrangement.
- `Char350.Tip`: canvas `3000×2250`, 100 frames; 300×225 cells in a 10×10 arrangement.
- `MagicIcon.Tip`: canvas `640×640`, 400 frames; descriptors are 32×32 cells.
- `Ground_motion.Tip`: canvas `384×512`, 8 frames; descriptors are 192×128 cells.
- `logo1.Tip`: canvas `800×600`, one full-canvas frame; each row can be represented by a single kind-1 run of length 800.

## Tooling

- `tools/convert/tip.py`: strict parser preserving raw run payload words.
- `tools/validate/validate_tip_assets.py`: validates the whole Tip corpus and writes structural counts/hashes.
- `tests/parsers/test_tip.py`: synthetic corruption and all-kind framing tests.

The project should not render kinds 2/3/4 as original-authentic pixels until their visual semantics are independently established.
