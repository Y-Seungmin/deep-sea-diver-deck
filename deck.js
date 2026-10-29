// Deep Sea Diver — web deck. One GSAP timeline per slide (tl.addPause() = wait for a click).
// URL #5 opens page 5, #5f shows page 5 in its final state (no audio, no motion) for PDF export.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const stage = $("#stage"), slidesEl = $("#slides"), hud = $("#hud"), gflash = $("#flash");
const fmt = (v) => Math.round(v).toLocaleString("en-US");
const hash = location.hash.slice(1), FINAL = /f$/.test(hash), RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = `translate(-50%,-50%) scale(${k})`; }
addEventListener("resize", fit); fit();

// ================================================================ audio
// wav cues are <audio> elements (fetch fails on file://); drone, phonk, whoosh, boom, thunder and sonar are synthesized
let AC, master, muted = false, QUIET = false;
const cue = {};
function audioInit() {
  if (AC || FINAL) return;
  AC = new AudioContext(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
  for (const n of ["ping", "rumble", "shutter", "alarm", "tick", "bubbles"]) { cue[n] = new Audio(`snd/${n}.wav`); cue[n].preload = "auto"; }
  drone();
}
const silent = () => !AC || muted || QUIET;
function sfx(n, vol = 0.8) { if (silent() || !cue[n]) return; const a = cue[n].cloneNode(); a.volume = vol; a.play().catch(() => {}); }
function noiseBuf(sec) { const b = AC.createBuffer(1, AC.sampleRate * sec, AC.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1; return b; }
function drone() {
  const g = AC.createGain(); g.gain.value = 0; g.connect(master); g.gain.linearRampToValueAtTime(0.07, AC.currentTime + 4);
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170; lp.connect(g);
  for (const f of [41.2, 41.6, 61.8]) { const o = AC.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); }
  const n = AC.createBufferSource(); n.buffer = noiseBuf(4); n.loop = true;
  const nl = AC.createBiquadFilter(); nl.type = "lowpass"; nl.frequency.value = 260; const ng = AC.createGain(); ng.gain.value = 0.35;
  const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 140; lfo.connect(lg).connect(nl.frequency); lfo.start();
  n.connect(nl).connect(ng).connect(lp); n.start();
}
function whoosh(dur = 1.2, vol = 0.5) {
  if (silent()) return; const t = AC.currentTime, s = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf(dur + 0.2); bp.type = "bandpass"; bp.Q.value = 1.2; bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(2400, t + dur);
  g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(bp).connect(g).connect(master); s.start(t);
}
function boom(vol = 0.9) {
  if (silent()) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.9); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
  o.connect(g).connect(master); o.start(t); o.stop(t + 1.5);
}
function thunder(vol = 0.7) {
  if (silent()) return; const t = AC.currentTime, s = AC.createBufferSource(), lp = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf(3.2); lp.type = "lowpass"; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(160, t + 1.2);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 3); s.connect(lp).connect(g).connect(master); s.start(t);
}
// a distant sonar ping with echoes, for the ambience between beats
function sonar(vol = 0.05) {
  if (silent()) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), d = AC.createDelay(), fb = AC.createGain();
  o.frequency.setValueAtTime(1420, t); o.frequency.exponentialRampToValueAtTime(1370, t + 1.2); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  d.delayTime.value = 0.34; fb.gain.value = 0.38; o.connect(g); g.connect(master); g.connect(d); d.connect(fb).connect(d); d.connect(master); o.start(t); o.stop(t + 1.5);
}
// phonk: 808 kick, clap, hats and the cowbell melody at 128 BPM (the title intro)
function phonk(bars = 4) {
  if (silent()) return;
  const t0 = AC.currentTime + 0.05, beat = 60 / 128, out = AC.createGain(); out.gain.value = 0.6; out.connect(master);
  const kick = (t) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6); o.connect(g).connect(out); o.start(t); o.stop(t + 0.6); };
  const hit = (t, d, f, v) => { const s = AC.createBufferSource(), h = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = noiseBuf(d); h.type = "highpass"; h.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(h).connect(g).connect(out); s.start(t); };
  const bell = (t, f) => { const g = AC.createGain(), bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f * 1.5; bp.Q.value = 3; g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    for (const m of [1, 1.48]) { const o = AC.createOscillator(); o.type = "square"; o.frequency.value = f * m; o.connect(bp); o.start(t); o.stop(t + 0.3); } bp.connect(g).connect(out); };
  const mel = [0, 0, 3, 0, 5, 3, 0, -2];
  for (let i = 0; i < bars * 16; i++) {
    const t = t0 + i * beat / 4;
    if (i % 8 === 0 || i % 16 === 11) kick(t);
    if (i % 8 === 4) hit(t, 0.18, 1500, 0.5);
    if (i % 2 === 1) hit(t, 0.04, 7000, 0.16);
    if (i % 2 === 0) bell(t, 560 * Math.pow(2, mel[(i / 2) % 8] / 12));
  }
}

// ================================================================ ambient layers: marine snow + bokeh, film grain, light rays
var snowSpeed = 1;
(function snow() {
  const cv = $("#snow"); cv.width = 1920; cv.height = 1080; const g = cv.getContext("2d");
  const P = Array.from({ length: RM ? 50 : 140 }, () => ({ x: Math.random() * 1920, y: Math.random() * 1080, r: 0.5 + Math.random() * 2.2, v: 0.12 + Math.random() * 0.5, a: 0.08 + Math.random() * 0.4, w: Math.random() * 6 }));
  // a few big out-of-focus motes drifting close to the lens
  const B = Array.from({ length: 9 }, () => ({ x: Math.random() * 1920, y: Math.random() * 1080, r: 10 + Math.random() * 22, v: 0.25 + Math.random() * 0.4, a: 0.05 + Math.random() * 0.07, w: Math.random() * 6 }));
  const step = (p, t) => { p.y += p.v * snowSpeed; p.x += Math.sin(t / 1500 + p.w) * 0.22; if (p.y > 1110) p.y = -30; if (p.y < -32) p.y = 1108; };
  const tick = (t) => {
    g.clearRect(0, 0, 1920, 1080);
    for (const p of P) { step(p, t); g.globalAlpha = p.a; g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * Math.min(6, 1 + Math.abs(snowSpeed) / 3), 0, 0, 7); g.fillStyle = "#cfefff"; g.fill(); }
    for (const p of B) { step(p, t); const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); gr.addColorStop(0, "rgba(200,240,255,1)"); gr.addColorStop(1, "rgba(200,240,255,0)"); g.globalAlpha = p.a; g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    requestAnimationFrame(tick);
  };
  if (!FINAL) requestAnimationFrame(tick);
})();
(function grain() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); const url = `url(${c.toDataURL()})`, el = $("#grain"); el.style.backgroundImage = url; stage.style.setProperty("--noise", url);
  if (!FINAL && !RM) setInterval(() => (el.style.transform = `translate(${Math.random() * 200 - 100}px,${Math.random() * 200 - 100}px)`), 80);
})();
if (!FINAL) gsap.to("#rays", { rotation: 2.5, x: 40, duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });

// ================================================================ HUD: depth gauge + hull / fuel / codex, carried through the whole talk
const MAXD = 10900;
$(".ticks", hud).innerHTML = [0, 1000, 2000, 4000, 6000, 8000, 10900].map((d) => `<i style="top:${(d / MAXD) * 100}%;width:${d % 2000 ? 10 : 18}px"></i>`).join("");
const hudState = { d: 0 }, hudRes = { hull: 100, fuel: 100, codex: 0 };
window.hudState = hudState;  // fx.js dims the caustics with depth
const H = { mark: $(".mark", hud), markB: $(".mark b", hud), dp: $(".dp .d", hud), rays: $("#rays"), vig: $("#vig"),
  hull: $(".hull", hud), fuel: $(".fuel", hud), codex: $(".codex span", hud) };
function renderDepth() {
  const d = hudState.d, k = d / MAXD;
  H.mark.style.top = k * 100 + "%"; H.markB.textContent = fmt(d) + " m"; H.dp.textContent = fmt(d);
  H.rays.style.opacity = Math.max(0, 0.9 - d / 2600);  // sunlight is gone below ~2,300 m
  H.vig.style.background = `radial-gradient(ellipse at 50% 50%, transparent ${55 - k * 18}%, rgba(0,0,0,${0.5 + k * 0.3}) 100%)`;
}
function renderRes() {
  const bar = (el, v) => { $(".seg i", el).style.width = v + "%"; $("span", el).textContent = Math.round(v) + "%"; };
  bar(H.hull, hudRes.hull); bar(H.fuel, hudRes.fuel); H.fuel.classList.toggle("low", hudRes.fuel < 25);
  H.codex.textContent = String(Math.round(hudRes.codex)).padStart(2, "0");
}
function setDepth(d, dur = 1.2) { gsap.to(hudState, { d, duration: FINAL ? 0 : dur, ease: "power2.inOut", onUpdate: renderDepth }); }
const hudTo = (tl, v, at, dur = 1.2) => tl.to(hudRes, { ...v, duration: dur, ease: "power2.inOut", onUpdate: renderRes }, at);
const codexPop = (tl, at) => tl.fromTo($(".rb.codex", hud), { scale: 1.8 }, { scale: 1, duration: 0.5, ease: "back.out(3)", immediateRender: false }, at);
renderDepth(); renderRes();

// ================================================================ effect helpers (all take the slide timeline)
const shake = (tl, el, at, amt = 18, dur = 0.35) => RM ? tl : tl.fromTo(el, { x: 0, y: 0 }, { keyframes: [{ x: amt, y: -amt * 0.4 }, { x: -amt, y: amt * 0.3 }, { x: amt * 0.6, y: 0 }, { x: -amt * 0.3, y: amt * 0.2 }, { x: 0, y: 0 }], duration: dur, ease: "none", immediateRender: false }, at);
const flash = (tl, at, peak = 0.9, dur = 0.3) => { if (FX && peak >= 0.5) tl.call(() => FX.ripple(0.5, 0.5, peak), null, at); return tl.fromTo(gflash, { opacity: peak }, { opacity: 0, duration: dur, ease: "power2.out", immediateRender: false }, at); };
const split = (tl, el, at, px = 16) => { const r = $(".r", el), c = $(".c", el);
  tl.fromTo(r, { x: -px, y: 3, opacity: 1 }, { x: 0, y: 0, opacity: 0, duration: 0.3, ease: "steps(5)", immediateRender: false }, at)
    .fromTo(c, { x: px, y: -3, opacity: 1 }, { x: 0, y: 0, opacity: 0, duration: 0.3, ease: "steps(5)", immediateRender: false }, at); };
const type = (tl, el, at, cps = 30) => { const text = el.textContent, o = { n: 0 }; tl.set(el, { textContent: "" }, 0);
  tl.to(o, { n: text.length, duration: text.length / cps, ease: "none", onUpdate: () => (el.textContent = text.slice(0, Math.round(o.n))) }, at); return at + text.length / cps; };
const count = (tl, el, from, to, at, dur, f = fmt) => { const o = { v: from }; tl.to(o, { v: to, duration: dur, ease: "power2.inOut", onUpdate: () => (el.textContent = f(o.v)) }, at); };
const rise = (tl, els, at, o = {}) => tl.from(els, { opacity: 0, y: o.y ?? 26, duration: o.d ?? 0.7, stagger: o.s ?? 0.1, ease: "power3.out" }, at);
const call = (tl, fn, at) => tl.call(fn, null, at);
const toastIn = (tl, el, at, hold = 2.8) => tl.fromTo(el, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.45, ease: "expo.out", immediateRender: false }, at).to(el, { opacity: 0, x: 30, duration: 0.4 }, at + hold);
// decorative loops live outside the slide timeline so skipping never breaks them
let loops = [];
const loop = (at, make) => { if (!FINAL) loops.push(gsap.delayedCall(at, () => loops.push(make()))); };
const drift = (bg, at = 0, s = 1.12, dur = 26) => loop(at, () => gsap.to(bg, { scale: s, duration: dur, ease: "none" }));
const causLoop = (s) => loop(0, () => gsap.to($(".caus", s), { y: 240, duration: 24, ease: "none", repeat: -1 }));
const rgb = (t, cls = "") => `<span class="rgb ${cls}"><span class="r">${t}</span><span class="c">${t}</span>${t}</span>`;
const kick = (en, kr) => `<div class="kick">${en}${kr ? ` &nbsp;<span class="kr">${kr}</span>` : ""}</div>`;
const mock = (t = "UI 목업 · 예시 화면") => `<div class="mock">${t}</div>`;
const toast = (title, sub, pos = "top:120px") => `<div class="toast" style="${pos}"><b>${title}</b><span>${sub}</span></div>`;

// chapter opener: the depth counter races between chapters with a loading tip, then the number and title slam in
const diveHTML = (no, title, to, tip) => `<div class="dive"><div class="lines"></div><div class="cnt"><span class="v">0</span><small>m</small></div>
  <div class="no">${rgb(no)}</div><div class="tt">${title}</div><div class="dd">DEPTH ${fmt(to)} M</div>
  <div class="tip"><b>TIP</b>${tip}</div><div class="ld"><i></i></div></div>`;
function dive(tl, s, from, to) {
  const d = $(".dive", s), v = $(".cnt .v", d), no = $(".no", d);
  tl.set([no, $(".tt", d), $(".dd", d)], { opacity: 0 }, 0);
  call(tl, () => { whoosh(1.3, 0.45); sfx("bubbles", 0.5); }, 0);
  tl.fromTo($(".lines", d), { y: 0 }, { y: -1600, duration: 1.4, ease: "power2.in" }, 0)
    .fromTo($(".cnt", d), { filter: "blur(0px)" }, { keyframes: [{ filter: "blur(6px)", duration: 0.9 }, { filter: "blur(0px)", duration: 0.4 }] }, 0)
    .to(hudState, { d: to, duration: 1.3, ease: "power2.inOut", onUpdate: renderDepth }, 0)
    .to($(".ld i", d), { width: "100%", duration: 2.7, ease: "power1.inOut" }, 0.1);
  rise(tl, $(".tip", d), 0.3);
  count(tl, v, from, to, 0, 1.3);
  tl.to($(".cnt", d), { opacity: 0, y: -60, duration: 0.25, ease: "power2.in" }, 1.45)
    .fromTo(no, { opacity: 0, scale: 1.7 }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, 1.5);
  call(tl, () => { sfx("ping", 0.9); boom(0.5); }, 1.66);
  flash(tl, 1.66, 0.5); split(tl, $(".rgb", no), 1.66, 20); shake(tl, no, 1.66, 16, 0.3);
  rise(tl, [$(".tt", d), $(".dd", d)], 1.85, { s: 0.15 });
  tl.to(d, { opacity: 0, duration: 0.7, ease: "power2.inOut" }, 2.9).set(d, { display: "none" }, 3.6);
  return 3.1;
}

