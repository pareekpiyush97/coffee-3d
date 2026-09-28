/* ============================================================================
   Blue Tokai · Origins — scroll-scrubbed video background
   The clip is re-encoded all-intra (every frame a keyframe), so scrolling seeks
   the video frame-by-frame at full quality. Whole-page scroll maps to video
   time; a smoothing loop eases currentTime for buttery scrubbing.
   Plus the page chrome: Lenis smooth scroll, reveals, counters, menu.
   ========================================================================== */
(function () {
  "use strict";
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const STILL = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MENU = [
    ["img/bt/03.jpg", "Signature", "Cappuccino", "₹230"],
    ["img/bt/08.jpg", "Brew", "Filter Coffee", "₹210"],
    ["img/bt/07.jpg", "Cold", "Cold Brew", "₹280"],
    ["img/bt/10.jpg", "Iced Tea", "Oolong Grapefruit", "₹300"],
    ["img/bt/06.jpg", "Bakes", "Almond Croissant", "₹190"],
    ["img/bt/11.jpg", "Kitchen", "Grilled Sandwich", "₹350"],
  ];

  /* phones can't seek a video per scroll-frame without lag → on touch devices we
     let the clip autoplay-loop as a smooth moving background instead of scrubbing */
  const MOBILE = matchMedia("(hover: none) and (pointer: coarse)").matches || innerWidth < 760;

  document.addEventListener("DOMContentLoaded", function () {
    $("#yr") && ($("#yr").textContent = new Date().getFullYear());
    const nav = $("#nav"), burger = $("#burger"), menu = $("#mainmenu"), cue = $("#scrollcue");
    if (MOBILE) document.body.classList.add("is-mobile");

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

    /* ── scroll-scrubbed video ── */
    const v = $("#bgv");
    let dur = 0, targetT = 0, curT = 0, primedDesktop = false;
    const playLoop = () => { if (!v) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    const primeScrub = () => {               // desktop: a play→pause primes smooth seeking
      if (primedDesktop || !v) return; primedDesktop = true;
      const p = v.play && v.play();
      if (p && p.then) p.then(() => v.pause()).catch(() => {});
      else { try { v.pause(); } catch (e) {} }
    };
    if (v) {
      v.addEventListener("loadedmetadata", () => { dur = v.duration || 10; });
      if (MOBILE) {
        /* MOBILE: just stream & loop the clip as a smooth moving background — no
           per-frame seeking, so no lag. Progressive stream, no big upfront Blob. */
        v.loop = true; v.setAttribute("loop", ""); v.setAttribute("autoplay", ""); v.setAttribute("playsinline", "");
        v.addEventListener("loadeddata", playLoop, { once: true });
        v.addEventListener("canplay", playLoop, { once: true });
        playLoop();
        ["pointerdown", "touchstart", "scroll"].forEach((ev) =>
          addEventListener(ev, playLoop, { passive: true }));
      } else {
        /* DESKTOP: load the whole clip as a Blob → fully seekable on any host, so
           scroll can scrub it frame-by-frame */
        const srcEl = v.querySelector("source");
        const url = (srcEl && srcEl.src) || v.currentSrc || "media/scrub.mp4";
        fetch(url).then((r) => r.blob()).then((b) => {
          v.removeAttribute("src"); if (srcEl) srcEl.remove();
          v.src = URL.createObjectURL(b); v.load();
        }).catch(() => {});
        if (v.readyState >= 1) dur = v.duration || 10;
        ["pointerdown", "wheel", "keydown"].forEach((ev) =>
          addEventListener(ev, primeScrub, { once: true, passive: true }));
        setTimeout(primeScrub, 600);
      }
    }

    let lastY = 0;
    const onScroll = (y) => {
      nav.classList.toggle("hide", y > lastY && y > 400 && !menu.classList.contains("open"));
      lastY = y;
      cue && cue.classList.toggle("hide", y > 260);
      const max = document.body.scrollHeight - innerHeight;
      const p = max > 0 ? clamp(y / max, 0, 1) : 0;
      $("#progress").style.transform = `scaleX(${p})`;
      targetT = p * (dur || 10);
    };

    /* smoothing loop → eases the video toward the scroll target (desktop scrub only;
       on mobile the video plays/loops on its own, so no per-frame seeking = no lag) */
    if (!MOBILE) {
      (function raf() {
        if (v && dur) {
          curT = lerp(curT, targetT, 0.14);
          if (Math.abs(curT - targetT) > 0.002) { try { v.currentTime = curT; } catch (e) {} }
        }
        requestAnimationFrame(raf);
      })();
    }

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
  });

  /* preloader */
  const MSG = ["Warming up", "Grinding fresh", "Loading the pour", "Catching the splash", "Serving up"];
  document.addEventListener("DOMContentLoaded", function () {
    const fill = $("#plFill"), num = $("#plNum"), msg = $("#plMsg"); let p = 0, i = 0;
    (function tick(){ p = Math.min(100, p + Math.random()*16 + 7);
      if (fill) fill.style.width = p + "%"; if (num) num.textContent = Math.round(p);
      if (msg && p > (i+1)*20 && i < MSG.length-1) msg.textContent = MSG[++i];
      if (p < 100) setTimeout(tick, 130 + Math.random()*120);
      else setTimeout(() => { const pl = $("#preload"); if (pl) pl.classList.add("gone"); }, 400); })();
  });
})();
