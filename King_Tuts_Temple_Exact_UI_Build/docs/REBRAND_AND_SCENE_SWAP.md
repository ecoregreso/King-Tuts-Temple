# King Tuts Temple visual update

- `assets/ui/frame_back.png`: authored stone background behind Pixi reels.
- `assets/ui/frame_front.png`: authored transparent gold/lapis overlay in front of reels.
- `assets/ui/logo.png`: transparent, wide crop of the generated Tut title. The original full transparent artwork is preserved in `source-art/king-tuts-winged-logo-full-transparent.png`.
- `index.html`: scene order swapped; `dayScene` displays `temple.webp` (old bonus scene), `templeScene` displays `main.webp` (old base scene).
- `game.js`: Anubis contact-shadow floor fractions were swapped to match the new imagery. `PIXI`/`GSAP` unchanged.
- The new game still uses the Treasure Temple feature as before; only its *backdrop* was exchanged.
- To revert the background swap, exchange the two scene `src` attributes and flip the floor fractions in `positionHost()`.
