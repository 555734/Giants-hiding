# Giants Hiding — Harbour Escape PV v0.5

[Latest 30-second PV (1080p / 30fps)](https://github.com/555734/Giants-hiding/releases/download/pv-build-27/giants-hiding-pv-30s.mp4) · [Character revision and verification](docs/visual-review-v0.5.md)

One continuous 30-second third-person traversal. A normal-size player crosses a giant worker's hand, jumps onto a single cargo tray, releases its latch, rises on that same tray and crouches behind timber as the worker examines the load. The camera follows throughout.

This is a replay-controlled 3D gameplay prototype. It is not a finished escape game. The supplied image board is the visual target; reference-level fidelity has not been established.

## Run locally

Requires Node 24, Python 3, Pillow and Blender 4.x with its FBX/glTF import/export support. On Ubuntu, Blender additionally needs its Python numpy/Pillow packages.

```sh
npm ci
python3 -m pip install Pillow==10.4.0
npm run assets
python3 scripts/scanned-download.py
blender -b -t 2 --python-exit-code 1 --python scripts/prepare-scanned.py
npm run dev
```

Replay starts automatically. Space pauses, R restarts, dragging changes the view. P switches to exploration at the current position; WASD moves, Space jumps, C crouches, E operates the latch and G grips the rail.

The actor is downloaded from Renderpeople's official free-sample page and prepared transiently. Its source meshes, maps and prepared GLB must remain local: the Renderpeople license permits rendered images/animation and real-time use, but forbids redistributing downloadable asset files. Do not publish the prepared GLB or a dist build containing it. This repository and its public workflow artifacts publish code, metadata and rendered footage only. See https://renderpeople.com/general-terms-and-conditions/ and https://renderpeople.com/free-3d-people/ .

## Rendering

```sh
npm test
npm run build
npm run pv:stills
python3 -m pip install numpy scipy Pillow
python3 scripts/audio.py
npm run pv:render
```

Capture requires Chrome/Chromium and FFmpeg. Set CHROMIUM_PATH if needed. The scene simulation advances at 60 Hz; v0.4 video samples it at 1920×1080 / 30 fps. The output is output/giants-hiding-pv-30s.mp4.

GitHub Actions reviews representative frames, including the takeoff transition, then full captures triggered by a commit message containing [render-pv] render 20 consecutive 1.5-second ranges. Each runner downloads the same actor bundle, checked against the review job's SHA256. Each range starts from the same deterministic simulation. Assembly verifies frame numbers, adjacent state timing/positions and camera positions. The final file is decoded in full and checked for 30 seconds and 900 frames. A contact sheet is extracted from the encoded video. No edits, scene changes or image-to-video interpolation are inserted.

## Implementation

- src/simulation/: deterministic route, jump, simplified support collision, cargo carry, latch and hiding visibility.
- src/render/: same persistent scene, scanned/skinned character adapter, two-bone IK, world, materials, reflected water and contact AO.
- scripts/: licensed actor preparation, CC0 material downloads, capture, original Foley, assembly and verification.
- docs/: timing, asset provenance and visual acceptance review.

The scanned actor replaces the recolored base mesh and closed-eye head used in v0.1/v0.2. The adapter retains the route while fitting the character's native bone axes to hand placement, grip, gaze, stance and crouch. Walk phase follows ground distance. PBR stone/wood/plaster/roof maps use metre-space projection; the city has varied orientations/elevations, foundations and work barges.

Current limitations include the provisional modern clothing, simplified hand support proxy and giant behavior, repeated city construction and unfinished art direction. Photoreal source textures do not by themselves establish parity with the supplied image.

## Credits

Current footage: Renderpeople Nathan Animated 003 Walking; Poly Haven CC0 surfaces/environment; Three.js MIT; Rapier Apache-2.0. Full credits and adaptation details are in docs/CREDITS.txt. Original code, city geometry and Foley were made for this project.

Legacy source/tests also retain the CC0 male base mesh and CC BY 3.0 Lee Perry-Smith head, with their original credits in docs/legacy-asset-credits.txt. These are not used for the v0.3 actor.

## v0.4 visual pass

The cargo uses baked irregular timbers, cut-end rings and cracks, braided rope, iron straps and bolts, plus hoist chains connected to a dock gantry. Building facades have lighter limewash, arched windows, corner masonry, cornices and balconies. Character scan materials are classified into workwear, trousers and boots; a skinned sleeve shell and a fitted satchel replace parts of the modern T-shirt appearance. The albedo retains its native 8K resolution; normal/roughness textures use 4K/2K. A ray query adjusts the rendered feet to the visible supporting hand; a deterministic takeoff correction blends this offset through the jump. Crouched hands curl over the front cargo beam. The deterministic simulation and 30-second route are retained. Visual acceptance is checked in rendered frames before a new full capture.

## 人物改修 v0.5

スキャンの骨格を維持して上着の裾・ポケット・縫い目・袖を加工し、別の眼球材質と虹彩・瞳孔、控えめな肌の反射を導入。隠れる姿勢も腰・足・手首を調整しています。衣服はゲーム用の近似であり、参考画像と同等の品質を保証するものではありません。

`prepare-scanned.py` は `tailor-scanned.py` を呼び出します。変換済み人物モデル・テクスチャは引き続き非公開の一時ファイルとして扱い、映像のみを公開します。