// ================================================================ slides: { depth, html, build(s, tl), noRes? }
const S = [];

// 01 ── title: phonk intro (four words on the beat), then the title screen
S.push({ depth: 0, html: () => `
  <div class="bg" style="background-image:url(img/title.jpg)"></div><div class="caus"></div><div class="shadeL"></div>
  <img class="abs eyes" src="img/eyes.png" style="left:1500px;top:760px;width:230px;opacity:0">
  ${["4인 협동", "서바이벌 호러", "10,900 M", "살아서 돌아와라"].map((w, i) => `<div class="abs word disp" style="left:0;right:0;top:390px;text-align:center;font-size:250px;opacity:0;${i === 3 ? "color:var(--amber)" : ""}">${w}</div>`).join("")}
  <div class="abs title" style="left:120px;top:250px">
    <div class="kk" style="font-size:22px;color:var(--soft);letter-spacing:.1em">2026 게임 세미나 &nbsp;|&nbsp; 4팀 게임 제안서</div>
    <div class="disp t1" style="font-size:200px;margin-top:26px">${rgb("DEEP SEA")}</div>
    <div class="disp t2" style="font-size:200px;margin-top:6px">${rgb("DIVER")}</div>
    <div class="sub" style="font-size:32px;margin-top:40px;font-weight:700">딥 씨 다이버 &nbsp;—&nbsp; 끝없이 더 깊은 바다로</div>
    <div class="tags small" style="margin-top:14px;font-size:22px">4인 협동 서바이벌 호러 &nbsp;·&nbsp; PC / Steam</div>
    <div class="press num" style="font-size:18px;font-weight:700;letter-spacing:.45em;color:var(--amber);margin-top:80px">PRESS ANY KEY</div>
  </div>
  <div class="bar t"></div><div class="bar b"></div>`,
  build(s, tl) {
    const bg = $(".bg", s), W = $$(".word", s), beat = 60 / 128;
    hud.classList.add("hide");
    tl.set([$(".title", s), $(".shadeL", s)], { opacity: 0 }, 0).set(bg, { scale: 1.3, filter: "blur(14px) brightness(.4)", opacity: 0 }, 0);
    tl.from($$(".bar", s), { height: 540, duration: 1, ease: "expo.inOut" }, 0).to(bg, { opacity: 1, duration: 1 }, 0);
    call(tl, () => { phonk(5); sfx("rumble", 0.6); }, 0);
    W.forEach((w, i) => {
      const t = 0.05 + i * beat * 2;
      tl.fromTo(w, { opacity: 0, scale: 2.4, filter: "blur(20px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.15, ease: "power4.in" }, t)
        .to(w, { scale: 1.07, duration: beat * 2 - 0.27, ease: "none" }, t + 0.15)
        .to(w, { opacity: 0, x: i % 2 ? -300 : 300, filter: "blur(12px)", duration: 0.12, ease: "power2.in" }, t + beat * 2 - 0.12)
        .fromTo(bg, { scale: 1.36, filter: "blur(5px) brightness(.85)" }, { scale: 1.26, filter: "blur(12px) brightness(.4)", duration: beat * 2, ease: "power2.out", immediateRender: false }, t);
      flash(tl, t + 0.14, 0.45); shake(tl, w, t + 0.15, 24, 0.3);
    });
    const T = 0.05 + W.length * beat * 2;
    tl.set([$(".title", s), $(".shadeL", s)], { opacity: 1 }, T)
      .to(bg, { scale: 1.04, filter: "blur(0px) brightness(1)", duration: 1.8, ease: "expo.out" }, T)
      .from($(".t1", s), { scale: 1.6, opacity: 0, duration: 0.17, ease: "power4.in", transformOrigin: "0% 50%" }, T)
      .from($(".t2", s), { scale: 1.6, opacity: 0, duration: 0.17, ease: "power4.in", transformOrigin: "0% 50%" }, T + 0.11)
      .to($$(".bar", s), { height: 0, duration: 1.4, ease: "expo.inOut" }, T + 0.6);
    call(tl, () => { sfx("ping", 1); boom(); hud.classList.remove("hide"); }, T + 0.17);
    flash(tl, T + 0.17, 1, 0.4); split(tl, $(".t1 .rgb", s), T + 0.17, 26); split(tl, $(".t2 .rgb", s), T + 0.21, 26); shake(tl, $(".title", s), T + 0.17, 28, 0.45);
    rise(tl, $(".kk", s), T + 0.7);
    type(tl, $(".sub", s), T + 0.9, 24);
    rise(tl, $(".tags", s), T + 2.2); rise(tl, $(".press", s), T + 2.8);
    tl.to($(".eyes", s), { opacity: 1, duration: 1.5 }, T + 2.6);
    loop(T + 3.4, () => gsap.to($(".press", s), { opacity: 0.15, duration: 0.8, repeat: -1, yoyo: true, ease: "sine.inOut" }));
    loop(T + 4.2, () => gsap.to($(".eyes", s), { keyframes: [{ opacity: 0, duration: 0.07 }, { opacity: 1, duration: 0.07 }], repeat: -1, repeatDelay: 3.2 }));
    loop(T + 1.8, () => gsap.to(bg, { scale: 1.12, duration: 30, ease: "none" }));
    causLoop(s);
  } });

// 02 ── contents: the dive route
const TOC = [["01", "게임 개요", 200], ["02", "핵심 특징", 1000], ["03", "세계관", 2000], ["04", "게임 특징", 3200], ["05", "게임 진행", 4000], ["06", "확장 요소 · 사양", 8800], ["07", "포지셔닝 · 시장조사", 9600], ["08", "유료화 · 마무리", 10300]];
S.push({ depth: 0, html: () => `
  <div class="bg" style="background-image:url(img/descend.jpg);left:640px"></div><div class="shadeL" style="background:linear-gradient(90deg,#000 0,#000 34%,rgba(0,0,0,.6) 50%,transparent 75%)"></div>
  <div class="content" style="top:170px;width:760px">${kick("DIVE LOG")}<div class="h1" style="margin:14px 0 46px">목차</div>
    <div class="toc">${TOC.map(([n, t, d], i) => `<div>${i === 0 ? '<div class="hi"></div>' : ""}<b>${n}</b><span>${t}</span><em>${fmt(d)} m</em></div>`).join("")}</div></div>`,
  build(s, tl) {
    tl.from($(".bg", s), { opacity: 0, scale: 1.15, duration: 1.6, ease: "power2.out" }, 0);
    rise(tl, [$(".kick", s), $(".h1", s)], 0.1);
    tl.from($$(".toc > div", s), { opacity: 0, x: 60, duration: 0.6, stagger: 0.07, ease: "power3.out" }, 0.4)
      .from($(".toc .hi", s), { scaleX: 0, duration: 0.5, ease: "expo.out" }, 1.3);
    call(tl, () => sfx("tick", 0.6), 1.3);
    drift($(".bg", s), 1.6, 1.08);
  } });

// 03 ── 01 overview: the sub, labelled, beside the spec sheet
const SPEC = [["장르", "서바이벌 호러 · 액션 · 4인 협동"], ["플랫폼", "PC 온라인 (Steam), 최대 4인"], ["플레이 시점", "1인칭"], ["개발 형태", "Unity 엔진 (예정)"], ["서비스 형태", "유료 다운로드 + 부분 유료화"], ["이용 연령", "15세 이용가"]];
S.push({ depth: 200, html: () => `
  <div class="bg" style="background-image:url(img/sub.jpg);transform:translateX(280px) scale(.92)"></div><div class="caus"></div><div class="shadeL"></div>
  <div class="wmk">01</div>
  ${[["LIGHT ×4", 904, 471, -1], ["GLASS DOME", 1203, 357, 1], ["HULL NO. 04", 1576, 528, 1]].map(([t, x, y, dir]) => `<div class="callout" style="left:${x}px;top:${y}px"><svg class="abs" style="left:0;top:0;overflow:visible" width="1" height="1"><path d="M0 0 L${dir * 40} ${dir < 0 ? 70 : -70} L${dir * 160} ${dir < 0 ? 70 : -70}" stroke="#5FE3D3" stroke-width="2" fill="none"/></svg><span class="abs" style="left:${dir < 0 ? -190 : 50}px;top:${dir < 0 ? 52 : -90}px">${t}</span></div>`).join("")}
  <div class="content">${kick("01", "게임 개요")}<div class="h1" style="margin:12px 0 44px">Deep Sea Diver</div>
    <div class="spec">${SPEC.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join("")}</div>
    <div class="body cg" style="margin-top:36px;font-size:24px"><b class="teal">코어 유저</b> &nbsp;PC 협동 생존 · 공포 게임을 즐기는 10~20대<br><b class="amber">게임 목표</b> &nbsp;심해 바닥까지 내려가 문명과 크리쳐를 조사하라</div></div>
  ${diveHTML("01", "게임 개요", 200, "잠수정은 아래로만 내려간다. 올라가는 길은 없다.")}`,
  build(s, tl) {
    const T = dive(tl, s, 0, 200);
    tl.from($(".bg", s), { opacity: 0, x: 420, duration: 2.2, ease: "expo.out" }, T - 0.6);
    rise(tl, [$(".kick", s), $(".h1", s)], T);
    tl.from($$(".spec > div", s), { opacity: 0, x: -30, duration: 0.45, stagger: 0.05, ease: "power3.out" }, T + 0.35);
    $$(".spec .v", s).forEach((v, i) => type(tl, v, T + 0.45 + i * 0.12, 60));
    rise(tl, $(".cg", s), T + 1.4);
    $$(".callout", s).forEach((c, i) => { const at = T + 1.6 + i * 0.25; tl.from(c, { opacity: 0, duration: 0.01 }, at).from($("path", c), { opacity: 0, duration: 0.3 }, at).from($("span", c), { opacity: 0, x: -10, duration: 0.4 }, at + 0.15); call(tl, () => sfx("tick", 0.4), at); });
    drift($(".bg", s), T + 2, 1.0, 30);
    causLoop(s);
  } });

const ICON = {
  scrap: '<circle cx="24" cy="24" r="8"/><path d="M24 6v7M24 35v7M6 24h7M35 24h7M11.3 11.3l5 5M31.7 31.7l5 5M11.3 36.7l5-5M31.7 16.3l5-5"/>',
  vial: '<path d="M18 6h12M20 6v12l-9 17a4 4 0 0 0 3.5 6h19a4 4 0 0 0 3.5-6l-9-17V6"/><path d="M15 31h18"/>',
  weed: '<path d="M24 42c0-12 8-14 8-24s-5-12-5-12M24 42c0-9-8-11-8-18s4-9 4-9"/>',
  ore: '<path d="M24 5l12 12-12 26-12-26z"/><path d="M12 17h24M24 5v38"/>',
  fuel: '<path d="M12 12h18l5 5v26H12z"/><path d="M17 7h9v5M18 27h12M24 21v12"/>',
  down: '<path d="M24 6v30M12 26l12 12 12-12"/>',
  cam: '<path d="M6 16h8l3-5h14l3 5h8v22H6z"/><circle cx="24" cy="27" r="7"/>',
  harpoon: '<path d="M8 40L38 10"/><path d="M38 10l-10 1.5M38 10l-1.5 10"/><path d="M13 31l4 4M17 27l4 4"/>',
};
const ico = (k) => `<svg viewBox="0 0 48 48">${ICON[k]}</svg>`;

// 03b ── 01 core loop: dive → shoot & gather → government lab → craft & upgrade → deeper
const LOOPN = [["down", "잠수", "잠수정으로 다음 층에 내려간다"], ["cam", "촬영 · 채집", "크리쳐 · 문명 촬영, 자원 채집"], ["vial", "정부 연구", "사진 · 샘플로 약점 · 레시피 해금"], ["harpoon", "제작 · 강화", "무기 · 방어구 제작, 잠수정 수리"]];
const LCX = 1180, LCY = 590, LR = 230, lpos = (k) => [LCX + LR * Math.sin((k * Math.PI) / 2), LCY - LR * Math.cos((k * Math.PI) / 2)];
const arcD = (k) => { const a0 = (k * 90 + 16) * Math.PI / 180, a1 = (k * 90 + 74) * Math.PI / 180, P = (a) => `${LCX + LR * Math.sin(a)} ${LCY - LR * Math.cos(a)}`; return `M${P(a0)} A${LR} ${LR} 0 0 1 ${P(a1)}`; };
S.push({ depth: 200, html: () => `
  <div class="bg" style="background-image:url(img/sub.jpg)"></div><div class="veil" style="opacity:.86"></div><div class="wmk">01</div>
  <div class="content" style="width:640px">${kick("01 — 2", "게임 개요")}<div class="h1" style="margin:12px 0 36px">한 번의 잠수가<br>다음 잠수를<br>더 깊게</div>
    <div class="body">찍고, 모으고, 연구하고, 만든다. 강해진 만큼 더 깊은 층에 내려갈 수 있고, 바닥에 닿으면 엔딩이다.</div>
    <div class="body risk" style="margin-top:34px;font-size:22px"><b class="red">위험</b> &nbsp;수압이 선체를 깎고, 연료가 줄고, 크리쳐가 막는다</div></div>
  <svg class="abs loopsvg" style="left:0;top:0;overflow:visible" width="1920" height="1080"><defs><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#5FE3D3"/></marker></defs>
    <circle cx="${LCX}" cy="${LCY}" r="${LR}" fill="none" stroke="rgba(95,227,211,.12)" stroke-width="2"/>
    ${[0, 1, 2, 3].map((k) => `<path class="arc" d="${arcD(k)}" fill="none" stroke="#5FE3D3" stroke-width="3" marker-end="url(#ah)"/>`).join("")}</svg>
  <div class="abs lmid" style="left:${LCX - 150}px;top:${LCY - 70}px;width:300px;text-align:center"><div class="kick" style="letter-spacing:.3em">GOAL</div><div class="disp" style="font-size:84px;margin-top:8px">10,900 m</div><div class="small" style="margin-top:6px">바닥에 닿으면 엔딩</div></div>
  <div class="abs ldot"></div>
  ${LOOPN.map(([ic, t, d], k) => { const [x, y] = lpos(k); return `<div class="lnode" style="left:${x - 62}px;top:${y - 62}px">${ico(ic)}</div>
    <div class="ltext" style="${k === 1 ? `left:${x + 78}px;top:${y - 42}px;text-align:left` : k === 3 ? `left:${x - 328}px;top:${y - 42}px;text-align:right;direction:rtl` : `left:${x - 140}px;top:${k === 0 ? y - 150 : y + 76}px`}"><b><span class="num">0${k + 1}</span> ${t}</b><span>${d}</span></div>`; }).join("")}
  <div class="abs deeper num" style="left:${LCX - LR - 150}px;top:${LCY - LR + 20}px">더 깊이 ↺</div>
`,
  build(s, tl) {
    rise(tl, [$(".kick", s), $(".h1", s), $(".content .body", s)], 0.2);
    tl.from($(".lmid", s), { scale: 0.7, opacity: 0, duration: 0.7, ease: "back.out(2)" }, 0.5);
    const arcs = $$(".arc", s), nodes = $$(".lnode", s), texts = $$(".ltext", s);
    arcs.forEach((a) => { const L = a.getTotalLength(); a.style.strokeDasharray = L; a.style.strokeDashoffset = L; });
    nodes.forEach((n, k) => { const at = 0.8 + k * 0.7;
      tl.from(n, { scale: 0, duration: 0.4, ease: "back.out(3)" }, at).from(texts[k], { opacity: 0, y: 14, duration: 0.5 }, at + 0.1)
        .to(arcs[k], { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" }, at + 0.25);
      call(tl, () => sfx("tick", 0.6), at); });
    tl.from($(".deeper", s), { opacity: 0, x: 20, duration: 0.5 }, 0.8 + 3 * 0.7 + 0.6);
    call(tl, () => sfx("ping", 0.7), 0.8 + 3 * 0.7 + 0.6);
    // a light runs the loop forever
    const dot = $(".ldot", s), D = { a: 0 }, place = () => { const a = D.a * Math.PI / 180; dot.style.left = LCX + LR * Math.sin(a) - 9 + "px"; dot.style.top = LCY - LR * Math.cos(a) - 9 + "px"; };
    place(); tl.from(dot, { opacity: 0, duration: 0.4 }, 3.6);
    loop(3.6, () => gsap.to(D, { a: 360, duration: 6, ease: "none", repeat: -1, onUpdate: place }));
  } });

// 04 ── 02 core ①: submarine management (click → PRESSURE, click → LOW FUEL); the big gauges stand in for the HUD here
const gaugeRow = (i, en, kr, d, c) => `<div class="g g${i}" style="margin-top:${i ? 46 : 0}px"><div style="font-size:27px"><b class="num" style="color:${c}">${en}</b> &nbsp;<b>${kr}</b> &nbsp;<span class="num pct" style="color:${c}">0%</span></div>
  <div class="gaugebar"><i style="background:${c}"></i></div><div class="small" style="margin-top:12px">${d}</div></div>`;
S.push({ depth: 1000, noRes: true, html: () => `
  <div class="bg" style="background-image:url(img/crew.jpg)"></div><div class="veil" style="opacity:.25"></div><div class="shadeL"></div><div class="wmk">02</div>
  <div class="content">${kick("02 — 1", "핵심 특징")}<div class="h1" style="margin:12px 0 26px">잠수정 관리</div>
    <div class="body" style="margin-bottom:56px">잠수정은 엘리베이터처럼 <b style="color:var(--ink)">아래로만</b> 내려간다. 깊어질수록 수압이 선체를 부수고, 연료가 바닥나면 그 자리가 무덤이 된다.</div>
    ${gaugeRow(0, "HULL", "선체 내구도", "수압이 깎는다 → 바다에서 주운 폐품으로 수리", "var(--teal)")}${gaugeRow(1, "FUEL", "연료", "이동할 때마다 줄어든다 → 0이 되면 갇혀서 사망", "var(--amber)")}</div>
  <div class="abs w1" style="left:1080px;top:380px"><div class="warn">${rgb("PRESSURE")}</div></div>
  <div class="abs w2" style="left:1080px;top:560px"><div class="warn">${rgb("LOW FUEL")}</div></div>
  <div class="abs redwash" style="inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 30%,rgba(255,40,30,.45));opacity:0"></div>
  ${diveHTML("02", "핵심 특징", 1000, "수압은 깊어질수록 선체를 더 빨리 깎는다.")}`,
  build(s, tl) {
    const T = dive(tl, s, 200, 1000), g0 = $(".g0", s), g1 = $(".g1", s), bg = $(".bg", s);
    tl.set([$(".w1", s), $(".w2", s)], { opacity: 0 }, 0);
    tl.from(bg, { scale: 1.2, duration: 3, ease: "power2.out" }, T - 0.8);
    rise(tl, [$(".kick", s), $(".h1", s), $(".body", s)], T); rise(tl, [g0, g1], T + 0.5, { s: 0.15 });
    const fill = (g, to, at, dur) => { tl.to($(".gaugebar i", g), { width: to + "%", duration: dur, ease: "power2.inOut" }, at); count(tl, $(".pct", g), parseFloat($(".pct", g).dataset.v || 0), to, at, dur, (v) => Math.round(v) + "%"); $(".pct", g).dataset.v = to; };
    fill(g0, 100, T + 0.8, 1.2); fill(g1, 100, T + 0.95, 1.2); call(tl, () => sfx("tick", 0.5), T + 2);
    tl.addPause();
    // pressure: hull crunches to 62 %
    let t = tl.duration();
    call(tl, () => { sfx("rumble", 1); boom(0.8); }, t);
    tl.set($(".w1", s), { opacity: 1 }, t).from($(".w1 .warn", s), { scale: 1.5, opacity: 0, duration: 0.14, ease: "power4.in" }, t);
    flash(tl, t + 0.14, 0.6); split(tl, $(".w1 .rgb", s), t + 0.14, 22); shake(tl, [bg, $(".content", s)], t + 0.14, 26, 0.5); shake(tl, $(".w1", s), t + 0.14, 16, 0.4);
    tl.set($(".g0 .gaugebar i", s), { background: "#FF8A3D" }, t + 0.2); fill(g0, 62, t + 0.15, 0.5);
    tl.addPause();
    // low fuel: fuel drains to 22 %, alarm, red wash pulses
    t = tl.duration();
    fill(g1, 22, t, 1.0); tl.set([$(".g1 .gaugebar i", s)], { background: "var(--red)" }, t + 0.6).set($(".g1 .pct", s), { color: "var(--red)" }, t + 0.6);
    call(tl, () => sfx("alarm", 0.9), t + 0.9);
    tl.set($(".w2", s), { opacity: 1 }, t + 0.9).from($(".w2 .warn", s), { scale: 1.5, opacity: 0, duration: 0.14, ease: "power4.in" }, t + 0.9)
      .to($(".w1", s), { opacity: 0.25, duration: 0.4 }, t + 0.9);
    flash(tl, t + 1.04, 0.5); split(tl, $(".w2 .rgb", s), t + 1.04, 22); shake(tl, $(".w2", s), t + 1.04, 16, 0.4);
    tl.to($(".redwash", s), { opacity: 0.6, duration: 0.3 }, t + 1.04);
    tl.call(() => { if (FINAL) return; loops.push(gsap.to($(".redwash", s), { opacity: 0.25, duration: 0.6, repeat: -1, yoyo: true, ease: "sine.inOut" })); loops.push(gsap.to($(".w2 .warn", s), { opacity: 0.35, duration: 0.35, repeat: -1, yoyo: true, ease: "steps(1)" })); }, null, t + 1.5);
  } });

// 05 ── 02 core ②: depth zones (click → the camera dives through five layers)
const Z = [["0 – 200 m", "표층", "폐품과 연료가 많은 입문 구역", "EPIPELAGIC", ""], ["200 – 1,000 m", "중층", "발광 생물 무리, 첫 문명의 흔적", "MESOPELAGIC", "descend"], ["1,000 – 4,000 m", "심층", "인간형 크리쳐와 유물 무기", "BATHYPELAGIC", "humanoid"],
  ["4,000 – 6,000 m", "심해층", "대형 크리쳐(보스), 희귀 광석", "ABYSSOPELAGIC", "boss"], ["6,000 – 10,900 m", "초심해", "크리쳐 문명의 중심, 그리고 엔딩", "HADALPELAGIC", "ruins"]];
S.push({ depth: 1000, html: () => `
  <div class="abs col" style="left:0;top:0;width:1920px;height:${1080 * 5}px;background:linear-gradient(180deg,#0f6070 0,#0a3f4c 8%,#06222c 20%,#03141b 40%,#010a0e 62%,#000 85%)">
    <div class="abs" style="left:0;top:0;width:1920px;height:1300px;background:repeating-linear-gradient(100deg,transparent 0 90px,rgba(180,255,250,.07) 90px 150px,transparent 150px 260px);-webkit-mask:linear-gradient(180deg,#000,transparent);mask:linear-gradient(180deg,#000,transparent)"></div>
    ${Z.map((z, i) => `${z[4] ? `<div class="abs" style="left:0;top:${i * 1080}px;width:1300px;height:1080px;background:url(img/${z[4]}.jpg) center/cover;opacity:.55;-webkit-mask:radial-gradient(ellipse 60% 60% at 60% 50%,#000 20%,transparent 75%);mask:radial-gradient(ellipse 60% 60% at 60% 50%,#000 20%,transparent 75%)"></div>` : ""}
      <div class="zone" style="top:${i * 1080 + 560}px"><div class="r">${z[0]}</div><div class="n">${z[1]}</div><div class="d">${z[2]}</div></div>`).join("")}
  </div>
  <div class="panelR"><div class="in">${kick("02 — 2", "핵심 특징")}<div class="h2" style="margin:12px 0 26px">층마다<br>다른 바다</div>
    <div class="body" style="font-size:23px">층마다 괴물, 폐품, 자원, 문명, 연료의 양이 다르다. 위층 자원으로 잠수정을 강화해야 더 깊이 들어갈 수 있다.</div>
    <div class="disp big" style="font-size:150px;margin-top:70px"><span class="v">0</span><span style="font-size:60px"> m</span></div>
    <div class="num zl" style="font-size:20px;letter-spacing:.3em;color:var(--teal);margin-top:14px">EPIPELAGIC</div>
    <div class="num hint" style="font-size:17px;color:var(--faint);margin-top:60px;letter-spacing:.1em">CLICK → DIVE</div></div></div>`,
  build(s, tl) {
    const col = $(".col", s), zl = $(".zl", s), big = $(".big .v", s), depth = [0, 200, 1000, 4000, 6000, 10900];
    tl.from(col, { opacity: 0, duration: 1 }, 0).from($(".panelR", s), { x: 760, duration: 1, ease: "expo.out" }, 0.1);
    rise(tl, [$(".panelR .kick", s), $(".h2", s), $(".panelR .body", s), $(".big", s), zl, $(".hint", s)], 0.5);
    rise(tl, $$(".zone > *", s).slice(0, 3), 0.8);
    tl.addPause();
    tl.to($(".hint", s), { opacity: 0, duration: 0.3 });
    const D = 8, t = tl.duration();
    call(tl, () => { sfx("bubbles"); whoosh(2, 0.3); }, t);
    tl.to(col, { y: -4320, duration: D, ease: "power1.inOut" }, t)
      .to(col, { keyframes: [{ filter: "blur(0px)", duration: D * 0.2 }, { filter: "blur(5px)", duration: D * 0.25 }, { filter: "blur(5px)", duration: D * 0.3 }, { filter: "blur(0px)", duration: D * 0.25 }] }, t)
      .to(window, { snowSpeed: -9, duration: D * 0.4, ease: "power2.in" }, t).to(window, { snowSpeed: 1, duration: D * 0.4, ease: "power2.out" }, t + D * 0.6);
    const o = { p: 0 };
    tl.to(o, { p: 4, duration: D, ease: "power1.inOut", onUpdate: () => { const q = (o.p * 5) / 4, i = Math.min(4, Math.floor(q)); big.textContent = fmt(depth[i] + (depth[i + 1] - depth[i]) * Math.min(1, q - i)); zl.textContent = Z[Math.min(4, Math.round(o.p))][3]; } }, t);
    for (let i = 1; i <= 4; i++) call(tl, () => sfx("tick", 0.6), t + (i / 4) * D - 0.3);
    tl.set(big, { color: "var(--amber)" }, t + D);
    call(tl, () => { sfx("ping", 0.9); boom(0.4); }, t + D);
    flash(tl, t + D, 0.25);
  } });

// 06 ── 02 core ③: photographs (flashlight hunt → lock → shutter → the shot flies into the codex)
S.push({ depth: 1840, pre: [89, 86, 0], html: () => `
  <div class="bg" style="background-image:url(img/humanoid.jpg)"></div>
  <div class="abs dark" style="inset:0;background:#000;--x:70%;--y:70%;--r:240px;-webkit-mask:radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0,transparent 35%,#000 100%);mask:radial-gradient(circle var(--r) at var(--x) var(--y),transparent 0,transparent 35%,#000 100%)"></div>
  <div class="abs vf" style="left:110px;top:110px;width:1060px;height:860px"><svg width="1060" height="860" class="abs vf"><path d="M0 70V0H70M990 0H1060V70M1060 790V860H990M70 860H0V790"/></svg>
    <div class="abs num rec" style="left:40px;top:30px;font-size:21px;font-weight:700"><span class="red">●</span> REC</div>
    <div class="abs num" style="right:40px;top:30px;font-size:18px;color:var(--soft)">DEPTH 1,840 m &nbsp; ISO 6400 &nbsp; 1/30</div></div>
  <div class="abs focus" style="left:530px;top:240px;width:260px;height:260px;border:3px solid var(--teal);opacity:0"></div>
  <div class="abs num lock" style="left:810px;top:250px;font-size:18px;font-weight:700;letter-spacing:.14em;color:var(--teal);opacity:0">TARGET LOCKED</div>
  <div class="abs shot" style="left:530px;top:240px;width:260px;height:260px;background:url(img/humanoid.jpg) -530px -240px / 1920px 1080px;border:6px solid #F2EFE8;box-shadow:0 20px 50px rgba(0,0,0,.6);opacity:0"></div>
  <div class="panelR"><div class="in">${kick("02 — 3", "핵심 특징")}<div class="h2" style="margin:12px 0 26px">찍어야<br>잡을 수 있다</div>
    <div class="log" style="font:24px/1.7 var(--serif);color:var(--ink);min-height:170px">조명 끝에서 무언가 우리를 보고 있었다. 사람의 형체였다. 셔터를 누르자 녀석은 어둠 속으로 사라졌다.</div>
    <div class="list" style="margin-top:34px">${[["약점 발견", "사진을 분석하면 크리쳐의 약점이 드러난다"], ["제품화", "연구로 무기 · 방어구 레시피가 해금된다"], ["도감 작성", "미발견 생명체를 기록해 도감을 채운다"]].map(([h, d], i) => `<div><b style="color:${i ? "var(--ink)" : "var(--amber)"}"><span class="num">0${i + 1}</span> &nbsp;${h}</b><span>${d}</span></div>`).join("")}</div></div></div>
  <div class="bar t"></div><div class="bar b"></div>
  ${toast("CODEX +1", "인간형 크리쳐 #01 — 도감에 기록됨", "left:150px;right:auto;top:auto;bottom:130px")}`,
  build(s, tl) {
    const dark = $(".dark", s), setL = (x, y) => { dark.style.setProperty("--x", x + "%"); dark.style.setProperty("--y", y + "%"); };
    tl.set($(".panelR", s), { opacity: 0 }, 0).from($$(".bar", s), { height: 0, duration: 0.8, ease: "power3.out" }, 0).from($(".bg", s), { opacity: 0, duration: 0.8 }, 0);
    call(tl, () => sfx("rumble", 0.7), 0);
    const L = { x: 80, y: 75 };
    [[60, 20], [18, 60], [45, 28], [30, 50], [36, 36]].forEach(([x, y], i) => tl.to(L, { x, y, duration: 0.7, ease: "sine.inOut", onUpdate: () => setL(L.x + Math.sin(performance.now() / 90) * 0.35, L.y + Math.cos(performance.now() / 110) * 0.35) }, 0.4 + i * 0.7));
    tl.from($(".vf", s), { opacity: 0, scale: 1.04, duration: 0.5 }, 0.4);
    loop(0.8, () => gsap.to($(".rec", s), { opacity: 0.15, duration: 0.5, repeat: -1, yoyo: true }));
    const T = 4.1;
    tl.fromTo($(".focus", s), { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(3)" }, T).to($(".focus", s), { keyframes: [{ opacity: 0.3 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], duration: 0.4 }, T + 0.3)
      .to($(".lock", s), { opacity: 1, duration: 0.1 }, T + 0.55);
    call(tl, () => sfx("tick", 0.8), T); call(tl, () => sfx("shutter", 1), T + 1);
    flash(tl, T + 1, 1, 0.45); shake(tl, $(".bg", s), T + 1, 14, 0.3);
    // the photo pops out of the viewfinder and files itself into the codex counter (bottom-left HUD)
    const shot = $(".shot", s);
    tl.set(shot, { opacity: 1 }, T + 1.05).fromTo(shot, { scale: 1.08, rotation: 0 }, { scale: 1, rotation: -4, duration: 0.3, ease: "back.out(2)", immediateRender: false }, T + 1.05)
      .to(shot, { x: 170, y: 655, scale: 0.12, rotation: -12, duration: 0.85, ease: "power2.in" }, T + 1.65).set(shot, { opacity: 0 }, T + 2.5);
    hudTo(tl, { codex: 1 }, T + 2.5, 0.01); codexPop(tl, T + 2.5); call(tl, () => sfx("tick", 0.9), T + 2.5);
    toastIn(tl, $(".toast", s), T + 2.55);
    const R = { r: 240 };
    tl.to(R, { r: 1700, duration: 1.4, ease: "expo.out", onUpdate: () => dark.style.setProperty("--r", R.r + "px") }, T + 1.05).to(dark, { opacity: 0, duration: 1.2 }, T + 1.3)
      .to($(".panelR", s), { opacity: 1, duration: 0.6 }, T + 1.7).from($(".panelR", s), { x: 200, duration: 0.9, ease: "expo.out" }, T + 1.7)
      .to([$(".focus", s), $(".lock", s)], { opacity: 0.5, duration: 0.5 }, T + 1.7);
    rise(tl, [$(".panelR .kick", s), $(".h2", s)], T + 2);
    const e = type(tl, $(".log", s), T + 2.4, 26);
    rise(tl, $$(".list > div", s), e + 0.2, { s: 0.18 });
  } });

// 06b ── 02 core ④: what a player actually sees — a first-person cockpit mock-up (the deck HUD steps aside)
const camIco = '<path d="M6 16h8l3-5h14l3 5h8v22H6z"/><circle cx="24" cy="27" r="7"/>';
const scanIco = '<path d="M8 14V8h6M34 8h6v6M40 34v6h-6M14 40H8v-6"/><path d="M12 24h24"/>';
const kitIco = '<path d="M8 16h32v24H8z"/><path d="M18 16v-6h12v6M24 22v12M18 28h12"/>';
const svgI = (d) => `<svg viewBox="0 0 48 48">${d}</svg>`;
S.push({ depth: 1840, hideHud: true, html: () => `
  <div class="abs ck"></div>
  <div class="abs win"><div class="water"></div><div class="cone"></div><img class="abs eyes2" src="img/eyes.png">
    <div class="obj"><b>임무</b>2,000 m 크리쳐 촬영 &nbsp;<span class="num">0 / 1</span></div>
    <div class="team">${["DIVER 1 (나)", "DIVER 2", "DIVER 3", "DIVER 4"].map((n, k) => `<div><i style="${k === 2 ? "background:var(--amber)" : ""}"></i>${n}</div>`).join("")}</div>
    <div class="xh"></div><div class="prompt"><kbd>E</kbd> 사진 찍기<span>미확인 생명체 · 거리 18 m</span></div></div>
  <div class="abs frame"></div>
  <div class="abs hot">${[[camIco, "카메라"], [ICON.harpoon, "작살"], [scanIco, "스캐너"], [kitIco, "수리 키트"]].map(([d, n], k) => `<div class="${k ? "" : "on"}"><span class="num">${k + 1}</span>${svgI(d)}<em>${n}</em></div>`).join("")}</div>
  <div class="abs dash">
    <div class="mod m1"><div class="lcd"><span class="dv num">1,700</span> m</div><div class="lbl">DEPTH</div>
      <svg class="dial" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><path d="M20 88A52 52 0 1 1 100 88" class="tr"/><line class="nd" x1="60" y1="60" x2="60" y2="18"/></svg><div class="lbl" style="margin-top:4px">PRESSURE <span class="num" style="color:var(--soft)">184 bar</span></div></div>
    <div class="mod m2"><div class="scope"><div class="rg" style="inset:0"></div><div class="rg" style="inset:22%"></div><div class="rg" style="inset:44%"></div><div class="sw"></div>
      <i class="b" style="left:62%;top:30%"></i><i class="b" style="left:30%;top:62%"></i><i class="b big" style="left:50%;top:18%"></i></div><div class="lbl" style="text-align:center">SONAR</div></div>
    <div class="mod m3">${[["HULL", 89, "var(--teal)"], ["FUEL", 86, "var(--amber)"]].map(([n, v, c]) => `<div class="rbar"><b>${n}</b><div class="sg"><i style="width:${v}%;background:${c}"></i></div><span class="num">${v}%</span></div>`).join("")}
      <div class="lbl" style="margin-top:22px">CREW <span class="num" style="color:var(--teal)">4 / 4</span> &nbsp;·&nbsp; LIGHT <span class="num" style="color:var(--teal)">ON</span></div></div></div>
  <div class="abs tagline">${kick("02 — 4", "플레이 화면")}<span class="small">1인칭 목업 · 실제 게임 화면 아님</span></div>
  ${[["1", "촬영 — 크리쳐를 조준하고 E", 1250, 405], ["2", "정부 임무", 370, 178], ["3", "수심 · 수압", 400, 792], ["4", "소나 — 근처 크리쳐 위치", 1100, 900], ["5", "선체 · 연료", 1400, 744], ["6", "도구 슬롯 1 ~ 4", 1160, 700]].map(([n, t, x, y]) => `<div class="co" style="left:${x}px;top:${y}px"><b>${n}</b><span>${t}</span></div>`).join("")}`,
  build(s, tl) {
    call(tl, () => { sonar(0.08); sfx("rumble", 0.5); }, 0.2);
    tl.from($(".ck", s), { opacity: 0, duration: 0.6 }, 0).from($(".dash", s), { y: 200, duration: 0.8, ease: "expo.out" }, 0.1)
      .from($(".win", s), { opacity: 0, duration: 0.05 }, 0.5).to($(".win", s), { keyframes: [{ filter: "brightness(.2)", duration: 0.06 }, { filter: "brightness(1.2)", duration: 0.06 }, { filter: "brightness(.4)", duration: 0.08 }, { filter: "brightness(1)", duration: 0.3 }] }, 0.55);
    rise(tl, [$(".tagline", s), $(".obj", s), $(".team", s), ...$$(".mod", s), ...$$(".hot > div", s)], 0.7, { s: 0.06 });
    count(tl, $(".dv", s), 1700, 1840, 0.9, 1.6);
    tl.fromTo($(".nd", s), { rotation: -110, svgOrigin: "60 60" }, { rotation: 35, svgOrigin: "60 60", duration: 1.6, ease: "elastic.out(1,.5)" }, 0.9);
    tl.from($(".eyes2", s), { opacity: 0, duration: 1.4 }, 1.6).from([$(".xh", s), $(".prompt", s)], { opacity: 0, scale: 1.3, duration: 0.3, stagger: 0.1 }, 2.2);
    $$(".co", s).forEach((c) => tl.set(c, { opacity: 0 }, 0));
    loop(0.8, () => gsap.to($(".sw", s), { rotation: 360, duration: 3, ease: "none", repeat: -1 }));
    loop(2.6, () => gsap.to($(".prompt kbd", s), { scale: 1.15, duration: 0.5, repeat: -1, yoyo: true }));
    loop(1.6, () => gsap.to($(".eyes2", s), { keyframes: [{ opacity: 0, duration: 0.07 }, { opacity: 1, duration: 0.07 }], repeat: -1, repeatDelay: 2.6 }));
    loop(1, () => gsap.to($(".cone", s), { opacity: 0.75, duration: 0.09, repeat: -1, yoyo: true, repeatDelay: 3.1 }));
    loop(1, () => gsap.to($(".water", s), { x: -30, scale: 1.08, duration: 18, ease: "sine.inOut", yoyo: true, repeat: -1 }));
    tl.addPause();
    // click: numbered labels explain each part of the screen
    const t = tl.duration();
    $$(".co", s).forEach((c, k) => { const at = t + 0.05 + k * 0.22; tl.set(c, { opacity: 1 }, at).from(c, { scale: 0.4, duration: 0.3, ease: "back.out(3)" }, at); call(tl, () => sfx("tick", 0.6), at); });
  } });

// 07–10 ── 03 world: four full-bleed story beats, lines typed like a log
function storyHTML(img, kicker, lines, extra, chap) {
  return `<div class="bg" style="background-image:url(img/${img}.jpg)"></div><div class="veil" style="opacity:.2"></div><div class="shadeL"></div><div class="shadeB" style="opacity:.6"></div>
  <div class="content" style="top:200px;width:1000px">${kick(kicker[0], kicker[1])}
    <div class="story" style="margin-top:40px">${lines.map(([t, hl, gap]) => `<div class="ln${hl ? " hl" : ""}" style="${gap ? "margin-top:30px" : ""}">${t}</div>`).join("")}</div></div>
  ${extra}${chap ? diveHTML("03", "세계관", 2000, "생존자들은 모두 같은 말을 했다.") : ""}`;
}
function storyBuild(s, tl, T, onDone) {
  tl.from($(".bg", s), { scale: 1.18, duration: 4, ease: "power2.out" }, Math.max(0, T - 1)).from($(".bg", s), { opacity: 0, duration: 1 }, Math.max(0, T - 1));
  rise(tl, $(".kick", s), T);
  let t = T + 0.5;
  $$(".ln", s).forEach((ln) => { t = type(tl, ln, t, ln.classList.contains("hl") ? 18 : 24) + 0.45; });
  drift($(".bg", s), T + 4, 1.06, 30);
  onDone && onDone(t);
}
S.push({ depth: 2000, html: () => storyHTML("storm", ["03 — 1", "세계관 · 사건"], [["전 세계 바다에서 배들이 사라지기 시작했다."], ["생존자들은 같은 말을 했다."], ["“바다 밑에서 무언가 올라왔다.”"], ["사람이 죽어 나가자, 각국 정부는 조사를 시작했다.", 1, 1]],
  `<div class="ticker"><div class="tag">BREAKING</div><div class="run">태평양 화물선 3척 연락 두절 &nbsp;&nbsp;·&nbsp;&nbsp; 대서양 어선 승무원 전원 실종 &nbsp;&nbsp;·&nbsp;&nbsp; “정체불명의 생명체” 목격담 잇따라 &nbsp;&nbsp;·&nbsp;&nbsp; 각국 정부, 합동 조사 착수 &nbsp;&nbsp;·&nbsp;&nbsp; 태평양 화물선 3척 연락 두절 &nbsp;&nbsp;·&nbsp;&nbsp; 대서양 어선 승무원 전원 실종</div></div>`, true),
  build(s, tl) {
    const T = dive(tl, s, 1840, 2000), bg = $(".bg", s);
    tl.set($(".ticker", s), { opacity: 0 }, 0);
    storyBuild(s, tl, T, (t) => {
      tl.set($(".ticker", s), { opacity: 1 }, t).from($(".ticker", s), { clipPath: "inset(0 100% 0 0)", duration: 0.5, ease: "expo.out" }, t);
      call(tl, () => sfx("alarm", 0.6), t);
      loop(t, () => gsap.fromTo($(".ticker .run", s), { x: 0 }, { x: -1400, duration: 26, ease: "none", repeat: -1 }));
    });
    // lightning: a double flicker of the sky with thunder
    const strike = (at) => { tl.to(bg, { keyframes: [{ filter: "brightness(2.2)", duration: 0.05 }, { filter: "brightness(.9)", duration: 0.08 }, { filter: "brightness(1.8)", duration: 0.05 }, { filter: "brightness(1)", duration: 0.5 }] }, at); flash(tl, at, 0.18, 0.4); call(tl, () => thunder(0.6), at + 0.1); };
    strike(T + 0.3); strike(T + 6.5);
  } });
S.push({ depth: 2300, html: () => storyHTML("descend", ["03 — 2", "세계관 · 투입"], [["조사 끝에 정부는 지구에서 가장 깊은 바다에서"], ["크리쳐와, 그들이 세운 문명을 발견한다."], ["각국은 해군 심해 탐사대를 투입한다.", 1, 1]],
  `<div class="stamp" style="left:1220px;top:300px"><small>ORDER 03-112</small>DEPLOY</div>`),
  build(s, tl) {
    tl.set($(".stamp", s), { opacity: 0 }, 0);
    storyBuild(s, tl, 0.2, (t) => {
      tl.set($(".stamp", s), { opacity: 1 }, t).from($(".stamp", s), { scale: 2.4, rotation: -20, duration: 0.18, ease: "power4.in" }, t);
      call(tl, () => { sfx("tick", 1); boom(0.6); }, t + 0.18); shake(tl, [$(".stamp", s), $(".bg", s)], t + 0.18, 14, 0.3);
    });
  } });
S.push({ depth: 2600, html: () => storyHTML("specimen", ["03 — 3", "세계관 · 연구"], [["탐사대가 보내는 희귀 자원과 크리쳐의 시체 샘플."], ["정부는 그것으로 크리쳐를 연구한다."], ["약점을 찾고, 무기를 만들고, 다시 바다로 보낸다.", 1, 1]],
  `<div class="doc" style="left:1240px;top:230px"><div class="cl">CLASSIFIED</div><div style="font-weight:700;font-size:25px">연구 보고서 #A-07</div><br>표본: 심층 발광 생물<br>채집 수심: 2,610 m<br>특이사항: 빛에 강한 반응<br>담당: <span class="redact">해양연구청 김ㅇㅇ</span><br><br><b>결론: 무기 소재로 전환 가능</b></div>`),
  build(s, tl) {
    tl.set($(".doc", s), { opacity: 0 }, 0);
    storyBuild(s, tl, 0.2, (t) => {
      tl.set($(".doc", s), { opacity: 1 }, t).from($(".doc", s), { x: 700, rotation: 14, duration: 0.8, ease: "expo.out" }, t);
      call(tl, () => sfx("tick", 0.8), t);
    });
  } });
const MISSION = ["문명 촬영", "희귀 자원 수집", "크리쳐 사냥 · 샘플", "바닥 도달"];
S.push({ depth: 3000, html: () => storyHTML("crew2", ["03 — 4", "세계관 · 임무"], [["유저는 해군 심해 탐사대원이다."], ["층마다 문명과 자원을 촬영하고,"], ["크리쳐를 사냥해 샘플을 얻는다."], ["그리고 더 깊이, 바닥까지 내려간다.", 1, 1]],
  `<div class="brief" style="left:1240px;top:260px"><div class="h">MISSION</div>${MISSION.map((m, i) => `<div class="m"><i></i>${i === 3 ? `<b>${m}</b>` : m}</div>`).join("")}</div>`),
  build(s, tl) {
    tl.set($(".brief", s), { opacity: 0 }, 0);
    storyBuild(s, tl, 0.2, (t) => {
      tl.set($(".brief", s), { opacity: 1 }, t).from($(".brief", s), { y: 40, opacity: 0, duration: 0.6, ease: "power3.out" }, t);
      tl.from($$(".brief .m", s), { opacity: 0, x: 20, stagger: 0.2, duration: 0.4 }, t + 0.3);
      $$(".brief .m", s).slice(0, 3).forEach((m, i) => { tl.fromTo(m, { "--ok": 0 }, { "--ok": 1, duration: 0.1 }, t + 1.3 + i * 0.35); call(tl, () => sfx("tick", 0.5), t + 1.3 + i * 0.35); });
    });
  } });

// 11 ── 04 features: four cards deal in
const F = [["f_weapon", "무기 수집", "인간형 크리쳐의 무기를 문명에서 발견해 개조한다"], ["f_survive", "생존", "크리쳐를 요리해 먹고, 해초로 치료제를 만든다"], ["f_craft", "제조", "스캐너로 재료를 스캔하면 정부 연구로 레시피가 열린다"], ["f_combat", "전투", "만든 무기로 4명이 힘을 합쳐 크리쳐를 사냥한다"]];
S.push({ depth: 3200, html: () => `
  <div class="bg" style="background-image:url(img/sub.jpg)"></div><div class="veil" style="opacity:.75"></div><div class="wmk">04</div>
  <div class="content" style="width:1600px">${kick("04", "게임 특징")}<div class="h1" style="margin-top:12px">사람들이 재미를 느낄 네 가지</div></div>
  ${F.map(([im, t, d], i) => `<div class="fcard" style="left:${120 + i * 412}px;top:410px"><div class="im" style="background-image:url(img/${im}.jpg)"><div class="n">0${i + 1}</div></div><div class="bl" style="${i === 3 ? "background:var(--red)" : ""}"></div><div class="t">${t}</div><div class="d">${d}</div></div>`).join("")}
  ${diveHTML("04", "게임 특징", 3200, "크리쳐는 먼저 찍어야 약점이 보인다.")}`,
  build(s, tl) {
    const T = dive(tl, s, 3000, 3200);
    rise(tl, [$(".kick", s), $(".h1", s)], T);
    $$(".fcard", s).forEach((c, i) => {
      const at = T + 0.5 + i * 0.45;
      tl.from(c, { y: 120, opacity: 0, rotation: i % 2 ? 3 : -3, duration: 0.7, ease: "expo.out" }, at)
        .from($(".bl", c), { scaleX: 0, transformOrigin: "left", duration: 0.5, ease: "expo.out" }, at + 0.25);
      call(tl, () => (i === 3 ? (sfx("alarm", 0.4), boom(0.4)) : sfx("tick", 0.6)), at + 0.25);
    });
  } });

// 12–16 ── 05 progress, with a five-step tracker on top
const STEPS = ["스토리 시작", "1차 탐험", "정비 · 제작", "크리쳐 조우", "엔딩"];
const steps = (cur) => `<div class="steps">${STEPS.map((t, i) => `<div class="${i < cur ? "done" : i === cur ? "cur" : ""}">${t}</div>`).join("")}</div>`;
S.push({ depth: 4000, html: () => `
  <div class="bg" style="background-image:url(img/title.jpg)"></div><div class="veil" style="opacity:.55"></div><div class="shadeL"></div>${steps(0)}
  <div class="content">${kick("05 — 1 / 5", "게임 진행")}<div class="h1" style="margin-top:12px">정부의 메일로<br>이야기가 시작된다</div>
    <div class="flow"><b>01</b> 접속 <span class="teal">→</span> <b>02</b> 방 만들기 <span class="teal">→</span> <b>03</b> 레벨 로딩 <span class="teal">→</span> <b>04</b> 정부의 메일</div></div>
  <div class="mail" style="left:980px;top:250px"><div class="top"><span class="dot"></span>[긴급] 해군 심해 탐사대 작전 지시</div><div class="meta">보낸 사람: 국가 해양 연구청 &nbsp;·&nbsp; 받는 사람: 탐사대 04</div>
    <div class="bodyt">탐사대원 여러분.

잠수정을 이용해 각 수심의 문명과 크리쳐를 촬영하고, 샘플을 회수하십시오. 연료와 선체 상태에 유의하십시오.

행운을 빕니다.</div>
    <div class="acts"><span class="btn acc">임무 수락<kbd>ENTER</kbd></span><span class="btn">나중에</span></div></div>
  ${toast("MISSION ACCEPTED", "1차 잠수 — 목표 수심 4,800 m", "top:130px")}
  ${diveHTML("05", "게임 진행", 4000, "정부의 메일은 잠수마다 새 임무를 준다.")}`,
  build(s, tl) {
    const T = dive(tl, s, 3200, 4000);
    rise(tl, [$(".kick", s), $(".h1", s)], T); tl.from($$(".steps > div", s), { opacity: 0, y: -10, stagger: 0.06, duration: 0.4 }, T);
    tl.from($$(".flow > *", s), { opacity: 0, x: -10, stagger: 0.08, duration: 0.3 }, T + 0.5);
    tl.from($(".mail", s), { y: 80, opacity: 0, duration: 0.8, ease: "expo.out" }, T + 1.2);
    call(tl, () => sfx("tick", 0.9), T + 1.3);
    const e = type(tl, $(".bodyt", s), T + 1.8, 34), acc = $(".btn.acc", s);
    rise(tl, $$(".acts .btn", s), e + 0.1, { y: 10, d: 0.4 });
    tl.to(acc, { scale: 0.92, duration: 0.08 }, e + 0.7).to(acc, { scale: 1, backgroundColor: "#5FE3D3", color: "#031014", duration: 0.25 }, e + 0.78);
    call(tl, () => { sfx("tick", 1); sfx("ping", 0.4); }, e + 0.7);
    toastIn(tl, $(".toast", s), e + 1.0);
  } });
// quest log: three objectives tick off, then QUEST COMPLETE refuels the sub (watch the HUD)
const QL = [["문명 탐험", "무너진 건축물과 유물을 조사한다", 2], ["자원 수집", "폐품 · 연료 · 희귀 자원을 모은다", 15], ["사진 촬영", "정부 미션에 맞춰 크리쳐 · 문명을 찍는다", 3]];
S.push({ depth: 4800, pre: [71, 64, 1], html: () => `
  <div class="bg" style="background-image:url(img/ruins.jpg)"></div><div class="veil" style="opacity:.35"></div><div class="shadeL"></div>${steps(1)}
  <div class="content" style="width:780px">${kick("05 — 2 / 5", "게임 진행")}<div class="h1" style="margin:12px 0 30px">1차 심해 탐험</div>
    <div class="body">정부의 첫 임무를 받고 내려간다. 층을 돌며 문명을 조사하고, 자원을 모으고, 크리쳐와 문명을 찍는다.</div></div>
  <div class="gpanel quest" style="left:990px;top:250px;width:750px">${mock()}<div class="gh">QUEST LOG <em>메인 임무</em></div>
    <div class="qt"><b>1차 잠수 — 정부 임무</b><span>목표 수심 4,800 m</span></div>
    ${QL.map(([h, d, n]) => `<div class="q"><div class="bx"></div><div><div class="tt"><b>${h}</b><i class="st"></i></div><div class="d">${d}</div></div><div class="c"><span class="v">0</span> / ${n}</div></div>`).join("")}
    <div class="rw"><b>REWARD</b>연구 자료 → 정부 연구 → 레시피 해금</div>
    <div class="qdone">QUEST COMPLETE</div></div>`,
  build(s, tl) {
    tl.from($(".bg", s), { scale: 1.15, opacity: 0, duration: 1.6, ease: "power2.out" }, 0);
    rise(tl, [$(".kick", s), $(".h1", s), $(".content .body", s)], 0.2);
    tl.set($(".qdone", s), { opacity: 0 }, 0).from($(".quest", s), { x: 120, opacity: 0, duration: 0.8, ease: "expo.out" }, 0.4);
    rise(tl, [$(".quest .qt", s), ...$$(".quest .q", s), $(".quest .rw", s)], 0.8, { s: 0.08 });
    $$(".quest .q", s).forEach((q, i) => {
      const at = 1.7 + i * 0.9;
      count(tl, $(".v", q), 0, QL[i][2], at, 0.6, (v) => Math.round(v));
      tl.fromTo($(".bx", q), { "--ok": 0 }, { "--ok": 1, duration: 0.12 }, at + 0.6).fromTo($(".bx", q), { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, at + 0.6)
        .to($(".st", q), { scaleX: 1, duration: 0.3, ease: "power2.out" }, at + 0.65).to([$(".tt b", q), $(".c", q)], { color: "#7F98A3", duration: 0.3 }, at + 0.65);
      call(tl, () => sfx("tick", 0.8), at + 0.6);
    });
    const t = 1.7 + QL.length * 0.9 + 0.2;
    tl.fromTo($(".qdone", s), { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.18, ease: "power4.in" }, t);
    call(tl, () => { sfx("ping", 0.9); boom(0.4); }, t + 0.18); flash(tl, t + 0.18, 0.25);
    hudTo(tl, { fuel: 95, codex: 3 }, t + 0.3, 1.0); codexPop(tl, t + 0.3);
    tl.to($(".qdone", s), { opacity: 0, duration: 0.5 }, t + 2);
    drift($(".bg", s), 1.6, 1.06);
  } });
// workbench: the five-link chain on the left drives the bench on the right; the repair restores the HUD hull
const INV = [["scrap", "폐품", 12], ["vial", "발광 샘플", 1], ["weed", "해초", 4], ["ore", "광석", 2], ["fuel", "연료", 1], [null, "", 0]];
const RC = ["재료 수집", "스캐너로 스캔", "정부 연구", "레시피 해금", "제작 · 수리"];
S.push({ depth: 5600, pre: [66, 93, 3], html: () => `
  <div class="bg" style="background-image:url(img/specimen.jpg)"></div><div class="veil" style="opacity:.45"></div><div class="shadeL"></div>${steps(2)}
  <div class="content" style="width:820px">${kick("05 — 3 / 5", "게임 진행")}<div class="h2" style="margin:12px 0 44px">잠수정 정비와<br>무기 제작</div>
    <div class="chain"><div class="ln" style="top:48px;height:${96 * 4}px"><i></i></div>${RC.map((t) => `<div><span class="dot"></span>${t}</div>`).join("")}</div>
    <div class="body pr" style="margin-top:26px;font-size:22px">무기 · 방어구 · 치료제를 만들고, 수압으로 망가진 선체를 폐품으로 고친다.</div></div>
  <div class="gpanel bench" style="left:940px;top:230px;width:800px;height:650px">${mock()}<div class="gh">WORKBENCH <em>잠수정 제작대</em></div>
    <div class="inv">${INV.map(([k, n, q]) => `<div class="slot${k ? "" : " empty"}">${k ? ico(k) + `<span class="q">×${q}</span><span class="nm">${n}</span>` : ""}</div>`).join("")}</div>
    <div class="scan"><div class="ghost">${ico("vial")}</div><div class="bm"></div><div class="pct">SCAN <span class="v">0</span>%</div></div>
    <div class="upl"><div class="lb"><span>정부 연구소로 전송</span><span class="v2">0%</span></div><div class="bar"><i></i></div></div>
    <div class="recipe"><div class="ic">${ico("harpoon")}</div><div><div class="t"><small>RECIPE UNLOCKED</small>발광 작살</div><div class="rq">발광 샘플 1 · 광석 2 · 폐품 4</div></div><div class="btn">제작</div></div>
    <div class="repair"><b>REPAIR</b><span>폐품 4개로 선체 수리</span><div class="bar"><i></i></div><em class="hv">HULL 66%</em></div></div>`,
  build(s, tl) {
    tl.from($(".bg", s), { opacity: 0, duration: 1.2 }, 0);
    rise(tl, [$(".kick", s), $(".h2", s)], 0.2);
    tl.from($(".bench", s), { x: 120, opacity: 0, duration: 0.8, ease: "expo.out" }, 0.3);
    tl.set([$(".scan .ghost", s), $(".recipe", s), $(".repair", s)], { opacity: 0 }, 0);
    const step = (i) => 0.9 + i * 1.15;
    $$(".chain > div:not(.ln)", s).forEach((r, i) => { const at = step(i), last = i === 4;
      tl.to(r, { color: last ? "#FFB547" : "#EAF2F4", duration: 0.2 }, at).to($(".dot", r), { background: last ? "#FFB547" : "#5FE3D3", scale: 1.4, duration: 0.15 }, at).to($(".dot", r), { scale: 1, duration: 0.3 }, at + 0.15);
      if (i < 4) tl.to($(".chain .ln i", s), { height: (i + 1) * 96 + "px", duration: 1.0, ease: "none" }, at + 0.1);
      call(tl, () => sfx("tick", last ? 1 : 0.5), at); });
    // 1 materials drop into the inventory
    tl.from($$(".slot", s), { scale: 0.6, opacity: 0, stagger: 0.07, duration: 0.35, ease: "back.out(2)" }, step(0));
    // 2 scan the glowing sample
    tl.to($$(".slot", s)[1], { borderColor: "#5FE3D3", duration: 0.2 }, step(1)).set($(".scan .ghost", s), { opacity: 1 }, step(1))
      .fromTo($(".scan .bm", s), { top: 0 }, { top: 207, duration: 0.5, repeat: 1, yoyo: true, ease: "sine.inOut" }, step(1));
    count(tl, $(".scan .v", s), 0, 100, step(1), 1.0, (v) => Math.round(v));
    // 3 send it to the government lab
    tl.to($(".upl .bar i", s), { width: "100%", duration: 0.9, ease: "power1.inOut" }, step(2)); count(tl, $(".upl .v2", s), 0, 100, step(2), 0.9, (v) => Math.round(v) + "%");
    // 4 the recipe flips in
    tl.set($(".recipe", s), { opacity: 1 }, step(3)).from($(".recipe", s), { rotationX: 90, transformPerspective: 800, transformOrigin: "50% 0%", duration: 0.5, ease: "back.out(1.6)" }, step(3));
    call(tl, () => sfx("ping", 0.6), step(3));
    // 5 craft, then the repair restores the hull — the HUD bar refills with it
    const btn = $(".recipe .btn", s), f = step(4);
    tl.to(btn, { scale: 0.9, duration: 0.08 }, f).to(btn, { scale: 1, backgroundColor: "#FFB547", color: "#031014", duration: 0.25 }, f + 0.08).set(btn, { textContent: "완료" }, f + 0.1)
      .fromTo($(".recipe .ic", s), { boxShadow: "0 0 0 0 rgba(255,181,71,.8)" }, { boxShadow: "0 0 0 26px rgba(255,181,71,0)", duration: 0.8 }, f + 0.1);
    call(tl, () => { sfx("tick", 1); boom(0.3); }, f);
    tl.set($(".repair", s), { opacity: 1 }, f + 0.4).from($(".repair", s), { y: 20, duration: 0.4 }, f + 0.4)
      .to($(".repair .bar i", s), { width: "100%", backgroundColor: "#5FE3D3", duration: 0.9 }, f + 0.6);
    count(tl, $(".repair .hv", s), 66, 100, f + 0.6, 0.9, (v) => "HULL " + Math.round(v) + "%");
    hudTo(tl, { hull: 100 }, f + 0.6, 0.9);
    rise(tl, $(".pr", s), f + 1.3);
  } });
// encounter: eyes in the dark (the photo goes into the codex), click → the hunt costs hull
const EN = [["발견", "어둠 속에서 빛나는 눈"], ["촬영", "약점을 알기 위해 먼저 찍는다"], ["사냥", "4명이 함께 공격한다"], ["샘플 회수", "시체에서 연구 샘플을 얻는다"]];
S.push({ depth: 6400, pre: [100, 82, 3], html: () => `
  <div class="bg" style="background-image:url(img/humanoid.jpg)"></div><div class="veil" style="opacity:.86"></div><div class="shadeL"></div>${steps(3)}
  <img class="abs eyes" src="img/eyes.png" style="left:1250px;top:330px;width:340px;opacity:0">
  <div class="content">${kick("05 — 4 / 5", "게임 진행")}<div class="h1" style="margin:12px 0 60px">크리쳐 조우</div>
    <div class="enc">${EN.map(([h, d], i) => `<div><b class="n" style="${i === 2 ? "color:var(--red)" : ""}">0${i + 1}</b><b>${h}</b><span>${d}</span></div>`).join("")}</div></div>
  <div class="abs redwash" style="inset:0;background:var(--red);mix-blend-mode:multiply;opacity:0"></div>`,
  build(s, tl) {
    const e = $$(".enc > div", s);
    rise(tl, [$(".kick", s), $(".h1", s)], 0.2); rise(tl, e.slice(0, 2), 0.7, { s: 0.5 });
    tl.to($(".eyes", s), { opacity: 1, duration: 1.6, ease: "power2.in" }, 1.2);
    loop(2.9, () => gsap.to($(".eyes", s), { keyframes: [{ opacity: 0, duration: 0.07 }, { opacity: 1, duration: 0.07 }], repeat: -1, repeatDelay: 2.4 }));
    call(tl, () => sfx("rumble", 0.6), 1.2);
    call(tl, () => sfx("shutter", 0.7), 1.9); flash(tl, 1.9, 0.35); hudTo(tl, { codex: 4 }, 1.95, 0.01); codexPop(tl, 1.95);
    tl.addPause();
    const t = tl.duration();
    call(tl, () => { sfx("alarm", 0.9); boom(0.9); }, t);
    tl.to($(".veil", s), { opacity: 0.6, duration: 0.15 }, t).fromTo($(".redwash", s), { opacity: 0.7 }, { opacity: 0, duration: 0.6, immediateRender: false }, t);
    flash(tl, t, 0.35); shake(tl, [$(".bg", s), $(".eyes", s)], t, 30, 0.5);
    tl.to($(".eyes", s), { scale: 1.3, opacity: 0, duration: 0.5 }, t + 0.1);
    hudTo(tl, { hull: 68 }, t + 0.05, 0.4);
    rise(tl, e.slice(2), t + 0.3, { s: 0.25 });
  } });
S.push({ depth: 7200, html: () => `
  <div class="bg" style="background-image:url(img/boss.jpg)"></div><div class="veil" style="opacity:.66"></div><div class="caus"></div>${steps(4)}
  <div class="abs" style="left:0;right:0;top:250px;text-align:center">${kick("05 — 5 / 5", "게임 진행")}
    <div class="disp bigd" style="font-size:250px;margin-top:20px">${rgb('<span class="v">0</span> M')}</div>
    <div class="h2 hh" style="margin-top:20px;font-size:52px">바닥에 도착하면, 엔딩</div>
    <div class="body pp" style="margin-top:12px">크리쳐 문명의 중심. 모든 사진과 샘플이 정부로 전송된다.</div>
    <div class="num mc" style="font-size:24px;font-weight:700;letter-spacing:.7em;color:var(--amber);margin-top:60px">MISSION COMPLETE</div></div>`,
  build(s, tl) {
    const vs = $$(".bigd .v", s), bg = $(".bg", s);
    tl.from(bg, { opacity: 0, scale: 1.25, duration: 2.4, ease: "power2.out" }, 0); rise(tl, $(".kick", s), 0.4);
    const o = { v: 0 };
    tl.to(o, { v: 10900, duration: 2.3, ease: "power2.in", onUpdate: () => vs.forEach((v) => (v.textContent = fmt(o.v))) }, 0.7);
    for (let i = 0; i < 11; i++) call(tl, () => sfx("tick", 0.35), 0.7 + i * 0.2);
    call(tl, () => { sfx("ping", 1); boom(); }, 3.0);
    flash(tl, 3.0, 1, 0.5); split(tl, $(".bigd .rgb", s), 3.0, 30); shake(tl, $(".bigd", s), 3.0, 26, 0.5);
    tl.fromTo($(".bigd", s), { scale: 1.25 }, { scale: 1, duration: 0.6, ease: "back.out(2)", immediateRender: false }, 3.0);
    rise(tl, $(".hh", s), 3.6); type(tl, $(".pp", s), 4.0, 30);
    tl.from($(".mc", s), { opacity: 0, letterSpacing: "1.6em", duration: 1.3, ease: "expo.out" }, 5.8);
    loop(7.2, () => gsap.to($(".mc", s), { opacity: 0.3, duration: 0.8, repeat: -1, yoyo: true }));
    drift(bg, 3, 1.1, 24); causLoop(s);
  } });

// 17–18 ── 06 expansion + hardware (a system-check console)
const XP = [["게임", "리썰 컴퍼니의 협동 재미 + 서브노티카의 심해 탐험, 그 위에 우리만의 시스템과 콘텐츠"], ["영화 · 미디어", "세계관과 스토리를 넓혀 영화 제작을 추진한다"], ["IP 사례", "백룸, 프레디의 피자가게처럼 게임에서 시작한 공포 IP"]];
S.push({ depth: 8800, html: () => `
  <div class="bg" style="background-image:url(img/wreck.jpg)"></div><div class="veil" style="opacity:.35"></div><div class="shadeL"></div><div class="wmk">06</div>
  <div class="content">${kick("06", "확장 요소")}<div class="h1" style="margin:12px 0 60px">게임을 넘어,<br>하나의 IP로</div>
    <div class="xp">${XP.map(([h, d], i) => `<div class="${i === 1 ? "a" : ""}"><b>${h}</b><span>${d}</span></div>`).join("")}</div></div>
  ${diveHTML("06", "확장 요소 · 사양", 8800, "바닥이 끝이 아닐 수도 있다.")}`,
  build(s, tl) {
    const T = dive(tl, s, 7200, 8800);
    tl.from($(".bg", s), { scale: 1.2, duration: 3, ease: "power2.out" }, T - 0.8);
    rise(tl, [$(".kick", s), $(".h1", s)], T);
    $$(".xp > div", s).forEach((x, i) => tl.from(x, { opacity: 0, x: -40, duration: 0.6, ease: "power3.out" }, T + 0.6 + i * 0.35));
    drift($(".bg", s), T + 2, 1.05);
  } });
const HW = [["", "리썰 컴퍼니", "클레트카", "Deep Sea Diver (목표)"], ["OS", "Windows 10 64bit", "Windows 10 64bit", "Windows 10 64bit"], ["CPU", "Intel Core i5-7400", "Intel Core i5", "Intel Core i5 7세대"],
  ["메모리", "—", "6 GB", "8 GB"], ["그래픽", "GTX 1050", "GTX 650", "GTX 1050"], ["DirectX", "11", "12", "11"], ["저장 공간", "4 GB", "3 GB", "5 GB"]];
S.push({ depth: 9200, html: () => `
  <div class="bg" style="background-image:url(img/sub.jpg)"></div><div class="veil" style="opacity:.84"></div>
  <div class="content" style="width:1600px">${kick("06", "하드웨어 요구사항")}<div class="h1" style="margin-top:12px">비슷한 게임과 같은 사양을 목표로</div></div>
  <div class="gpanel con" style="left:120px;top:310px;width:1620px;height:600px"><div class="gh">SYSTEM CHECK <em>최소 사양 비교 · Steam 상점 기준</em></div>
    <div class="term">&gt; DEEP SEA DIVER — 최소 사양 점검</div>
    <div class="tw"><div class="scanl"></div><table class="hw"><tr>${HW[0].map((c, j) => `<th class="${j === 3 ? "us" : ""}">${c}</th>`).join("")}</tr>${HW.slice(1).map((r) => `<tr>${r.map((c, j) => `<td class="${j === 3 ? "us" : ""}">${c}${j === 3 ? '<span class="ok">OK</span>' : ""}</td>`).join("")}</tr>`).join("")}</table></div>
    <div class="term res">&gt; 결과: 리썰 컴퍼니와 같은 수준의 최소 사양을 목표로 한다</div></div>
  <div class="small src" style="position:absolute;left:120px;top:932px;font-size:16px">출처: Steam 상점 최소 사양 (2026.10 확인). 리썰 컴퍼니는 메모리 항목이 표기되지 않음. 목표 사양은 팀 기획안.</div>`,
  build(s, tl) {
    rise(tl, [$(".kick", s), $(".h1", s)], 0.2);
    tl.from($(".con", s), { y: 60, opacity: 0, duration: 0.7, ease: "expo.out" }, 0.4);
    const e = type(tl, $(".con .term", s), 0.9, 45), rows = $$("table.hw tr", s), scan = $(".scanl", s);
    tl.from($$("th", rows[0]), { opacity: 0, stagger: 0.05, duration: 0.3 }, e);
    tl.set(scan, { opacity: 1 }, e + 0.3);
    rows.slice(1).forEach((r, k) => { const at = e + 0.3 + k * 0.32;
      tl.to(scan, { y: k * 58, duration: 0.2, ease: "power2.out" }, at).from(r, { opacity: 0, x: -20, duration: 0.3 }, at).from($(".ok", r), { scale: 2.2, opacity: 0, duration: 0.25, ease: "back.out(3)" }, at + 0.18);
      call(tl, () => sfx("tick", 0.35), at + 0.18); });
    const end = e + 0.3 + (rows.length - 1) * 0.32;
    tl.to(scan, { opacity: 0, duration: 0.4 }, end);
    type(tl, $(".con .term.res", s), end + 0.2, 40);
    rise(tl, $(".src", s), end + 0.4);
  } });

// 19–20 ── 07 positioning (sonar sweep finds each game) + market (reference dossiers)
const STP = [["S — 세분화", "PC 협동 게임 · 공포 게임 이용자"], ["T — 타깃", "친구와 함께 무서운 게임을 하는 10~20대, 게임 방송 시청자"], ["P — 포지셔닝", "심해라는 미지 + 4인 협동 + 촬영 · 연구 루프"]];
const PTS = [["서브노티카", 0.25, 0.42], ["리썰 컴퍼니", 0.8, 0.3], ["클레트카", 0.68, 0.18], ["레포", 0.86, 0.6], ["백룸", 0.4, 0.16]];
const RCX = 1330, RCY = 590, RR = 380, rpos = (px, py) => [RCX + (px - 0.5) * 2 * RR * 0.92, RCY + (py - 0.5) * 2 * RR * 0.92];
const ang = (x, y) => ((Math.atan2(x - RCX, -(y - RCY)) * 180) / Math.PI + 360) % 360;
S.push({ depth: 9600, html: () => `
  <div class="abs" style="inset:0;background:radial-gradient(ellipse at 70% 55%,#06222b,#000 70%)"></div>
  <div class="content" style="width:700px">${kick("07", "포지셔닝")}<div class="h1" style="margin:12px 0 60px">협동과 공포,<br>둘 다 높은 자리</div>
    <div class="stp">${STP.map(([h, d]) => `<div><b>${h}</b><span>${d}</span></div>`).join("")}</div>
    <div class="small nt" style="font-size:17px;color:var(--faint);margin-top:20px">* 그래프 위치는 팀의 주관적 평가</div></div>
  <div class="radar" style="left:${RCX - RR}px;top:${RCY - RR}px">
    ${[1, 0.66, 0.33].map((k) => `<div class="ring" style="left:${RR * (1 - k)}px;top:${RR * (1 - k)}px;width:${2 * RR * k}px;height:${2 * RR * k}px"></div>`).join("")}
    <div class="ax" style="left:0;right:0;top:${RR}px;height:1px"></div><div class="ax" style="top:0;bottom:0;left:${RR}px;width:1px"></div><div class="sweep"></div>
    <div class="lab" style="left:${RR}px;top:-40px;transform:translateX(-50%)">공포 · 생존 높음</div><div class="lab" style="left:${RR}px;bottom:-40px;transform:translateX(-50%)">공포 · 생존 낮음</div>
    <div class="lab" style="right:${2 * RR + 20}px;top:${RR - 12}px">협동 낮음</div><div class="lab" style="left:${2 * RR + 20}px;top:${RR - 12}px">협동 높음</div></div>
  ${PTS.map(([n, px, py]) => { const [x, y] = rpos(px, py); return `<div class="blip" style="left:${x}px;top:${y}px" data-a="${ang(x, y)}"><span>${n}</span></div>`; }).join("")}
  ${(() => { const [x, y] = rpos(0.9, 0.08); return `<div class="blip us" style="left:${x}px;top:${y}px" data-a="${ang(x, y)}"><span>DEEP SEA DIVER</span></div>`; })()}
  ${diveHTML("07", "포지셔닝 · 시장조사", 9600, "같은 바다에 들어간 게임은 많다. 바닥까지 간 게임은 없다.")}`,
  build(s, tl) {
    const T = dive(tl, s, 9200, 9600), SW = 3.2;
    rise(tl, [$(".kick", s), $(".h1", s)], T); rise(tl, $$(".stp > div", s), T + 0.5, { s: 0.2 });
    tl.from($(".radar", s), { scale: 0.6, opacity: 0, duration: 0.8, ease: "expo.out" }, T + 0.3);
    tl.fromTo($(".sweep", s), { rotation: 0 }, { rotation: 360, duration: SW, ease: "none" }, T + 1);
    $$(".blip:not(.us)", s).forEach((b) => { const at = T + 1 + (b.dataset.a / 360) * SW; tl.from(b, { opacity: 0, scale: 2.5, duration: 0.35, ease: "power2.out" }, at); call(tl, () => sfx("tick", 0.4), at); });
    const us = $(".blip.us", s), at = T + 1 + SW + 0.2;
    tl.from(us, { opacity: 0, scale: 3, duration: 0.22, ease: "power4.in" }, at);
    call(tl, () => { sfx("ping", 1); boom(0.5); }, at + 0.22); flash(tl, at + 0.22, 0.25); rise(tl, $(".nt", s), at + 0.5);
    loop(at + 0.5, () => gsap.to(us, { boxShadow: "0 0 0 34px rgba(255,181,71,0)", duration: 1.4, repeat: -1, ease: "power2.out" }));
    loop(at + 0.4, () => gsap.fromTo($(".sweep", s), { rotation: 0 }, { rotation: 360, duration: 6, ease: "none", repeat: -1 }));
  } });
// drop a screenshot at img/m_<name>.jpg (e.g. m_lethal_company.jpg) and it replaces the static on that file
// [en, kr, tags, took, differs, release, reviews, positive, all-time peak players] — Steam store + SteamCharts, checked 2026-10-29
const FILES = [["KLETKA", "클레트카", ["협동", "호러", "엘리베이터 하강"], "아래로만 가는 탈것", "수압 위협 + 4인 협동", "2026.02", "1,688", "87%", "3,628"],
  ["SUBNAUTICA", "서브노티카", ["생존", "제작", "해양 탐험"], "심해 공포 · 제작 루프", "층별 하강 · 협동", "2018.01", "189,993", "96%", "50,876"],
  ["LETHAL COMPANY", "리썰 컴퍼니", ["협동", "호러", "파밍"], "파밍 → 할당량 루프", "촬영 · 연구로 해금", "2023.10", "276,800", "97%", "239,369"],
  ["DAVE THE DIVER", "데이브 더 다이버", ["해양 탐험", "경영", "요리"], "탐험 + 요리 결합", "호러 톤의 생존 요리", "2023.06", "51,527", "96%", "98,281"]];
S.push({ depth: 9800, html: () => `
  <div class="bg" style="background-image:url(img/crew2.jpg)"></div><div class="veil" style="opacity:.82"></div>
  <div class="content" style="width:1600px">${kick("07", "시장조사")}<div class="h1" style="margin-top:12px">가져온 것과, 다른 것</div></div>
  ${FILES.map(([en, kr, tags, a, b, rel, rv, pos, pk], i) => `<div class="file" style="left:${120 + i * 408}px;top:330px;transform:rotate(${[-1.5, 1, -0.8, 1.6][i]}deg)"><div class="tab">FILE 0${i + 1}</div>
    <div class="sig" style="background:url(img/m_${en.toLowerCase().replace(/ /g, "_")}.jpg) center/cover, var(--noise) 0 0/256px 256px, #10181c"><span>${en}</span></div>
    <div class="kr">${kr}<small class="num">${rel}</small></div><div class="tags">${tags.map((t) => `<i>${t}</i>`).join("")}</div>
    <div class="stat"><div><b class="num">${rv}</b><span>Steam 리뷰</span></div><div><b class="num">${pos}</b><span>긍정</span></div><div><b class="num">${pk}</b><span>최고 동접</span></div></div>
    <div class="row a"><em>가져온 것</em>${a}</div><div class="row b"><em>다른 점</em>${b}</div><div class="stampR">REFERENCE</div></div>`).join("")}
  <div class="small src" style="position:absolute;left:120px;top:962px;font-size:16px;color:var(--dim)">출처: Steam 스토어(출시일 · 리뷰 수 · 긍정 비율 · 이미지), SteamCharts(역대 최고 동시 접속자) — 2026.10.29 조회</div>`,
  build(s, tl) {
    rise(tl, [$(".kick", s), $(".h1", s)], 0.2);
    $$(".file", s).forEach((f, i) => { const at = 0.5 + i * 0.3;
      tl.from(f, { y: 600, rotation: (i % 2 ? 12 : -12), duration: 0.8, ease: "expo.out" }, at); call(tl, () => sfx("tick", 0.5), at + 0.2);
      $$(".stat b", f).forEach((b) => { const raw = b.textContent, n = parseFloat(raw.replace(/[,%]/g, "")); count(tl, b, 0, n, at + 0.4, 1.0, (v) => (raw.includes("%") ? Math.round(v) + "%" : fmt(v))); });
      tl.from($(".stampR", f), { scale: 2.6, opacity: 0, duration: 0.16, ease: "power4.in" }, 2.0 + i * 0.25); call(tl, () => sfx("tick", 0.9), 2.16 + i * 0.25); });
    rise(tl, $(".src", s), 2.4);
  } });

// 21–22 ── 08 monetization (a supply-depot shop) + closing (dive result → ascent → THANK YOU)
const SKIN = (h) => `background:url(img/sub.jpg) -44px -6px/176px 99px;filter:hue-rotate(${h}deg) saturate(1.3)`;
const SKIN2 = (h) => `background:url(img/sub.jpg) -76px -34px/340px 191px;filter:hue-rotate(${h}deg) saturate(1.2)`;
S.push({ depth: 10300, html: () => `
  <div class="bg" style="background-image:url(img/wreck.jpg)"></div><div class="veil" style="opacity:.8"></div><div class="wmk">08</div>
  <div class="content" style="width:1600px">${kick("08", "유료화 방안")}<div class="h1" style="margin-top:12px">콘텐츠는 그대로, 꾸밈과 확장으로</div></div>
  <div class="gpanel shop" style="left:120px;top:300px;width:1620px;height:630px">${mock("UI 목업 · 가격은 예시")}
    <div class="top"><div class="nm"><small>SUPPLY DEPOT</small>보급 상점</div><div class="timer">상품 리셋까지<b class="tm">08:41:23</b></div><div class="cur"><span class="cr">12,400</span><span class="pl">320</span></div></div>
    <div class="cols">
      <div class="col"><div class="colh"><b>01</b><span>꾸밈 요소</span></div>
        <div class="item r"><div class="th" style="${SKIN(170)}"></div><div><div class="rr rar-r">RARE · 잠수정 스킨</div><div class="nm2">희귀 등급 잠수정 스킨</div></div><div class="pr">◆ 120</div></div>
        <div class="item e"><div class="th" style="background:url(img/crew.jpg) 30% 40%/cover"></div><div><div class="rr rar-e">EPIC · 코스튬</div><div class="nm2">코스튬 커스터마이징</div></div><div class="pr">◆ 80</div></div>
        <div class="item"><div class="mys">?</div><div><div class="rr rar-e">확률형 · 무기 스킨</div><div class="nm2">무기 스킨 상자</div></div><div class="pr">◆ 30</div></div>
        <div class="note">능력치는 그대로, 겉모습만 바뀐다</div></div>
      <div class="col"><div class="colh"><b>02</b><span>스킨 상점</span></div>
        <div class="daily">${[0, 60, 200, 300].map((h, k) => `<div class="d"><div class="th" style="${SKIN2(h)}"></div><div class="own">보유</div><div class="row"><span>기본 스킨 ${String.fromCharCode(65 + k)}</span><b>◎ ${[800, 800, 1200, 1500][k]}</b></div></div>`).join("")}</div>
        <div class="note">기본 등급 스킨 · 하루마다 상품 리셋 · 하루 최대 4개 구매 &nbsp;<b class="buy">구매 0 / 4</b></div></div>
      <div class="col a"><div class="colh"><b>03</b><span>DLC 추가 스토리</span></div>
        <div class="dlc" style="background-image:url(img/ruins.jpg)"><div class="shine"></div><div class="in"><div class="tg">DLC 01 · 추가 스토리</div><div class="tt">바닥 아래</div><ul><li>바닥이 끝이 아니었다</li><li>그 아래 새로운 공간 발견</li><li>기존 대원 재소집 · 추가 탐험</li></ul></div></div></div>
    </div></div>
  ${diveHTML("08", "유료화 · 마무리", 10300, "스킨은 강해지지 않는다. 멋있어질 뿐.")}`,
  build(s, tl) {
    const T = dive(tl, s, 9800, 10300);
    rise(tl, [$(".kick", s), $(".h1", s)], T);
    tl.from($(".shop", s), { y: 80, opacity: 0, duration: 0.8, ease: "expo.out" }, T + 0.3);
    rise(tl, $$(".shop .top > *", s), T + 0.6, { s: 0.1, y: 10 });
    count(tl, $(".cur .cr", s), 0, 12400, T + 0.7, 0.8); count(tl, $(".cur .pl", s), 0, 320, T + 0.7, 0.8);
    $$(".shop .col", s).forEach((c, i) => { const at = T + 0.9 + i * 0.35; rise(tl, $(".colh", c), at); rise(tl, $$(".item, .daily .d, .dlc, .note", c), at + 0.15, { s: 0.08, d: 0.5 }); call(tl, () => sfx("tick", 0.5), at); });
    // a purchase: one daily skin is bought, coins and the 0/4 counter move
    const d0 = $(".daily .d", s), bt = T + 2.6;
    tl.to(d0, { borderColor: "#5FE3D3", scale: 0.96, duration: 0.1 }, bt).to(d0, { scale: 1, duration: 0.3, ease: "back.out(3)" }, bt + 0.1).to($(".own", d0), { opacity: 1, duration: 0.2 }, bt + 0.15)
      .set($(".buy", s), { textContent: "구매 1 / 4" }, bt + 0.15);
    count(tl, $(".cur .cr", s), 12400, 11600, bt + 0.15, 0.5);
    call(tl, () => sfx("tick", 1), bt);
    let sec = 8 * 3600 + 41 * 60 + 23;
    loop(T + 1, () => gsap.to({}, { duration: 1, repeat: -1, onRepeat: () => { sec--; const p = (n) => String(n).padStart(2, "0"); $(".tm", s).textContent = `${p(Math.floor(sec / 3600))}:${p(Math.floor(sec / 60) % 60)}:${p(sec % 60)}`; } }));
    loop(T + 2, () => gsap.fromTo($(".dlc .shine", s), { left: -220 }, { left: 640, duration: 1.2, ease: "power2.inOut", repeat: -1, repeatDelay: 2.4 }));
  } });
S.push({ depth: 10900, html: () => `
  <div class="bg" style="background-image:url(img/title.jpg)"></div><div class="veil" style="opacity:.45"></div><div class="caus"></div>
  <div class="content cl" style="width:1500px;top:170px">${kick("08", "마무리")}
    <div class="body g1" style="margin-top:22px;font-size:28px;color:var(--ink)"><b class="teal">게임 안에서</b> &nbsp;<span>심해 맨바닥까지 내려가 문명을 조사하고, 크리쳐를 사냥해 정부의 연구를 돕는다.</span></div>
    <div class="body g2" style="margin-top:8px;font-size:28px;color:var(--ink)"><b class="amber">게임 밖에서</b> &nbsp;<span>차별화된 심해 생존 게임으로 자리 잡고, 영화까지 이어지는 IP로 키운다.</span></div></div>
  <div class="abs tyb" style="left:0;right:0;top:470px;text-align:center"><div class="disp ty" style="font-size:230px;letter-spacing:.08em">${rgb("THANK YOU")}</div>
    <div class="tys" style="font-size:26px;color:var(--soft);margin-top:24px">Deep Sea Diver &nbsp;·&nbsp; 4팀</div></div>
  <div class="small cr" style="position:absolute;left:0;right:0;bottom:110px;text-align:center;font-size:15px;color:var(--faint)">키아트: 팀 제작 AI 일러스트 (ComfyUI) &nbsp;·&nbsp; 음향: 자체 합성</div>
  <div class="result">${kick("DIVE RESULT", "탐사 결과")}<div class="mc">${rgb("MISSION COMPLETE")}</div>
    <div class="stats">${[["10,900 m", "최대 수심", ""], ["4종", "도감 기록", "teal"], ["55%", "선체 내구도", ""], ["18%", "남은 연료", "red"], ["4 / 4", "생존 대원", "amber"]].map(([v, l, c]) => `<div class="st"><b class="${c}">${v}</b><span>${l}</span></div>`).join("")}</div>
    <div class="rank"><b>S</b><span>탐사 등급</span></div>
    <div class="nx">CLICK → 귀환</div></div>`,
  build(s, tl) {
    const R = $(".result", s), V = $$(".st b", R);
    tl.set([$(".cl", s), $(".tyb", s), $(".cr", s)], { opacity: 0 }, 0);
    tl.from($(".bg", s), { opacity: 0, duration: 1.5 }, 0).from(R, { opacity: 0, duration: 0.6 }, 0);
    rise(tl, $(".kick", R), 0.3);
    tl.from($(".mc", R), { scale: 1.6, opacity: 0, duration: 0.18, ease: "power4.in" }, 0.6);
    call(tl, () => { sfx("ping", 1); boom(0.7); }, 0.78); flash(tl, 0.78, 0.6); split(tl, $(".mc .rgb", R), 0.78, 26); shake(tl, $(".mc", R), 0.78, 20, 0.4);
    rise(tl, $$(".st", R), 1.3, { s: 0.12 });
    count(tl, V[0], 0, 10900, 1.4, 1.2, (v) => fmt(v) + " m"); count(tl, V[1], 0, 4, 1.5, 0.8, (v) => Math.round(v) + "종");
    count(tl, V[2], 0, 55, 1.6, 1.0, (v) => Math.round(v) + "%"); count(tl, V[3], 0, 18, 1.7, 1.0, (v) => Math.round(v) + "%");
    for (let k = 0; k < 6; k++) call(tl, () => sfx("tick", 0.35), 1.4 + k * 0.2);
    tl.from($(".rank", R), { scale: 2.6, opacity: 0, rotation: -40, duration: 0.2, ease: "power4.in" }, 3.0);
    call(tl, () => { sfx("tick", 1); boom(0.6); }, 3.2); shake(tl, $(".rank", R), 3.2, 14, 0.3);
    rise(tl, $(".nx", R), 3.6);
    loop(4.4, () => gsap.to($(".nx", R), { opacity: 0.3, duration: 0.8, repeat: -1, yoyo: true }));
    tl.addPause();
    // ascent: the result clears and the depth gauge runs back to the surface — "살아서 돌아와라" answered
    const t = tl.duration();
    tl.to(R, { opacity: 0, duration: 0.6 }, t).set(R, { display: "none" }, t + 0.6);
    call(tl, () => { whoosh(2.2, 0.4); sfx("bubbles", 0.6); }, t);
    tl.to(hudState, { d: 0, duration: 2.6, ease: "power2.inOut", onUpdate: renderDepth }, t)
      .to(window, { snowSpeed: 7, duration: 1, ease: "power2.in" }, t).to(window, { snowSpeed: 1, duration: 1.4 }, t + 1.4)
      .to($(".veil", s), { opacity: 0.25, duration: 2.6 }, t);
    tl.set([$(".cl", s), $(".tyb", s), $(".cr", s)], { opacity: 1 }, t + 0.6);
    rise(tl, $(".cl .kick", s), t + 0.7);
    const e1 = type(tl, $(".g1 span", s), t + 1.0, 30); rise(tl, $(".g1 b", s), t + 0.8);
    rise(tl, $(".g2 b", s), e1 + 0.2); const e2 = type(tl, $(".g2 span", s), e1 + 0.4, 30);
    const u = e2 + 0.6;
    tl.set($(".ty", s), { opacity: 0 }, t + 0.6).fromTo($(".ty", s), { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "power4.in", immediateRender: false }, u);
    call(tl, () => { sfx("ping", 1); boom(); }, u + 0.18); flash(tl, u + 0.18, 1, 0.5); split(tl, $(".ty .rgb", s), u + 0.18, 30); shake(tl, $(".ty", s), u + 0.18, 26, 0.45);
    tl.set([$(".tys", s), $(".cr", s)], { opacity: 0 }, t + 0.6).to([$(".tys", s), $(".cr", s)], { opacity: 1, duration: 0.7 }, u + 0.7);
    drift($(".bg", s), 1, 1.1, 40); causLoop(s);
  } });

// hull / fuel / codex at the end of each page (HUD); `pre` above is the state before a page's own event
const HUDT = [[100, 100, 0], [100, 100, 0], [99, 98, 0], [99, 98, 0], [94, 92, 0], [94, 92, 0], [89, 86, 1], [89, 86, 1], [88, 85, 1], [86, 83, 1], [84, 80, 1], [82, 77, 1], [81, 76, 1],
  [76, 70, 1], [71, 95, 3], [100, 93, 3], [68, 82, 4], [66, 70, 4], [62, 48, 4], [61, 42, 4], [60, 37, 4], [59, 34, 4], [57, 27, 4], [55, 18, 4]];
S.forEach((p, i) => (p.hud = HUDT[i]));

// ================================================================ navigation
$("#hud .pg").innerHTML = `<span class="p">01</span> / ${S.length}`;
let cur = -1, tl = null, pauses = [], running = false;
function show(i) {
  i = Math.max(0, Math.min(S.length - 1, i));
  loops.forEach((l) => l.kill()); loops = [];
  if (tl) tl.kill(); gsap.killTweensOf(gflash); gsap.set(gflash, { opacity: 0 }); gsap.set($(".rb.codex", hud), { scale: 1 }); window.snowSpeed = 1;
  const s = document.createElement("section"); s.className = "slide"; s.innerHTML = S[i].html(); slidesEl.appendChild(s);
  [...slidesEl.children].forEach((c) => c !== s && (FINAL ? c.remove() : gsap.to(c, { opacity: 0, duration: 0.45, onComplete: () => c.remove() })));
  hud.classList.toggle("hide", !!S[i].hideHud); hud.classList.toggle("nores", !!S[i].noRes);
  $(".pg .p", hud).textContent = String(i + 1).padStart(2, "0");
  cur = i; history.replaceState(null, "", "#" + (i + 1) + (FINAL ? "f" : ""));
  try { localStorage.setItem("dsd-last", i + 1); } catch (e) {}
  // resources start where the previous page left them, then drift to this page's state
  const st = i ? S[i - 1].hud : [100, 100, 0], tg = S[i].pre || S[i].hud;
  Object.assign(hudRes, { hull: st[0], fuel: st[1], codex: st[2] }); renderRes();
  tl = gsap.timeline(); pauses = [];
  // a pause sits at the current end; what follows starts a hair later so it never fires on the pause frame
  const ap = tl.addPause.bind(tl); tl.addPause = () => { const at = tl.duration(); pauses.push(at); if (!FINAL) ap(at); tl.set({}, {}, at + 0.05); return tl; };
  hudTo(tl, { hull: tg[0], fuel: tg[1], codex: tg[2] }, 0.3, 1.4);
  S[i].build(s, tl);
  const chapter = !!$(".dive", s);
  if (!chapter) setDepth(S[i].depth);
  // WebGL backdrop: rides the chapter overlay as a rushing smear, then settles into the page art
  if (FX) { FX.attach(s, chapter ? "dive" : "bg"); if (chapter) { tl.fromTo(FX.u, { speed: 1.4 }, { speed: 0, duration: 2.6, ease: "power2.out" }, 0); tl.call(() => FX.attach(s, "bg"), null, 2.9); } }
  if (!FINAL && !chapter && i > 0) tl.fromTo(s, { opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "power2.out", clearProps: "filter" }, 0);
  if (FINAL) { setDepth(S[i].depth, 0); tl.progress(1); hud.classList.toggle("hide", !!S[i].hideHud); }
}
function next() {
  if (!tl) return;
  if (tl.paused() && tl.progress() < 1) { tl.play(); return; }
  const p = pauses.find((t) => t > tl.time() + 0.01);
  // pressed mid-animation: finish this beat silently instead of leaving the page
  if (tl.isActive() || (p !== undefined && tl.time() < p)) { QUIET = true; if (p !== undefined) { tl.seek(p, false); tl.pause(); } else { tl.progress(1); hud.classList.toggle("hide", !!S[cur].hideHud); } QUIET = false; return; }
  if (cur < S.length - 1) show(cur + 1);
}
const prev = () => cur > 0 && show(cur - 1);
// ambient sonar every ~17 s, with a ring off the depth marker
if (!FINAL) setInterval(() => { if (!running || cur < 1) return; sonar(); hud.classList.remove("pingfx"); void hud.offsetWidth; hud.classList.add("pingfx"); }, 17000);

// ================================================================ main menu (the start screen is the game's title menu)
const start = $("#start"), items = $$(".menu button", start);
let sel = 0, closing = false;
const lastPage = (() => { const h = parseInt(hash); if (h > 1) return h; try { return +localStorage.getItem("dsd-last") || 0; } catch (e) { return 0; } })();
if (lastPage > 1) $(".cpg", start).textContent = `${String(lastPage).padStart(2, "0")} / ${S.length}부터 이어서`; else items[1].classList.add("off");
if (parseInt(hash) > 1) sel = 1;
const paint = () => items.forEach((b, k) => b.classList.toggle("on", k === sel));
function move(d) { do { sel = (sel + d + items.length) % items.length; } while (items[sel].classList.contains("off")); paint(); sfx("tick", 0.4); }
function act() {
  if (closing) return; audioInit();
  const a = items[sel].dataset.act;
  if (a === "sound") { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.9; $(".snd", start).textContent = muted ? "OFF" : "ON"; sfx("tick", 0.6); return; }
  closing = true; sfx("ping", 0.7); whoosh(0.9, 0.35);
  gsap.timeline({ onComplete: () => { start.remove(); running = true; document.body.classList.add("run"); show(a === "cont" ? lastPage - 1 : 0); } })
    .to(items[sel], { keyframes: [{ opacity: 0.2, duration: 0.06 }, { opacity: 1, duration: 0.06 }, { opacity: 0.2, duration: 0.06 }, { opacity: 1, duration: 0.06 }] })
    .to(start, { opacity: 0, duration: 0.6, ease: "power2.in" }, 0.25);
}
items.forEach((b, k) => {
  b.addEventListener("mouseenter", () => { if (b.classList.contains("off") || sel === k) return; sel = k; paint(); sfx("tick", 0.3); });
  b.addEventListener("click", (e) => { e.stopPropagation(); audioInit(); if (b.classList.contains("off")) return; sel = k; paint(); act(); });
});
paint();
if (!FINAL) {
  gsap.to($(".mbg", start), { scale: 1.1, duration: 40, ease: "none" }); gsap.to($(".caus", start), { y: 260, duration: 24, ease: "none", repeat: -1 });
  gsap.from($$(".mlogo > *, .menu button, .mfoot", start), { opacity: 0, y: 20, stagger: 0.08, duration: 0.8, ease: "power3.out", delay: 0.2 });
}

let digits = "";
addEventListener("keydown", (e) => {
  if (!running) {
    audioInit();
    if (["ArrowUp", "w", "W"].includes(e.key)) move(-1);
    else if (["ArrowDown", "s", "S", "Tab"].includes(e.key)) { e.preventDefault(); move(1); }
    else if (["Enter", " "].includes(e.key)) act();
    return;
  }
  if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { if (e.key === "Enter" && digits) { show(parseInt(digits) - 1); digits = ""; return; } next(); }
  else if (["ArrowLeft", "PageUp"].includes(e.key)) prev();
  else if (e.key === "Home") show(0); else if (e.key === "End") show(S.length - 1);
  else if (/^[0-9]$/.test(e.key)) digits += e.key;
  else if (e.key === "f" || e.key === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  else if (e.key === "m" || e.key === "M") { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.9; }
});
addEventListener("click", (e) => {
  if (!running) { audioInit(); if (start.contains(e.target) && !e.target.closest("button")) act(); return; }
  e.clientX < innerWidth * 0.15 ? prev() : next();
});
if (FINAL) { start.remove(); running = true; show((parseInt(hash) || 1) - 1); }
