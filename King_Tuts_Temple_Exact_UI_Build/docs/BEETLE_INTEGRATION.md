# Every-landing beetle animation

Build: `royal-1.1.2-beetle-landings`

## Scope

This is the existing floor-character game with the user's new animation applied
to the scarab/scatter symbol. Anubis, backgrounds, controls, runtime libraries,
Spine playback, payouts, symbol probabilities and free-spin rules are retained.
`math.js`, `vendor/pixi-gsap.js`, `spine-character.js`, `spine-data.js` and
`styles.css` are byte-identical to the previous Floor Character package.

## Asset conversion

Input is the user's `beetle_animated_win.zip`: **54 RGBA PNG frames**, named
`anim_0007.png` through `anim_0060.png`, each 1024 × 1024. All 54 supplied
frames are used in their original numeric order. The archive does not supply
a frame rate; this integration uses **30 fps**, making a playthrough 1.8 seconds.

Every frame receives the SAME transparent crop `[34, 89, 850, 905]`, an
816 × 816 square containing the union of all nontransparent content plus
padding. Frames are resized to 384 × 384 for the approximately 140-design-pixel
symbol. No independent auto-trimming, added background, recoloring, or frame
interpolation is applied. Three transparent PNG atlas pages are preloaded once;
54 lightweight Pixi texture views share their three underlying image sources.
`SOURCE_MANIFEST.json` records the original filenames and SHA-256 hashes.

The first animation frame is also the new static scatter image, including
while the reels scroll. The original static art is retained at
`source-art/beetle/previous-static-scarab.png`.

Rebuild the atlases from the original upload using Pillow:

```sh
python3 tools/build_beetle_atlas.py /path/to/beetle_animated_win.zip
python3 tools/build_standalone.py
```

The 54 full-resolution input PNGs are not duplicated in this download; keep
the original uploaded ZIP for full-resolution re-export. Editable lossless
runtime atlases and the packing script are included.

## Runtime behavior

`Reel.spin()` calls `landBeetles()` once in its existing guarded finish callback,
after committing the final three symbols and before resolving the reel's spin.
The event does not inspect wins, payout amounts, or scatter award counts.
Each visible beetle has its own frame clock inside its existing `SymbolView`.
There is no extra ticker, animation timer, Sprite, or renderer per beetle.

* Each beetle starts as ITS reel stops, rather than waiting for a win.
* One or two non-winning scarabs animate, as do winning or bonus-triggering ones.
* Normal spins, free spins, turbo, autoplay, and manual stop share this hook.
* Only rows 0–2 animate. The hidden top/bottom buffer symbols do not.
* The clip plays once and holds its final frame. The next spin cancels the old
  clip before scrolling; it never delays a manual spin or changes autoplay pace.
* The same symbol landing in the same cell on the next spin restarts at frame 0.
* Fresh/restored visible grids also play their displayed beetles once.
* Win highlighting can scale the symbol without restarting the frame sequence.
* Existing Reduced Motion intentionally displays a static first frame.
* Expanded Anubis wilds still replace their column according to the old rules.

Animation affects presentation only. Deterministic outcome overrides in tests
require the existing `window.__KEMET_TEST__` flag, which is not enabled in PLAY.html.
