import './style.css';
import { startCamera, stopCamera } from './vision/camera';
import { PoseEngine } from './vision/poseEngine';
import { drawStage } from './ui/stage';
import { Calibration, computeFeatures, type BodyCalibration } from './vision/features';
import { detectMoves, MOVE_IDS, type MoveId } from './logic/moves';
import { MoveTracker } from './logic/moveTracker';
import { GoalkeeperGame, type GameZone, type GameSnapshot } from './logic/game';
import { CoachController, evaluateCoach, type CoachPhase, type CoachHint } from './logic/coach';
import { SoundEffects } from './audio/sfx';
import { CONFIG } from './config';
import { ballIcon, poseArt, type PoseExample } from './ui/illustrations';
import { pageLayout } from './ui/layout';
import { renderResults } from './ui/results';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = pageLayout();
const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const video = $<HTMLVideoElement>('#camera');
const canvas = $<HTMLCanvasElement>('#stage');
const stageWrap = $('#stage-wrap');
const status = $('#status');
const cameraState = $('#camera-state');
const poseBadge = $('#pose-badge');
const modal = $('#modal');
const modalTitle = $('#modal-title');
const modalCopy = $('#modal-copy');
const setupList = $('#setup-list');
const modalNote = $('#modal-note');
const loading = $('#loading');
const retry = $<HTMLButtonElement>('#retry');
const flowStepper = $('#flow-stepper');
const landing = $('#landing');
const session = $('#session');
const sessionTitle = $('#session-title');
const sessionEyebrow = $('#session-eyebrow');
const sessionDescription = $('#session-description');
const sessionCount = $('#session-count');
const trainingGrid = $('#training-grid');
const resultsSlot = $('#results-slot');
const calibrationOverlay = $('#calibration-overlay');
const calibrationCountdown = $('#calibration-countdown');
const matchStats = $('#match-stats');
const liveScore = $('#live-score');
const liveShot = $('#live-shot');
const exitSessionButton = $('#exit-session');
const names: Record<MoveId,string> = { READY:'Стойка', DIVE_LEFT:'Влево', DIVE_RIGHT:'Вправо', HIGH:'Верхний мяч', LOW:'Нижний мяч' };
const zones: Record<GameZone,string> = { DIVE_LEFT:'ВЛЕВО', DIVE_RIGHT:'ВПРАВО', HIGH:'ВЕРХНИЙ МЯЧ', LOW:'НИЖНИЙ МЯЧ' };
const tutorialMoves: { id: MoveId; title: string; copy: string; art: PoseExample }[] = [
  { id:'READY', title:'Встань в стойку', copy:'Согни колени, поставь стопы шире плеч и держи руки перед собой.', art:'ready' },
  { id:'DIVE_LEFT', title:'Шагни влево', copy:'Сместись всем телом и потянись рукой влево.', art:'left' },
  { id:'DIVE_RIGHT', title:'Шагни вправо', copy:'Сместись всем телом и потянись рукой вправо.', art:'right' },
  { id:'HIGH', title:'Поймай верхний мяч', copy:'Подними обе руки над головой и выпрями локти.', art:'high' },
  { id:'LOW', title:'Возьми нижний мяч', copy:'Присядь, опусти таз и протяни обе руки вниз.', art:'low' },
];

// The landing example is a diagram. It never pretends to be a live camera feed.
const examples: Record<'ready'|'high'|'mistake',{status:string;title:string;copy:string}> = {
  ready:{status:'СТОЙКА РАСПОЗНАНА ↗',title:'Всё готово к удару.',copy:'Колени согнуты, руки перед собой. Теперь следи за направлением мяча.'},
  high:{status:'ТЕХНИКА В ПОРЯДКЕ ↗',title:'Две руки. Один сейв.',copy:'Руки над головой, локти выпрямлены. Так берут верхний мяч.'},
  mistake:{status:'ТРЕНЕР ЗАМЕТИЛ ОШИБКУ',title:'Подними вторую руку.',copy:'Верхний мяч берут двумя руками. Тренер подсветит сустав и покажет, что исправить.'},
};
document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button=>button.addEventListener('click',()=>{
  const mode = button.dataset.example as keyof typeof examples;
  const example = examples[mode];
  $('#preview-art').innerHTML = poseArt(mode,true) + '<span class="art-side-label">ПОЗА → ДВИЖЕНИЕ → СЕЙВ</span>';
  $('#preview-status').textContent = example.status;
  $('#preview-title').textContent = example.title;
  $('#preview-copy').textContent = example.copy;
  $('.preview-report').classList.toggle('is-warning',mode==='mistake');
  document.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(item=>{
    const active = item===button;
    item.classList.toggle('active',active);
    item.setAttribute('aria-pressed',String(active));
  });
}));

