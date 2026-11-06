// Эфемериды: astronomy-engine (MIT) для планет, Луны и галилеевых спутников; JSON из Horizons для КА.
import * as A from 'astronomy-engine';
import { BodyDef } from './bodies';

export const KM_PER_AU = 149597870.7;
export const UNIT_KM = 1e6; // 1 единица сцены = 1 млн км
export const AU = KM_PER_AU / UNIT_KM;

const ECL = A.Rotation_EQJ_ECL();

export interface State { pos: [number, number, number]; vel: [number, number, number] } // км и км/с, гелиоцентрическая эклиптика J2000

function toKm(sv: A.StateVector, rotate: boolean): State {
  const p = new A.Vector(sv.x, sv.y, sv.z, sv.t);
  const v = new A.Vector(sv.vx, sv.vy, sv.vz, sv.t);
  const pr = rotate ? A.RotateVector(ECL, p) : p;
  const vr = rotate ? A.RotateVector(ECL, v) : v;
  const k = KM_PER_AU, kv = KM_PER_AU / 86400;
  return { pos: [pr.x * k, pr.y * k, pr.z * k], vel: [vr.x * kv, vr.y * kv, vr.z * kv] };
}

function add(a: State, b: State): State {
  return { pos: [a.pos[0] + b.pos[0], a.pos[1] + b.pos[1], a.pos[2] + b.pos[2]], vel: [a.vel[0] + b.vel[0], a.vel[1] + b.vel[1], a.vel[2] + b.vel[2]] };
}

const ZERO: State = { pos: [0, 0, 0], vel: [0, 0, 0] };

/** Гелиоцентрическое состояние тела на дату. */
export function bodyState(def: BodyDef, date: Date): State {
  if (def.id === 'sun') return ZERO;
  if (def.id === 'moon') {
    const earth = toKm(A.HelioState(A.Body.Earth, date), true);
    return add(earth, toKm(A.GeoMoonState(date), true));
  }
  if (def.parent === 'jupiter') {
    const jup = toKm(A.HelioState(A.Body.Jupiter, date), true);
    const m = A.JupiterMoons(date) as unknown as Record<string, A.StateVector>;
    return add(jup, toKm(m[def.id], true));
  }
  if (def.astro !== undefined) return toKm(A.HelioState(def.astro, date), true);
  return ZERO;
}

/** Точки орбиты относительно родителя (км), один полный период. */
export function orbitPath(def: BodyDef, date: Date, parentState: (d: Date) => State, steps = 360): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const period = def.orbitDays ?? 365;
  for (let i = 0; i <= steps; i++) {
    const d = new Date(date.getTime() - (i / steps) * period * 86400e3);
    const s = bodyState(def, d), p = parentState(d);
    pts.push([s.pos[0] - p.pos[0], s.pos[1] - p.pos[1], s.pos[2] - p.pos[2]]);
  }
  return pts;
}

// ---- Космические аппараты: таблица Horizons {t: unix ms[], p: [x,y,z] км[]} ----
export interface Track { t: number[]; p: [number, number, number][]; v?: [number, number, number][] }

export function trackState(tr: Track, date: Date): State | null {
  const t = date.getTime(), T = tr.t;
  if (t < T[0] || t > T[T.length - 1]) return null;
  let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
  const f = (t - T[lo]) / (T[hi] - T[lo] || 1);
  const a = tr.p[lo], b = tr.p[hi], dt = (T[hi] - T[lo]) / 1000 || 1;
  return {
    pos: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f],
    vel: [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt, (b[2] - a[2]) / dt],
  };
}
