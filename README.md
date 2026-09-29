# KeeperCam 🧤 — стань вратарём перед веб-камерой

**KeeperCam** — браузерная игра про вратаря: игрок отбивает мячи движениями тела, а AI-тренер объясняет, как улучшить технику. Сейчас готов первый этап прототипа: запуск камеры, локальное распознавание позы и визуализация скелета.

## What it is

KeeperCam is a browser goalkeeper game controlled by your body. Pose recognition runs locally in the browser; video frames are not uploaded. Track: Game (with coaching).

## Current prototype

- Camera permission flow with specific recovery messages.
- MediaPipe Pose Landmarker Lite, with GPU to CPU fallback.
- Mirrored camera view and a live 33-landmark skeleton overlay.
- Model and WebAssembly runtime are self-hosted under `public/`.
- Three-second body calibration and One Euro smoothing for landmark movement.
- Five live rule-based movement meters; press `D` to show feature values and FPS.
- A short tutorial that asks the player to trigger the one-hand error coach.
- Ten-shot game loop, target zones, scoring, reaction timing, results and local leaderboard.
- Russian technique hints with highlighted joints, optional speech, and synthesized game sounds.
- Pauses the game when the tab is hidden and reinitializes pose tracking when the player returns.
- Shows a low-performance notice if tracking remains below 12 FPS for 3 seconds.

## Movements

| Movement | What the detector checks |
|---|---|
| READY / Стойка | Bent knees, stance wider than shoulders, hands between shoulders and hips, centered body |
| DIVE_LEFT / Бросок влево | Body center shifts left and a wrist reaches left beyond the calibrated shoulder width |
| DIVE_RIGHT / Бросок вправо | Body center shifts right and a wrist reaches right beyond the calibrated shoulder width |
| HIGH / Верхний мяч | Both wrists rise above the head and both elbows extend |
| LOW / Нижний мяч | Hips lower relative to calibration and both wrists move below the hips |

Movement thresholds are grouped in `src/config.ts`. Each meter uses a progress score; a move event requires the rule to remain true for 150 ms and releases below 60% progress.

## Run locally

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite and allow camera access. Camera APIs require HTTPS or localhost.

## Build

```sh
npm run build
npm run preview
```

The static production output is written to `dist/` and can be deployed to Vercel or Netlify.

## Recognition pipeline

Camera → MediaPipe Pose Landmarker (33 landmarks, local inference) → One Euro smoothing → mirrored screen coordinates → body calibration → geometric movement rules → live meters and canvas skeleton overlay.

## Error coach

The coach evaluates framing, goalkeeper stance, and save technique rules each frame. It waits 300 ms before showing the highest-priority hint, highlights the relevant joints, and can speak the hint in Russian. The tutorial includes a deliberate one-hand high-save attempt so the player can see the coach catch a mistake.

## Borrowed work

- Vite TypeScript template (project scaffold).
- `@mediapipe/tasks-vision` and the official MediaPipe Pose Landmarker Lite model.
- MediaPipe WASM runtime files distributed with `@mediapipe/tasks-vision`.

Game, recognition-rule, and coaching logic are implemented in this repository.
