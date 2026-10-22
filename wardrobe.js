// The things Qattoura can wear. Each one is built from simple three.js shapes and hung on a node of her model,
// so it follows her bounce and her waving arms. Positions are in the model's own units (y up, face towards +z).
import * as THREE from 'three';

// Each kind comes in several colours so every child can dress Qattoura their own way.
// The first colour of each kind keeps its old id, so things already bought on a tablet stay valid.
const COLORS = {
  red: ['#e8344e', '#ff6b5e', 'حمراء'], blue: ['#2f7de0', '#6fb4ff', 'زرقاء'], pink: ['#ff4d9a', '#ff9cc8', 'وردية'],
  yellow: ['#ffc21a', '#ffe27a', 'صفراء'], green: ['#2fae66', '#7ddc9f', 'خضراء'], violet: ['#7b4fd6', '#a98af0', 'بنفسجية'],
  black: ['#2c2c3c', '#55556a', 'سوداء'], orange: ['#ff8a1f', '#ffb860', 'برتقالية'], gold: ['#ffc928', '#ffe08a', 'ذهبية']
};
const KINDS = [
  { base: 'bow', name: 'ربطة عنق', price: 30, slot: 'neck', colors: ['red', 'blue', 'pink', 'yellow', 'green', 'violet'] },
  { base: 'glasses', name: 'نظارة', price: 40, slot: 'eyes', colors: ['red', 'blue', 'pink', 'black', 'green', 'yellow'] },
  { base: 'flower', name: 'وردة', price: 35, slot: 'flower', colors: ['pink', 'red', 'yellow', 'violet', 'orange'] },
  { base: 'hat', name: 'قبعة', price: 40, slot: 'head', colors: ['violet', 'red', 'blue', 'green'] },
  { base: 'gloves', name: 'قفازات', price: 50, slot: 'hands', colors: ['yellow', 'blue', 'pink'] },
  { base: 'shoes', name: 'حذاء', price: 50, slot: 'feet', colors: ['pink', 'blue', 'red', 'yellow'], masc: true },
  { base: 'scarf', name: 'وشاح', price: 60, slot: 'neck', colors: ['green', 'red', 'blue', 'violet'], masc: true },
  { base: 'crown', name: 'تاج', price: 100, slot: 'head', colors: ['gold'], plain: true },
  { base: 'cape', name: 'عباءة البطل', price: 120, slot: 'back', colors: ['red', 'blue', 'violet'], back: true }
];
// masculine colour words for the masculine nouns (shoes, scarf)
const MASC = { 'حمراء': 'أحمر', 'زرقاء': 'أزرق', 'وردية': 'وردي', 'صفراء': 'أصفر', 'خضراء': 'أخضر', 'بنفسجية': 'بنفسجي',
  'سوداء': 'أسود', 'برتقالية': 'برتقالي', 'ذهبية': 'ذهبي' };
export const GOODS = [];
KINDS.forEach((k) => k.colors.forEach((c, i) => {
  const [main, light, word] = COLORS[c];
  const name = k.plain ? k.name : k.base === 'cape' ? 'عباءة البطل ال' + word : k.name + ' ' + (k.masc ? MASC[word] : word);
  GOODS.push({ id: i === 0 ? k.base : k.base + '-' + c, base: k.base, name, price: k.price, slot: k.slot,
    tint: main, main, light, back: !!k.back });
}));

// where each arm node sits in the model, needed only to draw the shop pictures
const NODE_AT = { drop_body: [0, 0, 0], arm_L: [0.5, -0.05, 0], arm_R: [-0.5, -0.05, 0] };

const materials = [];
function mat(color, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
  m.userData.base = extra.opacity === undefined ? 1 : extra.opacity;
  m.transparent = m.userData.base < 0.999;
  materials.push(m);
  return m;
}
const M = {
  red: mat(0xe8344e), redLight: mat(0xff5a4d), white: mat(0xffffff), violet: mat(0x7b4fd6), violetDark: mat(0x5a35ad),
  gold: mat(0xffc928, { emissive: 0xb37400, emissiveIntensity: 0.35, roughness: 0.3, side: THREE.DoubleSide }),
  yellow: mat(0xffd23a), green: mat(0x2fae66), greenLight: mat(0x7ddc9f), pink: mat(0xff4d6d),
  blueGem: mat(0x3d8bff, { emissive: 0x1d5fe0, emissiveIntensity: 0.5 }),
  lens: mat(0x2b3f66, { opacity: 0.42, roughness: 0.1 }),
  cape: mat(0xe8344e, { side: THREE.DoubleSide, roughness: 0.6 })
};

