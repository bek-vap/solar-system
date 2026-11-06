import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';
import { BODIES, SPACECRAFT, BodyDef } from './bodies';
import { bodyState, orbitPath, trackState, Track, State, UNIT_KM, KM_PER_AU } from './ephemeris';
import { SimClock } from './clock';
import { STORIES, Story } from './stories';

// ---------- Сущности ----------
interface Entity {
  def: BodyDef;
  state: State;
  group: THREE.Group;          // позиция в сцене (относительно floating origin)
  mesh?: THREE.Mesh;
  label: HTMLDivElement;
  orbit?: THREE.Line;
  orbitTime?: number;
  track?: Track;
}

const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 1e-7, 1e8);
camera.position.set(0, 900, 1400);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.zoomSpeed = 1.5;
controls.maxDistance = 5e5;

const ambient = new THREE.AmbientLight(0xffffff, 0.06);
const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0);
scene.add(ambient, sunLight);

const clock = new SimClock();
const entities = new Map<string, Entity>();
const labelsEl = document.getElementById('labels')!;
const loader = new THREE.TextureLoader();
let originKm: [number, number, number] = [0, 0, 0];
let focus: Entity | null = null;
let showOrbits = true, showLabels = true;

// Плоскость эклиптики → XZ сцены
const toScene = (p: [number, number, number], out: THREE.Vector3) =>
  out.set((p[0] - originKm[0]) / UNIT_KM, (p[2] - originKm[2]) / UNIT_KM, -(p[1] - originKm[1]) / UNIT_KM);

function makeLabel(e: Entity) {
  const el = document.createElement('div');
  el.className = `label ${e.def.kind}`;
  el.innerHTML = `<span class="marker" style="border-color:${e.def.color}"></span><span class="name">${e.def.name}</span>`;
  el.onclick = () => (location.hash = `#/${e.def.id}`);
  labelsEl.appendChild(el);
  return el;
}

function addBody(def: BodyDef) {
  const group = new THREE.Group();
  const e: Entity = { def, state: bodyState(def, clock.date), group, label: null as unknown as HTMLDivElement };
  const r = def.radiusKm / UNIT_KM;
  const geo = new THREE.SphereGeometry(r, 64, 32);
  const mat = def.kind === 'star'
    ? new THREE.MeshBasicMaterial({ color: def.color })
    : new THREE.MeshStandardMaterial({ color: def.color, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  if (def.texture) loader.load(`textures/${def.texture}`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
  }, undefined, () => {});
  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(def.tiltDeg ?? 0);
  tilt.add(mesh);
  group.add(tilt);
  e.mesh = mesh;

  if (def.id === 'saturn') {
    const ring = new THREE.RingGeometry(74500 / UNIT_KM, 140220 / UNIT_KM, 128, 4);
    const pos = ring.attributes.position, uv = ring.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() * UNIT_KM - 74500) / 65720, 0.5); }
    const c = document.createElement('canvas'); c.width = 512; c.height = 1;
    const g = c.getContext('2d')!;
    for (let x = 0; x < 512; x++) {
      const a = 0.35 + 0.5 * Math.abs(Math.sin(x * 0.07) * Math.sin(x * 0.013)) * (x > 300 && x < 330 ? 0.1 : 1);
      g.fillStyle = `rgba(230,210,170,${a})`; g.fillRect(x, 0, 1, 1);
    }
    const rm = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, transparent: true }));
    rm.rotation.x = -Math.PI / 2;
    tilt.add(rm);
  }
  if (def.kind === 'star') {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!, grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,200,1)'); grd.addColorStop(0.2, 'rgba(255,200,100,0.5)'); grd.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(r * 10);
    group.add(glow);
  }
  scene.add(group);
  e.label = makeLabel(e);
  entities.set(def.id, e);
}

function parentState(e: Entity, d: Date): State {
  const p = e.def.parent ? entities.get(e.def.parent)! : entities.get('sun')!;
  return bodyState(p.def, d);
}