const soundToggle = document.createElement('button');
soundToggle.className = 'sound-toggle';
soundToggle.type = 'button';
soundToggle.setAttribute('aria-label','Выключить звук');
soundToggle.setAttribute('aria-pressed','true');
soundToggle.textContent = 'ЗВУК · ВКЛ';
$('#camera-controls').append(soundToggle);
const sfx = new SoundEffects();
soundToggle.addEventListener('click',()=>{
  sfx.enabled=!sfx.enabled;
  soundToggle.textContent=sfx.enabled?'ЗВУК · ВКЛ':'ЗВУК · ВЫКЛ';
  soundToggle.setAttribute('aria-pressed',String(sfx.enabled));
  soundToggle.setAttribute('aria-label',sfx.enabled?'Выключить звук':'Включить звук');
});

const tutorialCard = document.createElement('div');
tutorialCard.className = 'tutorial-card hidden';
tutorialCard.innerHTML = '<div class="tutorial-step" id="tutorial-step"></div><strong id="tutorial-title"></strong><p id="tutorial-copy"></p><div id="tutorial-art"></div>';
$('#instruction-slot').append(tutorialCard);
const tutorialStepLabel = $('#tutorial-step');
const tutorialTitle = $('#tutorial-title');
const tutorialCopy = $('#tutorial-copy');
const tutorialArt = $('#tutorial-art');
const coachCard = document.createElement('div');
coachCard.className = 'coach-card hidden';
coachCard.innerHTML = '<div class="coach-head"><span>ТВОЙ ТРЕНЕР</span><button type="button" id="voice-toggle" aria-pressed="false">ГОЛОС · ВЫКЛ</button></div><div class="coach-body"><span class="coach-alert">!</span><span id="coach-message">Встань в полный рост — проверю технику</span><b id="coach-arrow" aria-hidden="true"></b></div>';
$('#coach-slot').append(coachCard);
const coachMessage = $('#coach-message');
const coachArrow = $('#coach-arrow');
const voiceToggle = $<HTMLButtonElement>('#voice-toggle');
let voiceEnabled = false;
voiceToggle.addEventListener('click',()=>{
  voiceEnabled=!voiceEnabled;
  voiceToggle.textContent=voiceEnabled?'ГОЛОС · ВКЛ':'ГОЛОС · ВЫКЛ';
  voiceToggle.setAttribute('aria-pressed',String(voiceEnabled));
  if(!voiceEnabled) window.speechSynthesis?.cancel();
});
const meterPanel = document.createElement('div');
meterPanel.className = 'live-meters hidden';
meterPanel.innerHTML = `<div class="meters-head"><span>ЧТО ВИДИТ КАМЕРА</span><span id="calibration-state">КАЛИБРОВКА · 3 СЕК</span></div>${MOVE_IDS.map(id=>`<div class="meter-row" data-row="${id}"><span>${names[id]}</span><div class="meter-track"><i data-meter="${id}"></i></div><output data-value="${id}" aria-live="off">0</output></div>`).join('')}`;
$('#meters-slot').append(meterPanel);
const calibrationState = $('#calibration-state');
const gameButton = document.createElement('button');
gameButton.className = 'game-start hidden';
gameButton.type = 'button';
gameButton.innerHTML = 'Сыграть 10 ударов <span>↗</span>';
$('#action-slot').append(gameButton);
const debug = document.createElement('pre');
debug.className='debug-overlay hidden';
debug.textContent='DEBUG · D';
stageWrap.append(debug);
const performanceNotice = document.createElement('div');
performanceNotice.className='performance-notice hidden';
performanceNotice.textContent='Слабая производительность — закрой другие вкладки';
stageWrap.append(performanceNotice);
stageWrap.insertAdjacentHTML('beforeend',`<div class="goal-layer hidden" id="goal-layer"><i data-zone="DIVE_LEFT"></i><i data-zone="DIVE_RIGHT"></i><i data-zone="HIGH"></i><i data-zone="LOW"></i></div><div class="game-hud hidden" id="game-hud"><span class="shot-count" id="shot-count"></span><span class="target-label" id="target-label"></span><span class="flying-ball" id="flying-ball">${ballIcon}</span><span class="verdict-label" id="verdict-label"></span></div>`);
const goalLayer = $('#goal-layer');
const gameHud = $('#game-hud');
const shotCount = $('#shot-count');
const targetLabel = $('#target-label');
const flyingBall = $('#flying-ball');
const verdictLabel = $('#verdict-label');