const byColor = new Map();
function cmat(hex, extra = {}) {
  const key = hex + JSON.stringify(extra);
  if (!byColor.has(key)) { byColor.set(key, mat(new THREE.Color(hex), extra)); }
  return byColor.get(key);
}
const darker = (hex) => '#' + new THREE.Color(hex).multiplyScalar(0.72).getHexString();

function part(geometry, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale);
  return m;
}
const G = {
  ball: new THREE.SphereGeometry(1, 24, 16),
  ring: new THREE.TorusGeometry(0.2, 0.04, 10, 28),
  disc: new THREE.CircleGeometry(0.18, 24),
  rod: new THREE.CylinderGeometry(0.028, 0.028, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 20),
  drum: new THREE.CylinderGeometry(1, 1, 1, 28),
  band: new THREE.CylinderGeometry(1, 0.94, 1, 28, 1, true),
  loop: new THREE.TorusGeometry(1, 0.17, 12, 32),
  cuff: new THREE.TorusGeometry(0.13, 0.055, 10, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  cape: new THREE.CylinderGeometry(0.6, 0.86, 1.25, 20, 1, true, Math.PI / 2 + 0.4, Math.PI - 0.8)
};

// Each builder returns a list of { node, group }.
const BUILD = {
  bow(c) {
    const g = new THREE.Group();
    g.position.set(0.02, -0.62, 0.5);
    g.add(part(G.cone, cmat(c.main), [0.15, 0, 0], [0, 0, Math.PI / 2], [0.15, 0.26, 0.09]));
    g.add(part(G.cone, cmat(c.main), [-0.15, 0, 0], [0, 0, -Math.PI / 2], [0.15, 0.26, 0.09]));
    g.add(part(G.ball, cmat(c.light), [0, 0, 0.03], [0, 0, 0], [0.075, 0.075, 0.075]));
    return [{ node: 'drop_body', group: g }];
  },
  glasses(c) {
    const g = new THREE.Group();
    [-1, 1].forEach((s) => {
      const x = 0.02 + s * 0.235;
      g.add(part(G.ring, cmat(c.main), [x, 0.06, 0.7], [0, s * 0.18, 0]));
      g.add(part(G.disc, M.lens, [x, 0.06, 0.7], [0, s * 0.18, 0]));
    });
    g.add(part(G.rod, cmat(c.main), [0.02, 0.1, 0.71], [0, 0, Math.PI / 2], [1.2, 0.1, 1.2]));
    return [{ node: 'drop_body', group: g }];
  },
  hat(c) {
    const g = new THREE.Group();
    g.position.set(0.1, 0.9, 0); g.rotation.z = -0.2;
    g.add(part(G.drum, cmat(darker(c.main)), [0, 0, 0], [0, 0, 0], [0.44, 0.05, 0.44]));
    g.add(part(G.drum, cmat(c.main), [0, 0.26, 0], [0, 0, 0], [0.27, 0.48, 0.27]));
    g.add(part(G.drum, M.gold, [0, 0.08, 0], [0, 0, 0], [0.285, 0.1, 0.285]));
    return [{ node: 'drop_body', group: g }];
  },
  gloves(c) {
    return [['arm_L', 1], ['arm_R', -1]].map(([node, s]) => {
      const g = new THREE.Group();
      g.add(part(G.ball, cmat(c.main), [s * 0.52, 0.64, 0], [0, 0, s * -0.2], [0.22, 0.25, 0.18]));
      g.add(part(G.cuff, M.red, [s * 0.46, 0.43, 0], [Math.PI / 2, 0, 0]));
      return { node, group: g };
    });
  },
  shoes(c) {
    const g = new THREE.Group();
    [-1, 1].forEach((s) => {
      g.add(part(G.ball, cmat(c.main), [s * 0.3, -1.07, 0.1], [0, 0, 0], [0.2, 0.15, 0.3]));
      g.add(part(G.ball, M.white, [s * 0.3, -1.08, 0.3], [0, 0, 0], [0.13, 0.1, 0.1]));
    });
    return [{ node: 'drop_body', group: g }];
  },
  scarf(c) {
    const g = new THREE.Group();
    g.add(part(G.loop, cmat(c.main), [0, -0.56, 0], [Math.PI / 2, 0, 0], [0.5, 0.5, 0.45]));
    g.add(part(G.box, cmat(c.main), [0.3, -0.78, 0.44], [0.1, 0, 0.18], [0.17, 0.38, 0.07]));
    g.add(part(G.box, cmat(c.light), [0.33, -0.93, 0.455], [0.1, 0, 0.18], [0.175, 0.07, 0.075]));
    return [{ node: 'drop_body', group: g }];
  },
  flower(c) {
    // petals round a yellow middle, pinned on the side of her head
    const g = new THREE.Group();
    g.position.set(-0.36, 0.5, 0.42); g.rotation.set(-0.25, -0.5, 0.3);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(part(G.ball, cmat(i % 2 ? c.light : c.main), [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0], [0, 0, a], [0.1, 0.065, 0.04]));
    }
    g.add(part(G.ball, cmat('#ffd23a'), [0, 0, 0.03], [0, 0, 0], [0.065, 0.065, 0.05]));
    g.add(part(G.ball, cmat('#2fae66'), [0.13, -0.15, -0.02], [0, 0, -0.6], [0.09, 0.04, 0.02]));
    return [{ node: 'drop_body', group: g }];
  },
  crown() {
    const g = new THREE.Group();
    g.position.set(0.105, 0.94, 0); g.rotation.z = -0.2;
    g.add(part(G.band, M.gold, [0, 0.07, 0], [0, 0, 0], [0.3, 0.15, 0.3]));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.add(part(G.cone, M.gold, [Math.sin(a) * 0.29, 0.22, Math.cos(a) * 0.29], [0, 0, 0], [0.075, 0.2, 0.075]));
      g.add(part(G.ball, i % 2 ? M.blueGem : M.red, [Math.sin(a) * 0.305, 0.07, Math.cos(a) * 0.305], [0, 0, 0], [0.05, 0.05, 0.05]));
    }
    return [{ node: 'drop_body', group: g }];
  },
  cape(c) {
    const g = new THREE.Group();
    g.add(part(G.cape, cmat(c.main, { side: THREE.DoubleSide, roughness: 0.6 }), [0, -0.3, -0.02]));
    [-1, 1].forEach((s) => g.add(part(G.ball, M.gold, [s * 0.5, 0.3, 0.2], [0, 0, 0], [0.07, 0.07, 0.07])));
    return [{ node: 'drop_body', group: g }];
  }
};

