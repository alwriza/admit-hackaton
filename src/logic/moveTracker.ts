import { CONFIG } from '../config';
import { MOVE_IDS, type MoveId, type MoveReading } from './moves';

export class MoveTracker {
  private active?: MoveId;
  private startedAt = 0;
  private confirmed = new Set<MoveId>();
  update(readings: Record<MoveId, MoveReading>, now: number): MoveId[] {
    if (this.active && readings[this.active].progress < CONFIG.releaseProgress) {
      this.active = undefined;
      this.startedAt = 0;
    }
    if (!this.active) {
      this.active = MOVE_IDS.find((id) => readings[id].ok);
      this.startedAt = this.active ? now : 0;
    }
    if (this.active && readings[this.active].ok && now - this.startedAt >= CONFIG.moveHoldMs && !this.confirmed.has(this.active)) {
      this.confirmed.add(this.active);
      return [this.active];
    }
    for (const id of this.confirmed) if (readings[id].progress < CONFIG.releaseProgress) this.confirmed.delete(id);
    return [];
  }
  reset(): void { this.active = undefined; this.startedAt = 0; this.confirmed.clear(); }
}
