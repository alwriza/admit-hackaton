import { CONFIG } from '../config';
import type { PoseFeatures } from '../vision/features';

export const MOVE_IDS = ['READY','DIVE_LEFT','DIVE_RIGHT','HIGH','LOW'] as const;
export type MoveId = typeof MOVE_IDS[number];
export type MoveReading = { id: MoveId; progress: number; ok: boolean };
const ratio = (value: number | null, threshold: number) => value === null ? 0 : Math.max(0, Math.min(1, value / threshold));
const average = (values: number[]) => values.reduce((a,b) => a+b,0) / values.length;

export function detectMoves(f: PoseFeatures): Record<MoveId, MoveReading> {
  const kneeReady = f.kneeAngleL !== null && f.kneeAngleR !== null ? Number(f.kneeAngleL < CONFIG.ready.kneeMax && f.kneeAngleR < CONFIG.ready.kneeMax) : 0;
  const readyParts = [kneeReady, Number((f.feetWidth ?? 0) > CONFIG.ready.feetWidthMin), Number(f.wristsInReadyZone === true), Number(Math.abs(f.dx ?? Infinity) < CONFIG.ready.dxMax)];
  const readyProgress = average(readyParts);
  const left = average([ratio(f.leftReach, CONFIG.dive.reachMin), ratio(Math.max(0, -(f.dx ?? 0)), CONFIG.dive.dxMin)]);
  const right = average([ratio(f.rightReach, CONFIG.dive.reachMin), ratio(Math.max(0, f.dx ?? 0), CONFIG.dive.dxMin)]);
  const highHeight = (f.wristsAboveHead ?? 0) / 2;
  const highStraight = f.elbowAngleL !== null && f.elbowAngleR !== null ? Number(f.elbowAngleL > CONFIG.high.elbowMin && f.elbowAngleR > CONFIG.high.elbowMin) : 0;
  const low = ratio(f.hipDrop, CONFIG.low.hipDropMin);
  const mk = (id: MoveId, progress: number, ok: boolean): MoveReading => ({ id, progress: Math.max(0,Math.min(1,progress)), ok });
  return {
    READY: mk('READY', readyProgress, readyProgress === 1),
    DIVE_LEFT: mk('DIVE_LEFT', left, (f.leftReach ?? 0) > CONFIG.dive.reachMin && (f.dx ?? 0) < -CONFIG.dive.dxMin),
    DIVE_RIGHT: mk('DIVE_RIGHT', right, (f.rightReach ?? 0) > CONFIG.dive.reachMin && (f.dx ?? 0) > CONFIG.dive.dxMin),
    HIGH: mk('HIGH', average([highHeight, highStraight]), f.wristsAboveHead === 2 && highStraight === 1),
    LOW: mk('LOW', low, (f.hipDrop ?? 0) > CONFIG.low.hipDropMin && f.wristsBelowHips === true),
  };
}
