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
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
    const vw = video.videoWidth * scale, vh = video.videoHeight * scale;
    ctx.save(); ctx.globalAlpha = 0.34; ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, (w - vw) / 2, (h - vh) / 2, vw, vh); ctx.restore();
  }
  if (!pose) return;
  const point = (id: number) => ({ x: pose[id].x * w, y: pose[id].y * h, visible: (pose[id].visibility ?? 1) >= 0.55 });
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#a6f083'; ctx.shadowColor = '#8efb62'; ctx.shadowBlur = 9;
  for (const [a, b] of BONES) {
    const p = point(a), q = point(b);
    if (!p.visible || !q.visible) continue;
    ctx.beginPath(); ctx.strokeStyle = highlighted.includes(a) || highlighted.includes(b) ? '#ff675f' : '#a6f083'; ctx.shadowColor = highlighted.includes(a) || highlighted.includes(b) ? '#ff675f' : '#8efb62'; ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.shadowBlur = 8;
  for (let i = 0; i < pose.length; i++) {
    const p = point(i); if (!p.visible) continue;
    ctx.shadowColor = highlighted.includes(i) ? '#ff675f' : '#8efb62';
    ctx.beginPath(); ctx.fillStyle = highlighted.includes(i) ? '#ff675f' : '#e8ffdd'; ctx.arc(p.x, p.y, highlighted.includes(i) ? 6 : i < 11 ? 3 : 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}
