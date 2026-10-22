// "Qattoura climbs to the cloud": a short 3D game about condensation for Grade 3.
// Three stations, each ending in a gate challenge and a golden card with one key phrase:
//   1. rising        -> where: high up, in the sky
//   2. the cold layer -> why: the water vapour cools
//   3. the change     -> what: from water vapour (gas) to liquid water, forming a cloud
// Two kinds of reward: coins buy things Qattoura wears (the cloud shop), and stars are earned by how the pupil plays.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STARS, MAX_BANK, loadState, saveState, resetState, earnedStars } from './save.js';
import { GOODS, applyWorn, setOpacity as setWardrobeOpacity, renderThumbs } from './wardrobe.js';

const $ = (id) => document.getElementById(id);
const ar = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const POINTS = { arrow: 5, cold: 10, drop: 10, heat: -5, gateFirst: 30, gateSecond: 15 };
const MAX_RUN = 310;                       // 8 arrows, 8 cold crystals, 10 drops and three gates at the first try

const STATIONS = [
  {
    good: 'arrow', bad: 'lowcloud', need: 8, every: 0.78, badChance: 0.28,
    mission: (n, need) => `اجمع أسهم الصعود: ${ar(n)} / ${ar(need)}`,
    hello: 'أنا بخار ماء! ساعدني لأصعد إلى الأعلى',
    gate: { title: 'بوابة المحطة الأولى', q: 'أين يحدث التكثف؟', right: 'في الأعلى، في السماء', wrong: 'عند سطح البحر',
            rightPic: { img: 'gate/sky.webp' }, wrongPic: { img: 'gate/sea.webp' },
            hint: 'تذكّر: إلى أين صعدنا الآن؟',
            why: 'عند سطح البحر يحدث التبخر. أما التكثف فيحدث في الأعلى، في السماء.' },
    card: { label: 'المكان', phrase: 'في الأعلى، في السماء' },
    badge: { icon: '🚀', name: 'بطاقة الصعود الذهبية' }
  },
  {
    good: 'cold', bad: 'heat', need: 8, every: 0.72, badChance: 0.3,
    mission: (n, need) => `برّد بخار الماء: ${ar(n)} / ${ar(need)}`,
    hello: 'الهواء هنا بارد! اجمع بلورات البرودة وابتعد عن الحرارة',
    gate: { title: 'بوابة المحطة الثانية', q: 'يتكثف بخار الماء عندما…', right: 'يبرد', wrong: 'يسخن',
            rightPic: { icons: ['❄️', '🥶'], tone: 'cold' }, wrongPic: { icons: ['☀️', '🥵'], tone: 'hot' },
            hint: 'تذكّر: ماذا جمعنا حتى انخفض مقياس الحرارة؟',
            why: 'التسخين يحوّل الماء السائل إلى بخار ماء، وهذا هو التبخر. أما التكثف فيحدث عندما يبرد بخار الماء.' },
    card: { label: 'السبب', phrase: 'يبرد بخار الماء' },
    badge: { icon: '❄️', name: 'بطاقة البرودة الذهبية' }
  },
  {
    good: 'drop', bad: null, need: 10, every: 0.6, badChance: 0,
    mission: (n, need) => `اجمع قطرات الماء: ${ar(n)} / ${ar(need)}`,
    hello: 'بردتُ فتحوّلتُ إلى قطرة ماء سائلة! هذا هو التكثف',
    gate: { title: 'بوابة المحطة الثالثة', q: 'في التكثف يتحول الماء…', right: 'من غاز إلى سائل', wrong: 'من سائل إلى غاز',
            rightPic: { icons: ['💨', '⬅️', '💧'], tone: 'cold' }, wrongPic: { icons: ['💧', '⬅️', '💨'], tone: 'hot' },
            hint: 'تذكّر: كنتُ بخار ماء، وماذا صرتُ بعد أن بردت؟',
            why: 'من سائل إلى غاز هو التبخر. أما في التكثف فيتحول بخار الماء (غاز) إلى ماء سائل.' },
    card: { label: 'التحول', phrase: 'من بخار ماء (غاز) إلى ماء سائل' },
    badge: { icon: '☁️', name: 'بطاقة الغيمة الذهبية' }
  }
];

// what the pupil keeps between runs: coin bank, things bought and worn, stars
let state = loadState(GOODS);

// ---------------------------------------------------------------- scene
// The canvas is see-through: the sky is a CSS gradient behind it that changes with the station.
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
const CAM_Y = 1.2, CAM_Z = 9.5;
const SHOP_Y = -2.62, SHOP_Z = 5.9;           // close-up that keeps Qattoura in the upper part of the screen
// on a wide screen the shop counter fills the right half and Qattoura stands big in the middle of the left half
const SHOP_WIDE_Y = -1.25, SHOP_WIDE_Z = 3.3;
function shopView() {
  const wide = camera.aspect >= 1.25;
  const z = wide ? SHOP_WIDE_Z : SHOP_Z;
  const x = wide ? Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * z * camera.aspect * 0.5 : 0;
  return { x, y: wide ? SHOP_WIDE_Y : SHOP_Y, z };
}
camera.position.set(0, CAM_Y, CAM_Z);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9fc8f0, 1.5));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
sun.position.set(-4, 8, 6);
scene.add(sun);
const rim = new THREE.DirectionalLight(0xbfe4ff, 0.7);
rim.position.set(5, 2, -6);
scene.add(rim);

