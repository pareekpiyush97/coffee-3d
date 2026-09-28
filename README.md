# Blue Tokai · Origins — scroll-scrubbed concept (3D coffee site)

An **independent concept & design study** — a premium coffee site whose
**background video scrubs frame-by-frame as you scroll**. Themed around Blue Tokai
Coffee Roasters' Origins café on Janpath, New Delhi, using public info & photos
from Google Maps.

> Not affiliated with, or endorsed by, Blue Tokai Coffee Roasters. Imagery and
> details are shown for demonstration only.

## The effect
- The hero clip is re-encoded **all-intra** (every frame a keyframe), so seeking
  to any scroll position is instant and crisp — no quality loss on scrub.
- The clip is loaded **into memory as a Blob**, which makes it fully seekable on
  any static host (plain servers can't HTTP-range-seek a streamed `<video>`).
- Whole-page scroll maps to video time; a smoothing loop eases `currentTime`.

## Stack
Plain HTML / CSS / JS. GSAP + ScrollTrigger + Lenis (vendored in `js/lib/`) for
smooth scroll, reveals and counters. Fonts via Google. No build step — serve the folder.

## Structure
```
index.html
css/app.css
js/app.js        · scroll-scrub + page chrome
js/lib/          · gsap, scrolltrigger, lenis
media/scrub.mp4  · all-intra hero clip (+ poster)
img/bt/          · café / menu photos (via Google)
```
