import { CONFIG } from '../config';
import type { Landmark } from './poseEngine';

type Point = { x: number; y: number };
export type PoseFeatures = {
  visible: boolean;
  dx: number | null; hipDrop: number | null;
  kneeAngleL: number | null; kneeAngleR: number | null;
  elbowAngleL: number | null; elbowAngleR: number | null;
  wristsAboveHead: number | null;
  leftReach: number | null; rightReach: number | null; feetWidth: number | null;
  wristsBelowHips: boolean | null;
  wristsInReadyZone: boolean | null;
  values: Record<string, number | null>;
};

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function angle(a: Point, b: Point, c: Point): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }, cb = { x: c.x - b.x, y: c.y - b.y };
  const cos = (ab.x * cb.x + ab.y * cb.y) / (Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y) || 1);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}
export function visiblePose(pose: Landmark[], ids: number[]): boolean {
  return ids.every((id) => (pose[id]?.visibility ?? 0) >= CONFIG.visibility);
}

export function computeFeatures(pose: Landmark[], base?: { c0: Point; hipY0: number; noseY0: number; sw: number; tl: number }): PoseFeatures {
  const get = (id: number): Point | null => {
    const p = pose[id];
    return p && (p.visibility ?? 0) >= CONFIG.visibility ? { x: p.x, y: p.y } : null;
  };
  const [nose, shoulderL, shoulderR, elbowL, elbowR, wristL, wristR, hipL, hipR, kneeL, kneeR, ankleL, ankleR] = [0,11,12,13,14,15,16,23,24,25,26,27,28].map(get);
  const list = [nose, shoulderL, shoulderR, elbowL, elbowR, wristL, wristR, hipL, hipR, kneeL, kneeR, ankleL, ankleR];
  const [n, sl, sr, el, er, wl, wr, hl, hr, kl, kr, al, ar] = list;
  const visible = list.every(Boolean);
  const out: PoseFeatures = { visible, dx: null, hipDrop: null, kneeAngleL: null, kneeAngleR: null, elbowAngleL: null, elbowAngleR: null, wristsAboveHead: null, leftReach: null, rightReach: null, feetWidth: null, wristsBelowHips: null, wristsInReadyZone: null, values: {} };
  if (kl && hl && al) out.kneeAngleL = angle(hl, kl, al);
  if (kr && hr && ar) out.kneeAngleR = angle(hr, kr, ar);
  if (sl && el && wl) out.elbowAngleL = angle(sl, el, wl);
  if (sr && er && wr) out.elbowAngleR = angle(sr, er, wr);
  if (base && n && sl && sr && hl && hr && wl && wr && al && ar) {
    const shoulders = midpoint(sl, sr), hips = midpoint(hl, hr);
    const center = midpoint(shoulders, hips);
    const sw = Math.max(base.sw, 0.001), tl = Math.max(base.tl, 0.001);
    out.dx = (center.x - base.c0.x) / sw;
    out.hipDrop = (hips.y - base.hipY0) / tl;
    out.wristsAboveHead = Number(wl.y < n.y - CONFIG.high.wristMargin * tl) + Number(wr.y < n.y - CONFIG.high.wristMargin * tl);
    out.leftReach = (base.c0.x - Math.min(wl.x, wr.x)) / sw;
    out.rightReach = (Math.max(wl.x, wr.x) - base.c0.x) / sw;
    out.feetWidth = Math.abs(al.x - ar.x) / sw;
    out.wristsBelowHips = wl.y > hips.y && wr.y > hips.y;
    out.wristsInReadyZone = wl.y >= shoulders.y && wl.y <= hips.y && wr.y >= shoulders.y && wr.y <= hips.y;
  }
  out.values = { dx: out.dx, hipDrop: out.hipDrop, kneeAngleL: out.kneeAngleL, kneeAngleR: out.kneeAngleR, elbowAngleL: out.elbowAngleL, elbowAngleR: out.elbowAngleR, wristsAboveHead: out.wristsAboveHead, leftReach: out.leftReach, rightReach: out.rightReach, feetWidth: out.feetWidth };
  return out;
}

export type BodyCalibration = { c0: Point; hipY0: number; noseY0: number; sw: number; tl: number };
export class Calibration {
  private frames: BodyCalibration[] = [];
  private startedAt?: number;
  add(pose: Landmark[]): BodyCalibration | undefined {
    const needed = [0,11,12,23,24,25,26,27,28];
    if (!visiblePose(pose, needed)) { this.reset(); return undefined; }
    const point = (i: number) => ({ x: pose[i].x, y: pose[i].y });
    const sl = point(11), sr = point(12), hl = point(23), hr = point(24);
    const shoulder = midpoint(sl, sr), hip = midpoint(hl, hr);
    const now = performance.now();
    this.startedAt ??= now;
    this.frames.push({ c0: midpoint(shoulder, hip), hipY0: hip.y, noseY0: pose[0].y, sw: distance(sl, sr), tl: distance(shoulder, hip) });
    if (this.frames.length < 10 || now - this.startedAt < CONFIG.calibrationMs) return undefined;
    const median = (values: number[]) => values.sort((a,b) => a-b)[Math.floor(values.length / 2)];
    const keys = ['c0.x','c0.y','hipY0','noseY0','sw','tl'] as const;
    const vals = keys.map((key) => median(this.frames.map((f) => key.startsWith('c0.') ? f.c0[key.slice(3) as 'x'|'y'] : f[key as 'hipY0'|'noseY0'|'sw'|'tl'])));
    return { c0: { x: vals[0], y: vals[1] }, hipY0: vals[2], noseY0: vals[3], sw: vals[4], tl: vals[5] };
  }
  progress(now = performance.now()): number { return this.startedAt === undefined ? 0 : Math.min(1, (now - this.startedAt) / CONFIG.calibrationMs); }
  reset(): void { this.frames = []; this.startedAt = undefined; }
}