let halfW = 3, halfH = 5, bound = 2;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAM_Z;
  halfW = halfH * camera.aspect;
  bound = Math.max(1.1, Math.min(3.4, halfW - 0.8));
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- things in the sky
const std = (color, emissive, intensity = 0.4, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.4, ...extra });

function softDot(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, alpha]) => g.addColorStop(at, `rgba(255,255,255,${alpha})`));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// a small white picture drawn on a canvas, used as a particle
function drawn(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.translate(size / 2, size / 2);
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  paint(ctx, size / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const TEX = {
  glow: softDot(128, [[0, 0.9], [0.35, 0.4], [1, 0]]),
  mote: softDot(48, [[0, 1], [0.5, 0.7], [1, 0]]),
  crystal: drawn(64, (ctx, r) => {           // a snow crystal: six arms, each with two side twigs
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.86);
      ctx.moveTo(0, -r * 0.5); ctx.lineTo(r * 0.22, -r * 0.7);
      ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 0.22, -r * 0.7);
      ctx.stroke();
    }
  }),
  droplet: drawn(64, (ctx, r) => {           // a tiny drop: pointed at the top, round at the bottom
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.bezierCurveTo(r * 0.75, -r * 0.05, r * 0.6, r * 0.8, 0, r * 0.8);
    ctx.bezierCurveTo(-r * 0.6, r * 0.8, -r * 0.75, -r * 0.05, 0, -r * 0.9);
    ctx.fill();
  })
};

function arrowGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 1); s.lineTo(0.62, 0.22); s.lineTo(0.24, 0.22); s.lineTo(0.24, -1);
  s.lineTo(-0.24, -1); s.lineTo(-0.24, 0.22); s.lineTo(-0.62, 0.22); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 });
  g.center();
  return g;
}
const GEO = {
  arrow: arrowGeometry(),
  bar: new THREE.BoxGeometry(1.15, 0.13, 0.13),
  gem: new THREE.IcosahedronGeometry(0.2, 0),
  ball: new THREE.SphereGeometry(1, 20, 14),
  drop: (() => {
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const th = Math.PI * (1 - i / 22), c = Math.cos(th);
      pts.push(new THREE.Vector2(0.4 * Math.sin(th) * Math.pow(Math.sin(th / 2), 0.85) * 1.32, c > 0 ? 0.82 * c : 0.5 * c));
    }
    return new THREE.LatheGeometry(pts, 24);
  })()
};
const MAT = {
  arrow: std(0x8fdcff, 0x35a8ee, 0.7),
  cold: std(0xffffff, 0x9fdcff, 0.9),
  heatShaft: std(0xff9a12, 0xff7a00, 1.2),
  heat: std(0xff3b1f, 0xff2200, 1.3),
  lowcloud: std(0xe8eef5, 0x9fb4c8, 0.25, { roughness: 1 }),
  drop: std(0x2aa9ff, 0x1479e0, 0.45, { roughness: 0.15 }),
  cloud: std(0xffffff, 0xdcebff, 0.35, { roughness: 1, transparent: true, opacity: 0.55 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
};
const halo = (color, opacity) => new THREE.SpriteMaterial({ map: TEX.glow, color, transparent: true, opacity, depthWrite: false,
  blending: THREE.AdditiveBlending });
const HALO = { arrow: halo(0xa8e6ff, 0.75), cold: halo(0xffffff, 0.8), heat: halo(0xff8a4a, 0.75), drop: halo(0x8fd0ff, 0.7) };

function makeItem(type) {
  const g = new THREE.Group();
  if (HALO[type]) {
    const h = new THREE.Sprite(HALO[type]);
    h.scale.setScalar(type === 'heat' ? 2.1 : 2.4); h.position.z = -0.3;
    g.add(h);
  }
  if (type === 'arrow') {
    const m = new THREE.Mesh(GEO.arrow, MAT.arrow); m.scale.setScalar(0.55); g.add(m);
  } else if (type === 'cold') {
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(GEO.bar, MAT.cold); b.rotation.z = (k * Math.PI) / 3; g.add(b); }
    g.add(new THREE.Mesh(GEO.gem, MAT.cold));
  } else if (type === 'heat') {
    const m = new THREE.Mesh(GEO.arrow, MAT.heat); m.scale.set(0.5, 0.62, 0.5); m.rotation.z = Math.PI; g.add(m);
    const glow = new THREE.Mesh(GEO.ball, MAT.heatShaft); glow.scale.set(0.2, 0.2, 0.2); glow.position.y = 0.72; g.add(glow);
  } else if (type === 'lowcloud') {
    [[0, 0, 0.55], [-0.6, -0.08, 0.4], [0.62, -0.06, 0.42]].forEach(([x, y, r]) => {
      const b = new THREE.Mesh(GEO.ball, MAT.lowcloud); b.position.set(x, y, 0); b.scale.set(r, r * 0.8, r * 0.8); g.add(b);
    });
  } else if (type === 'drop') {
    const m = new THREE.Mesh(GEO.drop, MAT.drop); m.scale.setScalar(0.8); g.add(m);
  }
  g.userData.type = type;
  return g;
}

// soft clouds far behind, for depth
const backdrop = [];
for (let i = 0; i < 9; i++) {
  const g = new THREE.Group();
  [[0, 0, 1], [-1.1, -0.15, 0.72], [1.15, -0.12, 0.78], [0.3, 0.45, 0.7]].forEach(([x, y, r]) => {
    const b = new THREE.Mesh(GEO.ball, MAT.cloud); b.position.set(x, y, 0); b.scale.set(r, r * 0.8, r * 0.7); g.add(b);
  });
  g.position.set((Math.random() - 0.5) * 26, Math.random() * 28 - 10, -9 - Math.random() * 9);
  g.scale.setScalar(0.7 + Math.random() * 0.8);
  scene.add(g); backdrop.push(g);
}

// One light layer of floating specks that changes with the station:
// vapour motes that rise, then snow crystals that drift down, then tiny drops that fall.
// vy is the speed up the screen; sway is how far a speck swings from side to side.
const SPECKS = 70, SPECK_SPAN = 26;
const speckLook = [
  { map: TEX.mote, color: 0xffffff, size: 0.18, opacity: 0.6, vy: 0.9, sway: 0.25 },
  { map: TEX.crystal, color: 0xf2fbff, size: 0.34, opacity: 0.95, vy: -0.8, sway: 0.5 },
  { map: TEX.droplet, color: 0x8fcfff, size: 0.26, opacity: 0.85, vy: -2.4, sway: 0 }
];
let speckNow = speckLook[0];
const speckPos = new Float32Array(SPECKS * 3);
for (let i = 0; i < SPECKS; i++) {
  speckPos[i * 3] = (Math.random() - 0.5) * 18;
  speckPos[i * 3 + 1] = CAM_Y + (Math.random() - 0.5) * SPECK_SPAN;
  speckPos[i * 3 + 2] = -1 - Math.random() * 6;
}
const speckGeo = new THREE.BufferGeometry();
speckGeo.setAttribute('position', new THREE.BufferAttribute(speckPos, 3));
const speckX0 = Float32Array.from({ length: SPECKS }, (_, i) => speckPos[i * 3]);
const speckMat = new THREE.PointsMaterial({ transparent: true, depthWrite: false });
function setSpecks(i) {
  speckNow = speckLook[i];
  speckMat.map = speckNow.map; speckMat.color.set(speckNow.color); speckMat.size = speckNow.size; speckMat.opacity = speckNow.opacity;
  speckMat.needsUpdate = true;
}
setSpecks(0);
const specks = new THREE.Points(speckGeo, speckMat);
specks.frustumCulled = false;
scene.add(specks);

// little sparks when something is collected
const sparks = [];
function burst(pos, color) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(GEO.gem, MAT.spark.clone());
    m.material.color.set(color); m.scale.setScalar(0.45);
    m.position.copy(pos);
    const a = (i / 8) * Math.PI * 2;
    m.userData = { vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, life: 0.5 };
    scene.add(m); sparks.push(m);
  }
}

