# King Tuts Temple — reference UI update

- Exact user-provided `fram_back.png` and `1frame_front.png` preserved under `source-art/`.
- Source is sliced into five aligned textures (`kingtuts_*`) to avoid compressing the 5×3 reels. The original title is baked into `kingtuts_top_title.png`.
- Screenshot-derived eight controls copied from the prior approved asset pack, independently clickable and tagged to the existing Game methods.
- Screenshot-based transparent control rail sits behind the eight separate button images. Balance/bet are live text over darkened display panels, not the static values from the screenshot.
- The core math/session implementation `math.js`, Spine rig, eye/beetle animation atlases, reel/bonus logic, and sound code are unchanged.
- Coin denomination controls moved into Settings, while Paytable & Fullscreen moved to the small footer tools.
- Artwork is raster PNG, not vector. The project is a play-credits demo, not a certified RTP/real-money game.
