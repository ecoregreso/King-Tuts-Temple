# Runtime and artwork notices

## Bundled JavaScript

`vendor/pixi-gsap.js` was copied intact from the user's earlier working Sewer Spins standalone game. The bundle identifies itself as PixiJS 8.20.1 and GSAP 3.15.0. The original embedded copyright and license headers are retained.

PixiJS: MIT License. https://pixijs.com/

GSAP: GreenSock copyright and standard-license terms in the bundle. https://gsap.com/standard-license/

No representation is made that this combined runtime is a new independently published distribution. It is retained specifically as the user's previously working local runtime.

## Artwork

Custom scene, character and PSD-derived control/digit artwork was taken from `egypt.zip` supplied for this project. The earlier Kemet pack supplies the additional matching symbols and decorative artwork listed in the README. Its provided `ASSET_LICENSE.txt` and `PACK_NOTICES.txt` are retained alongside this notice. This is a project handoff, not a separate asset-library product. Preserve the applicable source licenses when distributing a finished game.

No font files or third-party recorded audio files are bundled. The gold digit sprites and control lettering are rasterized images. Sound effects are synthesized in code using the browser's audio API.

## Live Spine-export playback

`spine-character.js` is a purpose-built player for the supplied Anubis 3.8.99 export. It is not the complete Esoteric runtime, the official Spine-Pixi plugin, or a general-purpose Spine importer. It implements the bones, weighted meshes, deform timelines, constraints, attachment swaps and clipping used by this export. It creates a shared transparent texture consumed by the existing Pixi game.

Bone transform and atlas-coordinate conventions were adapted with reference to Esoteric Software's Spine 3.8 runtime source (copyright 2013–2020, Esoteric Software LLC). The current Spine Runtimes License Agreement is included in `SPINE_RUNTIME_LICENSE.txt` and embedded in the adapter, including the standalone HTML. This handoff does not grant a Spine Editor license or establish that a publisher meets the license requirements.

Primary references:
- https://github.com/EsotericSoftware/spine-runtimes/blob/3.8/spine-ts/core/src/Bone.ts
- https://github.com/EsotericSoftware/spine-runtimes/blob/3.8/spine-ts/core/src/attachments/MeshAttachment.ts
- https://esotericsoftware.com/spine-runtimes-license
- https://esotericsoftware.com/spine-editor-license

The source JSON and atlas remain unchanged. The atlas image in the original archive was misnamed with a `.spine` extension despite containing PNG bytes; the repaired `.png` copy is used. No Spine Editor executable is included. Confirm the applicable Spine licensing position before integrating modifications into, or publishing, a distributed product.
