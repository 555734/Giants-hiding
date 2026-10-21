# Giants Hiding — Harbour Escape PV v0.6

[Latest 30-second PV (1080p / 30fps)](https://github.com/555734/Giants-hiding/releases/download/pv-build-31/giants-hiding-pv-30s.mp4) · [Model and architecture revision / verification](docs/visual-review-v0.6.md)

One continuous 30-second third-person traversal. A normal-size player crosses a giant worker's hand, jumps onto a single cargo tray, releases its latch, rises on that same tray and crouches behind timber as the worker examines the load. The camera follows throughout.

This is a replay-controlled 3D gameplay prototype. It is not a finished escape game. The supplied image board is the visual target; reference-level fidelity has not been established.

## Run locally

Requires Node 24, Python 3, Pillow and Blender 4.3.2 with its FBX/glTF import/export support. On Ubuntu, Blender additionally needs its Python numpy/Pillow packages.

```sh
npm ci
python3 -m pip install Pillow==10.4.0
npm run assets
python3 scripts/scanned-download.py
python3 scripts/worker-download.py
python3 scripts/architecture-download.py
blender -b -t 2 --python-exit-code 1 --python scripts/prepare-worker.py
blender -b -t 2 --python-exit-code 1 --python scripts/prepare-architecture.py
blender -b -t 2 --python-exit-code 1 --python scripts/prepare-scanned.py
npm run dev
```

Replay starts automatically. Space pauses, R restarts, dragging changes the view. P switches to exploration at the current position; WASD moves, Space jumps, C crouches, E operates the latch and G grips the rail.

The two actors are downloaded from Renderpeople's official free-sample page and prepared transiently. Its source meshes, maps and prepared GLB must remain local: the Renderpeople license permits rendered images/animation and real-time use, but forbids redistributing downloadable asset files. Do not publish the prepared GLB or a dist build containing it. Renderpeople models and textures are excluded from public artifacts. The CC-BY 4.0 architecture kit may be shared with its attribution and modification notice. See https://renderpeople.com/general-terms-and-conditions/ and https://renderpeople.com/free-3d-people/ .

## Rendering

```sh
npm test
npm run build
npm run pv:stills
python3 -m pip install numpy scipy Pillow
python3 scripts/audio.py
npm run pv:render
```

Capture requires Chrome/Chromium and FFmpeg. Set CHROMIUM_PATH if needed. The scene simulation advances at 60 Hz; the video samples it at 1920×1080 / 30 fps. The output is output/giants-hiding-pv-30s.mp4.

GitHub Actions reviews representative frames, including the takeoff transition, then full captures triggered by a commit message containing [render-pv] render 20 consecutive 1.5-second ranges. Each runner downloads the same actor bundle, checked against the review job's SHA256. Each range starts from the same deterministic simulation. Assembly verifies frame numbers, adjacent state timing/positions and camera positions. The final file is decoded in full and checked for 30 seconds and 900 frames. A contact sheet is extracted from the encoded video. No edits, scene changes or image-to-video interpolation are inserted.

## Implementation

- src/simulation/: deterministic route, jump, simplified support collision, cargo carry, latch and hiding visibility.
- src/render/: same persistent scene, scanned/skinned character adapter, two-bone IK, world, materials, authored architecture instancing, four-cascade shadows, reflected water and contact AO.
- scripts/: licensed actor/coat preparation, CC-BY architecture extraction and LOD preparation, CC0 material downloads, capture, original Foley, assembly and verification.
- docs/: timing, asset provenance and visual acceptance review.

The protagonist retains Nathan's native rig and skin scan, with a new hip-length skinned coat, woven material, collar, lapels and leather satchel. The giant is a distinct Eric scan and rig, with his native long-sleeve collared shirt and vest. The native eye textures receive a separate corneal material. Both rigs use deterministic IK and the original continuous route.

The former box-house generator has been replaced by six architectural prefabs extracted from the CC-BY 4.0 Amazon Lumberyard Bistro scene. Their modeled windows, cornices, balconies and authored UVs/PBR maps are retained. The city has 126 buildings with separate high/low LODs, adapted tiled roofs and individually modeled wall masonry courses. Metre-space PBR maps remain on the quays, wall and cargo. Import dimensions are checked at runtime to catch FBX unit errors.

Current limitations include provisional period clothing, simplified hand-support collision and giant behavior, repeated architecture, incomplete facial animation and unfinished art direction. The supplied reference image remains substantially more photorealistic; asset replacement is not a claim of equal quality.

## Credits

Current footage: Renderpeople Nathan Animated 003 Walking and Eric Rigged 001; Amazon Lumberyard Bistro / NVIDIA ORCA, CC-BY 4.0; Poly Haven CC0 surfaces/environment including Rough Linen and Brown Leather; Three.js MIT; Rapier Apache-2.0. Full credits and adaptation details are in docs/CREDITS.txt and docs/bistro-license.txt. Original canal/cargo/wall/boat geometry, coat construction, code and Foley were made for this project.

Legacy source/tests also retain the CC0 male base mesh and CC BY 3.0 Lee Perry-Smith head, with their original credits in docs/legacy-asset-credits.txt. These are not used for the v0.3 actor.

## 人物・建築の置き換え v0.6

巨人を別の顔・体格・服装のモデルへ変更し、主人公に立体的な長い上着を追加しました。街は箱型の家から詳細な建築モデル126棟に置き換えています。人物と遠景の街にカスケードシャドウを適用しています。

`prepare-scanned.py` は `coat-scanned.py` を呼び出します。`prepare-worker.py` は巨人用の別スキャンを準備します。変換済み人物モデル・テクスチャは非公開の一時ファイルとして扱い、映像のみを公開します。

検証と残る課題は [visual-review-v0.6.md](docs/visual-review-v0.6.md) に記録しています。