// "+5" labels that float up from the place where coins were won or lost
const floatPool = [];
const projected = new THREE.Vector3();
function floatLabel(pos, n) {
  let el = floatPool.find((f) => !f.busy);
  if (!el) {
    if (floatPool.length >= 8) { return; }
    el = document.createElement('div'); el.className = 'float'; $('hud').appendChild(el); floatPool.push(el);
  }
  projected.copy(pos).project(camera);
  el.style.left = ((projected.x + 1) / 2) * window.innerWidth + 'px';
  el.style.top = ((1 - projected.y) / 2) * window.innerHeight + 'px';
  el.innerHTML = (n > 0 ? '+' : '−') + ar(Math.abs(n)) + ' <i class="coin"></i>';
  el.classList.toggle('minus', n < 0);
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  el.busy = true;
  setTimeout(() => { el.busy = false; el.classList.remove('go'); }, 850);
}

// ---------------------------------------------------------------- Qattoura and her cloud
const player = new THREE.Group();
player.position.set(0, -1.9, 0);
scene.add(player);
let mixer = null, playerMeshes = [], model = null, thumbs = {};
const bigCloud = new THREE.Group();
bigCloud.position.set(0, -1.4, -1.3);
bigCloud.scale.setScalar(0.001);
scene.add(bigCloud);

function setPlayerOpacity(o) {
  playerMeshes.forEach((m) => { m.material.transparent = o < 0.999; m.material.opacity = o; m.material.depthWrite = true; });
  setWardrobeOpacity(o);
}
const smileParts = [];
function dress() { if (model) { applyWorn(model, state.worn); } }

