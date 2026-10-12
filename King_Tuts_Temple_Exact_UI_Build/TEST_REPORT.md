# KING TUTS TEMPLE — Visual Update Report

Build: 2026-10-11 · king-tuts-temple-1.4.0-winged-frame-swapped-scenes

## Scope

1. Kept all 17 reel symbols and both 35-frame eye and 54-frame scarab animation loops.
2. Replaced old single frame with supplied `frame_back.png` behind reels and `frame_front.png` in front (both 1536×1024). They use identical transforms.
3. Installed **KING TUTS TEMPLE** transparent wordmark derived from generated Egyptian gold-and-blue logo artwork. Original old title preserved under `source-art/previous-crowns-logo.png`; original full-height isolated logo at `source-art/king-tuts-winged-logo-full-transparent.png`.
4. Exchanged original HTML scene roles: base game uses `assets/scenes/temple.webp`; free spins use `assets/scenes/main.webp`. The image files themselves are unchanged. Anubis floor alignment swaps accordingly.
5. Payline math, volatility design, balance, and gameplay code are otherwise untouched.

## Confirmed tests

- `node tests/math.test.js` → **41/41 PASS**, including 10,000 accounting cycles.
- `python3 tests/king_tuts_visual.test.py` → **PASS** in headless Chromium via the offline HTML: renderer initialized, 5 reels, matched front/back frame, logo dimensions, exchanged background links, complete no-win spin ending `IDLE`, background crossfade, mobile 390×844, no console/page errors and no external network requests.
- Previous extended `python3 tests/eye_symbols.test.py`: first **37 animation/asset checks passed** (frame counts, bounding stabilization, restart/loop behavior, reduced motion), then stress portion exceeded the execution timeout. **Do not interpret this as a full suite pass.**
- `node --check game.js` → PASS.
- `python3 -m py_compile tools/build_standalone.py` → PASS.
- Standalone `PLAY.html` rebuilt and rendered successfully in the Chromium smoke test.

## Limitations

- Renderer observed in headless Chromium: Canvas2D. User-specific Firefox/Chrome GPU/WebGL has **not** been independently tested.
- Browser smoke verified the free-spin scene transition visually but did not rerun the complete eight-spin award/summary sequence following this artwork-only patch.
- This is a fictional-credit demo, not a certified real-money product. No certified RTP is claimed.
