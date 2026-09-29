import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config';
import { OneEuroFilter } from './oneEuro';

export type Landmark = { x: number; y: number; z: number; visibility?: number };
const WASM = '/mediapipe/wasm';
const MODEL = '/models/pose_landmarker_lite.task';

export class PoseEngine {
  private filters: { x: OneEuroFilter; y: OneEuroFilter }[] = [];
  private recovering?: Promise<void>;
  private failure?: unknown;
  private constructor(private vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, private landmarker: PoseLandmarker, private delegate: 'GPU'|'CPU') {}

  static async create(): Promise<PoseEngine> {
    const vision = await FilesetResolver.forVisionTasks(WASM);
    const probe = document.createElement('canvas');
    const webgl2 = probe.getContext('webgl2');
    const gpuAvailable = Boolean(webgl2);
    webgl2?.getExtension('WEBGL_lose_context')?.loseContext();
    if (!gpuAvailable) {
      throw new Error('WebGL2 required');
    }
    const cpuRequested = new URLSearchParams(location.search).get('delegate')?.toLowerCase() === 'cpu';
    if (cpuRequested) {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 1,
      });
      return new PoseEngine(vision, landmarker, 'CPU');
    }
    try {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO', numPoses: 1,
      });
      return new PoseEngine(vision, landmarker, 'GPU');
    } catch {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 1,
      });
      return new PoseEngine(vision, landmarker, 'CPU');
    }
  }

  detect(video: HTMLVideoElement): Landmark[] | undefined {
    if (this.recovering || this.failure) return undefined;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return undefined;
    try {
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
    } catch (error) {
      if (this.delegate === 'GPU') this.recovering = this.switchToCpu();
      else this.failure = error;
      return undefined;
    }
  }

  private async switchToCpu(): Promise<void> {
    try { this.landmarker.close(); } catch { /* A lost GPU context may also prevent cleanup. */ }
    try {
      this.landmarker = await PoseLandmarker.createFromOptions(this.vision, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 1,
      });
      this.delegate = 'CPU';
      this.filters = [];
    } catch (error) { this.failure = error; }
    finally { this.recovering = undefined; }
  }

  get isRecovering(): boolean { return Boolean(this.recovering); }
  consumeFailure(): unknown { const error=this.failure; this.failure=undefined; return error; }
  close(): void { this.landmarker.close(); }
}