export function buildAccessory(id) {
  const gd = GOODS.find((g) => g.id === id);
  const parts = BUILD[gd.base](gd);
  parts.forEach((p) => { p.group.userData.accessory = id; });
  return parts;
}

// Takes off everything, then puts on the listed things.
export function applyWorn(model, wornIds) {
  const old = [];
  model.traverse((n) => { if (n.userData.accessory) { old.push(n); } });
  old.forEach((n) => n.removeFromParent());
  wornIds.forEach((id) => {
    buildAccessory(id).forEach(({ node, group }) => {
      const target = model.getObjectByName(node);
      if (target) { target.add(group); }
    });
  });
}

// Qattoura is faint while she is vapour; her things fade with her.
let lastOpacity = -1;
export function setOpacity(o) {
  if (Math.abs(o - lastOpacity) < 0.004) { return; }
  lastOpacity = o;
  materials.forEach((m) => {
    m.opacity = m.userData.base * o;
    const see = m.opacity < 0.999;
    if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
  });
}

// Small pictures of the goods for the shop, drawn once from the same 3D shapes.
// Returns { id: dataURL }. An empty object means the pictures could not be made; the shop then shows plain tokens.
export function renderThumbs(size = 168) {
  const out = {};
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(size, size, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c8e0, 1.7));
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    scene.add(light);
    setOpacity(1);
    GOODS.forEach((gd) => {
      const holder = new THREE.Group();
      buildAccessory(gd.id).forEach(({ node, group }) => {
        const wrap = new THREE.Group();
        wrap.position.set(...NODE_AT[node]);
        if (gd.id === 'gloves') { wrap.position.x *= -0.5; }      // bring the pair closer so the picture is not tiny
        wrap.add(group); holder.add(wrap);
      });
      scene.add(holder);
      const box = new THREE.Box3().setFromObject(holder);
      const c = box.getCenter(new THREE.Vector3()), d = box.getSize(new THREE.Vector3());
      const half = Math.max(d.x, d.y, 0.3) * 0.62;
      const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 30);
      const side = gd.back ? -1 : 1;
      cam.position.set(c.x + 0.9 * side, c.y + 0.7, c.z + 6 * side);
      cam.lookAt(c);
      light.position.set(-2 * side, 4, 5 * side);
      renderer.render(scene, cam);
      out[gd.id] = renderer.domElement.toDataURL('image/png');
      scene.remove(holder);
    });
  } catch (e) {
    Object.keys(out).forEach((k) => delete out[k]);
  }
  if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
  return out;
}