function rebuildOrbit(e: Entity) {
  if (!e.def.orbitDays) return;
  const pts = orbitPath(e.def, clock.date, (d) => parentState(e, d));
  const arr = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { arr[i * 3] = p[0] / UNIT_KM; arr[i * 3 + 1] = p[2] / UNIT_KM; arr[i * 3 + 2] = -p[1] / UNIT_KM; });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  // Затухание к «хвосту» орбиты, как в оригинале
  const col = new Float32Array(pts.length * 3), c = new THREE.Color(e.def.color);
  pts.forEach((_, i) => { const k = 1 - (i / pts.length) * 0.85; col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k; });
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (e.orbit) { scene.remove(e.orbit); e.orbit.geometry.dispose(); }
  e.orbit = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }));
  e.orbitTime = clock.date.getTime();
  scene.add(e.orbit);
}

async function loadSpacecraft() {
  for (const sc of SPACECRAFT) {
    try {
      const res = await fetch(`data/spacecraft/${sc.id}.json`);
      if (!res.ok || !res.headers.get('content-type')?.includes('json')) continue;
      const track = (await res.json()) as Track;
      const def: BodyDef = { id: sc.id, name: sc.name, kind: 'spacecraft', radiusKm: 0.005, color: '#cfd8dc', description: `Траектория по данным JPL Horizons (ID ${sc.horizons}).` };
      const group = new THREE.Group();
      scene.add(group);
      const e: Entity = { def, state: { pos: [0, 0, 0], vel: [0, 0, 0] }, group, label: null as unknown as HTMLDivElement, track };
      e.label = makeLabel(e);
      // След траектории целиком
      const arr = new Float32Array(track.p.length * 3);
      e.orbit = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(arr, 3)),
        new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.5 }));
      scene.add(e.orbit);
      entities.set(sc.id, e);
    } catch { /* нет данных — пропускаем */ }
  }
}

// Звёзды: процедурная заглушка (план: каталог HYG, CC BY-SA 4.0)
function addStars() {
  const n = 9000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos.set([s * Math.cos(th), u, s * Math.sin(th)].map((x) => x * 1e6), i * 3);
    const b = Math.pow(Math.random(), 3) * 0.9 + 0.1;
    col.set([b, b * (0.9 + Math.random() * 0.1), b * (0.85 + Math.random() * 0.15)], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false }));
  stars.renderOrder = -1;
  stars.onBeforeRender = () => stars.position.copy(camera.position);
  scene.add(stars);
}

// ---------- Камера: перелёт к объекту ----------
let flight: { from: [number, number, number]; t0: number; dur: number; d0: number; d1: number } | null = null;

function select(id: string, distanceKm?: number, withInfo = true) {
  const e = entities.get(id) ?? (id === 'home' ? null : undefined);
  if (e === undefined) return;
  const d0 = camera.position.length();
  focus = e;
  const d1 = distanceKm ? distanceKm / UNIT_KM
    : e ? Math.max((e.def.radiusKm / UNIT_KM) * (e.def.kind === 'star' ? 8 : 5), 1e-4) * (e.def.kind === 'spacecraft' ? 1e4 : 1) : 1700;
  flight = { from: [...originKm], t0: performance.now(), dur: 2500, d0, d1 };
  showInfo(withInfo ? e : null);
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function updateOrigin() {
  const target = focus ? focus.state.pos : [0, 0, 0];
  if (!flight) { originKm = [target[0], target[1], target[2]]; return; }
  const k = Math.min((performance.now() - flight.t0) / flight.dur, 1), f = ease(k);
  originKm = [0, 1, 2].map((i) => flight!.from[i] + (target[i] - flight!.from[i]) * f) as [number, number, number];
  // Логарифмическая интерполяция дистанции — плавный подлёт через порядки величин
  const dist = Math.exp(Math.log(flight.d0) + (Math.log(flight.d1) - Math.log(flight.d0)) * f);
  camera.position.setLength(dist);
  if (k >= 1) flight = null;
}

// ---------- Инфопанель ----------
const info = document.getElementById('info')!;
const fmt = (x: number, d = 3) => (Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-2 && x !== 0) ? x.toExponential(d) : x.toLocaleString('ru-RU', { maximumFractionDigits: d }));
const len = (v: number[]) => Math.hypot(v[0], v[1], v[2]);