const loader = new GLTFLoader();
const load = (url) => new Promise((ok, bad) => loader.load(url, ok, undefined, bad));
Promise.all([load('models/qattoura.glb'), load('models/cloud.glb')]).then(([drop, cloud]) => {
  model = drop.scene;
  model.scale.setScalar(0.62);
  model.position.y = 0.75;
  model.traverse((n) => { if (n.isMesh) { n.material = n.material.clone(); playerMeshes.push(n); } });
  // the mouth and tongue can open into a big laugh in the shop: move their pivot to the middle of the mouth
  const mouth = playerMeshes.find((n) => n.material.name === 'mouth');
  if (mouth) {
    mouth.geometry.computeBoundingBox();
    const mc = mouth.geometry.boundingBox.getCenter(new THREE.Vector3());
    playerMeshes.filter((n) => n.material.name === 'mouth' || n.material.name === 'tongue').forEach((n) => {
      n.geometry.translate(-mc.x, -mc.y, -mc.z); n.position.add(mc); smileParts.push(n);
    });
  }
  player.add(model);
  mixer = new THREE.AnimationMixer(model);
  drop.animations.forEach((c) => mixer.clipAction(c).play());
  cloud.scene.scale.setScalar(1.5);
  bigCloud.add(cloud.scene);
  thumbs = renderThumbs();
  dress();
  $('loading').textContent = '';
  $('startBtn').disabled = false;
  $('miniShop').disabled = false;
}).catch(() => { $('loading').textContent = 'تعذّر تحميل اللعبة. تأكد من الاتصال بالإنترنت ثم أعد تحميل الصفحة.'; });

// ---------------------------------------------------------------- sound (made in code, no files)
let audio = null;
function wakeAudio() {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } }
}
function beep(freq, dur = 0.12, type = 'sine', when = 0, gain = 0.16) {
  if (!audio) { return; }
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = type; o.frequency.value = freq;
  const t = audio.currentTime + when;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  good: () => { beep(880, 0.09); beep(1320, 0.12, 'sine', 0.07); },
  bad: () => beep(170, 0.25, 'sawtooth', 0, 0.1),
  wrong: () => { beep(240, 0.14, 'square', 0, 0.09); beep(190, 0.2, 'square', 0.13, 0.09); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.2, 'triangle', i * 0.11)),
  change: () => [392, 523, 659, 784, 988, 1175].forEach((f, i) => beep(f, 0.16, 'sine', i * 0.08)),
  tap: () => beep(660, 0.07, 'triangle', 0, 0.1)
};

// ---------------------------------------------------------------- game state
// peak: the highest progress reached in this station. Coins are paid only above it, so progress that a heat ray
// took away cannot be collected again for more coins.
const S = { mode: 'start', station: 0, got: 0, peak: 0, score: 0, tries: 0, spawnT: 0, slowT: 0, lockT: 0, targetX: 0, time: 0,
            badges: [], firstTries: 0, heatHits: 0, cloudHits: 0, shopFrom: 'end' };
const items = [];
let bubbleTimer = 0;

function say(text, secs = 2.6) {
  const b = $('bubble'); b.textContent = text; b.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove('show'), secs * 1000);
}
function addScore(n) {
  S.score = Math.min(MAX_RUN, Math.max(0, S.score + n));
  $('scoreNum').textContent = ar(S.score);
  const el = $('score'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
const PANELS = ['start', 'story', 'gate', 'card', 'end', 'shop', 'boardPanel'];
function showPanel(id) { PANELS.forEach((p) => $(p).classList.toggle('show', p === id)); }
function setSky(n) { document.body.dataset.sky = String(n); }
function hud() {
  const st = STATIONS[S.station];
  $('mission').textContent = st.mission(S.got, st.need);
  [1, 2, 3].forEach((n) => {
    const el = $('st' + n);
    el.classList.toggle('on', n - 1 === S.station);
    el.classList.toggle('done', n - 1 < S.station);
  });
  const th = $('thermo');
  th.style.display = S.station === 1 ? 'block' : 'none';
  if (S.station === 1) {
    const f = $('thermoFill');
    f.style.height = Math.max(6, (1 - S.got / st.need) * 100) + '%';
    f.style.background = S.got >= 5 ? 'linear-gradient(#5cc8ff, #2a8fe0)' : 'linear-gradient(#ff5a36, #ffb13d)';
  }
}
function clearItems() { items.forEach((it) => scene.remove(it)); items.length = 0; }

function startStation(i) {
  S.station = i; S.got = 0; S.peak = 0; S.tries = 0; S.spawnT = 0.6; S.slowT = 0; S.mode = 'play';
  clearItems(); showPanel(null); hud(); setSky(i + 1);
  setSpecks(i);
  const st = STATIONS[i];
  if (i === 2) {
    // The change: Qattoura was cooled, so the vapour becomes a clear drop of liquid water.
    S.lockT = 1.8; S.changeT = 0; sfx.change();
  } else { S.lockT = 0; }
  say(st.hello, 3.6);
}

function missionDone() {
  S.mode = 'gate';
  clearItems();
  const st = STATIONS[S.station], g = st.gate;
  $('gateTitle').textContent = g.title;
  $('gateQ').textContent = g.q;
  $('hintLine').textContent = ''; $('hintLine').className = '';
  const box = $('gateOpts'); box.innerHTML = '';
  const opts = [{ t: g.right, ok: true, pic: g.rightPic }, { t: g.wrong, ok: false, pic: g.wrongPic }];
  if (Math.random() < 0.5) { opts.reverse(); }
  opts.forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt';
    // a picture on every choice, so a pupil who cannot read yet can still choose by the picture
    const pic = document.createElement('span'); pic.className = 'pic' + (o.pic && o.pic.tone ? ' ' + o.pic.tone : '');
    if (o.pic && o.pic.img) { const im = document.createElement('img'); im.src = o.pic.img; im.alt = ''; pic.appendChild(im); }
    else if (o.pic && o.pic.icons) { pic.classList.add('n' + o.pic.icons.length); o.pic.icons.forEach((ic) => { const s = document.createElement('i'); s.textContent = ic; pic.appendChild(s); }); }
    const tx = document.createElement('span'); tx.className = 'tx'; tx.textContent = o.t;
    b.append(pic, tx);
    b.addEventListener('click', () => answer(o.ok, b));
    box.appendChild(b);
  });
  showPanel('gate');
}

