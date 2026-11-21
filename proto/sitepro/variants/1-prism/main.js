// PRISM: one beam of white light, a glass prism, three bands out.
// Raw WebGL, no library. The whole scene is one fragment shader:
// an analytic ray / prism intersection with dispersive refraction,
// light beams drawn as glowing segments, and a dark reflective floor.

const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const root = document.documentElement;

/* ---------------- Page behaviour (works without WebGL) ---------------- */

const acts = [...document.querySelectorAll("[data-act]")];
const railLinks = [...document.querySelectorAll("[data-rail]")];

function markRail(i) {
  railLinks.forEach((a, j) => {
    if (j === i) a.setAttribute("aria-current", "step");
    else a.removeAttribute("aria-current");
  });
}

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add("is-in");
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
}

const status = document.querySelector(".copy-status");
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = document.getElementById(btn.dataset.copy).textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied";
      status.textContent = `Copied: ${text}`;
    } catch {
      status.textContent = "Copy failed. Select the command and copy it by hand.";
    }
    setTimeout(() => { btn.textContent = "Copy"; }, 1800);
  });
});

/* Where the story is: a float from 0 (hero) to 6 (start). */
function storyPosition() {
  const mid = innerHeight * 0.5;
  const centers = acts.map((el) => {
    const r = el.getBoundingClientRect();
    return r.top + r.height * 0.5;
  });
  if (mid <= centers[0]) return 0;
  for (let i = 0; i < centers.length - 1; i++) {
    if (mid < centers[i + 1]) {
      const f = (mid - centers[i]) / (centers[i + 1] - centers[i]);
      return i + smooth(0.12, 0.88, f);
    }
  }
  return centers.length - 1;
}
function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ---------------- Camera keyframes, one per act ---------------- */
// T: look-at target, yaw / pitch (radians), dist, sx: horizontal shift of the
// frame (fraction of the half width; positive moves the scene right),
// spin: turn of the prism and its light, bands: intensity of tokens, core, catalog.
const KEYS = [
  { T: [1.2, -0.7, 0], yaw: 0.22, pitch: 0.08, dist: 9.0, sx: 0.55, spin: 0.0, bands: [1, 1, 1] },
  { T: [0.6, -0.3, 0], yaw: -0.5, pitch: 0.2, dist: 6.6, sx: 0.5, spin: 0.12, bands: [1.1, 1.1, 1.1] },
  { T: [4.6, -1.3, 0], yaw: 0.32, pitch: 0.16, dist: 6.4, sx: 0.42, spin: 0.18, bands: [1.7, 0.12, 0.12] },
  { T: [4.2, -1.7, 0], yaw: -0.28, pitch: 0.32, dist: 6.4, sx: 0.42, spin: 0.22, bands: [0.12, 1.7, 0.12] },
  { T: [3.6, -2.0, 0], yaw: 0.45, pitch: 0.55, dist: 6.4, sx: 0.42, spin: 0.26, bands: [0.12, 0.12, 1.7] },
  { T: [3.2, -1.6, 0], yaw: -0.2, pitch: 1.05, dist: 12.5, sx: 0.0, spin: 0.15, bands: [1.3, 1.3, 1.3] },
  { T: [1.6, -0.8, 0], yaw: 0.05, pitch: 0.05, dist: 11.0, sx: 0.5, spin: 0.0, bands: [0.9, 0.9, 0.9] },
];

function keyAt(f) {
  const i = Math.min(KEYS.length - 2, Math.floor(f));
  const t = f - i;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const l = (x, y) => x + (y - x) * t;
  return {
    T: a.T.map((v, k) => l(v, b.T[k])),
    yaw: l(a.yaw, b.yaw),
    pitch: l(a.pitch, b.pitch),
    dist: l(a.dist, b.dist),
    sx: l(a.sx, b.sx),
    spin: l(a.spin, b.spin),
    bands: a.bands.map((v, k) => l(v, b.bands[k])),
  };
}

/* ---------------- WebGL ---------------- */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uRo, uF, uR, uU;
uniform vec2 uShift;
uniform float uFocal;
uniform mat3 uRot;
uniform vec3 uBands;
uniform float uIntro;