function showInfo(e: Entity | null) {
  info.classList.toggle('hidden', !e);
  if (!e) return;
  const d = e.def;
  info.innerHTML = `<button class="close" onclick="location.hash='#/home'">✕</button>
    <h1>${d.name}</h1><div class="kind">${({ star: 'Звезда', planet: 'Планета', dwarf: 'Карликовая планета', moon: 'Спутник', spacecraft: 'Космический аппарат' })[d.kind]}</div>
    <p>${d.description}</p>
    <table>
      ${d.massKg ? `<tr><td>Масса</td><td>${fmt(d.massKg)} кг</td></tr>` : ''}
      ${d.kind !== 'spacecraft' ? `<tr><td>Радиус</td><td>${fmt(d.radiusKm)} км</td></tr>` : ''}
      ${d.orbitDays ? `<tr><td>Период обращения</td><td>${fmt(d.orbitDays)} сут</td></tr>` : ''}
      ${d.dayHours ? `<tr><td>Период вращения</td><td>${fmt(d.dayHours)} ч</td></tr>` : ''}
      ${d.tiltDeg !== undefined ? `<tr><td>Наклон оси</td><td>${d.tiltDeg}°</td></tr>` : ''}
      <tr><td>Расстояние до Солнца</td><td id="i-sun"></td></tr>
      <tr><td>Расстояние до Земли</td><td id="i-earth"></td></tr>
      <tr><td>Скорость (гелиоц.)</td><td id="i-vel"></td></tr>
    </table>`;
  updateInfo();
}

function updateInfo() {
  if (!focus) return;
  const s = focus.state, earth = entities.get('earth')!.state;
  const ds = len(s.pos), de = len([s.pos[0] - earth.pos[0], s.pos[1] - earth.pos[1], s.pos[2] - earth.pos[2]]);
  const set = (id: string, t: string) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  set('i-sun', `${fmt(ds / KM_PER_AU, 4)} а.е. (${fmt(ds, 4)} км)`);
  set('i-earth', focus.def.id === 'earth' ? '—' : `${fmt(de / KM_PER_AU, 4)} а.е. (${fmt(de, 4)} км)`);
  set('i-vel', `${fmt(len(s.vel), 3)} км/с`);
}
setInterval(updateInfo, 250);

// ---------- Кадр ----------
const tmp = new THREE.Vector3();
const J2000 = Date.UTC(2000, 0, 1, 12);

function frame() {
  clock.tick();
  const date = clock.date;
  for (const e of entities.values()) {
    if (e.track) {
      const s = trackState(e.track, date);
      e.group.visible = !!s;
      e.label.dataset.hidden = s ? '' : '1';
      if (s) e.state = s;
    } else e.state = bodyState(e.def, date);
  }
  updateOrigin();
  for (const e of entities.values()) {
    toScene(e.state.pos, e.group.position);
    if (e.mesh && e.def.dayHours) e.mesh.rotation.y = (((date.getTime() - J2000) / 3.6e6) / e.def.dayHours) * Math.PI * 2;
    if (!e.track && e.def.orbitDays) {
      if (!e.orbit || Math.abs(date.getTime() - (e.orbitTime ?? 0)) > (e.def.orbitDays ?? 1) * 86400e3 * 0.01) rebuildOrbit(e);
      toScene(parentState(e, date).pos, e.orbit!.position);
    }
    if (e.orbit && e.track) {
      const a = e.orbit.geometry.attributes.position as THREE.BufferAttribute;
      e.track.p.forEach((p, i) => { toScene(p, tmp); a.setXYZ(i, tmp.x, tmp.y, tmp.z); });
      a.needsUpdate = true;
    }
    if (e.orbit) e.orbit.visible = showOrbits;
  }
  toScene([0, 0, 0], sunLight.position);
  controls.update();
  renderer.render(scene, camera);
  placeLabels();
  document.getElementById('date')!.textContent = date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  document.getElementById('rate')!.textContent = clock.describe();
  requestAnimationFrame(frame);
}

function placeLabels() {
  const w = innerWidth, h = innerHeight;
  const screen = new Map<string, [number, number]>();
  for (const e of entities.values()) {
    tmp.copy(e.group.position).project(camera);
    const visible = showLabels && tmp.z < 1 && e.label.dataset.hidden !== '1';
    const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
    screen.set(e.def.id, [x, y]);
    let show = visible;
    // Прячем подписи спутников, если они сливаются с родителем
    if (show && e.def.parent) { const p = screen.get(e.def.parent); if (p && Math.hypot(p[0] - x, p[1] - y) < 25) show = false; }
    e.label.style.display = show ? '' : 'none';
    if (show) e.label.style.transform = `translate(${x}px, ${y}px)`;
    e.label.classList.toggle('active', e === focus);
  }
}