function answer(ok, btn) {
  if (S.mode !== 'gate') { return; }
  const st = STATIONS[S.station];
  if (!ok) {
    S.tries++; sfx.wrong();
    btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong');
    // immediate corrective feedback: say why this choice is wrong, then give a hint and let the pupil retry
    $('hintLine').className = 'fb';
    $('hintLine').innerHTML = '✖ ' + st.gate.why + '<br>💧 ' + st.gate.hint + ' حاول مرة أخرى.';
    return;
  }
  if (S.tries === 0) { S.firstTries++; }
  addScore(S.tries === 0 ? POINTS.gateFirst : POINTS.gateSecond);
  S.badges.push(st.badge);
  sfx.win();
  $('cardBadge').textContent = st.badge.icon;
  $('cardBadgeName').textContent = 'حصلتَ على ' + st.badge.name;
  $('cardLabel').textContent = st.card.label + ':';
  $('cardPhrase').textContent = st.card.phrase;
  $('cardBtn').textContent = S.station < 2 ? 'إلى المحطة التالية' : 'شاهد النتيجة';
  S.mode = 'card';
  showPanel('card');
}

// ---------------------------------------------------------------- the stars board
// compact: smaller cells for the end screen. A star not yet earned always says how to earn it.
function drawBoard(box, fresh = [], compact = false) {
  box.innerHTML = '';
  box.classList.toggle('compact', compact);
  STARS.forEach((st) => {
    const has = state.stars.includes(st.id);
    const d = document.createElement('div');
    d.className = 'star' + (has ? ' on' : '') + (fresh.includes(st.id) ? ' new' : '');
    const icon = document.createElement('i'); icon.className = 'st';
    const name = document.createElement('b'); name.textContent = st.name;
    const how = document.createElement('small'); how.textContent = has ? 'حصلتَ عليها ✔' : st.how;
    d.append(icon, name);
    if (!compact || !has) { d.append(how); }
    box.appendChild(d);
  });
}
function starCount() { return ar(state.stars.length) + ' / ' + ar(STARS.length); }

// the end of a run: bank the coins once, then give the stars that this run earned
function finishRun() {
  state.runs++;
  state.bank = Math.min(MAX_BANK, state.bank + S.score);
  const run = { finished: true, firstTries: S.firstTries, heatHits: S.heatHits, cloudHits: S.cloudHits, score: S.score };
  const fresh = earnedStars(run, state).filter((id) => !state.stars.includes(id));
  state.stars.push(...fresh);
  saveState(state);
  $('final').innerHTML = 'قطعك في هذه الرحلة: ' + ar(S.score) + ' <i class="coin"></i>';
  // the golden cards she won, drawn as small gold cards on top of the stars board
  $('badges').innerHTML = S.badges.map((b) => '<span class="goldmini"><i>' + b.icon + '</i><small>' + b.name.replace('بطاقة ', '').replace(' الذهبية', '') + '</small></span>').join('');
  $('endStarsTitle').textContent = fresh.length
    ? 'ربحتَ ' + (fresh.length === 1 ? 'نجمة جديدة!' : fresh.length === 2 ? 'نجمتين جديدتين!' : ar(fresh.length) + ' نجوم جديدة!')
    : 'لوحة النجوم: ' + starCount();
  drawBoard($('endBoard'), fresh, true);
  $('hud').hidden = true;
  $('end').scrollTop = 0;
  showPanel('end');
}

$('cardBtn').addEventListener('click', () => {
  if (S.mode !== 'card') { return; }
  if (S.station < 2) { startStation(S.station + 1); return; }
  S.mode = 'end';
  finishRun();
});

function begin() {
  wakeAudio();
  S.score = 0; S.badges = []; S.targetX = 0; S.firstTries = 0; S.heatHits = 0; S.cloudHits = 0; S.grow = 0.5;
  player.position.x = 0; player.rotation.y = 0;
  bigCloud.scale.setScalar(0.001);
  setPlayerOpacity(0.38);
  $('scoreNum').textContent = ar(0);
  $('hud').hidden = false;
  startStation(0);
}
function intro() {
  wakeAudio();
  $('hud').hidden = true;
  showPanel('story');
}
$('startBtn').addEventListener('click', intro);
$('goBtn').addEventListener('click', begin);
// From the end screen the pupil replays at once. From the start screen the game still opens with the AR recap.
$('againBtn').addEventListener('click', () => (S.shopFrom === 'start' ? intro() : begin()));

