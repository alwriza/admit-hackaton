import './style.css';
import { startCamera, stopCamera } from './vision/camera';
import { PoseEngine } from './vision/poseEngine';
import { drawStage } from './ui/stage';
import { Calibration, computeFeatures } from './vision/features';
import { detectMoves, MOVE_IDS, type MoveId } from './logic/moves';
import { MoveTracker } from './logic/moveTracker';
import { GoalkeeperGame, type GameZone } from './logic/game';
import { CoachController, evaluateCoach, type CoachPhase } from './logic/coach';
import { getLeaderboard, saveScore } from './storage/leaderboard';
import { SoundEffects } from './audio/sfx';
import { CONFIG } from './config';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <main class="shell">
    <header class="topbar"><a class="brand" href="#" aria-label="KeeperCam"><span class="brand-mark">K</span> KEEPER<span class="brand-light">CAM</span></a><nav class="flow-stepper hidden" id="flow-stepper"><span>1 Камера</span><i>→</i><span>2 Калибровка</span><i>→</i><span>3 Обучение</span><i>→</i><span>4 Игра</span><i>→</i><span>5 Итоги</span></nav><span class="build-tag"><i></i> ПРОТОТИП · ЛОКАЛЬНОЕ РАСПОЗНАВАНИЕ</span></header>
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow"><span class="eyebrow-line"></span> ТРЕНИРОВКА НАЧИНАЕТСЯ ЗДЕСЬ</p><h1>Встань в ворота.<br/><em>Поймай момент.</em></h1><p class="lead">Стань вратарём перед веб-камерой. ИИ-тренер увидит движение и подскажет, как улучшить технику.</p><button class="primary" id="start"><span>Начать тренировку</span><span class="button-arrow">↗</span></button><div class="privacy"><span class="lock">⌑</span><span>Видео обрабатывается прямо на устройстве<br/><b>Кадры не отправляются в интернет</b></span></div></div>
      <div class="demo-card"><div class="demo-top"><span><span class="live-dot"></span> ПОЛЕ ЗРЕНИЯ ИИ</span><span class="camera-state" id="camera-state">ОЖИДАНИЕ</span></div><div class="stage-wrap" id="stage-wrap"><div class="stage-placeholder"><div class="goal-lines"><span></span><span></span><span></span></div><div class="person-icon"><div class="person-head"></div><div class="person-body"></div><div class="person-arms"></div><div class="person-legs"></div></div><div class="stage-prompt"><span class="prompt-icon">◎</span><span>Встань в кадр, чтобы начать</span></div></div><video id="camera" playsinline autoplay muted></video><canvas id="stage"></canvas><div class="camera-overlay"><span class="rec"><i></i> LIVE</span><span class="frame-corner tl"></span><span class="frame-corner tr"></span><span class="frame-corner bl"></span><span class="frame-corner br"></span></div></div><div class="demo-bottom"><div><span class="status-label">СТАТУС СИСТЕМЫ</span><strong id="status">Готова к запуску</strong></div><div class="pose-badge" id="pose-badge"><span></span> ПОЗА НЕ НАЙДЕНА</div></div></div>
    </section>
    <section class="steps"><div class="steps-heading"><span class="eyebrow">ТВОЁ ДВИЖЕНИЕ — ТВОЙ ДЖОЙСТИК</span><span class="steps-note">Три шага до первого сейва</span></div><div class="step-grid"><article class="step"><span class="step-num">01</span><div class="step-icon">↗</div><h3>Двигайся</h3><p>Лови мячи всем телом — без контроллеров и датчиков.</p></article><article class="step"><span class="step-num">02</span><div class="step-icon scan-icon">⌗</div><h3>Тренируйся</h3><p>Камера распознаёт позу и оценивает технику в реальном времени.</p></article><article class="step"><span class="step-num">03</span><div class="step-icon">✳</div><h3>Расти</h3><p>Получай точные подсказки тренера после каждого движения.</p></article></div></section>
    <footer><span>KEEPERCAM <span class="footer-dot">·</span> РАННИЙ ПРОТОТИП</span><span>СДЕЛАНО ДЛЯ ДВИЖЕНИЯ</span></footer>
    <div class="modal hidden" id="modal"><div class="modal-card"><button class="modal-close" id="close-modal" aria-label="Закрыть">×</button><p class="eyebrow">НУЖНА ВЕБ-КАМЕРА</p><h2 id="modal-title">Разреши доступ к камере</h2><p id="modal-copy">Камера нужна, чтобы распознавать движения. Видео обрабатывается локально и не покидает устройство.</p><div class="loading hidden" id="loading"><div class="loading-track"><span></span></div><small>ЗАГРУЖАЕМ МОДЕЛЬ РАСПОЗНАВАНИЯ ТЕЛА…</small></div><button class="primary modal-action" id="retry">Продолжить <span class="button-arrow">↗</span></button></div></div>
  </main>`;

const video = document.querySelector<HTMLVideoElement>('#camera')!;
const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const stageWrap = document.querySelector<HTMLElement>('#stage-wrap')!;
const status = document.querySelector<HTMLElement>('#status')!;
const cameraState = document.querySelector<HTMLElement>('#camera-state')!;
const soundToggle = document.createElement('button');
soundToggle.className = 'sound-toggle';
soundToggle.textContent = 'ЗВУК · ВКЛ';
cameraState.insertAdjacentElement('beforebegin', soundToggle);
const sfx = new SoundEffects();
soundToggle.addEventListener('click', () => { sfx.enabled = !sfx.enabled; soundToggle.textContent = sfx.enabled ? 'ЗВУК · ВКЛ' : 'ЗВУК · ВЫКЛ'; });
const poseBadge = document.querySelector<HTMLElement>('#pose-badge')!;
const modal = document.querySelector<HTMLElement>('#modal')!;
const modalTitle = document.querySelector<HTMLElement>('#modal-title')!;
const modalCopy = document.querySelector<HTMLElement>('#modal-copy')!;
const loading = document.querySelector<HTMLElement>('#loading')!;
const retry = document.querySelector<HTMLButtonElement>('#retry')!;
const flowStepper = document.querySelector<HTMLElement>('#flow-stepper')!;
function setFlowStep(step: number) { flowStepper.classList.remove('hidden'); flowStepper.querySelectorAll('span').forEach((item, index) => item.classList.toggle('current', index === step - 1)); }
const labels = ['Стойка', 'Влево', 'Вправо', 'Верхний мяч', 'Нижний мяч'];
const ids = [...MOVE_IDS];
const meterPanel = document.createElement('div');
meterPanel.className = 'live-meters hidden';
meterPanel.innerHTML = `<div class="meters-head"><span>РАСПОЗНАВАНИЕ ДВИЖЕНИЙ</span><span id="calibration-state">КАЛИБРОВКА · 3 СЕК</span></div>${ids.map((id, i) => `<div class="meter-row"><span>${labels[i]}</span><div class="meter-track"><i data-meter="${id}"></i></div></div>`).join('')}`;
stageWrap.insertAdjacentElement('afterend', meterPanel);
const debug = document.createElement('pre');
debug.className = 'debug-overlay hidden';
debug.textContent = 'DEBUG · D';
stageWrap.append(debug);
const performanceNotice = document.createElement('div');
performanceNotice.className = 'performance-notice hidden';
performanceNotice.textContent = 'Слабая производительность — закрой другие вкладки';
stageWrap.append(performanceNotice);
const calibrationState = meterPanel.querySelector<HTMLElement>('#calibration-state')!;
const gameButton = document.createElement('button');
gameButton.className = 'game-start';
gameButton.textContent = 'Сыграть 10 ударов';
gameButton.disabled = true;
meterPanel.append(gameButton);
stageWrap.insertAdjacentHTML('beforeend', '<div class="goal-layer hidden" id="goal-layer"><i data-zone="DIVE_LEFT"></i><i data-zone="DIVE_RIGHT"></i><i data-zone="HIGH"></i><i data-zone="LOW"></i></div><div class="game-hud hidden" id="game-hud"><span class="shot-count" id="shot-count"></span><span class="target-label" id="target-label"></span><span class="flying-ball" id="flying-ball">⚽</span><span class="verdict-label" id="verdict-label"></span></div>');
const gameHud = stageWrap.querySelector<HTMLElement>('#game-hud')!;
const shotCount = stageWrap.querySelector<HTMLElement>('#shot-count')!;
const targetLabel = stageWrap.querySelector<HTMLElement>('#target-label')!;
const flyingBall = stageWrap.querySelector<HTMLElement>('#flying-ball')!;
const verdictLabel = stageWrap.querySelector<HTMLElement>('#verdict-label')!;
const goalLayer = stageWrap.querySelector<HTMLElement>('#goal-layer')!;
const resultsCard = document.createElement('section');
resultsCard.className = 'results-card hidden';
meterPanel.insertAdjacentElement('afterend', resultsCard);
const game = new GoalkeeperGame();
const coach = new CoachController();
const tutorialCard = document.createElement('div');
tutorialCard.className = 'tutorial-card hidden';
tutorialCard.innerHTML = '<div class="tutorial-step" id="tutorial-step">ОБУЧЕНИЕ · ШАГ 1 ИЗ 7</div><strong id="tutorial-title"></strong><p id="tutorial-copy"></p>';
meterPanel.insertAdjacentElement('afterend', tutorialCard);
const tutorialStepLabel = tutorialCard.querySelector<HTMLElement>('#tutorial-step')!;
const tutorialTitle = tutorialCard.querySelector<HTMLElement>('#tutorial-title')!;
const tutorialCopy = tutorialCard.querySelector<HTMLElement>('#tutorial-copy')!;
const tutorialMoves = [
  ['READY','Стойка','Согни колени и поставь руки перед собой.'],
  ['DIVE_LEFT','Бросок влево','Сделай широкий шаг и тянись влево.'],
  ['DIVE_RIGHT','Бросок вправо','Сделай широкий шаг и тянись вправо.'],
  ['HIGH','Верхний мяч','Подними обе руки над головой.'],
  ['LOW','Нижний мяч','Опустись ниже, согнув колени.'],
] as const;
let tutorialIndex = -1;
const coachCard = document.createElement('div');
coachCard.className = 'coach-card';
coachCard.classList.add('hidden');
coachCard.innerHTML = '<div class="coach-head"><span>ИИ-ТРЕНЕР</span><button type="button" id="voice-toggle">ГОЛОС · ВЫКЛ</button></div><div class="coach-body"><span class="coach-alert">✳</span><span id="coach-message">Встань в кадр — проверю технику</span><b id="coach-arrow"></b></div>';
meterPanel.insertAdjacentElement('afterend', coachCard);
const coachMessage = coachCard.querySelector<HTMLElement>('#coach-message')!;
const coachArrow = coachCard.querySelector<HTMLElement>('#coach-arrow')!;
const voiceToggle = coachCard.querySelector<HTMLButtonElement>('#voice-toggle')!;
let voiceEnabled = false;
let spokenHintId = '';
let lastConfirmedMove: MoveId | undefined;
let lastConfirmedAt = 0;
const calibration = new Calibration();
const moveTracker = new MoveTracker();
let bodyBase: ReturnType<Calibration['add']>;
let resultsShown = false;
let previousGamePhase = 'idle';
const zoneNames: Record<GameZone, string> = { DIVE_LEFT: 'ВЛЕВО', DIVE_RIGHT: 'ВПРАВО', HIGH: 'ВЕРХНИЙ МЯЧ', LOW: 'НИЖНИЙ МЯЧ' };
let engine: PoseEngine | undefined;
let running = false;
let frameLoop: (() => void) | undefined;
let loopGeneration = 0;
let reinitializing = false;
let fpsFrames = 0;
let fpsWindowStarted = performance.now();

function setError(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  const noWebgl = error instanceof Error && error.message === 'WebGL2 required';
  modalTitle.textContent = noWebgl ? 'Включи WebGL 2' : name === 'NotAllowedError' ? 'Разреши доступ к камере' : name === 'NotFoundError' ? 'Камера не найдена' : !window.isSecureContext ? 'Нужна защищённая ссылка' : 'Не удалось запустить камеру';
  modalCopy.textContent = noWebgl ? 'Этому браузеру нужен WebGL 2 для обработки изображения. Включи аппаратное ускорение в настройках браузера и перезапусти страницу.' : name === 'NotAllowedError' ? 'Нажми на значок камеры рядом с адресом сайта и разреши доступ, затем попробуй ещё раз.' : name === 'NotFoundError' ? 'Подключи веб-камеру и повтори попытку.' : !window.isSecureContext ? 'Открой KeeperCam по HTTPS-ссылке или через localhost.' : 'Проверь, что камера не занята другим приложением, и попробуй ещё раз.';
  loading.classList.add('hidden');
  retry.classList.remove('hidden');
  retry.textContent = 'Попробовать снова';
  modal.classList.remove('hidden');
}

async function boot() {
  if (running) return;
  modal.classList.remove('hidden');
  modalTitle.textContent = 'Разреши доступ к камере';
  modalCopy.textContent = 'Камера нужна, чтобы распознавать движения. Видео обрабатывается локально и не покидает устройство.';
  retry.classList.add('hidden');
  loading.classList.remove('hidden');
  status.textContent = 'Подключаем камеру…';
  setFlowStep(1);
  try {
    await startCamera(video);
    stageWrap.classList.add('is-loading');
    status.textContent = 'Загружаем распознавание…';
    cameraState.textContent = 'КАМЕРА АКТИВНА';
    engine = await PoseEngine.create();
    running = true;
    setFlowStep(2);
    meterPanel.classList.remove('hidden');
    coachCard.classList.remove('hidden');
    stageWrap.classList.remove('is-loading');
    stageWrap.classList.add('is-live');
    modal.classList.add('hidden');
    status.textContent = 'Встань в полный рост в кадре';
    cameraState.textContent = 'СИСТЕМА ГОТОВА';
    const scheduleLoop = () => {
      const generation = ++loopGeneration;
      const loop = () => {
      if (generation !== loopGeneration || !running || !engine) return;
      fpsFrames++;
      const fpsElapsed = performance.now() - fpsWindowStarted;
      if (fpsElapsed >= CONFIG.performance.fpsWarningAfterMs) {
        const fps = fpsFrames * 1000 / fpsElapsed;
        performanceNotice.classList.toggle('hidden', fps >= CONFIG.performance.fpsWarningBelow);
        fpsFrames = 0;
        fpsWindowStarted = performance.now();
      }
      const pose = engine.detect(video);
      if (engine.isRecovering) { cameraState.textContent = 'ПЕРЕКЛЮЧАЕМСЯ НА CPU'; status.textContent = 'Включаем резервный режим распознавания…'; }
      const modelFailure = engine.consumeFailure();
      if (modelFailure) {
        running = false;
        stopCamera(video);
        console.error('Pose inference failed after GPU/CPU fallback', modelFailure);
        setError(modelFailure);
        cameraState.textContent = 'ОЖИДАНИЕ';
        return;
      }
      if (!engine.isRecovering && cameraState.textContent === 'ПЕРЕКЛЮЧАЕМСЯ НА CPU') cameraState.textContent = 'СИСТЕМА ГОТОВА · CPU';
      drawStage(video, canvas, pose, coach.hint()?.joints);
      const detected = Boolean(pose?.length);
      poseBadge.classList.toggle('detected', detected);
      poseBadge.innerHTML = `<span></span> ${detected ? 'ПОЗА РАСПОЗНАНА' : 'ВСТАНЬ В КАДР'}`;
      if (pose) {
        if (!bodyBase) {
          bodyBase = calibration.add(pose);
          calibrationState.textContent = bodyBase ? 'ГОТОВО · ПОЗА ЗАПИСАНА' : 'ВСТАНЬ ПРЯМО В ПОЛНЫЙ РОСТ';
          if (bodyBase) { tutorialIndex = 0; setFlowStep(3); tutorialCard.classList.remove('hidden'); }
        }
        if (!bodyBase) {
          const hint = coach.update(evaluateCoach(pose, computeFeatures(pose), 'calibration'), performance.now());
          coachMessage.textContent = hint?.message ?? 'Встань в кадр — проверю технику';
          coachCard.classList.toggle('has-warning', Boolean(hint && !hint.positive));
          coachArrow.textContent = hint?.arrow === 'left' ? '←' : hint?.arrow === 'right' ? '→' : hint?.arrow === 'up' ? '↑' : hint?.arrow === 'down' ? '↓' : '';
          if (hint && voiceEnabled && hint.id !== spokenHintId) {
            window.speechSynthesis?.cancel(); const utterance = new SpeechSynthesisUtterance(hint.message); utterance.lang = 'ru-RU'; window.speechSynthesis?.speak(utterance); spokenHintId = hint.id;
          }
        }
        if (bodyBase) {
          const features = computeFeatures(pose, bodyBase);
          const readings = detectMoves(features);
          for (const id of ids) {
            const bar = meterPanel.querySelector<HTMLElement>(`[data-meter="${id}"]`);
            if (bar) bar.style.width = `${Math.round(readings[id].progress * 100)}%`;
          }
          const confirmed = moveTracker.update(readings, performance.now());
          if (confirmed[0]) { lastConfirmedMove = confirmed[0]; lastConfirmedAt = performance.now(); }
          if (confirmed.length) status.textContent = `Распознано движение: ${labels[ids.indexOf(confirmed[0])]}`;
          const snapshot = game.tick(performance.now(), readings.READY.ok, confirmed);
          if (snapshot.phase === 'telegraph' && previousGamePhase !== 'telegraph') sfx.whistle();
          if (snapshot.phase === 'flight' && previousGamePhase !== 'flight') sfx.kick();
          if (snapshot.phase === 'verdict' && previousGamePhase !== 'verdict') {
            const last = snapshot.verdict;
            if (last?.result === 'goal') { sfx.goal(); stageWrap.classList.add('goal-hit'); setTimeout(() => stageWrap.classList.remove('goal-hit'), 170); }
            else { sfx.save(); if (last?.result === 'clean') {
              for (let i=0;i<14;i++) { const particle=document.createElement('i'); particle.className='confetti-particle'; particle.style.setProperty('--x',`${10+Math.random()*80}%`); particle.style.setProperty('--h',`${Math.round(Math.random()*360)}deg`); stageWrap.append(particle); setTimeout(()=>particle.remove(),1100); }
            } }
          }
          if (tutorialIndex >= 0 && tutorialIndex < 5 && confirmed.includes(tutorialMoves[tutorialIndex][0])) tutorialIndex++;
          const coachPhase: CoachPhase = tutorialIndex === 5 || snapshot.phase === 'flight' ? 'flight' : snapshot.phase === 'waiting' ? 'waiting' : 'other';
          const activeMove = performance.now() - lastConfirmedAt < 400 ? lastConfirmedMove : undefined;
          const target = tutorialIndex === 5 ? 'HIGH' : snapshot.zone;
          const coachRules = evaluateCoach(pose, features, coachPhase, target, activeMove);
          const hint = coach.update(coachRules, performance.now());
          game.noteTechniqueError(coachPhase === 'flight' && hint?.id.startsWith('T') ? hint.id : undefined);
          if (tutorialIndex === 5 && coachRules.some((rule) => rule.id === 'T2') && hint?.id === 'T2') tutorialIndex = 6;
          if (tutorialIndex === 6 && confirmed.includes('HIGH')) tutorialIndex = 7;
          if (tutorialIndex >= 0 && tutorialIndex < 5) {
            tutorialStepLabel.textContent = `ОБУЧЕНИЕ · ШАГ ${tutorialIndex + 1} ИЗ 7`;
            tutorialTitle.textContent = tutorialMoves[tutorialIndex][1];
            tutorialCopy.textContent = tutorialMoves[tutorialIndex][2];
          } else if (tutorialIndex === 5) {
            tutorialStepLabel.textContent = 'ОБУЧЕНИЕ · ШАГ 6 ИЗ 7'; tutorialTitle.textContent = 'А теперь ошибись специально'; tutorialCopy.textContent = 'Подними только одну руку для верхнего мяча. Тренер должен заметить ошибку.';
          } else if (tutorialIndex === 6) {
            tutorialStepLabel.textContent = 'ОБУЧЕНИЕ · ШАГ 7 ИЗ 7'; tutorialTitle.textContent = 'Теперь сделай правильно'; tutorialCopy.textContent = 'Подними обе руки и выпрями их над головой.';
          } else if (tutorialIndex === 7) {
            tutorialTitle.textContent = 'Ты готов к игре'; tutorialCopy.textContent = 'Тренер заметил ошибку и подсказал, как её исправить.';
            gameButton.disabled = false;
            setFlowStep(4);
            setTimeout(() => tutorialCard.classList.add('hidden'), 1600);
            tutorialIndex = 8;
          }
          coachMessage.textContent = hint?.message ?? 'Отлично! Продолжай в своём темпе';
          coachCard.classList.toggle('has-warning', Boolean(hint && !hint.positive));
          coachCard.classList.toggle('is-positive', Boolean(hint?.positive));
          coachArrow.textContent = hint?.arrow === 'left' ? '←' : hint?.arrow === 'right' ? '→' : hint?.arrow === 'up' ? '↑' : hint?.arrow === 'down' ? '↓' : '';
          if (hint && voiceEnabled && hint.id !== spokenHintId) {
            window.speechSynthesis?.cancel();
            const utterance = new SpeechSynthesisUtterance(hint.message);
            utterance.lang = 'ru-RU';
            window.speechSynthesis?.speak(utterance);
            spokenHintId = hint.id;
          } else if (!hint) spokenHintId = '';
          if (snapshot.phase !== 'idle') {
            gameHud.classList.remove('hidden');
            goalLayer.classList.remove('hidden');
            shotCount.textContent = `УДАР ${Math.min(snapshot.shot, 10)} / 10   ·   ${snapshot.score} ОЧКОВ`;
            targetLabel.textContent = snapshot.zone ? (snapshot.phase === 'telegraph' ? `ГОТОВЬСЯ · ${zoneNames[snapshot.zone]}` : zoneNames[snapshot.zone]) : 'ВЕРНИСЬ В СТОЙКУ';
            targetLabel.classList.toggle('target-pulse', snapshot.phase === 'telegraph');
            goalLayer.classList.toggle('active', snapshot.phase === 'telegraph' || snapshot.phase === 'flight');
            goalLayer.dataset.target = snapshot.zone ?? '';
            const ballTarget: Record<GameZone, [number, number]> = { DIVE_LEFT: [17,50], DIVE_RIGHT: [83,50], HIGH: [50,17], LOW: [50,83] };
            const [ballX, ballY] = snapshot.zone ? ballTarget[snapshot.zone] : [50,50];
            flyingBall.style.setProperty('--ball-x', `${ballX}%`);
            flyingBall.style.setProperty('--ball-y', `${ballY}%`);
            flyingBall.style.setProperty('--flight-duration', `${snapshot.flightMs || 1200}ms`);
            flyingBall.classList.toggle('in-flight', snapshot.phase === 'flight');
            verdictLabel.textContent = snapshot.phase === 'verdict' ? (snapshot.verdict?.result === 'clean' ? 'СЕЙВ! · ЧИСТАЯ ТЕХНИКА' : snapshot.verdict?.result === 'saved_with_error' ? 'СЕЙВ! · ЕСТЬ НАД ЧЕМ РАБОТАТЬ' : 'ГОЛ · ПОПРОБУЙ ЕЩЁ') : '';
            if (snapshot.phase === 'results' && !resultsShown) {
              resultsShown = true;
              setFlowStep(5);
              gameHud.classList.add('hidden');
              goalLayer.classList.add('hidden');
              goalLayer.classList.remove('active');
              const saves = snapshot.results.filter((item) => item.result !== 'goal').length;
              const cleanCount = snapshot.results.filter((item) => item.result === 'clean').length;
              const timed = snapshot.results.filter((item) => item.reactionMs !== null);
              const avgReaction = timed.length ? Math.round(timed.reduce((sum,item)=>sum+(item.reactionMs ?? 0),0)/timed.length) : 0;
              const errorLabels: Record<string,string> = { T1:'Двигайся к мячу всем телом',T2:'Поднимай обе руки',T3:'Выпрямляй руки',T4:'Сгибай колени',T5:'Выбирай движение по мячу' };
              const counts = new Map<string,number>();
              for (const shot of snapshot.results) if (shot.errorId) counts.set(shot.errorId,(counts.get(shot.errorId) ?? 0)+1);
              const topMistakes = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3);
              resultsCard.classList.remove('hidden');
              resultsCard.innerHTML = `<span class="eyebrow">ФИНАЛЬНЫЙ СВИСТОК</span><h2>${saves} ИЗ 10 <em>СЕЙВОВ</em></h2><p>Счёт: <b>${snapshot.score}</b> · Чистые сейвы: ${cleanCount} · Реакция: ${avgReaction} мс</p><div class="shot-timeline">${snapshot.results.map((item) => `<i class="${item.result}"></i>`).join('')}</div><h3>Твои ошибки</h3>${topMistakes.length ? `<ul class="mistake-list">${topMistakes.map(([id,count])=>`<li>${errorLabels[id] ?? id}<b>×${count}</b></li>`).join('')}</ul>` : '<p>Чистая игра — ошибок нет.</p>'}<div class="leader-form"><input id="player-name" maxlength="24" placeholder="Твоё имя" aria-label="Твоё имя"><button type="button" class="game-start" id="save-score">В лидерборд</button></div><h3>Лидерборд · ТОП-10</h3><ol class="leader-list" id="leader-list"></ol><button class="game-start" id="replay">Сыграть ещё раз</button>`;
              const renderLeaderboard = (entries: ReturnType<typeof getLeaderboard>) => {
                const list = resultsCard.querySelector<HTMLOListElement>('#leader-list')!;
                const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
                list.innerHTML = entries.length ? entries.map((entry)=>`<li><span>${escape(entry.name)}</span><b>${entry.score}</b></li>`).join('') : '<li>Пока пусто</li>';
              };
              renderLeaderboard(getLeaderboard());
              resultsCard.querySelector('#save-score')?.addEventListener('click', () => { const name = resultsCard.querySelector<HTMLInputElement>('#player-name')?.value ?? ''; renderLeaderboard(saveScore(name, snapshot.score)); });
              resultsCard.querySelector('#replay')?.addEventListener('click', () => { resultsShown = false; resultsCard.classList.add('hidden'); game.start(performance.now()); moveTracker.reset(); });
            }
          }
          previousGamePhase = snapshot.phase;
          debug.textContent = `FPS ${(1000 / Math.max(1, performance.now() - lastFrame)).toFixed(0)}\n` + Object.entries(features.values).map(([key, value]) => `${key.padEnd(17)} ${value === null ? '—' : value.toFixed(2)}`).join('\n');
        }
        lastFrame = performance.now();
      }
      if (detected && !bodyBase) status.textContent = 'Встань ровно на 3 секунды для калибровки';
      else if (detected && !(status.textContent ?? '').startsWith('Распознано')) status.textContent = 'Двигайся — ИИ отслеживает пять поз';
      requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    };
    frameLoop = scheduleLoop;
    scheduleLoop();
  } catch (error) {
    stageWrap.classList.remove('is-loading', 'is-live');
    stopCamera(video);
    setError(error);
    status.textContent = 'Нужна помощь с запуском камеры';
    cameraState.textContent = 'ОЖИДАНИЕ';
  }
}

document.querySelector('#start')!.addEventListener('click', boot);
gameButton.addEventListener('click', () => { resultsShown = false; resultsCard.classList.add('hidden'); game.start(performance.now()); moveTracker.reset(); gameButton.disabled = true; setFlowStep(4); });
voiceToggle.addEventListener('click', () => { voiceEnabled = !voiceEnabled; voiceToggle.textContent = voiceEnabled ? 'ГОЛОС · ВКЛ' : 'ГОЛОС · ВЫКЛ'; if (!voiceEnabled) window.speechSynthesis?.cancel(); });
let lastFrame = performance.now();
window.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'd' && !event.repeat) debug.classList.toggle('hidden'); });
retry.addEventListener('click', boot);
document.querySelector('#close-modal')!.addEventListener('click', () => modal.classList.add('hidden'));
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    if (running) { running = false; loopGeneration++; game.pause(performance.now()); window.speechSynthesis?.cancel(); status.textContent = 'Пауза — вернись на вкладку, чтобы продолжить'; }
    return;
  }
  if (!engine || running || reinitializing) return;
  reinitializing = true;
  try {
    const stream = video.srcObject;
    const hasLiveCamera = stream instanceof MediaStream && stream.getVideoTracks().some((track) => track.readyState === 'live');
    if (!hasLiveCamera) { stopCamera(video); await startCamera(video); }
    else await video.play();
    engine.close();
    engine = await PoseEngine.create();
    moveTracker.reset();
    game.resume(performance.now());
    fpsFrames = 0; fpsWindowStarted = performance.now();
    running = true;
    cameraState.textContent = 'СИСТЕМА ГОТОВА';
    status.textContent = 'Распознавание восстановлено';
    frameLoop?.();
  } catch (error) {
    running = false;
    setError(error);
    cameraState.textContent = 'ОЖИДАНИЕ';
  } finally { reinitializing = false; }
});
window.addEventListener('pagehide', () => { running = false; loopGeneration++; engine?.close(); stopCamera(video); window.speechSynthesis?.cancel(); });
