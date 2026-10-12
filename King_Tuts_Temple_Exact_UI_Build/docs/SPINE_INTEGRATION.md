# Anubis live skeletal integration

## Scope

Build `royal-1.1.1-floor-character` updates the existing Royal Edition game. It does not replace its renderer, reel algorithm, payout engine, offline boot sequence or launcher. `math.js` and `vendor/pixi-gsap.js` are byte-identical to the base package.

This is a **rig-specific Spine-export playback adapter**, not the official Spine-Pixi plugin or a general-purpose replacement for Esoteric Software's runtime. It reads the actual supplied skeleton/atlas and evaluates animations at runtime. No animation frames are prebaked. Bone matrices and mesh vertices change while the containing Pixi sprite can remain stationary.

## Supplied data

The JSON identifies Spine 3.8.99 and contains 81 bones, 93 slots, two authored animations, weighted/unweighted meshes, linked meshes, region attachments and clipping. `idle` is 2 seconds; `action` is 1.6667 seconds. The drawable attachment inventory has 98 entries and 1,876 nondegenerate mesh/quad triangles after resolving linked meshes. That inventory is not a claim that all attachments render simultaneously.

The original export includes a tall decorative frame, background, character meshes and blue flame. The original framing and clipping are preserved for reel symbols and expanded guardians. The outside character omits only portrait decoration and its clipping polygon, exposing the original rigged legs and feet. No separate full-body PNG or generated character artwork is substituted.

Files:
- `source-art/anubis/character_anubis.json` and `.atlas`: unchanged export sources.
- `source-art/anubis/character_anubis.png`: repaired filename for the PNG bytes that were named `.spine` in the uploaded archive.
- `assets/spine/anubis.png`: runtime atlas image, identical bytes.
- `spine-data.js`: embedded JSON/atlas text generated from those sources.
- `spine-character.js`: parser, timeline sampler, bone/constraint evaluation and live mesh rendering.

## Implemented for this export

Bone translation, rotation, scale and shear; normal inheritance and the export's no-rotation/reflection inheritance; uniform-scale two-bone IK for its two foot constraints; its face translation constraint; weighted/unweighted vertices; mesh deformation including linked-mesh inheritance; trimmed/90-degree-rotated atlas regions; region attachments; slot opacity and attachment swaps; the supplied clipping polygon; linear, stepped and authored cubic Bezier curves; and looping, one-shot playback and pose crossfades.

The supplied colors use white RGB with animated opacity. This adapter validates that condition. It is not an implementation of arbitrary color/two-color tint timelines. Path constraints, general nonuniform-scale IK, binary `.skel` imports, arbitrary skins, other Spine versions, and unrepresented timeline/constraint types are outside this adapter's scope. Do not change a different skeleton's version string to force it through the parser. Future rigs should use a properly matched official runtime or an explicitly extended/tested adapter.

## Rendering and integration

One shared skeleton is evaluated. Its original framed canvas continues to feed normal Anubis reel symbols and expanded guardians. A second transparent offscreen canvas renders the same evaluated pose without portrait decoration/clipping for the outside host. The full-body view uses fixed 700×1260 bounds, covering both authored animations, lower legs, feet and flame. No second animation state, onscreen canvas, renderer or WebGL context is created. The host and reels stay synchronized. The outside canvas is not rasterized while hidden on mobile.

The fixed canvas bounds avoid changing sprite size as the arm or flame moves. Slightly expanded triangle clips prevent antialiasing seams. Character updates target 30 Hz at high quality or 15 Hz at low quality; invisible mobile character work is skipped. Reduced motion freezes the pose. This is a bounded, shared CPU rasterization approach, not native GPU Spine mesh rendering; performance depends on the device and is not promised at a fixed frame rate.

Existing reel masks, controls, expansion timing and win presentation remain. Desktop free-spin information sits on the right to avoid covering the full-height host. Narrow layouts omit only the outside host, retaining the existing live reel symbols/guardians. The host is grounded by a stationary contact shadow and a fixed foot reference; background object-fit:cover coordinates are mapped into Pixi stage coordinates during resize.

| Game event | Authored animation |
|---|---|
| Idle / after a reaction | `idle`, looping |
| Outside character click | `action`, then `idle` |
| Spin start | `action`, then `idle` |
| Winning result / large win | `action`, then `idle` |
| Treasure Temple entry | `action`, then `idle` |
| Full-reel guardian expansion | `action`, then `idle` |

The two source clips are reused for these events. No claim is made that separate spin, win or celebration clips were authored in Spine.

## Verification and limitations

`tests/spine.test.py` checks bone movement, changed rendered pixels, blinking alpha, weighted deform, flame attachment switching, action-to-idle transitions, crossfading, reduced motion, live texture sharing, repeated expansion cleanup and event wiring. `tests/browser.test.py` covers the complete existing slot flow, including 100 consecutive animated spins, autoplay and feature/showcase restoration. `tests/floor.test.py` additionally checks the outside decoration filter, 122 sampled animation poses against the full-body bounds, floor alignment in six desktop viewports, mobile hiding, and event wiring. An optional `--baseline` folder enables the eight-pose framed-output pixel comparison against the previous edition. Raw reports and rendered screenshots are included.

Tested backend: headless Chromium with the existing Pixi Canvas2D renderer. WebGL on the user's GPU, Firefox, Safari, touch-device performance and hours-long soak stability were not verified. The adapter has not been compared pixel-for-pixel with the Spine Editor's preview. Its rig-specific constraints are exercised visually and through the included tests, not claimed as complete runtime conformance.

## Licensing

The adapter follows/adapts bone transform and atlas conventions from Esoteric Software's 3.8 runtime sources. Preserve `SPINE_RUNTIME_LICENSE.txt` and the embedded notice. This handoff does not grant a Spine Editor license or certify the publisher's licensing eligibility. See `THIRD_PARTY_RUNTIME_NOTICES.md` for the source references and current official licensing links.