// ---------------------------------------------------------------- the cloud shop
// Coins buy things that Qattoura wears. She keeps them on in the next run.
function drawShop() {
  $('walletNum').textContent = ar(state.bank);
  const box = $('goods'); box.innerHTML = '';
  GOODS.forEach((gd) => {
    const has = state.owned.includes(gd.id), on = state.worn.includes(gd.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'good' + (on ? ' on' : has ? ' own' : state.bank < gd.price ? ' poor' : '');
    const pic = thumbs[gd.id] ? document.createElement('img') : document.createElement('span');
    pic.className = 'ic';
    if (thumbs[gd.id]) { pic.src = thumbs[gd.id]; pic.alt = ''; } else { pic.style.background = gd.tint; }
    const name = document.createElement('span'); name.className = 'nm'; name.textContent = gd.name;
    const tag = document.createElement('span'); tag.className = 'pr';
    if (on) { tag.textContent = 'تلبسها ✔'; } else if (has) { tag.textContent = 'البسها'; } else { tag.innerHTML = ar(gd.price) + ' <i class="coin"></i>'; }
    b.append(pic, name, tag);
    b.addEventListener('click', () => pick(gd));
    box.appendChild(b);
  });
}
function wear(gd) {
  // one thing per place: a crown takes the hat off, a scarf takes the bow off
  state.worn = state.worn.filter((id) => GOODS.find((g) => g.id === id).slot !== gd.slot);
  state.worn.push(gd.id);
}
function pick(gd) {
  if (S.mode !== 'shop') { return; }
  const msg = $('shopMsg');
  if (state.owned.includes(gd.id)) {
    if (state.worn.includes(gd.id)) {
      state.worn = state.worn.filter((id) => id !== gd.id);
      msg.textContent = 'خلعت قطّورة ' + gd.name + '.';
    } else {
      wear(gd);
      msg.textContent = 'لبست قطّورة ' + gd.name + '!';
    }
    sfx.tap();
  } else if (state.bank < gd.price) {
    sfx.wrong();
    msg.textContent = 'ينقصك ' + ar(gd.price - state.bank) + ' قطعة نقدية. العب مرة أخرى لتجمع أكثر!';
    return;
  } else {
    state.bank -= gd.price; state.owned.push(gd.id); wear(gd); sfx.win();
    msg.textContent = 'اشتريتَ ' + gd.name + '! 🎉';
  }
  saveState(state);
  dress();
  renderer.render(scene, camera);     // the new piece shows on her at once
  drawShop();
}
function shopTab(which) {
  const goods = which === 'goods';
  $('tabGoods').classList.toggle('on', goods);
  $('tabStars').classList.toggle('on', !goods);
  $('goods').hidden = !goods;
  $('shopStars').hidden = goods;
  $('shopMsg').textContent = goods ? 'اختر ما تلبسه قطّورة بقطعك النقدية' : 'النجوم لا تُشترى. تربحها بلعبك الجيد: ' + starCount();
  if (!goods) { drawBoard($('shopStars')); }
  $('sheet').scrollTop = 0;
}
function openShop(from) {
  if (!model) { return; }
  S.shopFrom = from;
  $('shopBack').hidden = from !== 'start';
  wakeAudio();
  S.mode = 'shop'; S.targetX = 0;
  clearItems();
  $('hud').hidden = true;
  setSky(3);
  $('againBtn').textContent = from === 'end' ? '🔄 العب مرة أخرى لتجمع قطعاً أكثر' : '▶ العب لتجمع القطع النقدية';
  drawShop();
  shopTab('goods');
  showPanel('shop');
  // show Qattoura in her shop pose at once, without waiting for the camera to glide there
  { const v = shopView(); camera.position.set(v.x, v.y, v.z); }
  player.position.x = 0; player.scale.setScalar(1); setPlayerOpacity(1);
  bigCloud.scale.setScalar(1); bigCloud.position.x = 0;
  dress();
  renderer.render(scene, camera);
}
$('shopBtn').addEventListener('click', () => openShop('end'));
$('miniShop').addEventListener('click', () => openShop('start'));
$('shopBack').addEventListener('click', () => { S.mode = 'start'; showPanel('start'); });
$('tabGoods').addEventListener('click', () => shopTab('goods'));
$('tabStars').addEventListener('click', () => shopTab('stars'));

// the stars board on its own, opened from the start screen
$('miniStars').addEventListener('click', () => {
  $('boardTitle').textContent = 'لوحة النجوم: ' + starCount();
  drawBoard($('mainBoard'));
  showPanel('boardPanel');
});
$('boardBack').addEventListener('click', () => showPanel('start'));

// "new player": class tablets are shared, so the saved coins, things and stars can be cleared with two taps
let resetArmed = 0;
$('miniReset').addEventListener('click', () => {
  const b = $('miniReset');
  if (!resetArmed) {
    b.textContent = 'اضغط ثانيةً للتأكيد'; b.classList.add('warn');
    resetArmed = setTimeout(() => { resetArmed = 0; b.textContent = '👤 لاعب جديد'; b.classList.remove('warn'); }, 3000);
    return;
  }
  clearTimeout(resetArmed); resetArmed = 0;
  state = resetState();
  dress();
  b.textContent = 'تم. أهلاً باللاعب الجديد!'; b.classList.remove('warn');
  setTimeout(() => { b.textContent = '👤 لاعب جديد'; }, 2000);
});

// ---------------------------------------------------------------- controls
function steer(clientX) {
  const ndc = (clientX / window.innerWidth) * 2 - 1;
  S.targetX = THREE.MathUtils.clamp(ndc * halfW, -bound, bound);
}
canvas.addEventListener('pointerdown', (e) => { steer(e.clientX); $('swipe').style.display = 'none'; });
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) { steer(e.clientX); } });
window.addEventListener('keydown', (e) => {
  if (S.mode !== 'play') { return; }
  if (e.key === 'ArrowLeft') { S.targetX = Math.max(-bound, S.targetX - 0.7); }
  if (e.key === 'ArrowRight') { S.targetX = Math.min(bound, S.targetX + 0.7); }
});

