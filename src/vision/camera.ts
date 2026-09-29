export async function startCamera(video: HTMLVideoElement): Promise<void> {
  if (!window.isSecureContext) throw new Error('Secure context required');
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  video.srcObject = stream;
  await video.play();
  await new Promise<void>((resolve) => {
    if (video.videoWidth) resolve();
    else video.addEventListener('loadedmetadata', () => resolve(), { once: true });
  });
}

export function stopCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject;
  if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
}
