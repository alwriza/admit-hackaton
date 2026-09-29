import type { GameZone } from './game';
import type { MoveId } from './moves';
import type { Landmark } from '../vision/poseEngine';
import type { PoseFeatures } from '../vision/features';

export type CoachPhase = 'calibration'|'waiting'|'flight'|'other';
export type CoachRule = { id: string; priority: number; message: string; joints: number[]; arrow?: 'left'|'right'|'down'|'up' };
export type CoachHint = CoachRule & { positive?: boolean };
const vis = (pose: Landmark[], ids: number[]) => ids.every((id) => (pose[id]?.visibility ?? 0) >= 0.55);

export function evaluateCoach(pose: Landmark[], f: PoseFeatures, phase: CoachPhase, target?: GameZone, confirmed?: MoveId): CoachRule[] {
  const rules: CoachRule[] = [];
  const ankles = vis(pose,[27,28]), upper = vis(pose,[0,11,12]);
  const key = [0,11,12,23,24,25,26,27,28];
  const mean = key.reduce((sum,id)=>sum+(pose[id]?.visibility ?? 0),0)/key.length;
  if (!ankles) rules.push({ id:'F1', priority:100, message:'Отойди на шаг назад — мне не видно твоих стоп', joints:[27,28] });
  if (!upper) rules.push({ id:'F2', priority:99, message:'Встань в центр кадра — мне не видно плеч', joints:[0,11,12] });
  if (mean < 0.6) rules.push({ id:'F3', priority:98, message:'Слишком темно — повернись лицом к свету', joints:key });
  if (phase === 'waiting') {
    if (f.kneeAngleL !== null && f.kneeAngleR !== null && f.kneeAngleL > 165 && f.kneeAngleR > 165) rules.push({id:'S1',priority:60,message:'Слегка согни колени — вратарь всегда готов к прыжку',joints:[25,26]});
    if (f.feetWidth !== null && f.feetWidth < 1) rules.push({id:'S2',priority:50,message:'Поставь стопы шире плеч',joints:[27,28],arrow:'left'});
    if (f.wristsBelowHips) rules.push({id:'S3',priority:40,message:'Подними руки перед собой, ладони к мячу',joints:[15,16],arrow:'up'});
    if (f.dx !== null && Math.abs(f.dx) > 0.3) rules.push({id:'S4',priority:30,message:'Вернись в центр ворот',joints:[23,24],arrow:f.dx < 0 ? 'right' : 'left'});
  }
  if (phase === 'flight' && target) {
    if ((target === 'DIVE_LEFT' && (f.leftReach ?? 0) > 1.5 && Math.abs(f.dx ?? 0) < 0.3) || (target === 'DIVE_RIGHT' && (f.rightReach ?? 0) > 1.5 && Math.abs(f.dx ?? 0) < 0.3)) rules.push({id:'T1',priority:70,message:'Шагни в сторону мяча всем телом, а не только рукой',joints:[23,24],arrow:target === 'DIVE_LEFT' ? 'left':'right'});
    if (target === 'HIGH' && f.wristsAboveHead === 1) rules.push({id:'T2',priority:75,message:'Верхний мяч берут двумя руками — подними обе',joints:[(pose[15]?.y ?? 0) > (pose[16]?.y ?? 0) ? 15 : 16],arrow:'up'});
    if (target === 'HIGH' && f.wristsAboveHead === 2 && ((f.elbowAngleL ?? 180) < 140 || (f.elbowAngleR ?? 180) < 140)) rules.push({id:'T3',priority:74,message:'Выпрями руки вверх полностью',joints:[13,14],arrow:'up'});
    if (target === 'LOW' && f.wristsBelowHips && (f.hipDrop ?? 1) < 0.15 && (f.kneeAngleL ?? 0) > 150 && (f.kneeAngleR ?? 0) > 150) rules.push({id:'T4',priority:73,message:'Согни колени, а не спину — опустись ниже',joints:[23,24,25,26],arrow:'down'});
    if (confirmed && confirmed !== 'READY' && confirmed !== target) {
      const names: Record<GameZone, string> = { DIVE_LEFT:'влево', DIVE_RIGHT:'вправо', HIGH:'верхом', LOW:'низом' };
      rules.push({id:'T5',priority:80,message:`Мяч летел ${names[target]} — нужно было сделать правильное движение`,joints:[]});
    }
  }
  return rules.sort((a,b)=>b.priority-a.priority);
}

export class CoachController {
  private candidate?: string;
  private candidateSince = 0;
  private lastShown = new Map<string, number>();
  private current?: CoachRule;
  private positiveUntil = 0;
  update(rules: CoachRule[], now: number): CoachHint | undefined {
    const top = rules[0];
    if (top?.id === this.current?.id) return this.current;
    if (!top) {
      if (this.current) this.positiveUntil = now + 800;
      this.current = undefined;
      this.candidate = undefined;
      return now < this.positiveUntil ? { id:'OK', priority:0, message:'Отлично!', joints:[], positive:true } : undefined;
    }
    if (this.candidate !== top.id) { this.candidate = top.id; this.candidateSince = now; return this.current; }
    if (now - this.candidateSince < 300) return this.current;
    if (now - (this.lastShown.get(top.id) ?? -Infinity) < 3500) return this.current;
    this.current = top;
    this.lastShown.set(top.id, now);
    return this.current;
  }
  hint(): CoachHint | undefined { return this.current; }
}
