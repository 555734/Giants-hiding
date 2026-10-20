# Face texture adaptation

Asset: `public/assets/face-albedo-open.jpg`.
Source: Lee Perry-Smith / Infinite-Realities head diffuse atlas, CC BY 3.0. Attribution and original source are in CREDITS.txt. Preserve that attribution with the adapted texture and footage.

Mode: built-in image generation, edit. The original scan's closed-eye atlas was used as the edit target. The generated square atlas was encoded as JPEG for the game. Head geometry remains based on the credited scan, with the shoulder portion cropped and a neck fill added.

Prompt:

Use case: identity-preserve / precise-object-edit. Asset type: 1024x1024 square UV diffuse albedo texture atlas for an existing rigged human head in a 3D game. Image 1 is the exact edit target, not a style reference. It is a flattened unlit UV head texture. Change ONLY the two closed eye patches, currently centered approximately at x=43% and x=57%, y=30% of the square, into naturally OPEN, alert, ordinary HUMAN EYES with small dark brown irises looking straight forward. Preserve exactly the original image boundaries, original head UV layout, all facial landmark coordinates, eyebrows, nose, mouth, ears, stubble, skin pores, neck and shoulders, lighting-free albedo tones, and all other skin pixels. Keep the eyes in the original eyelid footprints; don't enlarge, move, beautify or make the eyes round or cartoonish. Paint anatomically plausible upper and lower eyelids around those open eyes. This will be mapped directly onto the SAME 3D head geometry, so absolute pixel registration is critical. Preserve the identical 1:1 square atlas composition. No new portrait, no cropped face, no camera projection, no background, no typography, no extra eyes.