const float RIN = 0.5;      // inradius of the triangle (circumradius 1)
const float HL = 1.35;      // half length of the prism
const float FLOOR = -3.0;
const vec3 E = vec3(-0.5083, 0.1201, 0.0); // where the beam enters
const vec3 X = vec3( 0.5083, 0.1201, 0.0); // where it leaves
const vec3 DIN = vec3(0.9478, 0.3190, 0.0);
const vec3 WHITE = vec3(1.0, 0.96, 0.92);
const vec3 C0 = vec3(1.0, 0.30, 0.15);
const vec3 C1 = vec3(0.20, 1.0, 0.50);
const vec3 C2 = vec3(0.34, 0.40, 1.0);

float hash3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}

void plane(int i, out vec3 n, out float o){
  if (i == 0) { n = vec3(0.0, -1.0, 0.0); o = RIN; }
  else if (i == 1) { n = vec3(0.8660254, 0.5, 0.0); o = RIN; }
  else if (i == 2) { n = vec3(-0.8660254, 0.5, 0.0); o = RIN; }
  else if (i == 3) { n = vec3(0.0, 0.0, 1.0); o = HL; }
  else { n = vec3(0.0, 0.0, -1.0); o = HL; }
}

bool slab(vec3 ro, vec3 rd, out float tn, out float tf, out vec3 nn, out vec3 nf){
  tn = -1e5; tf = 1e5; nn = vec3(0.0, 1.0, 0.0); nf = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 5; i++) {
    vec3 n; float o; plane(i, n, o);
    float dn = dot(n, rd);
    float num = o - dot(n, ro);
    if (abs(dn) < 1e-6) { if (num < 0.0) return false; continue; }
    float t = num / dn;
    if (dn < 0.0) { if (t > tn) { tn = t; nn = n; } }
    else { if (t < tf) { tf = t; nf = n; } }
  }
  return tn < tf && tf > 0.0;
}

// Second-largest plane distance: near zero on an edge.
float edgeOf(vec3 p){
  float m1 = -1e5; float m2 = -1e5;
  for (int i = 0; i < 5; i++) {
    vec3 n; float o; plane(i, n, o);
    float d = dot(n, p) - o;
    if (d > m1) { m2 = m1; m1 = d; } else if (d > m2) { m2 = d; }
  }
  return m2;
}

// Glow of a segment a..b, widening from w0 to w1, seen along a ray.
float seg(vec3 ro, vec3 rd, vec3 a, vec3 b, float w0, float w1, out float tc, out vec3 q, out float s){
  vec3 v = b - a; vec3 w = ro - a;
  float B = dot(rd, v), C = dot(v, v), D = dot(rd, w), Ee = dot(v, w);
  float den = C - B * B;
  s = den > 1e-6 ? (Ee - B * D) / den : 0.0;
  s = clamp(s, 0.0, 1.0);
  q = a + v * s;
  tc = max(dot(q - ro, rd), 0.0);
  float d = length(ro + rd * tc - q);
  float wd = mix(w0, w1, s);
  float hw = wd * 5.0;
  return exp(-d * d / (wd * wd)) + 0.06 * hw * hw / (d * d + hw * hw);
}

float pointGlow(vec3 ro, vec3 rd, vec3 p, float k){
  vec3 w = p - ro;
  float t = max(dot(w, rd), 0.0);
  float d = length(w - rd * t);
  return k / (d * d + k);
}

float distSeg(vec3 p, vec3 a, vec3 b){
  vec3 v = b - a; float s = clamp(dot(p - a, v) / dot(v, v), 0.0, 1.0);
  return length(p - a - v * s);
}

vec3 bandDir(int i){
  if (i == 0) return vec3(0.9744, -0.2250, 0.0);  // 13 deg
  if (i == 1) return vec3(0.9336, -0.3584, 0.0);  // 21 deg
  return vec3(0.8746, -0.4848, 0.0);              // 29 deg
}
vec3 bandCol(int i){ if (i == 0) return C0; if (i == 1) return C1; return C2; }
float bandK(int i){ if (i == 0) return uBands.x; if (i == 1) return uBands.y; return uBands.z; }
float bandLen(int i){ return (X.y - FLOOR) / -bandDir(i).y; }

