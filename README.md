# Giants Hiding — Harbour Escape PV

A continuous 30-second third-person 3D traversal prototype, based on the v0.1 storyboard. The player crosses the giant worker's left hand, jumps onto one cargo tray, releases its latch, rises with that same tray, and crouches behind timber while the worker examines the load. The camera stays with the player throughout.

## Run

```sh
npm ci
npm run assets
npm run dev
```

Open the local URL. Replay starts automatically. Space pauses; R restarts; drag changes the view. P switches to exploration at the current state; WASD moves, Space jumps, C crouches, E operates the latch, G grips the rail. The level is a PV prototype, not a complete escape game.

## Capture

```sh
npm run pv:stills
python3 -m pip install numpy scipy Pillow
python3 scripts/audio.py
npm run pv:render
```

Capture requires Chrome/Chromium and FFmpeg. Set `CHROMIUM_PATH` when using a system browser. Output is `output/giants-hiding-pv-30s.mp4`. The renderer advances the same simulation at 60 fixed steps per second and records its canvas frame by frame. It does not interpolate storyboard images, cut between scenes, or use generated video. The MP4 is a recording of the replay-controlled prototype; this is not a finished production game's trailer.

GitHub Actions builds the project and generates review frames. The full-render workflow also produces the MP4, audio, telemetry, and a decoded contact sheet.

## Implementation

- `src/simulation/`: kinematic movement, gravity/jump sweeps, planar support, moving-platform carry, latch condition, recorded steering and NPC timing.
- `src/render/`: one persistent scene, articulated humanoids, two-bone limb IK, city, canal, wall, cargo, materials.
- `scripts/`: asset integrity checks, deterministic browser capture, Foley and video checks.
- `docs/`: storyboard timing, asset provenance, capture notes.

The hand uses a simplified support proxy with a shallow ramp fitted to the posed hand along the recorded route. The cargo is a persistent kinematic support. On flat supports the grounded motor integrates horizontal velocity directly, avoiding a Rapier capsule resting-contact stiction issue; airborne motion uses Rapier sweeps. This prototype does not implement the full giant AI, complete escape routes, or mobile release controls.

## Asset credits (also apply when sharing the video)

- **Male base mesh**: orange juice games, CC0. Original: https://orange-juice-games.itch.io/male-base-mesh . Mirror: https://github.com/BoQsc/Godot-3D-Male-Base-Mesh . Modified: clothing/material assignment, removed original head surface, rig posing, scale and accessories.
- **Infinite / Lee Perry-Smith 3D Head Scan**: Lee Perry-Smith / Infinite-Realities, **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/). Model conversion/distribution credits: Morgan McGuire and Guedis Cardenas. Source distribution: https://threejs.org/examples/webgl_materials_normalmap.html ; original dataset information: https://casual-effects.com/data/ . Modified: scaled, attached to the body rig, material/normal settings and pose. Asset provenance also documented at https://github.com/keijiro/InfiniteScan . Please retain this credit with the footage; it does not imply endorsement.
- Three.js: MIT. Rapier: Apache-2.0. City meshes, props, procedural materials, camera and Foley: created for this project.

Downloaded, rigged assets were adapted in code. The face albedo was edited with image generation to open the eyes; the UV-map prompt is in `docs/face-texture.md`. No image-to-3D reconstruction service was used. The original image-board quality is a visual target, not a claim about this prototype's fidelity.

The GitHub renderer distributes consecutive frame ranges across runners. Every range starts from the same deterministic simulation and uses the same time-dependent camera and articulated poses; `scripts/assemble.py` checks the adjacent frame numbers, state positions and camera positions before joining encoded frames. No action, camera or location changes are inserted at range boundaries. Distant houses use simpler window details to reduce capture cost.
