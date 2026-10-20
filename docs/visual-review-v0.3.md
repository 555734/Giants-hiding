# PV v0.3 visual review

Source: bf01a57682fa076c1eb877b95d6ea37b7615b19f
Capture run: https://github.com/555734/Giants-hiding/actions/runs/39473469033

This revision does not meet the reference image's visual fidelity. It is an improved gameplay prototype.

## Verified before capture

Five tests pass, including native scanned-rig carrying hand/head pose consistency across sequential and distributed capture, foot placement while crouched, the full jump/landing/latch/carry replay, reach-gated latch operation, and reset/seek determinism. The gaze assertion normalizes quaternions because FBX matrix decomposition returned a magnitude of 0.9999999936112979; the normalized orientation difference is zero.

Eleven rendered review frames were produced and tagged with the source commit/run in pv-previews/previews/manifest.json. Frames at 7.5 and 25.5 seconds were visually inspected. The actor has scan-derived skin, integrated nails, open eyes, hair and actual clothing geometry; the supporting hand remains attached to the same worker and tray. Metre-space PBR maps, reflected water, terrain, building foundations and work barges replace parts of the original blockout appearance.

## Remaining fidelity gaps

The modern T-shirt/jeans do not match the reference's period workwear. Building shapes/windows and wall detailing remain repetitive and simplified. Lighting and animation remain prototype-level. The invisible hand support is a simplified proxy: at the reviewed 7.5-second sample the root support height is approximately 0.19 m below the raycast skin surface, so foot/hand contact is not fully solved. These limitations must not be described as reference-quality parity.

## Encoded-video acceptance

The completed capture pipeline passed consecutive frame-number, simulation-state and camera-continuity checks at every range boundary. The assembled MP4 passed ffprobe validation and a full FFmpeg decode: H.264/AAC, 1920 x 1080, 30 fps, 900 frames, 30.0 seconds, 60,154,886 bytes. A 30-sample motion sheet was extracted from that encoded MP4 and is published alongside the video in release pv-build-17. These are technical delivery checks; the visual fidelity verdict above remains unmet.

Video/review files: https://github.com/555734/Giants-hiding/releases/tag/pv-build-17

## Asset handling

Renderpeople source files and prepared GLB/maps remain transient. Public artifacts contain only rendered footage, metadata and permitted CC0/legacy assets. Every render job checks the official actor bundle against the SHA256 recorded by the review job. Current footage credits are in docs/CREDITS.txt.