// ---------- UI ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

document.querySelectorAll<HTMLButtonElement>('#timeline [data-rate]').forEach((b) => (b.onclick = () => clock.setRate(+b.dataset.rate!)));
document.getElementById('pause')!.onclick = () => clock.togglePause();
document.getElementById('live')!.onclick = () => clock.goLive();
document.getElementById('menu-btn')!.onclick = () => document.getElementById('menu')!.classList.toggle('hidden');
(document.getElementById('opt-orbits') as HTMLInputElement).onchange = (ev) => (showOrbits = (ev.target as HTMLInputElement).checked);
(document.getElementById('opt-labels') as HTMLInputElement).onchange = (ev) => (showLabels = (ev.target as HTMLInputElement).checked);
const flood = document.getElementById('opt-flood') as HTMLInputElement;
const setFlood = (on: boolean) => { flood.checked = on; ambient.intensity = on ? 1.4 : 0.06; };
flood.onchange = () => setFlood(flood.checked);
setFlood(params.get('lighting') === 'flood');

const search = document.getElementById('search') as HTMLInputElement;
search.onchange = () => {
  const e = [...entities.values()].find((x) => x.def.name.toLowerCase() === search.value.toLowerCase());
  if (e) location.hash = `#/${e.def.id}`;
};

// ---------- Карточки событий и истории ----------
const eventsEl = document.getElementById('events')!;
const storyEl = document.getElementById('story')!;
document.getElementById('event-cards')!.innerHTML = STORIES.map((s) =>
  `<a class="card" href="#/story/${s.id}"><div><div class="card-title">${s.title}</div><div class="card-sub">${s.subtitle}</div></div><div class="card-icon">${s.icon}</div></a>`).join('');

function playStory(story: Story, index: number) {
  const step = story.steps[Math.min(Math.max(index, 0), story.steps.length - 1)];
  const i = story.steps.indexOf(step);
  clock.setTime(step.time === 'now' ? Date.now() : Date.parse(step.time));
  clock.setRate(step.rate ?? 0);
  select(step.focus, step.distanceKm, false);
  const link = (k: number) => `#/story/${story.id}/${k}`;
  storyEl.innerHTML = `
    <div class="story-head"><span class="story-name">${story.title}</span><a class="close" href="#/home">✕</a></div>
    <div class="story-progress">${story.steps.map((_, k) => `<a href="${link(k)}" class="${k === i ? 'on' : ''}"></a>`).join('')}</div>
    <h2>${step.title}</h2>
    <p>${step.text}</p>
    <div class="story-nav">
      ${i > 0 ? `<a href="${link(i - 1)}">← Назад</a>` : '<span></span>'}
      <span class="story-count">${i + 1} / ${story.steps.length}</span>
      ${i < story.steps.length - 1 ? `<a href="${link(i + 1)}">Далее →</a>` : `<a href="#/home">Готово</a>`}
    </div>`;
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('?')[0].split('/');
  const id = parts[0] || 'home';
  const story = id === 'story' ? STORIES.find((s) => s.id === parts[1]) : undefined;
  eventsEl.classList.toggle('hidden', id !== 'home');
  storyEl.classList.toggle('hidden', !story);
  if (story) return playStory(story, +(parts[2] ?? 0));
  if (clock.rate === 0) clock.goLive(); // вышли из истории на остановленном кадре
  select(id);
}
addEventListener('hashchange', route);

// ---------- Старт ----------
(async () => {
  const fill = document.querySelector<HTMLDivElement>('#loader .fill')!;
  resize();
  addStars();
  BODIES.forEach(addBody);
  fill.style.width = '50%';
  await loadSpacecraft();
  document.getElementById('search-list')!.innerHTML = [...entities.values()].map((e) => `<option value="${e.def.name}">`).join('');
  fill.style.width = '100%';
  route();
  requestAnimationFrame(frame);
  setTimeout(() => document.getElementById('loader')!.classList.add('done'), 400);
})();