// ---------------------------------------------------------------- per-frame update
function spawn() {
  const st = STATIONS[S.station];
  const type = st.bad && Math.random() < st.badChance ? st.bad : st.good;
  const it = makeItem(type);
  it.position.set((Math.random() * 2 - 1) * bound, CAM_Y + halfH + 1.2, 0);
  it.userData.x0 = it.position.x;
  it.userData.phase = Math.random() * 6.28;
  scene.add(it); items.push(it);
}

function collect(it) {
  const type = it.userData.type, st = STATIONS[S.station];
  if (type === 'lowcloud') {
    S.cloudHits++; S.slowT = 1.4; sfx.bad(); say('الغيوم المنخفضة تؤخّرنا!', 1.6);
  } else if (type === 'heat') {
    S.heatHits++;
    S.got = Math.max(0, S.got - 1);
    if (S.score > 0) { floatLabel(it.position, POINTS.heat); }
    addScore(POINTS.heat); sfx.bad(); burst(it.position, 0xff5a36);
    say('الحرارة تُبعدني عن التكثف!', 1.8);
  } else {
    S.got++; sfx.good();
    if (S.got > S.peak) { S.peak = S.got; addScore(POINTS[type]); floatLabel(it.position, POINTS[type]); }
    burst(it.position, type === 'arrow' ? 0x8fdcff : type === 'cold' ? 0xffffff : 0x2aa9ff);
    if (type === 'cold' && S.got === 4) { say('أشعر بالبرودة!', 1.6); }
    if (type === 'drop' && S.got === 3) { say('القطرات تتجمع، والغيمة تكبر!', 1.8); }
    if (type === 'drop' && S.got === 7) { say('ما أكبر غيمتنا!', 1.8); }
  }
  hud();
  if (S.got >= st.need) { setTimeout(missionDone, 500); S.mode = 'pause'; }
}

