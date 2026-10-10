// "Qattoura climbs to the cloud": a short 3D game about condensation for Grade 3.
// Three stations, each ending in a gate challenge and a golden card with one key phrase:
//   1. rising        -> where: high up, in the sky
//   2. the cold layer -> why: the water vapour cools
//   3. the change     -> what: from water vapour (gas) to liquid water, forming a cloud
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);
const ar = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const POINTS = { arrow: 5, cold: 10, drop: 10, heat: -5, gateFirst: 30, gateSecond: 15 };
const STAR_2 = 200, STAR_3 = 280;          // out of a possible 310

const STATIONS = [
  {
    good: 'arrow', bad: 'lowcloud', need: 8, every: 0.78, badChance: 0.28, sky: 0x8fd3ff,
    mission: (n, need) => `اجمع أسهم الصعود: ${ar(n)} / ${ar(need)}`,
    hello: 'أنا بخار ماء! ساعدني لأصعد إلى الأعلى',
    gate: { title: 'بوابة المحطة الأولى', q: 'أين يحدث التكثف؟', right: 'في الأعلى، في السماء', wrong: 'عند سطح البحر',
            hint: 'تذكّر: إلى أين صعدنا الآن؟',
            why: 'عند سطح البحر يحدث التبخر. أما التكثف فيحدث في الأعلى، في السماء.' },
    card: { label: 'المكان', phrase: 'في الأعلى، في السماء' },
    badge: { icon: '🚀', name: 'بطاقة الصعود الذهبية' }
  },
  {
    good: 'cold', bad: 'heat', need: 8, every: 0.72, badChance: 0.3, sky: 0x79b6ef,
    mission: (n, need) => `برّد بخار الماء: ${ar(n)} / ${ar(need)}`,
    hello: 'الهواء هنا بارد! اجمع بلورات البرودة وابتعد عن الحرارة',
    gate: { title: 'بوابة المحطة الثانية', q: 'يتكثف بخار الماء عندما…', right: 'يبرد', wrong: 'يسخن',
            hint: 'تذكّر: ماذا جمعنا حتى انخفض مقياس الحرارة؟',
            why: 'التسخين يحوّل الماء السائل إلى بخار ماء، وهذا هو التبخر. أما التكثف فيحدث عندما يبرد بخار الماء.' },
    card: { label: 'السبب', phrase: 'يبرد بخار الماء' },
    badge: { icon: '❄️', name: 'بطاقة البرودة الذهبية' }
  },
  {
    good: 'drop', bad: null, need: 10, every: 0.6, badChance: 0, sky: 0xb7d5f5,
    mission: (n, need) => `اجمع قطرات الماء: ${ar(n)} / ${ar(need)}`,
    hello: 'بردتُ فتحوّلتُ إلى قطرة ماء سائلة! هذا هو التكثف',
    gate: { title: 'بوابة المحطة الثالثة', q: 'في التكثف يتحول الماء…', right: 'من غاز إلى سائل', wrong: 'من سائل إلى غاز',
            hint: 'تذكّر: كنتُ بخار ماء، وماذا صرتُ بعد أن بردت؟',
            why: 'من سائل إلى غاز هو التبخر. أما في التكثف فيتحول بخار الماء (غاز) إلى ماء سائل.' },
    card: { label: 'التحول', phrase: 'من بخار ماء (غاز) إلى ماء سائل' },
    badge: { icon: '☁️', name: 'بطاقة الغيمة الذهبية' }
  }
];

