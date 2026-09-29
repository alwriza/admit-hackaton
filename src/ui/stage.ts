import type { Landmark } from '../vision/poseEngine';

const BONES: [number, number][] = [[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];

export function drawStage(video: HTMLVideoElement, canvas: HTMLCanvasElement, pose?: Landmark[], highlighted: number[] = []): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  const hasFrame = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
  const scale = hasFrame ? Math.min(w / video.videoWidth, h / video.videoHeight) : 1;
  const vw = hasFrame ? video.videoWidth * scale : w;
  const vh = hasFrame ? video.videoHeight * scale : h;
  const ox = (w - vw) / 2;
  const oy = (h - vh) / 2;
  if (hasFrame) {
    ctx.save(); ctx.globalAlpha = 0.72; ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, ox, oy, vw, vh); ctx.restore();
  }
  if (!pose) return;
  const point = (id: number) => ({ x: ox + (pose[id]?.x ?? 0) * vw, y: oy + (pose[id]?.y ?? 0) * vh, visible: (pose[id]?.visibility ?? 0) >= 0.55 });
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#6FD39C';
  for (const [a, b] of BONES) {
    const p = point(a), q = point(b);
    if (!p.visible || !q.visible) continue;
    ctx.beginPath(); ctx.strokeStyle = highlighted.includes(a) || highlighted.includes(b) ? '#E7A28A' : '#6FD39C'; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  for (let i = 0; i < pose.length; i++) {
    const p = point(i); if (!p.visible) continue;
    ctx.beginPath(); ctx.fillStyle = highlighted.includes(i) ? '#E7A28A' : '#F3F1EC'; ctx.arc(p.x, p.y, highlighted.includes(i) ? 4.6 : 3.6, 0, Math.PI * 2); ctx.fill();
  }
}
