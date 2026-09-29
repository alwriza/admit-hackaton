export const CONFIG = {
  visibility: 0.55,
  oneEuro: { minCutoff: 1, beta: 0.007, dCutoff: 1 },
  calibrationMs: 3000,
  moveHoldMs: 150,
  releaseProgress: 0.6,
  ready: { kneeMax: 165, feetWidthMin: 1, wristMargin: 0, dxMax: 0.3 },
  dive: { reachMin: 1.5, dxMin: 0.3 },
  high: { wristMargin: 0.25, elbowMin: 140 },
  low: { hipDropMin: 0.25 },
} as const;
