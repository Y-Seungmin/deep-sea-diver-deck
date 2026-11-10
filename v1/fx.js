// WebGL backdrop: redraws a slide's .bg art with underwater wobble, caustics, chromatic fringe,
// a vertical rush (speed) for chapter dives and expanding ripples on impacts.
// One canvas is moved between hosts (the .bg of the current slide, or its .dive overlay); the CSS image stays as fallback.
const FX = (() => {
  // phones get no shader: WebGL textures plus the blur layers push mobile Safari over its memory limit and it reloads the tab
  if (/f$/.test(location.hash) || matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(pointer: coarse)").matches) return null;
  const cv = document.createElement("canvas"); cv.width = 1280; cv.height = 720; cv.className = "glbg";
  const gl = cv.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) return null;
  const VS = "attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }";
  const FS = `precision mediump float;
varying vec2 uv; uniform sampler2D tex; uniform float t, speed, depth, rip, ripT; uniform vec2 ripC;
float caustic(vec2 q, float time) {
  vec2 p = mod(q * 6.2831, 6.2831) - 250.; vec2 i = p; float c = 1.;
  for (int n = 0; n < 4; n++) { float tt = time * (1. - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005))); }
  c = 1.17 - pow(c / 4., 1.4); return pow(abs(c), 8.); }
void main() {
  vec2 u = uv;
  u += vec2(sin(u.y * 9. + t * .9), cos(u.x * 7. - t * .7)) * .0022;
  vec2 a = vec2(16. / 9., 1.); vec2 dv = (u - ripC) * a; float d = length(dv);
  u += (dv / (d + 1e-4)) / a * sin(d * 40. - ripT * 18.) * exp(-d * 4.) * rip * .012;
  float off = .0012 + speed * .004;
  vec3 col = vec3(0.);
  for (int k = 0; k < 6; k++) { vec2 v = u + vec2(0., float(k) * speed * .018);
    col += vec3(texture2D(tex, v + vec2(off, 0.)).r, texture2D(tex, v).g, texture2D(tex, v - vec2(off, 0.)).b); }
  col /= 6.;
  float light = (1. - depth) * smoothstep(1., .1, uv.y);
  col += caustic(uv * vec2(1.6, .9) + vec2(0., t * .02), t * .35) * .16 * light * vec3(.6, 1., .95);
  col *= 1. + rip * .25 * exp(-d * 3.);
  gl_FragColor = vec4(col, 1.); }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog); } catch (e) { console.warn("fx off:", e.message); return null; }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ["t", "speed", "depth", "rip", "ripT", "ripC"]) U[n] = gl.getUniformLocation(prog, n);

  // textures from the embedded data URLs; lib/imgdata.js (1.5 MB) is fetched after the deck is live, so slides use the CSS art until then
  const tex = {};
  const load = () => { for (const [k, src] of Object.entries(window.IMGDATA || {})) {
    const im = new Image(); im.onload = () => { const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
      tex[k] = tx; }; im.src = src;
  } };

  const u = { speed: 0, rip: 0, ripT: 0, ripX: 0.5, ripY: 0.5 };
  let key = null, owner = null;
  const keyOf = (bg) => (bg.dataset.key ??= (getComputedStyle(bg).backgroundImage.match(/img\/([\w-]+)\.jpg/) || [])[1] || "");
  function release() {
    if (owner) { owner.style.backgroundImage = owner.dataset.bgi; owner = null; }
    cv.remove();
  }
  // where: "bg" puts the canvas inside the slide's .bg (it inherits that layer's GSAP transforms); "dive" inside the chapter overlay
  function attach(s, where = "bg") {
    const bg = s.querySelector(".bg"), k = bg && keyOf(bg);
    if (!k || !tex[k]) { release(); key = null; return; }
    release(); key = k;
    if (where === "dive" && s.querySelector(".dive")) { const d = s.querySelector(".dive"); d.insertBefore(cv, d.firstChild); cv.classList.add("indive"); return; }
    cv.classList.remove("indive");
    owner = bg; bg.dataset.bgi = bg.style.backgroundImage; bg.style.backgroundImage = "none"; bg.appendChild(cv);
  }
  function ripple(x = 0.5, y = 0.5, power = 1) { u.ripX = x; u.ripY = y; gsap.fromTo(u, { rip: power, ripT: 0 }, { rip: 0, ripT: 2.2, duration: 2.2, ease: "power2.out", overwrite: true }); }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!cv.isConnected || !key || !tex[key] || document.hidden) return;
    gl.viewport(0, 0, cv.width, cv.height); gl.bindTexture(gl.TEXTURE_2D, tex[key]);
    gl.uniform1f(U.t, now / 1000); gl.uniform1f(U.speed, u.speed); gl.uniform1f(U.depth, Math.min(1, (window.hudState?.d ?? 0) / 10900));
    gl.uniform1f(U.rip, u.rip); gl.uniform1f(U.ripT, u.ripT); gl.uniform2f(U.ripC, u.ripX, u.ripY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(frame);
  document.body.classList.add("gl");
  return { attach, release, ripple, load, u };
})();