function update(dt) {
  S.time += dt;
  if (mixer) { mixer.update(dt); }
  const shop = S.mode === 'shop';

  // the camera comes close in the shop, and goes back for the climb
  const ease = Math.min(1, dt * 5);
  const view = shop ? shopView() : { x: 0, y: CAM_Y, z: CAM_Z };
  camera.position.x += (view.x - camera.position.x) * ease;
  camera.position.y += (view.y - camera.position.y) * ease;
  camera.position.z += (view.z - camera.position.z) * ease;

  // Qattoura follows the finger; in the shop she turns from side to side to show what she wears
  player.position.x += (S.targetX - player.position.x) * Math.min(1, dt * 9);
  player.rotation.z = (player.position.x - S.targetX) * 0.12;
  player.rotation.y += ((shop ? Math.sin(S.time * 0.9) * 0.75 : 0) - player.rotation.y) * Math.min(1, dt * 6);
  // in the shop she is happy with what she achieved: she hops and wiggles
  const hop = shop ? Math.abs(Math.sin(S.time * 3.2)) * 0.32 : 0;
  player.position.y += (-1.9 + hop - player.position.y) * Math.min(1, dt * 12);
  if (shop) { player.rotation.z = Math.sin(S.time * 6.4) * 0.09; }
  // a big laugh and faster arm waving while she is happy in the shop
  S.smile = (S.smile || 0) + ((shop ? 1 : 0) - (S.smile || 0)) * Math.min(1, dt * 5);
  smileParts.forEach((n) => n.scale.set(1 + 0.3 * S.smile, 1 + 0.9 * S.smile, 1 + 0.25 * S.smile));
  if (mixer) { mixer.timeScale = shop ? 2 : 1; }

  // she starts small and grows with every item she collects and every station she passes, until the cloud forms
  const st0 = STATIONS[Math.min(S.station, 2)];
  const prog = S.mode === 'end' ? 1 : Math.min(1, (S.station + Math.min(1, S.got / st0.need)) / 3);
  const growTo = 0.5 + 0.6 * prog;
  S.grow = (S.grow || growTo) + (growTo - (S.grow || growTo)) * Math.min(1, dt * 4);

  // how visible she is: faint vapour, clearer as she cools, a solid drop after the change
  let op = 0.38;
  if (S.station === 1) { op = 0.38 + 0.2 * (S.got / STATIONS[1].need); }
  if (S.station === 2) {
    S.changeT = Math.min(1, (S.changeT || 0) + dt / 1.5);
    op = 0.58 + 0.42 * S.changeT;
    const pulse = 1 + 0.25 * Math.sin(S.changeT * Math.PI);
    player.scale.setScalar(pulse * S.grow);
  } else { player.scale.setScalar(S.grow); }
  if (S.mode === 'end' || S.mode === 'card' && S.station === 2) { op = 1; player.scale.setScalar(S.grow); }
  if (shop) { op = 1; player.scale.setScalar(1); }
  setPlayerOpacity(op);

  // the cloud she builds in the last station; in the shop it stays behind her like a backdrop
  const cloudTarget = shop ? 1 : S.station === 2 ? 0.2 + 1.15 * (S.got / STATIONS[2].need) : 0.001;
  const cs = bigCloud.scale.x + (cloudTarget - bigCloud.scale.x) * Math.min(1, dt * 3);
  bigCloud.scale.setScalar(cs);
  bigCloud.position.x += (player.position.x - bigCloud.position.x) * Math.min(1, dt * 4);

  const speed = (S.slowT > 0 ? 1.5 : 3.3);
  S.slowT = Math.max(0, S.slowT - dt);

  backdrop.forEach((c) => {
    c.position.y -= dt * speed * 0.22;
    if (c.position.y < CAM_Y - halfH - 9) { c.position.y = CAM_Y + halfH + 9; c.position.x = (Math.random() - 0.5) * 26; }
  });

  const lift = dt * speckNow.vy;
  for (let i = 0; i < SPECKS; i++) {
    speckPos[i * 3 + 1] += lift;
    if (speckPos[i * 3 + 1] < CAM_Y - SPECK_SPAN / 2) { speckPos[i * 3 + 1] += SPECK_SPAN; }
    if (speckPos[i * 3 + 1] > CAM_Y + SPECK_SPAN / 2) { speckPos[i * 3 + 1] -= SPECK_SPAN; }
    speckPos[i * 3] = speckX0[i] + Math.sin(S.time * 1.3 + i) * speckNow.sway;
  }
  speckGeo.attributes.position.needsUpdate = true;

  for (let i = sparks.length - 1; i >= 0; i--) {
    const m = sparks[i], d = m.userData;
    m.position.x += d.vx * dt; m.position.y += d.vy * dt; d.life -= dt;
    m.material.opacity = Math.max(0, d.life * 2);
    if (d.life <= 0) { scene.remove(m); m.material.dispose(); sparks.splice(i, 1); }
  }

  if (S.mode !== 'play') { return; }
  if (S.lockT > 0) { S.lockT -= dt; return; }

  S.spawnT -= dt;
  if (S.spawnT <= 0) { spawn(); S.spawnT = STATIONS[S.station].every * (S.slowT > 0 ? 1.8 : 1); }

  const px = player.position.x, py = player.position.y + 0.9;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i], t = it.userData.type;
    it.position.y -= speed * dt;
    if (t === 'cold') { it.rotation.z += dt * 1.6; }
    if (t === 'arrow') { it.rotation.y = Math.sin(S.time * 3 + it.userData.phase) * 0.5; }
    if (t === 'drop') { it.position.x = THREE.MathUtils.clamp(it.userData.x0 + Math.sin(S.time * 2 + it.userData.phase) * 0.9, -bound, bound); }
    if (t === 'heat') { it.position.x = it.userData.x0 + Math.sin(S.time * 5 + it.userData.phase) * 0.12; }
    if (Math.abs(it.position.x - px) < 0.95 && Math.abs(it.position.y - py) < 1.05) {
      scene.remove(it); items.splice(i, 1); collect(it);
      if (S.mode !== 'play') { return; }
    } else if (it.position.y < CAM_Y - halfH - 1.5) {
      scene.remove(it); items.splice(i, 1);
    }
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
}
function frame(now) {
  tick(now);
  window.requestAnimationFrame(frame);
}
window.requestAnimationFrame(frame);
// Some embedded browsers pause requestAnimationFrame while the page counts as hidden.
// A timer keeps the scene moving then, so Qattoura still shows in the shop.
window.setInterval(() => { const now = performance.now(); if (now - last > 250) { tick(now); } }, 60);

// small handle for testing from the console
window.__game = {
  S, STATIONS, items, player,
  get state() { return state; },
  step: (dt = 1 / 30, n = 1) => { for (let i = 0; i < n; i++) { update(dt); } renderer.render(scene, camera); },
  collectOne: (type) => { const it = makeItem(type || STATIONS[S.station].good); it.position.copy(player.position); collect(it); }
};
