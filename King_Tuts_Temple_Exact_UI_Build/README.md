# KING TUTS TEMPLE — Reference Frame & Controls Edition

# KING TUTS TEMPLE — Royal Edition

# King Tuts Temple — Eye & Scarab Loop / Royal Symbol Expansion

## Play offline

**Open `PLAY.html`** in Chromium or Chrome (recommended). PixiJS, GSAP, Anubis Spine playback, art, and both animations are embedded in that file; it requires no downloads, install, or server. `run_game.sh` serves the **editable** multi-file version if you prefer to work with the source.

## What changed

- Your **35-frame Eye of Horus** source animation plays on *every* red-eye landing, whether or not it wins. Its red-and-gold artwork is retained; the blue Eye is a **different** imported symbol and receives a stationary iris shimmer, retaining your original blue design.
- Your existing **54-frame emerald scarab/beetle** animation now plays **continuously** until the next spin starts rather than stopping after the first pass. The blue scarab from SpriteForge is a separate paying symbol with a subtle stationary light shimmer.
- Animations play at 30 fps and use **seamless forward/reverse (ping-pong) repetition** to avoid snapping from the final painted pose back to the first one. They begin as **each reel stops**, not on a win; all visible instances have independent clocks. Animations are cleared immediately on the following spin. Turbo, autoplay, quick-stop, winning and losing spins, and free spins use the same event hook. Reduced Motion displays a static pose.
- The eye's input 1024×1024 transparent frames drift by ~56px horizontally and ~78px vertically in the source files. Every frame is *optically recentered* using the original alpha bounding box and an identical **640×640 crop → 384×384 frame**, keeping size and anchor fixed. The beetle keeps the original **384×384 shared atlas bounds** and a fixed sprite pivot/transform; its wing motion remains part of the supplied artwork.
- All **11 SpriteForge images** are included as distinct tiles (Pharaoh, Cleopatra, Anubis guardian, Mummy, Azure Scarab, Azure Eye, Royal Ankh, Lotus, Cobra, Treasure, BONUS). Runtime textures are fitted to the same maximum 140×140 reel slot as the existing symbols. Original transparency and original PNGs are retained.
- `BONUS` tiles and animated **emerald scarabs** count together toward the **existing free-spins feature** (three / four / five+ across the reels). The **azure scarab** is a regular paying symbol. Either Anubis variation can expand a reel during free spins.
- Because 11 distinct paying/feature symbols change winning combinations, **weights and line prizes are rebalanced** instead of leaving the game nearly unwinnable. This changes the math relative to previous versions; the game remains a **fictional-credit demo, not certified or production gambling math**. No certified RTP is claimed.
- Your large freestanding live-Spine Anubis, scenes, UI, paylines, controls, and previous animations remain.

## Build / test

```sh
python3 tools/build_standalone.py
node tests/math.test.js
python3 tests/eye_symbols.test.py
python3 tests/feature_smoke.test.py
```

For source-atlas regeneration from the original eye ZIP: `python3 tools/build_eye_atlas.py path/to/eye_animation.zip`. The same metadata is in `assets/animations/eye/atlas.json`, and every original filename and SHA-256 is in `ALIGNMENT_MANIFEST.json`.

### Source provenance

`assets/symbols/SPRITEFORGE_SOURCE_MAP.json` records the file-to-symbol naming for all 11 SpriteForge images. `docs/` retains earlier artwork, runtime, and Spine notices, including Spine license obligations. The older `tests/beetle.test.py` reflects the **prior one-shot behavior** and has been archived under `docs/legacy-tests/`; the updated looping regression is `tests/eye_symbols.test.py`.


## King Tuts Temple visual update

- New user-supplied **front and back two-piece gold/lapis frame**, layered respectively ahead of and behind the reels. Both use the same position/scale.
- New **KING TUTS TEMPLE** transparent logo extracted from an original generated concept. Source full-height art is at `source-art/king-tuts-winged-logo-full-transparent.png`, the wide in-game rendition at `assets/ui/logo.png`.
- Base game now uses the originally labeled `temple.webp` scene and the free-spin feature uses the originally labeled `main.webp` courtyard scene. The original scene assets were **not modified**, only their display roles switched.
- Anubis's ground alignment recalibrated to follow the new scene assignment. Payout math, spin behavior, animations, and feature logic unchanged.

To regenerate standalone offline `PLAY.html`: `python3 tools/build_standalone.py`.


## Reference frame + buttons update

The complete functioning PixiJS game now uses the exact supplied `fram_back.png` and `1frame_front.png` art as registered front title/side/bottom overlays and a stone backplate. The title is IN the new front art; the older separate logo is no longer drawn over it. The eight approved screenshot-derived gold-and-sapphire controls are separately clickable original buttons: Settings, Sound, Bet −, Bet +, Spin/Stop, Max Bet, Auto/Stop Auto and Turbo. Live BALANCE and BET values replace the static screenshot numbers, and coin denomination moves to Settings (Paytable/Fullscreen to the footer). Reel math, Spine Anubis, looping eyes/beetles, bonuses and win effects are preserved. The frame extraction source, exact original images and placement notes are under `source-art/` and `docs/REFERENCE_UI_INTEGRATION.md`.

Open `PLAY.html` with Chrome or Firefox for offline play; run `./run_game.sh` for editable source.