let game = new GoalkeeperGame();
let coach = new CoachController();
const calibration = new Calibration();
const moveTracker = new MoveTracker();
let bodyBase: BodyCalibration | undefined;
let tutorialIndex = -1;
let shownTutorialIndex = -2;
let lastConfirmedMove: MoveId | undefined;
let lastConfirmedAt = 0;
let spokenHintId = '';
let previousGamePhase: GameSnapshot['phase'] = 'idle';
let engine: PoseEngine | undefined;
let running = false;
let booting = false;
let sessionActive = false;
let reinitializing = false;
let loopGeneration = 0;
let resultsShown = false;
let lastFrame = performance.now();
let fpsFrames = 0;
let fpsWindowStarted = performance.now();
let currentStep = 0;
let focusReturn: HTMLElement | null = null;

function setFlowStep(step: number): void {
  if(currentStep===step) return;
  currentStep=step;
  flowStepper.classList.remove('hidden');
  flowStepper.querySelectorAll('span').forEach((item,index)=>{
    item.classList.toggle('current',index===step-1);
    item.classList.toggle('complete',index<step-1);
  });
  sessionCount.innerHTML = `${String(step).padStart(2,'0')}<span> / 05</span>`;
  const copy: Record<number,[string,string,string]> = {
    1:['КАМЕРА / ПОДКЛЮЧЕНИЕ','Подключаем камеру','Разреши доступ к камере и встань перед ней.'],
    2:['КАЛИБРОВКА / 3 СЕКУНДЫ','Встань в полный рост','Голова и стопы должны быть в кадре. Постой спокойно три секунды.'],
    3:['ОБУЧЕНИЕ / ДВИЖЕНИЯ','Повтори за схемой','Следуй инструкции справа. Полоски покажут, что распознано.'],
    4:['МАТЧ / 10 УДАРОВ','Защити свои ворота','Вернись в стойку перед каждым ударом. Подсвеченная зона покажет направление мяча.'],
    5:['ИТОГИ / РАЗБОР','Твой матч','Посмотри на каждый удар и сохрани результат.'],
  };
  sessionEyebrow.textContent=copy[step][0];
  sessionTitle.textContent=copy[step][1];
  sessionDescription.textContent=copy[step][2];
  if(sessionActive) sessionTitle.focus({preventScroll:true});
}
function updateTutorial(): void {
  if(tutorialIndex===shownTutorialIndex) return;
  shownTutorialIndex=tutorialIndex;
  if(tutorialIndex<0 || tutorialIndex>7) { tutorialCard.classList.add('hidden'); return; }
  tutorialCard.classList.remove('hidden');
  tutorialStepLabel.textContent = tutorialIndex===7?'ОБУЧЕНИЕ ПРОЙДЕНО':`ОБУЧЕНИЕ · ШАГ ${tutorialIndex+1} ИЗ 7`;
  if(tutorialIndex<5) {
    tutorialTitle.textContent=tutorialMoves[tutorialIndex].title;
    tutorialCopy.textContent=tutorialMoves[tutorialIndex].copy;
    tutorialArt.innerHTML=poseArt(tutorialMoves[tutorialIndex].art);
  } else if(tutorialIndex===5) {
    tutorialTitle.textContent='Ошибись специально';
    tutorialCopy.textContent='Подними только одну руку. Тренер заметит ошибку и покажет, что исправить.';
    tutorialArt.innerHTML=poseArt('mistake');
  } else if(tutorialIndex===6) {
    tutorialTitle.textContent='Теперь поймай правильно';
    tutorialCopy.textContent='Опусти руки и снова подними обе над головой. Выпрями локти.';
    tutorialArt.innerHTML=poseArt('high');
  } else {
    tutorialTitle.textContent='Ты готов к матчу';
    tutorialCopy.textContent='Тренер заметил ошибку. Теперь защити ворота от десяти ударов.';
    tutorialArt.innerHTML=poseArt('ready');
    gameButton.classList.remove('hidden');
    setTimeout(()=>{
      if(tutorialIndex===7) { tutorialCard.classList.add('hidden'); tutorialIndex=8; shownTutorialIndex=8; }
    },2200);
  }
}
function updateCoach(hint?: CoachHint): void {
  coachMessage.textContent=hint?.message ?? 'Отлично. Следи за мячом и продолжай.';
  coachCard.classList.toggle('has-warning',Boolean(hint&&!hint.positive));
  coachCard.classList.toggle('is-positive',Boolean(hint?.positive));
  coachArrow.textContent=hint?.arrow==='left'?'←':hint?.arrow==='right'?'→':hint?.arrow==='up'?'↑':hint?.arrow==='down'?'↓':'';
  if(hint && voiceEnabled && hint.id!==spokenHintId) {
    window.speechSynthesis?.cancel();
    const utterance=new SpeechSynthesisUtterance(hint.message);
    utterance.lang='ru-RU';
    window.speechSynthesis?.speak(utterance);
    spokenHintId=hint.id;
  } else if(!hint) spokenHintId='';
}
function resetGameDisplay(): void {
  gameHud.classList.add('hidden');
  goalLayer.classList.add('hidden');
  goalLayer.classList.remove('active');
  matchStats.classList.add('hidden');
  resultsSlot.innerHTML='';
  trainingGrid.classList.remove('hidden');
  resultsShown=false;
  previousGamePhase='idle';
}
function stopSession(): void {
  sessionActive=false;
  running=false;
  loopGeneration++;
  try { engine?.close(); } catch { /* A lost context may prevent cleanup. */ }
  engine=undefined;
  stopCamera(video);
  window.speechSynthesis?.cancel();
  modal.classList.add('hidden');
  landing.classList.remove('hidden');
  session.classList.add('hidden');
  $('.landing-nav').classList.remove('hidden');
  exitSessionButton.classList.add('hidden');
  document.querySelector('.header-action')?.classList.remove('hidden');
  resetGameDisplay();
  game=new GoalkeeperGame(); coach=new CoachController();
  calibration.reset(); moveTracker.reset(); bodyBase=undefined;
  tutorialIndex=-1; shownTutorialIndex=-2; currentStep=0;
  coachCard.classList.add('hidden');
  meterPanel.classList.add('hidden');
  gameButton.classList.add('hidden');
  calibrationOverlay.classList.remove('hidden');
  poseBadge.classList.remove('detected');
  poseBadge.innerHTML='<span></span> ПОЗА НЕ НАЙДЕНА';
  window.scrollTo({top:0,behavior:'smooth'});
}
function activateSession(): void {
  landing.classList.add('hidden');
  session.classList.remove('hidden');
  $('.landing-nav').classList.add('hidden');
  exitSessionButton.classList.remove('hidden');
  document.querySelector('.header-action')?.classList.add('hidden');
  sessionActive=true;
  window.scrollTo({top:0,behavior:'instant'});
}
function showModal(title:string,copy:string,action:string,setup=false): void {
  focusReturn=document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalTitle.textContent=title;
  modalCopy.textContent=copy;
  retry.innerHTML=`${action} <span>↗</span>`;
  retry.classList.remove('hidden');
  retry.disabled=false;
  setupList.classList.toggle('hidden',!setup);
  modalNote.classList.toggle('hidden',!setup);
  loading.classList.add('hidden');
  modal.classList.remove('hidden');
  $('#close-modal').focus();
}
function closeModal(): void {
  modal.classList.add('hidden');
  focusReturn?.focus();
  if(!running && sessionActive) stopSession();
}
function setError(error: unknown): void {
  const name=error instanceof DOMException?error.name:'';
  const noWebgl=error instanceof Error && error.message==='WebGL2 required';
  const title=noWebgl?'Включи WebGL 2':name==='NotAllowedError'?'Разреши камеру':name==='NotFoundError'?'Камера не найдена':!window.isSecureContext?'Нужна защищённая ссылка':'Не удалось включить камеру';
  const copy=noWebgl?'Включи аппаратное ускорение или WebGL 2 в настройках браузера и перезапусти страницу.':name==='NotAllowedError'?'Нажми значок камеры рядом с адресом сайта, разреши доступ и попробуй снова.':name==='NotFoundError'?'Подключи веб-камеру и попробуй ещё раз.':!window.isSecureContext?'Открой страницу по HTTPS или через localhost.':'Проверь, что камеру не использует другое приложение, и повтори попытку.';
  showModal(title,copy,'Попробовать снова');
  status.textContent='Камера ждёт повторного запуска';
  cameraState.textContent='ОЖИДАНИЕ';
}
function updateGame(snapshot: GameSnapshot): void {
  if(snapshot.phase==='idle') return;
  if(snapshot.phase==='results') {
    if(resultsShown) return;
    resultsShown=true;
    setFlowStep(5);
    trainingGrid.classList.add('hidden');
    renderResults(resultsSlot,snapshot,()=>boot(true,true),()=>{bodyBase=undefined;calibration.reset();tutorialIndex=-1;shownTutorialIndex=-2;boot(true,false);});
    running=false; loopGeneration++;
    try { engine?.close(); } catch { /* Context may already be gone. */ }
    engine=undefined; stopCamera(video);
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  gameHud.classList.remove('hidden');
  goalLayer.classList.remove('hidden');
  matchStats.classList.remove('hidden');
  shotCount.textContent=`УДАР ${Math.min(snapshot.shot,10)} / 10 · ${snapshot.score} ОЧКОВ`;
  liveScore.textContent=String(snapshot.score);
  liveShot.innerHTML=`${Math.min(snapshot.shot,10)}<span>/10</span>`;
  targetLabel.textContent=snapshot.phase==='waiting'?'ВЕРНИСЬ В СТОЙКУ':snapshot.phase==='telegraph'&&snapshot.zone?`ПРИГОТОВЬСЯ · ${zones[snapshot.zone]}`:snapshot.zone?zones[snapshot.zone]:'';
  targetLabel.classList.toggle('target-pulse',snapshot.phase==='telegraph');
  goalLayer.classList.toggle('active',snapshot.phase==='telegraph'||snapshot.phase==='flight');
  goalLayer.setAttribute('data-target',snapshot.zone??'');
  const positions: Record<GameZone,[number,number]>={DIVE_LEFT:[17,50],DIVE_RIGHT:[83,50],HIGH:[50,17],LOW:[50,83]};
  const [x,y]=snapshot.zone?positions[snapshot.zone]:[50,50];
  flyingBall.style.setProperty('--ball-x',`${x}%`);
  flyingBall.style.setProperty('--ball-y',`${y}%`);
  flyingBall.style.setProperty('--flight-duration',`${snapshot.flightMs||1200}ms`);
  flyingBall.classList.toggle('in-flight',snapshot.phase==='flight');
  const verdictErrors:Record<string,string>={T1:'ШАГНИ В СТОРОНУ ВСЕМ ТЕЛОМ',T2:'ПОДНИМИ ОБЕ РУКИ',T3:'ВЫПРЯМИ РУКИ',T4:'СОГНИ КОЛЕНИ',T5:'СЛЕДИ ЗА ЗОНОЙ МЯЧА'};
  verdictLabel.textContent=snapshot.phase==='verdict'?(snapshot.verdict?.result==='clean'?'СЕЙВ · ЧИСТАЯ ТЕХНИКА':snapshot.verdict?.result==='saved_with_error'?`СЕЙВ · ${verdictErrors[snapshot.verdict.errorId??'']??'УЛУЧШИ ТЕХНИКУ'}`:`ГОЛ · ${verdictErrors[snapshot.verdict?.errorId??'']??'ГОТОВЬСЯ К СЛЕДУЮЩЕМУ'}`):'';
  if(snapshot.phase==='telegraph'&&previousGamePhase!=='telegraph')sfx.whistle();
  if(snapshot.phase==='flight'&&previousGamePhase!=='flight')sfx.kick();
  if(snapshot.phase==='verdict'&&previousGamePhase!=='verdict') {
    if(snapshot.verdict?.result==='goal'){sfx.goal();stageWrap.classList.add('goal-hit');setTimeout(()=>stageWrap.classList.remove('goal-hit'),170);}
    else {sfx.save();if(snapshot.verdict?.result==='clean')for(let i=0;i<12;i++){
      const particle=document.createElement('i'); particle.className='confetti-particle';
      particle.style.setProperty('--x',`${10+Math.random()*80}%`);
      stageWrap.append(particle); setTimeout(()=>particle.remove(),1100);
    }}
  }
  previousGamePhase=snapshot.phase;
}
function updateCalibration(pose: NonNullable<ReturnType<PoseEngine['detect']>>): void {
  bodyBase=calibration.add(pose);
  const progress=calibration.progress();
  calibrationOverlay.classList.toggle('is-tracking',progress>0);
  calibrationCountdown.textContent=progress>0?`СТОЙ РОВНО · ${Math.max(1,Math.ceil((1-progress)*3))}`:'ВСТАНЬ В ПОЛНЫЙ РОСТ';
  calibrationState.textContent=progress>0?`ЗАПИСЫВАЕМ ПОЗУ · ${Math.round(progress*100)}%`:'КАЛИБРОВКА · 3 СЕК';
  if(bodyBase) {
    calibrationOverlay.classList.add('hidden');
    calibrationState.textContent='КАЛИБРОВКА ГОТОВА';
    tutorialIndex=0; setFlowStep(3); updateTutorial();
  }
}
function updateMeters(readings: ReturnType<typeof detectMoves>): void {
  for(const id of MOVE_IDS){
    const value=Math.round(readings[id].progress*100);
    meterPanel.querySelector<HTMLElement>(`[data-meter="${id}"]`)!.style.width=`${value}%`;
    meterPanel.querySelector<HTMLOutputElement>(`[data-value="${id}"]`)!.textContent=String(value);
    meterPanel.querySelector<HTMLElement>(`[data-row="${id}"]`)!.classList.toggle('is-confirmed',readings[id].ok);
  }
}
function runFrame(generation:number): void {
  if(generation!==loopGeneration||!running||!engine) return;
  const now=performance.now();
  fpsFrames++;
  const fpsElapsed=now-fpsWindowStarted;
  if(fpsElapsed>=CONFIG.performance.fpsWarningAfterMs){
    performanceNotice.classList.toggle('hidden',fpsFrames*1000/fpsElapsed>=CONFIG.performance.fpsWarningBelow);
    fpsFrames=0;fpsWindowStarted=now;
  }
  const pose=engine.detect(video);
  if(engine.isRecovering){cameraState.textContent='ПЕРЕКЛЮЧАЕМ НА CPU';status.textContent='Восстанавливаем распознавание…';}
  const failure=engine.consumeFailure();
  if(failure){running=false;loopGeneration++;stopCamera(video);setError(failure);return;}
  if(!engine.isRecovering&&cameraState.textContent==='ПЕРЕКЛЮЧАЕМ НА CPU')cameraState.textContent='КАМЕРА РАБОТАЕТ · CPU';
  drawStage(video,canvas,pose,coach.hint()?.joints);
  const detected=Boolean(pose?.length);
  poseBadge.classList.toggle('detected',detected);
  poseBadge.innerHTML=`<span></span> ${detected?'ПОЗА РАСПОЗНАНА':'ВСТАНЬ В КАДР'}`;
  if(!pose){
    if(game.snapshot().phase!=='idle'&&game.snapshot().phase!=='results')game.pause(now);
    moveTracker.reset();
    updateCoach({id:'F1',priority:100,message:'Вернись в кадр целиком — покажи голову и стопы',joints:[]});
    status.textContent='Пока не вижу тебя целиком';
    if(!bodyBase){calibration.reset();calibrationOverlay.classList.remove('is-tracking');calibrationCountdown.textContent='ВСТАНЬ В ПОЛНЫЙ РОСТ';}
  } else if(!bodyBase){
    updateCalibration(pose);
    const hint=coach.update(evaluateCoach(pose,computeFeatures(pose),'calibration'),now);
    updateCoach(hint);
    status.textContent=bodyBase?'Калибровка готова':calibration.progress()>0?'Записываем твою позу…':'Встань ровно для калибровки';
  } else {
    game.resume(now);
    const features=computeFeatures(pose,bodyBase);
    const readings=detectMoves(features);
    updateMeters(readings);
    const confirmed=moveTracker.update(readings,now);
    if(confirmed[0]){lastConfirmedMove=confirmed[0];lastConfirmedAt=now;}
    const pre=game.snapshot();
    const coachPhase:CoachPhase=tutorialIndex===5||pre.phase==='flight'?'flight':pre.phase==='waiting'||tutorialIndex===0?'waiting':'other';
    const target: GameZone|undefined=tutorialIndex===5?'HIGH':pre.zone;
    const activeMove=now-lastConfirmedAt<400?lastConfirmedMove:undefined;
    const rules=evaluateCoach(pose,features,coachPhase,target,activeMove);
    const hint=coach.update(rules,now);
    updateCoach(hint);
    if(pre.phase==='flight'&&hint?.id.startsWith('T'))game.noteTechniqueError(hint.id);
    if(tutorialIndex>=0&&tutorialIndex<5&&confirmed.includes(tutorialMoves[tutorialIndex].id))tutorialIndex++;
    if(tutorialIndex===5&&hint?.id==='T2')tutorialIndex=6;
    if(tutorialIndex===6&&confirmed.includes('HIGH'))tutorialIndex=7;
    updateTutorial();
    const snapshot=game.tick(now,readings.READY.ok,confirmed);
    updateGame(snapshot);
    if(snapshot.phase==='waiting')status.textContent='Вернись в стойку и подожди свистка';
    else if(snapshot.phase==='telegraph')status.textContent='Следи за подсвеченной зоной';
    else if(snapshot.phase==='flight')status.textContent='Лови мяч всем телом';
    else if(snapshot.phase==='idle'&&tutorialIndex>=7)status.textContent='Обучение пройдено. Начни матч.';
    else if(snapshot.phase==='idle'&&tutorialIndex>=0)status.textContent=`Обучение: шаг ${Math.min(tutorialIndex+1,7)} из 7`;
    debug.textContent=`FPS ${(1000/Math.max(1,now-lastFrame)).toFixed(0)}\n${Object.entries(features.values).map(([key,value])=>`${key.padEnd(17)} ${value===null?'—':value.toFixed(2)}`).join('\n')}`;
  }
  lastFrame=now;
  if(generation===loopGeneration&&running)requestAnimationFrame(()=>runFrame(generation));
}
async function boot(reuseSession=false,replay=false): Promise<void> {
  if(booting||running)return;
  booting=true;
  if(!reuseSession)activateSession();
  resetGameDisplay();
  if(!replay){game=new GoalkeeperGame();coach=new CoachController();moveTracker.reset();gameButton.classList.add('hidden');}
  setFlowStep(replay?4:1);
  modal.classList.remove('hidden');
  modalTitle.textContent='Подключаем камеру';
  modalCopy.textContent='После разрешения доступа загрузим модель распознавания. Первый запуск может занять немного времени.';
  retry.classList.add('hidden');
  setupList.classList.add('hidden');modalNote.classList.add('hidden');
  loading.classList.remove('hidden');
  status.textContent='Подключаем камеру…';
  cameraState.textContent='ЗАГРУЗКА';
  const generation=++loopGeneration;
  try{
    await startCamera(video);
    if(generation!==loopGeneration){stopCamera(video);return;}
    modalTitle.textContent='Загружаем распознавание';
    status.textContent='Загружаем модель движения…';
    engine=await PoseEngine.create();
    if(generation!==loopGeneration){engine.close();engine=undefined;stopCamera(video);return;}
    running=true;
    booting=false;
    modal.classList.add('hidden');
    stageWrap.classList.add('is-live');
    coachCard.classList.remove('hidden');
    meterPanel.classList.remove('hidden');
    trainingGrid.classList.remove('hidden');
    cameraState.textContent='КАМЕРА РАБОТАЕТ';
    fpsFrames=0;fpsWindowStarted=performance.now();lastFrame=performance.now();
    if(replay){game.start(performance.now());tutorialIndex=8;shownTutorialIndex=8;calibrationOverlay.classList.add('hidden');setFlowStep(4);}
    else if(bodyBase){tutorialIndex=0;shownTutorialIndex=-2;updateTutorial();calibrationOverlay.classList.add('hidden');setFlowStep(3);}
    else{tutorialIndex=-1;shownTutorialIndex=-2;calibrationOverlay.classList.remove('hidden');setFlowStep(2);}
    status.textContent=replay?'Вернись в стойку и жди свистка':bodyBase?'Начинаем обучение':'Встань в полный рост';
    requestAnimationFrame(()=>runFrame(generation));
  }catch(error){
    if(generation===loopGeneration){running=false;try{engine?.close();}catch{}engine=undefined;stopCamera(video);setError(error);}
  }finally{booting=false;}
}
function startGame(): void {
  if(!bodyBase||!running||tutorialIndex<7)return;
  tutorialIndex=8;shownTutorialIndex=8;
  tutorialCard.classList.add('hidden');gameButton.classList.add('hidden');
  game.start(performance.now());moveTracker.reset();coach=new CoachController();
  setFlowStep(4);window.scrollTo({top:0,behavior:'smooth'});
}
function requestStart(): void {
  if(booting)return;
  showModal('Подготовим твоё поле','Поставь устройство устойчиво, освободи место для шага в сторону и встань лицом к свету.','Включить камеру',true);
}
document.querySelectorAll<HTMLButtonElement>('[data-start]').forEach(button=>button.addEventListener('click',requestStart));
retry.addEventListener('click',()=>boot());
$('#close-modal').addEventListener('click',closeModal);
modal.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!booting){closeModal();event.preventDefault();}
  if(event.key==='Tab'){
    const controls=[...modal.querySelectorAll<HTMLElement>('button:not(.hidden):not([disabled])')];
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){last?.focus();event.preventDefault();}
    else if(!event.shiftKey&&document.activeElement===last){first?.focus();event.preventDefault();}
  }
});
exitSessionButton.addEventListener('click',stopSession);
gameButton.addEventListener('click',startGame);
window.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='d'&&!event.repeat&&modal.classList.contains('hidden')&&sessionActive)debug.classList.toggle('hidden');});
document.addEventListener('visibilitychange',async()=>{
  if(document.hidden){
    if(running){running=false;loopGeneration++;game.pause(performance.now());window.speechSynthesis?.cancel();status.textContent='Пауза — вернись на вкладку';}
    return;
  }
  if(!sessionActive||!engine||running||reinitializing||resultsShown)return;
  reinitializing=true;
  const expectedGeneration=loopGeneration;
  try{
    const stream=video.srcObject;
    const live=stream instanceof MediaStream&&stream.getVideoTracks().some(track=>track.readyState==='live');
    if(!live){stopCamera(video);await startCamera(video);}else await video.play();
    if(!sessionActive||expectedGeneration!==loopGeneration){stopCamera(video);return;}
    engine.close();engine=await PoseEngine.create();
    if(!sessionActive||expectedGeneration!==loopGeneration){engine.close();engine=undefined;stopCamera(video);return;}
    moveTracker.reset();game.resume(performance.now());
    fpsFrames=0;fpsWindowStarted=performance.now();
    running=true;cameraState.textContent='КАМЕРА РАБОТАЕТ';status.textContent='Распознавание восстановлено';
    const generation=++loopGeneration;
    requestAnimationFrame(()=>runFrame(generation));
  }catch(error){if(sessionActive){running=false;setError(error);}}finally{reinitializing=false;}
});
window.addEventListener('pagehide',()=>{running=false;loopGeneration++;try{engine?.close();}catch{}stopCamera(video);window.speechSynthesis?.cancel();});