// ---------------------------------------------------------------- scene
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(STATIONS[0].sky);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
const CAM_Y = 1.2, CAM_Z = 9.5;
camera.position.set(0, CAM_Y, CAM_Z);
camera.lookAt(0, CAM_Y, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9fc8f0, 1.5));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
sun.position.set(-4, 8, 6);
scene.add(sun);

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
  cloud: std(0xffffff, 0xdcebff, 0.35, { roughness: 1, transparent: true, opacity: 0.5 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
};

function makeItem(type) {
  const g = new THREE.Group();
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

// ---------------------------------------------------------------- Qattoura and her cloud
const player = new THREE.Group();
player.position.set(0, -1.9, 0);
scene.add(player);
let mixer = null, playerMeshes = [];
const bigCloud = new THREE.Group();
bigCloud.position.set(0, -1.4, -1.3);
bigCloud.scale.setScalar(0.001);
scene.add(bigCloud);

function setPlayerOpacity(o) {
  playerMeshes.forEach((m) => { m.material.transparent = o < 0.999; m.material.opacity = o; m.material.depthWrite = true; });
}

const loader = new GLTFLoader();
const load = (url) => new Promise((ok, bad) => loader.load(url, ok, undefined, bad));
Promise.all([load('models/qattoura.glb'), load('models/cloud.glb')]).then(([drop, cloud]) => {
  drop.scene.scale.setScalar(0.62);
  drop.scene.position.y = 0.75;
  drop.scene.traverse((n) => { if (n.isMesh) { n.material = n.material.clone(); playerMeshes.push(n); } });
  player.add(drop.scene);
  mixer = new THREE.AnimationMixer(drop.scene);
  drop.animations.forEach((c) => mixer.clipAction(c).play());
  cloud.scene.scale.setScalar(1.5);
  bigCloud.add(cloud.scene);
  $('loading').textContent = '';
  $('startBtn').disabled = false;
}).catch(() => { $('loading').textContent = 'تعذّر تحميل اللعبة. تأكد من الاتصال بالإنترنت ثم أعد تحميل الصفحة.'; });

// ---------------------------------------------------------------- sound (made in code, no files)
let audio = null;
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
  change: () => [392, 523, 659, 784, 988, 1175].forEach((f, i) => beep(f, 0.16, 'sine', i * 0.08))
};

// ---------------------------------------------------------------- game state
const S = { mode: 'start', station: 0, got: 0, score: 0, tries: 0, spawnT: 0, slowT: 0, lockT: 0, targetX: 0, time: 0, badges: [] };
const items = [];
let bubbleTimer = 0;

function say(text, secs = 2.6) {
  const b = $('bubble'); b.textContent = text; b.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove('show'), secs * 1000);
}
function addScore(n) {
  S.score = Math.max(0, S.score + n);
  $('scoreNum').textContent = ar(S.score);
  const el = $('score'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function showPanel(id) { ['start', 'story', 'gate', 'card', 'end', 'shop'].forEach((p) => $(p).classList.toggle('show', p === id)); }
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
  S.station = i; S.got = 0; S.tries = 0; S.spawnT = 0.6; S.slowT = 0; S.mode = 'play';
  clearItems(); showPanel(null); hud();
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
  const opts = [{ t: g.right, ok: true }, { t: g.wrong, ok: false }];
  if (Math.random() < 0.5) { opts.reverse(); }
  opts.forEach((o) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt'; b.textContent = o.t;
    b.addEventListener('click', () => answer(o.ok, b));
    box.appendChild(b);
  });
  showPanel('gate');
}

function answer(ok, btn) {
  const st = STATIONS[S.station];
  if (!ok) {
    S.tries++; sfx.wrong();
    btn.classList.remove('wrong'); void btn.offsetWidth; btn.classList.add('wrong');
    // immediate corrective feedback: say why this choice is wrong, then give a hint and let the pupil retry
    $('hintLine').className = 'fb';
    $('hintLine').innerHTML = '✖ ' + st.gate.why + '<br>💧 ' + st.gate.hint + ' حاول مرة أخرى.';
    return;
  }
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

$('cardBtn').addEventListener('click', () => {
  if (S.station < 2) { startStation(S.station + 1); return; }
  S.mode = 'end';
  const stars = S.score >= STAR_3 ? 3 : S.score >= STAR_2 ? 2 : 1;
  $('stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  $('final').innerHTML = 'قطعك النقدية: ' + ar(S.score) + ' <i class="coin"></i>';
  $('badges').innerHTML = 'بطاقاتك الذهبية: ' + S.badges.map((b) => b.icon).join(' ');
  $('hud').hidden = true;
  showPanel('end');
});

function begin() {
  S.score = 0; S.badges = []; S.targetX = 0;
  player.position.x = 0;
  bigCloud.scale.setScalar(0.001);
  setPlayerOpacity(0.38);
  $('scoreNum').textContent = ar(0);
  $('hud').hidden = false;
  startStation(0);
}
function intro() {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } }
  $('hud').hidden = true;
  showPanel('story');
}
$('startBtn').addEventListener('click', intro);
$('goBtn').addEventListener('click', begin);
$('againBtn').addEventListener('click', begin);

// ---------------------------------------------------------------- the cloud shop
// Prizes are stickers on Qattoura's souvenir picture. x and y are percentages of the picture.
const GOODS = [
  { id: 'balloons', icon: '🎈', name: 'بالونات', price: 30, at: [[86, 30, 2.4]] },
  { id: 'glasses', icon: '🕶️', name: 'نظارة شمسية', price: 40, at: [[50, 52, 2.5]] },
  { id: 'stars', icon: '✨', name: 'نجوم لامعة', price: 60, at: [[16, 18, 2.2], [78, 78, 1.8], [24, 80, 1.6]] },
  { id: 'crown', icon: '👑', name: 'تاج', price: 80, at: [[51, 2, 2.4]] },
  { id: 'rainbow', icon: '🌈', name: 'قوس قزح', price: 100, at: [[50, -16, 4.4]] },
  { id: 'cup', icon: '🏆', name: 'كأس صانع الغيوم', price: 150, at: [[12, 62, 2.8]] }
];
let wallet = 0;
const owned = new Set();

