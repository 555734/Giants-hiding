# PV v0.4 visual revision

Source: e4192c53036ce93af7f91decce011c4b2b5afbef
Capture: https://github.com/555734/Giants-hiding/actions/runs/39482553253
Reference: user-supplied 6446.png, a close third-person view of a worker's timber load above a walled canal city.

## Changes verified in representative rendered frames

- Rebuilt the persistent cargo tray with irregular bevelled timbers, split marks, cut-end grain, deck fasteners, thick crossbeam, iron plates, bolts, braided sling ropes and coils. The wood projection follows the cargo instead of swimming as the tray rises. Cut-end textures are confined to the ends of the grain axes.
- Added moving hoist links and a dock cantilever. The bottom links follow the load and remain connected to its slings.
- Corrected inverted roof winding, added arched openings, corner stones, cornices and balconies, and layered a lighter limewash over the scanned plaster material. Increased atmospheric separation. Distant blocks use simple geometry; foreground cargo retains authored bevels.
- Preserved the scanned actor's native 8K albedo, using 4K normals and 2K roughness. Classified photographed clothing separately, added skinned fabric sleeves in correct world units, and fitted a small satchel. Oversized experimental collar/cuff props and incomplete sleeve patches were rejected during screenshot review.
- The visible player follows the hand surface with a ray-based foot IK offset. At 7.5 s the correction is approximately +0.189 m. The -0.425 m takeoff correction at 10.3 s blends through the jump instead of snapping to zero; the 10.35 s sample is approximately -0.420 m.
- Crouched hands turn and curl over the crossbeam. A smooth camera approach between 19 and 24 seconds increases foreground scale and puts the player left of the worker's face while preserving the same scene and continuous route.

Nine exact-source review frames were published with source/run metadata. The 7.5 s and 25.5 s frames were visually inspected. Earlier review passes also inspected the before/after takeoff frames. Five tests pass: native rig pose consistency between continuous and distributed updates, the corresponding legacy rig check, the full jump/landing/latch/carry route, reach-gated latch operation, and reset/seek determinism.

## Remaining visual limits

The reference remains more detailed. Building construction is modular, window interiors and street dressing are simplified, fabric folds and tailoring are approximate, and the actor retains some modern scan details and a fixed facial expression. Hand collision remains a simplified physics proxy; the visual foot IK correction is not a replacement for a full moving-hand collider.

## Final movie verification

The assembled MP4 passed all range-boundary frame, state and camera continuity checks. FFprobe and a full FFmpeg decode confirmed H.264/AAC, 1920 x 1080, 30 fps, 900 frames and exactly 30.0 seconds. File size: 71,578,887 bytes. A 30-sample contact sheet was extracted from the encoded video.

Delivered files: https://github.com/555734/Giants-hiding/releases/tag/pv-build-22

## Asset handling

Renderpeople source/converted model and texture data remain transient and excluded from public artifacts. Only source code, permitted source assets, metadata and rendered footage are published. Every rendering job checks the official actor archive against the review job's SHA256. Credits and license links are in docs/CREDITS.txt.
