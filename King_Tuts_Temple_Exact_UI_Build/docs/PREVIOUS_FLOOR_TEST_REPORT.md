# Validation — Freestanding Anubis

Build: `royal-1.1.1-floor-character`.

## Requested change

The outside Anubis is full-body, enlarged and placed on the courtyard stone ledge (and the corresponding temple floor), with no portrait frame/background. His own rig contains the legs and feet; its portrait crop previously hid them. A soft stationary contact shadow grounds the figure. The original idle/action/flame animations are retained. Framed reel symbols and expanded guardians are unchanged. Desktop free-spin information was moved to the right to keep it clear of the taller character. The existing mobile layout is retained.

## Final passing checks

- **37/37 math/state tests** — `tests/math-results.txt`.
- **35/35 Spine integration checks** — `tests/spine-results.json`.
- **36/36 complete-game browser checks** — `tests/browser-results.json`.
- **24/24 floor-character presentation checks** — `tests/floor-results.json`.

**132 checks passed in total.** These counts refer to the final passing runs, not a claim that every development test attempt passed on its first run.

The complete-game suite finished **100 consecutive animated spins**. It took 8.4 seconds with GSAP accelerated, turbo and reduced motion; it is a regression check, not a normal-speed benchmark or a long-duration stability/FPS guarantee. The same suite exercised autoplay, stop behavior, bets, complete free spins, showcase balance restoration and saved-feature restoration.

**Eight sampled framed idle/action poses were pixel-identical to the previous build**, comparing the actual framed canvas PNG hashes in the same Chromium environment. The new unframed host uses a separate presentation canvas of the same already-evaluated skeleton. No original mesh, atlas, animation timeline, payout engine or renderer bundle was replaced.

The full-body bounds contain visible attachment geometry at **122 sampled poses** across the two authored clips. Tests checked removal of portrait decoration only from the outside draw, preservation of armor/body shadows/eyes/flame, lower-leg/foot pixels, live action movement without scale changes, character-click balance isolation and unchanged reel guardian texture sources.

**Six desktop viewports:** 1280×720, 1600×900, 1920×1080, 1280×800, 2560×1080 and 844×390. Tests checked floor/shadow registration and clearance from reels and spin controls. **390×844 mobile** retains the prior hidden-host layout and avoids unnecessary outside-canvas rasterization. Screenshots are included in `tests/`.

No JavaScript page errors, console warnings/errors or external network requests were reported in the final three browser suites.

**35 source/asset files are byte-identical to the previous Spine Edition**, including `math.js`, the Pixi/GSAP bundle, CSS, all original artwork, original Spine JSON/atlas/PNG and launch scripts. Evidence: `tests/unchanged-files.json`.

## Scope and limitations

The tested rendering backend was the existing **Pixi Canvas2D renderer in headless Chromium**. The original bundled runtime and boot path are unchanged. WebGL on the user's GPU, Firefox, Safari and physical-device performance remain unverified.

The actual embedded game was exercised with Playwright `set_content`, not a mock renderer. File double-click navigation and local-storage persistence on the user's downloaded-file origin were not tested. Saved-feature restoration uses injected in-memory storage. Its short initial RESUMING state is captured in-page to avoid a timing race with automation; subsequent automatic free-spin scheduling is paused only in that test page so the restored snapshot can be checked deterministically.

This remains the same rig-specific Spine 3.8.99 adapter, not the official Spine-Pixi plugin or a general runtime-conformance claim. The extra outside view entails a second offscreen rasterization while visible, not a second skeleton evaluation or GPU context.

The simulation JSON retained from the earlier edition is historical evidence for the unchanged payout engine, not a new simulation. No certified RTP or real-money certification is claimed. All licensing notices remain included.

## Reproduce

```bash
node tests/math.test.js
python3 tests/spine.test.py
python3 tests/browser.test.py
python3 tests/floor.test.py
# Optional previous extracted edition, for the framed-output pixel comparison:
python3 tests/floor.test.py --baseline /path/to/Crowns_of_Kemet_Spine_Edition
```

Browser suites require Python Playwright and Chromium for development only. `CHROMIUM_PATH` can select the browser executable. No test dependencies are needed to open `PLAY.html`.
