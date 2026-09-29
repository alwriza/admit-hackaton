export class OneEuroFilter {
  private previous?: number;
  private previousDerivative = 0;
  private previousTime?: number;

  constructor(private readonly minCutoff: number, private readonly beta: number, private readonly derivativeCutoff: number) {}

  filter(value: number, timeMs: number): number {
    if (this.previous === undefined || this.previousTime === undefined) {
      this.previous = value;
      this.previousTime = timeMs;
      return value;
    }
    const dt = Math.max((timeMs - this.previousTime) / 1000, 1 / 240);
    const derivative = (value - this.previous) / dt;
    const filteredDerivative = this.lowPass(derivative, this.previousDerivative, this.alpha(this.derivativeCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(filteredDerivative);
    const filtered = this.lowPass(value, this.previous, this.alpha(cutoff, dt));
    this.previous = filtered;
    this.previousDerivative = filteredDerivative;
    this.previousTime = timeMs;
    return filtered;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  private lowPass(value: number, previous: number, alpha: number): number {
    return alpha * value + (1 - alpha) * previous;
  }
}
