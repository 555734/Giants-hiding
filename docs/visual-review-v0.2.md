# Visual acceptance review — 2026-10-21 JST

Target: the user-supplied harbour gameplay image. The continuous 30-second traversal and third-person camera remain required.

Material-only source: 982e9f2f85bce2ff1fcd8a5579030e2893acc18e. Reviewed source frames: 0, 7.5, 25.5 and 28.5 seconds, published in pv-previews for run 39466260419.

Status: NOT accepted as reference-level fidelity. Do not describe this pass as achieving the requested quality.

Observed problems:
- Smooth base-mesh hand/forearm silhouette still lacks anatomical folds, fingernail integration and detailed skin variation.
- Recolored/inflated base-mesh clothing remains visibly unlike fitted workwear.
- The Lee Perry-Smith head sculpt has closed eyelids; albedo edits do not correct that geometry.
- City forms, facades and roof placement remain repetitive, and detailed quay/boat dressing is missing.
- PBR stone/wood/plaster, environment light, reflected water and contact occlusion improve surface rendering but do not resolve those modeling issues.

The 30-second full render of the material-only pass is stopped to avoid treating it as the requested result. Next: inspect a licensed scanned actor on visual-assets-trial, retaining rendered screenshots/metadata only. Renderpeople free-sample meshes may be used for renders but must not be redistributed as source files or included in public repository artifacts. Local/CI downloads must remain transient. Recheck the character silhouette, open eyes, skin and clothing before another full capture.
