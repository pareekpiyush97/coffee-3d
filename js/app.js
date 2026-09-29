/* ============================================================================
   Blue Tokai · Origins — scroll-driven image-sequence background
   The hero clip is exported as a sequence of clean frames (no baked-in UI) and
   drawn to a canvas. Scroll maps to a frame index, so it scrubs frame-by-frame,
   pin-sharp, with zero video-seek lag — identical on desktop and mobile.
   Plus the page chrome: Lenis smooth scroll, reveals, counters, menu.
   ========================================================================== */
(function () {
  "use strict";
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const STILL = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const N = 93;                                  // number of frames in img/seq
  const PATH = (i) => `img/seq/f_${String(i + 1).padStart(3, "0")}.jpg`;

  const MENU = [
    ["img/bt/03.jpg", "Signature", "Cappuccino", "₹230"],
    ["img/bt/08.jpg", "Brew", "Filter Coffee", "₹210"],
    ["img/bt/07.jpg", "Cold", "Cold Brew", "₹280"],
    ["img/bt/10.jpg", "Iced Tea", "Oolong Grapefruit", "₹300"],
    ["img/bt/06.jpg", "Bakes", "Almond Croissant", "₹190"],
    ["img/bt/11.jpg", "Kitchen", "Grilled Sandwich", "₹350"],
  ];

  document.addEventListener("DOMContentLoaded", function () {
    $("#yr") && ($("#yr").textContent = new Date().getFullYear());
    const nav = $("#nav"), burger = $("#burger"), menu = $("#mainmenu"), cue = $("#scrollcue");

    /* menu cards */
    const cards = $("#cards");
    if (cards) cards.innerHTML = MENU.map(([img, tag, name, price]) =>
      `<article class="card rev"><div class="card__img"><img src="${img}" alt="${name}" loading="lazy" /></div>
        <div class="card__b"><div><span class="tag">${tag}</span><h3>${name}</h3></div><span class="price">${price}</span></div></article>`
    ).join("");

    /* overlay menu */
    const setMenu = (o) => { menu.classList.toggle("open", o); menu.setAttribute("aria-hidden", String(!o));
      burger.setAttribute("aria-expanded", String(o)); document.body.classList.toggle("is-locked", o); };
    burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    $$("#mainmenu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

    /* ── image-sequence canvas ── */
    const cv = $("#seq"), ctx = cv && cv.getContext("2d", { alpha: false });
    const frames = new Array(N);
    let vw = 0, vh = 0, dpr = 1, ready = false, target = 0, cur = 0, drawnIdx = -1;

    function fit() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      vw = innerWidth; vh = innerHeight;
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawnIdx = -1;                              // force redraw at new size
    }
    function draw(i) {
      i = clamp(Math.round(i), 0, N - 1);
      const im = frames[i];
      if (!im || !im.complete || !im.naturalWidth) return;
      const iw = im.naturalWidth, ih = im.naturalHeight;
      const s = Math.max(vw / iw, vh / ih);       // cover
      const w = iw * s, h = ih * s, x = (vw - w) / 2, y = (vh - h) / 2;
      ctx.drawImage(im, x, y, w, h);
      drawnIdx = i;
    }

    /* preload every frame, driving the real loading bar */
    const plFill = $("#plFill"), plNum = $("#plNum"), plMsg = $("#plMsg");
    const MSG = ["Warming up", "Grinding fresh", "Loading the pour", "Catching the splash", "Serving up"];
    let loaded = 0;
    const onOne = () => {
      loaded++;
      const pct = Math.round((loaded / N) * 100);
      if (plFill) plFill.style.width = pct + "%";
      if (plNum) plNum.textContent = pct;
      if (plMsg) plMsg.textContent = MSG[Math.min(MSG.length - 1, Math.floor(pct / 20))];
      if (loaded >= N && !ready) {
        ready = true; if (cv) { fit(); draw(0); }
        setTimeout(() => { const pl = $("#preload"); if (pl) pl.classList.add("gone"); }, 350);
      }
    };
    if (cv) {
      for (let i = 0; i < N; i++) { const im = new Image(); im.decoding = "async";
        im.onload = onOne; im.onerror = onOne; im.src = PATH(i); frames[i] = im; }
      addEventListener("resize", () => { if (ready) { fit(); draw(cur); } });
    } else { onOne_all(); }
    function onOne_all(){ const pl=$("#preload"); if(pl) pl.classList.add("gone"); }

    /* scroll → target frame + chrome */
    let lastY = 0;
    const onScroll = (y) => {
      nav.classList.toggle("hide", y > lastY && y > 400 && !menu.classList.contains("open"));
      lastY = y;
      cue && cue.classList.toggle("hide", y > 260);
      const max = document.body.scrollHeight - innerHeight;
      const p = max > 0 ? clamp(y / max, 0, 1) : 0;
      $("#progress").style.transform = `scaleX(${p})`;
      target = p * (N - 1);
    };

    /* eased scrub loop (draw only when the frame actually changes → efficient) */
    (function raf() {
      if (ready) {
        cur = STILL ? target : lerp(cur, target, 0.2);
        if (Math.abs(cur - target) < 0.01) cur = target;
        if (Math.round(cur) !== drawnIdx) draw(cur);
      }
      requestAnimationFrame(raf);
    })();

    /* smooth scroll */
    let lenis = null;
    if (window.Lenis && !STILL) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      const loop = (t) => { lenis.raf(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
      lenis.on("scroll", (e) => onScroll(e.scroll || scrollY));
      $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (ev) => {
        const id = a.getAttribute("href"); if (id.length < 2) return; const el = $(id); if (!el) return;
        ev.preventDefault(); lenis.scrollTo(el); }));
    } else {
      addEventListener("scroll", () => onScroll(scrollY), { passive: true });
    }

    /* reveals + counters */
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      if (lenis) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
      if (!STILL) $$(".rev:not(.in)").forEach((el) => {
        gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" }, onStart: () => el.classList.add("in") });
      });
      else $$(".rev").forEach((el) => el.classList.add("in"));
      $$(".num").forEach((el) => {
        const to = +el.dataset.count;
        ScrollTrigger.create({ trigger: el, start: "top 92%", once: true,
          onEnter: () => gsap.to({ n: 0 }, { n: to, duration: 1.6, ease: "power2.out",
            onUpdate() { el.textContent = Math.round(this.targets()[0].n); } }) });
      });
    } else { $$(".rev").forEach((el) => el.classList.add("in")); }

    onScroll(scrollY);
    /* safety: if frames are slow, don't trap the user on the preloader */
    setTimeout(() => { const pl = $("#preload"); if (pl && !ready) pl.classList.add("gone"); }, 9000);
  });
})();
