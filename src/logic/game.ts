import type { MoveId } from './moves';

export type GameZone = Extract<MoveId, 'DIVE_LEFT' | 'DIVE_RIGHT' | 'HIGH' | 'LOW'>;
export type ShotResult = { zone: GameZone; result: 'clean' | 'saved_with_error' | 'goal'; reactionMs: number | null; errorId: string | null; points: number };
export type GameSnapshot = { phase: 'idle'|'waiting'|'telegraph'|'flight'|'verdict'|'results'; shot: number; total: number; score: number; streak: number; zone?: GameZone; phaseStarted: number; flightMs: number; results: ShotResult[]; verdict?: ShotResult };

const ZONES: GameZone[] = ['DIVE_LEFT','DIVE_RIGHT','HIGH','LOW'];
const FLIGHTS = [1600,1600,1600,1300,1300,1300,1300,1000,1000,1000];

export class GoalkeeperGame {
  private state: GameSnapshot = { phase: 'idle', shot: 0, total: 10, score: 0, streak: 0, phaseStarted: 0, flightMs: 0, results: [] };
  private readySince?: number;
  private wrongMove?: MoveId;
  private coachErrorId?: string;
  snapshot(): GameSnapshot { return this.state; }
  start(now: number): void { this.state = { phase: 'waiting', shot: 1, total: 10, score: 0, streak: 0, phaseStarted: now, flightMs: 0, results: [] }; this.readySince = undefined; this.coachErrorId = undefined; }
  noteTechniqueError(id?: string): void { this.coachErrorId = id; }
  tick(now: number, ready: boolean, confirmed: MoveId[] = []): GameSnapshot {
    const s = this.state;
    if (s.phase === 'waiting') {
      if (!ready) this.readySince = undefined;
      else {
        this.readySince ??= now;
        if (now - this.readySince >= 700) this.beginTelegraph(now);
      }
    } else if (s.phase === 'telegraph' && now - s.phaseStarted >= 400) {
      this.state = { ...s, phase: 'flight', phaseStarted: now };
    } else if (s.phase === 'flight') {
      for (const move of confirmed) {
        if (move === s.zone) { this.finishShot(now, true, move); break; }
        if (move !== 'READY') this.wrongMove = move;
      }
      if (this.state.phase === 'flight' && now - s.phaseStarted >= s.flightMs) this.finishShot(now, false, this.wrongMove);
    } else if (s.phase === 'verdict' && now - s.phaseStarted >= 1800) {
      if (s.shot >= s.total) this.state = { ...s, phase: 'results', phaseStarted: now };
      else this.state = { ...s, phase: 'waiting', shot: s.shot + 1, zone: undefined, phaseStarted: now, flightMs: 0, verdict: undefined };
      this.readySince = undefined;
    }
    return this.state;
  }
  private beginTelegraph(now: number): void {
    const previous = this.state.results.slice(-2).map((r) => r.zone);
    const choices = ZONES.filter((z) => !(previous.length === 2 && previous[0] === z && previous[1] === z));
    const zone = choices[Math.floor(Math.random() * choices.length)];
    this.wrongMove = undefined;
    this.coachErrorId = undefined;
    this.state = { ...this.state, phase: 'telegraph', zone, phaseStarted: now, flightMs: FLIGHTS[this.state.shot - 1] };
  }
  private finishShot(now: number, saved: boolean, move?: MoveId): void {
    const s = this.state;
    const reactionMs = saved ? Math.max(0, now - s.phaseStarted) : null;
    const clean = saved && s.zone === move && !this.coachErrorId;
    const result: ShotResult = {
      zone: s.zone!, result: clean ? 'clean' : saved ? 'saved_with_error' : 'goal', reactionMs,
      errorId: clean ? null : !saved && this.wrongMove ? 'T5' : this.coachErrorId ?? null,
      points: clean ? 150 + Math.round(50 * (1 - (reactionMs ?? 0) / s.flightMs)) * (s.streak >= 2 ? 2 : 1) : saved ? 100 : 0,
    };
    const streak = clean ? s.streak + 1 : 0;
    const results = [...s.results, result];
    this.state = { ...s, phase: 'verdict', phaseStarted: now, results, verdict: result, score: s.score + result.points, streak };
  }
}
