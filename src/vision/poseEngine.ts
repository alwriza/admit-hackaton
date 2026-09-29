import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config';
import { OneEuroFilter } from './oneEuro';

export type Landmark = { x: number; y: number; z: number; visibility?: number };
const WASM = '/mediapipe/wasm';
const MODEL = '/models/pose_landmarker_lite.task';

export class PoseEngine {
  private filters: { x: OneEuroFilter; y: OneEuroFilter }[] = [];
  private constructor(private landmarker: PoseLandmarker) {}

  static async create(): Promise<PoseEngine> {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    try {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO', numPoses: 1,
      });
      return new PoseEngine(landmarker);
    } catch {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 1,
      });
      return new PoseEngine(landmarker);
    }
  }

  detect(video: HTMLVideoElement): Landmark[] | undefined {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return undefined;
    const result = this.landmarker.detectForVideo(video, performance.now());
    const landmarks = result.landmarks[0];
    if (!landmarks) return undefined;
    const now = performance.now();
    return landmarks.map(({ x, y, z, visibility }, index) => {
      this.filters[index] ??= {
        x: new OneEuroFilter(CONFIG.oneEuro.minCutoff, CONFIG.oneEuro.beta, CONFIG.oneEuro.dCutoff),
        y: new OneEuroFilter(CONFIG.oneEuro.minCutoff, CONFIG.oneEuro.beta, CONFIG.oneEuro.dCutoff),
      };
      return { x: 1 - this.filters[index].x.filter(x, now), y: this.filters[index].y.filter(y, now), z, visibility };
    });
  }

  close(): void { this.landmarker.close(); }
}