function drawShop() {
  $('walletNum').textContent = ar(wallet);
  const box = $('goods'); box.innerHTML = '';
  let shelf = null;
  GOODS.forEach((gd, i) => {
    if (i % 2 === 0) { shelf = document.createElement('div'); shelf.className = 'shelf'; box.appendChild(shelf); }
    const b = document.createElement('button');
    const has = owned.has(gd.id);
    b.type = 'button';
    b.className = 'good' + (has ? ' own' : wallet < gd.price ? ' poor' : '');
    b.innerHTML = '<span class="ic">' + gd.icon + '</span><span class="nm">' + gd.name + '</span><span class="pr">' +
      (has ? 'اشتريتها ✔' : ar(gd.price) + ' <i class="coin"></i>') + '</span>';
    b.addEventListener('click', () => buy(gd));
    shelf.appendChild(b);
  });
}
function buy(gd) {
  if (owned.has(gd.id)) { $('shopMsg').textContent = 'هذه الجائزة عندك.'; return; }
  if (wallet < gd.price) {
    sfx.wrong();
    $('shopMsg').textContent = 'ينقصك ' + ar(gd.price - wallet) + ' قطعة نقدية. العب مرة أخرى لتجمع أكثر!';
    return;
  }
  wallet -= gd.price; owned.add(gd.id); sfx.win();
  gd.at.forEach(([x, y, size]) => {
    const s = document.createElement('span');
    s.textContent = gd.icon; s.style.left = x + '%'; s.style.top = y + '%'; s.style.fontSize = size + 'rem';
    $('photo').appendChild(s);
    requestAnimationFrame(() => s.classList.add('on'));
    setTimeout(() => s.classList.add('on'), 60);
  });
  $('shopMsg').textContent = 'اشتريتَ ' + gd.name + '! 🎉';
  drawShop();
}
$('shopBtn').addEventListener('click', () => {
  wallet = S.score; owned.clear();
  $('photo').querySelectorAll('span').forEach((s) => s.remove());
  $('shopMsg').textContent = 'اختر جوائزك بقطعك النقدية';
  drawShop();
  showPanel('shop');
});

// ---------------------------------------------------------------- controls
function steer(clientX) {
  const ndc = (clientX / window.innerWidth) * 2 - 1;
  S.targetX = THREE.MathUtils.clamp(ndc * halfW, -bound, bound);
}
canvas.addEventListener('pointerdown', (e) => { steer(e.clientX); $('swipe').style.display = 'none'; });
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) { steer(e.clientX); } });
window.addEventListener('keydown', (e) => {
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
    S.slowT = 1.4; sfx.bad(); say('الغيوم المنخفضة تؤخّرنا!', 1.6);
  } else if (type === 'heat') {
    S.got = Math.max(0, S.got - 1); addScore(POINTS.heat); sfx.bad(); burst(it.position, 0xff5a36);
    say('الحرارة تُبعدني عن التكثف!', 1.8);
  } else {
    S.got++; addScore(POINTS[type]); sfx.good();
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

  // the sky gets paler and colder as she climbs
  scene.background.lerp(new THREE.Color(STATIONS[S.station].sky), Math.min(1, dt * 1.5));

  // Qattoura follows the finger
  player.position.x += (S.targetX - player.position.x) * Math.min(1, dt * 9);
  player.rotation.z = (player.position.x - S.targetX) * 0.12;

  // how visible she is: faint vapour, clearer as she cools, a solid drop after the change
  let op = 0.38;
  if (S.station === 1) { op = 0.38 + 0.2 * (S.got / STATIONS[1].need); }
  if (S.station === 2) {
    S.changeT = Math.min(1, (S.changeT || 0) + dt / 1.5);
    op = 0.58 + 0.42 * S.changeT;
    const pulse = 1 + 0.25 * Math.sin(S.changeT * Math.PI);
    player.scale.setScalar(pulse);
  } else { player.scale.setScalar(1); }
  if (S.mode === 'end' || S.mode === 'card' && S.station === 2) { op = 1; }
  setPlayerOpacity(op);

  // the cloud she builds in the last station
  const cloudTarget = S.station === 2 ? 0.2 + 1.15 * (S.got / STATIONS[2].need) : 0.001;
  const cs = bigCloud.scale.x + (cloudTarget - bigCloud.scale.x) * Math.min(1, dt * 3);
  bigCloud.scale.setScalar(cs);
  bigCloud.position.x += (player.position.x - bigCloud.position.x) * Math.min(1, dt * 4);

  const speed = (S.slowT > 0 ? 1.5 : 3.3);
  S.slowT = Math.max(0, S.slowT - dt);

  backdrop.forEach((c) => {
    c.position.y -= dt * speed * 0.22;
    if (c.position.y < CAM_Y - halfH - 9) { c.position.y = CAM_Y + halfH + 9; c.position.x = (Math.random() - 0.5) * 26; }
  });

  for (let i = sparks.length - 1; i >= 0; i--) {
    const m = sparks[i], d = m.userData;
    m.position.x += d.vx * dt; m.position.y += d.vy * dt; d.life -= dt;
    m.material.opacity = Math.max(0, d.life * 2);
    if (d.life <= 0) { scene.remove(m); sparks.splice(i, 1); }
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
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
  window.requestAnimationFrame(frame);
}
window.requestAnimationFrame(frame);

// small handle for testing from the console
window.__game = { S, STATIONS, items, collectOne: () => { const it = makeItem(STATIONS[S.station].good); it.position.copy(player.position); collect(it); } };