vec3 beams(vec3 ro, vec3 rd, float tLim, bool primary){
  vec3 col = vec3(0.0);
  float tc, s; vec3 q;
  float k1 = clamp(uIntro * 1.7, 0.0, 1.0);
  float k2 = clamp(uIntro * 1.7 - 0.75, 0.0, 1.0);

  // Incoming white beam, rising from the floor towards the prism.
  float lin = (E.y - FLOOR) / DIN.y;
  vec3 a = E - DIN * lin;
  float g = seg(ro, rd, a, mix(a, E, k1), 0.022, 0.016, tc, q, s);
  float occ = 1.0 - 0.9 * smoothstep(tLim - 0.03, tLim + 0.03, tc);
  float dust = primary ? 0.6 + 0.8 * noise(q * 3.0 + vec3(-uTime * 0.6, 0.0, uTime * 0.15)) : 1.0;
  col += WHITE * 3.2 * g * occ * dust;

  // Inside the glass: the light is still white, spreading a little.
  if (primary && k1 > 0.99) {
    g = seg(ro, rd, E, X, 0.03, 0.06, tc, q, s);
    col += WHITE * 1.1 * g;
    col += WHITE * 0.9 * pointGlow(ro, rd, E, 0.0016);
    col += vec3(1.0, 0.95, 1.0) * 0.6 * pointGlow(ro, rd, X, 0.0012) * k2;
  }

  // Three bands out.
  for (int i = 0; i < 3; i++) {
    vec3 d = bandDir(i);
    float L = bandLen(i);
    g = seg(ro, rd, X, X + d * L * k2, 0.018, 0.03 + L * 0.011, tc, q, s);
    occ = 1.0 - 0.9 * smoothstep(tLim - 0.03, tLim + 0.03, tc);
    dust = primary ? 0.65 + 0.7 * noise(q * 2.2 + vec3(-uTime * 0.5, uTime * 0.1, 0.0)) : 1.0;
    col += bandCol(i) * 2.0 * bandK(i) * g * occ * dust * step(0.001, k2);
  }
  return col;
}

vec3 bg(vec3 rd){
  vec3 c = mix(vec3(0.006, 0.006, 0.012), vec3(0.018, 0.016, 0.03), smoothstep(-0.3, 0.5, rd.y));
  return c;
}

vec3 envSpec(vec3 r){
  vec3 key = normalize(vec3(-0.45, 0.75, 0.55));
  vec3 c = vec3(1.0, 0.96, 0.9) * pow(max(dot(r, key), 0.0), 60.0) * 4.0;
  c += vec3(0.6, 0.65, 0.9) * pow(max(dot(r, normalize(vec3(0.7, 0.3, 0.6))), 0.0), 30.0) * 1.2;
  c += vec3(0.04, 0.04, 0.07) * max(r.y, 0.0);
  return c;
}

vec3 floorShade(vec3 p, vec3 rd, float t){
  vec3 c = vec3(0.005, 0.005, 0.008);
  float k1 = clamp(uIntro * 1.7, 0.0, 1.0);
  float k2 = clamp(uIntro * 1.7 - 0.75, 0.0, 1.0);
  // Pools of light under the beams, and a splash where each band lands.
  float lin = (E.y - FLOOR) / DIN.y;
  vec3 a = E - DIN * lin;
  float pd = distSeg(p, a, mix(a, E, k1));
  c += WHITE * 0.05 / (1.0 + pd * pd * 10.0);
  c += WHITE * 0.8 * exp(-dot(p - a, p - a) * 6.0) * k1;
  for (int i = 0; i < 3; i++) {
    vec3 d = bandDir(i);
    vec3 e = X + d * bandLen(i) * k2;
    pd = distSeg(p, X, e);
    float kk = bandK(i) * step(0.001, k2);
    c += bandCol(i) * kk * 0.06 / (1.0 + pd * pd * 6.0);
    vec3 dp = p - e; dp.z *= 0.8;
    c += bandCol(i) * kk * smoothstep(0.97, 1.0, k2) * (0.9 * exp(-dot(dp, dp) * 5.0) + 0.12 * exp(-dot(dp, dp) * 0.6));
  }
  // A dim, rough mirror.
  vec3 rr = reflect(rd, vec3(0.0, 1.0, 0.0));
  float fr = 0.05 + 0.5 * pow(1.0 - max(-rd.y, 0.0), 4.0);
  c += beams(p, rr, 1e5, false) * 0.35 * fr;
  // Faint lines, like a polished stage.
  vec2 gp = abs(fract(p.xz * 0.5) - 0.5);
  float line = smoothstep(0.012 * t * 0.15 + 0.004, 0.0, min(gp.x, gp.y));
  c += vec3(0.05, 0.05, 0.08) * line * exp(-t * 0.08);
  float fog = exp(-max(t - 5.0, 0.0) * 0.07);
  return mix(bg(rd), c, fog);
}

vec3 sceneSecondary(vec3 ro, vec3 rd){
  vec3 c = bg(rd) + envSpec(rd) * 0.12;
  if (rd.y < 0.0) {
    float tF = (FLOOR - ro.y) / rd.y;
    vec3 p = ro + rd * tF;
    c = mix(bg(rd), vec3(0.006), exp(-tF * 0.05));
  }
  return c + beams(ro, rd, 1e5, false);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv0 = (frag - 0.5 * uRes) / uRes.y;
  vec2 uv = uv0 - uShift;
  vec3 rdw = normalize(uF * uFocal + uv.x * uR + uv.y * uU);
  vec3 ro = uRot * uRo;
  vec3 rd = uRot * rdw;

  float tn, tf; vec3 nn, nf;
  bool hit = slab(ro, rd, tn, tf, nn, nf) && tn > 0.0;
  float tP = hit ? tn : 1e5;
  float tFl = rd.y < 0.0 ? (FLOOR - ro.y) / rd.y : 1e5;

  vec3 col = bg(rd);
  if (tFl > 0.0 && tFl < tP) col = floorShade(ro + rd * tFl, rd, tFl);

  if (hit) {
    vec3 p = ro + rd * tn;
    vec3 n = nn;
    float cosi = clamp(dot(-rd, n), 0.0, 1.0);
    float fr = 0.04 + 0.96 * pow(1.0 - cosi, 5.0);
    vec3 refl = envSpec(reflect(rd, n));
    vec3 tr = vec3(0.0);
    for (int c = 0; c < 3; c++) {
      float ior = c == 0 ? 1.44 : (c == 1 ? 1.50 : 1.57);
      vec3 ri = refract(rd, n, 1.0 / ior);
      float a, b; vec3 n1, n2;
      slab(p + ri * 0.002, ri, a, b, n1, n2);
      vec3 pe = p + ri * (b + 0.002);
      vec3 ro2 = refract(ri, -n2, ior);
      vec3 sc;
      if (dot(ro2, ro2) < 0.01) {
        // Total internal reflection: bounce once more inside the glass.
        vec3 rb = reflect(ri, -n2);
        slab(pe + rb * 0.002, rb, a, b, n1, n2);
        vec3 pb = pe + rb * (b + 0.002);
        vec3 ro3 = refract(rb, -n2, ior);
        sc = dot(ro3, ro3) < 0.01 ? vec3(0.006, 0.007, 0.012) : sceneSecondary(pb, ro3) * 0.85;
      } else {
        sc = sceneSecondary(pe, ro2);
      }
      if (c == 0) tr.r = sc.r; else if (c == 1) tr.g = sc.g; else tr.b = sc.b;
    }
    vec3 glass = tr * vec3(0.9, 0.94, 1.0) * (1.0 - fr) + refl * fr;
    glass += vec3(0.006, 0.007, 0.012);
    float e = edgeOf(p);
    float edge = smoothstep(-0.035, -0.002, e);
    float lightNear = exp(-length(p.xy - vec2(0.0, 0.12)) * 1.4);
    glass += mix(vec3(0.5, 0.55, 0.75), vec3(1.0, 0.95, 0.9), lightNear) * edge * (0.22 + 0.9 * lightNear + fr);
    glass += vec3(0.55, 0.6, 0.85) * fr * 0.12;
    col = glass;
  }

  col += beams(ro, rd, min(tP, tFl), true);

  // Tone map, vignette, grain.
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(1.0 / 2.2));
  col *= 1.0 - 0.28 * dot(uv0, uv0);
  col += (hash3(vec3(frag, fract(uTime) * 97.0)) - 0.5) * 0.028;
  gl_FragColor = vec4(col, 1.0);
}
`;

const canvas = document.getElementById("scene");
let gl = null;
try {
  gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
} catch { gl = null; }

let program = null;
const U = {};

function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("PRISM: shader did not compile, showing the still drawing.", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function setup() {
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;
  program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("PRISM: program did not link.", gl.getProgramInfoLog(program));
    return false;
  }
  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  for (const n of ["uRes", "uTime", "uRo", "uF", "uR", "uU", "uShift", "uFocal", "uRot", "uBands", "uIntro"]) {
    U[n] = gl.getUniformLocation(program, n);
  }
  return true;
}

/* Quality: device pixel ratio capped at 1.5, scaled down when frames run long. */
let scale = 1;
const DPR_CAP = 1.5;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * scale;
  const w = Math.max(1, Math.round(innerWidth * dpr));
  const h = Math.max(1, Math.round(innerHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// The world-to-scene rotation: the turn of the prism and its light, plus the pointer tilt.
function rotation(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  const cz = Math.cos(roll), sz = Math.sin(roll);
  // M = Ry * Rx * Rz (object), we upload its inverse = transpose.
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
  const Rz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((row, i) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
  const M = mul(mul(Ry, Rx), Rz);
  // inverse = M^T; GLSL wants column-major, and the columns of M^T are the rows of M.
  return new Float32Array([M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]]);
}

const state = keyAt(0);
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let intro = reduce.matches ? 1 : 0;
let last = performance.now();
let start = last;
let raf = 0;
let frames = 0;
let acc = 0;

function draw(now, still) {
  const time = still ? 4.0 : (now - start) / 1000;
  const k = still ? keyAt(0) : state;
  const aspect = innerWidth / innerHeight;
  const wide = aspect > 1.05;

  let dist = k.dist;
  let shift = [0, 0];
  if (wide) {
    shift = [k.sx * aspect * 0.5, 0];
  } else {
    dist *= 1.25 + (1.05 - aspect) * 0.5;
    shift = [0, 0.2];
  }

  const T = [...k.T];
  if (!wide) { T[0] = T[0] * 0.3 + 0.15; }
  const ro = [
    T[0] + dist * Math.cos(k.pitch) * Math.sin(k.yaw),
    T[1] + dist * Math.sin(k.pitch),
    T[2] + dist * Math.cos(k.pitch) * Math.cos(k.yaw),
  ];
  const f = norm(sub(T, ro));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);

  const bob = still ? 0 : Math.sin(time * 0.5) * 0.03;
  const rot = rotation(k.spin + pointer.x * 0.18, pointer.y * 0.1 + bob, bob * 0.5);

  gl.uniform2f(U.uRes, canvas.width, canvas.height);
  gl.uniform1f(U.uTime, time);
  gl.uniform3fv(U.uRo, ro);
  gl.uniform3fv(U.uF, f);
  gl.uniform3fv(U.uR, r);
  gl.uniform3fv(U.uU, u);
  gl.uniform2fv(U.uShift, shift);
  gl.uniform1f(U.uFocal, 1.65);
  gl.uniformMatrix3fv(U.uRot, false, rot);
  gl.uniform3fv(U.uBands, k.bands);
  gl.uniform1f(U.uIntro, still ? 1 : intro);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  intro = Math.min(1, intro + dt / 2.2);
  const target = keyAt(storyPosition());
  const a = 1 - Math.exp(-dt * 3.2);
  state.T = state.T.map((v, i) => v + (target.T[i] - v) * a);
  for (const key of ["yaw", "pitch", "dist", "sx", "spin"]) state[key] += (target[key] - state[key]) * a;
  state.bands = state.bands.map((v, i) => v + (target.bands[i] - v) * a);
  pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 2.5));
  pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 2.5));

  draw(now, false);

  // Adapt the resolution to keep the frame rate.
  frames++;
  acc += dt;
  if (frames >= 40) {
    const ms = (acc / frames) * 1000;
    if (ms > 22 && scale > 0.45) { scale = Math.max(0.45, scale * 0.82); resize(); }
    else if (ms < 13 && scale < 1) { scale = Math.min(1, scale * 1.1); resize(); }
    frames = 0;
    acc = 0;
  }
}

function startLoop() {
  if (raf || reduce.matches || document.hidden) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
function stopLoop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

function still() {
  stopLoop();
  resize();
  draw(performance.now(), true);
}

if (gl && setup()) {
  resize();
  root.classList.add("gl");
  if (reduce.matches) still();
  else startLoop();

  addEventListener("resize", () => { resize(); if (reduce.matches) still(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopLoop(); else startLoop(); });
  reduce.addEventListener("change", () => { if (reduce.matches) still(); else { intro = 1; startLoop(); } });
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stopLoop();
    root.classList.remove("gl");
  });
}

/* The rail follows the story, with or without WebGL. */
let railRaf = 0;
function updateRail() {
  railRaf = 0;
  markRail(Math.round(storyPosition()));
}
addEventListener("scroll", () => { if (!railRaf) railRaf = requestAnimationFrame(updateRail); }, { passive: true });
updateRail();
