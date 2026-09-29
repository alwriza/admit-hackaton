import { goalIcon, poseArt } from './illustrations';

export function pageLayout(): string {
  return `
  <a class="skip-link" href="#main-content">Перейти к содержимому</a>
  <header class="topbar">
    <a class="brand" href="#" aria-label="KeeperCam — главная">${goalIcon}<span>KEEPER<span class="brand-light">CAM</span><small>ДВИЖЕНИЕ РЕШАЕТ</small></span></a>
    <nav class="landing-nav" aria-label="Основная навигация"><a href="#how">Как играть</a><a href="#movements">Движения</a><a href="#coach-explainer">Тренер</a></nav>
    <div class="header-action"><span class="header-caption">ВЕБ-КАМЕРА → ИГРА</span><button class="primary small" data-start>На поле <span>↗</span></button></div>
    <button class="outline hidden" id="exit-session">Завершить тренировку <span>↗</span></button>
  </header>
  <main id="main-content">
    <div id="landing">
      <section class="hero ink-block">
        <div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> ФУТБОЛ · КАМЕРА · ТВОЯ РЕАКЦИЯ</p>
          <h1>ТВОЁ ТЕЛО.<br>ТВОИ<br><em>ВОРОТА.</em></h1>
          <p class="lead">Лови мячи движениями перед камерой.<br class="desktop-break"> Тренер заметит ошибку и подскажет, как сделать следующий сейв лучше.</p>
          <div class="hero-actions"><button class="primary" id="start" data-start>Начать тренировку <span>↗</span></button><a class="outline dark" href="#how">Как это работает <span>↓</span></a></div>
          <p class="privacy">Без регистрации. Видео остаётся на твоём устройстве.</p>
          <div class="hero-stats"><div><strong>05</strong><span>движений тела</span></div><div><strong>10</strong><span>ударов за матч</span></div><div><strong>01</strong><span>камера. И ты в игре.</span></div></div>
        </div>
        <div class="preview-panel">
          <div class="preview-caption"><span class="eyebrow">ПОЛЕ ЗРЕНИЯ ТРЕНЕРА</span><span class="tag">ПРИМЕР</span></div>
          <div class="preview-art" id="preview-art">${poseArt('high',true)}<span class="art-side-label">ПОЗА → ДВИЖЕНИЕ → СЕЙВ</span></div>
          <div class="preview-switch" role="group" aria-label="Посмотреть пример распознавания"><button data-example="ready" aria-pressed="false">01 Стойка</button><button data-example="high" class="active" aria-pressed="true">02 Сейв</button><button data-example="mistake" aria-pressed="false">03 Ошибка</button></div>
          <div class="preview-report" aria-live="polite"><div class="report-top"><span class="eyebrow">ОБРАТНАЯ СВЯЗЬ</span><span class="report-status" id="preview-status">ТЕХНИКА В ПОРЯДКЕ ↗</span></div><strong id="preview-title">Две руки. Один сейв.</strong><p id="preview-copy">Руки над головой, локти выпрямлены. Так берут верхний мяч.</p><div class="report-bottom"><span>Попробуй переключить пример ↑</span><span>ДЕМОНСТРАЦИЯ</span></div></div>
        </div>
      </section>
      <section class="how-section page-section" id="how"><div class="section-heading"><div><p class="eyebrow">01 / ПЕРВЫЙ ВЫХОД НА ПОЛЕ</p><h2>ВСТАНЬ.<br>ПОЙМАЙ. ПОВТОРИ.</h2></div><p>Сначала освоим движения.<br>Потом — десять ударов по воротам.</p></div>
        <div class="step-grid">
          <article class="step"><span class="step-num">01</span><div><h3>Попади в кадр</h3><p>Поставь камеру перед собой и отойди так, чтобы были видны голова и стопы.</p><span class="step-meta">КАМЕРА + СВОБОДНОЕ МЕСТО</span></div></article>
          <article class="step"><span class="step-num">02</span><div><h3>Почувствуй движение</h3><p>Повтори пять простых движений. Затем ошибись специально — увидишь, как помогает тренер.</p><span class="step-meta">КОРОТКОЕ ОБУЧЕНИЕ</span></div></article>
          <article class="step"><span class="step-num">03</span><div><h3>Защити ворота</h3><p>Следи за подсветкой, двигайся к мячу. После матча разберём реакцию и технику.</p><span class="step-meta">10 УДАРОВ · ТВОЙ РЕЗУЛЬТАТ</span></div></article>
        </div>
      </section>
      <section class="coach-section ink-block" id="coach-explainer"><div><p class="eyebrow">02 / БОЛЬШЕ, ЧЕМ «ПОПАЛ ИЛИ НЕТ»</p><h2>ОШИБКА —<br>ТОЖЕ<br><em>ПРОГРЕСС.</em></h2><p class="lead">Потянулся одной рукой? Тренер покажет, что исправить. Попробуй ещё раз — и почувствуй разницу.</p><a class="text-link" href="#movements">Посмотреть движения →</a></div><div class="coach-specs"><div class="spec-row"><span class="spec-number">33</span><div><h3>Тело в деталях</h3><p>Камера отслеживает положение суставов — от плеч до стоп.</p></div></div><div class="spec-row"><span class="spec-number">01</span><div><h3>Одна подсказка за раз</h3><p>«Подними обе руки» понятнее десятка показателей. Исправляй главное, играй дальше.</p></div></div><div class="spec-row"><span class="spec-number">→</span><div><h3>Видишь, что изменить</h3><p>Тренер выделяет нужную часть тела и показывает направление движения.</p></div></div></div></section>
      <section class="movements-section page-section" id="movements"><div class="section-heading"><div><p class="eyebrow">03 / ТВОЙ НАБОР ДВИЖЕНИЙ</p><h2>ПЯТЬ ДВИЖЕНИЙ.<br>ВСЕ ВОРОТА.</h2></div><p>Не нужно прыгать или падать.<br>Шага, наклона и движения рук достаточно.</p></div><div class="movement-grid">${[['ready','Стойка','Согни колени. Руки перед собой.'],['left','Влево','Шагни и потянись всем телом.'],['right','Вправо','Шагни и потянись всем телом.'],['high','Верхний мяч','Подними и выпрями обе руки.'],['low','Нижний мяч','Присядь. Опусти руки ниже таза.']].map(([mode,name,copy],i)=>`<article class="movement"><div class="movement-number">0${i+1}<span>${i===0?'ПОДГОТОВКА':'СЕЙВ'}</span></div>${poseArt(mode as Parameters<typeof poseArt>[0])}<h3>${name}</h3><p>${copy}</p></article>`).join('')}</div></section>
      <section class="final-cta ink-block"><div><p class="eyebrow">СЛЕДУЮЩИЙ МЯЧ — ТВОЙ</p><h2>ВОРОТА ЖДУТ.</h2></div><div><button class="primary" data-start>Начать тренировку <span>↗</span></button><p>Только ты, камера и десять ударов.</p></div></section>
    </div>
    <section class="session hidden" id="session" aria-label="Тренировка">
      <nav class="flow-stepper hidden" id="flow-stepper" aria-label="Этапы тренировки"><span data-short="01">01 Камера</span><span data-short="02">02 Калибровка</span><span data-short="03">03 Обучение</span><span data-short="04">04 Матч</span><span data-short="05">05 Итоги</span></nav>
      <div class="session-heading"><div><p class="eyebrow" id="session-eyebrow">ПОДГОТОВКА / КАЛИБРОВКА</p><h1 id="session-title" tabindex="-1">Встань в полный рост</h1><p id="session-description">Голова и стопы должны быть в кадре. Стой ровно три секунды.</p></div><span class="session-count" id="session-count">01<span> / 05</span></span></div>
      <div class="training-grid" id="training-grid"><div class="camera-panel ink-block"><div class="demo-top"><span><span class="status-dot"></span> ТВОЁ ПОЛЕ</span><div id="camera-controls"><span class="camera-state" id="camera-state">ОЖИДАНИЕ</span></div></div>
        <div class="stage-wrap" id="stage-wrap"><video id="camera" playsinline autoplay muted></video><canvas id="stage" aria-label="Зеркальное изображение с камеры и скелет"></canvas><div id="calibration-overlay" class="calibration-overlay"><div class="calibration-silhouette">${poseArt('ready')}</div><span id="calibration-countdown">ВСТАНЬ В КАДР</span></div><div class="camera-overlay"><span class="frame-corner tl"></span><span class="frame-corner tr"></span><span class="frame-corner bl"></span><span class="frame-corner br"></span></div></div>
        <div class="demo-bottom"><div><span class="status-label">КАМЕРА / ЗЕРКАЛЬНОЕ ОТОБРАЖЕНИЕ</span><strong id="status">Готова к запуску</strong></div><div class="pose-badge" id="pose-badge"><span></span> ПОЗА НЕ НАЙДЕНА</div></div>
      </div><aside class="training-sidebar" id="training-sidebar" aria-label="Подсказки и распознавание"><div id="instruction-slot"></div><div id="coach-slot"></div><div id="meters-slot"></div><div id="match-stats" class="match-stats hidden"><div><span class="eyebrow">СЧЁТ</span><strong id="live-score">0</strong></div><div><span class="eyebrow">УДАР</span><strong id="live-shot">1<span>/10</span></strong></div></div><div id="action-slot"></div><p class="session-help">Следи за собой в кадре.<br>Двигайся спокойно — прыгать не нужно.</p></aside></div>
      <div id="results-slot"></div>
    </section>
  </main>
  <footer><a class="brand" href="#">${goalIcon}<span>KEEPERCAM</span></a><span>ТВОЁ ДВИЖЕНИЕ — ТВОЙ ДЖОЙСТИК.</span><span class="footer-edition">MOTION / 2026</span></footer>
  <div class="modal hidden" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-copy"><div class="modal-card"><button class="modal-close" id="close-modal" aria-label="Закрыть">×</button><p class="eyebrow">ПЕРЕД ПЕРВЫМ СЕЙВОМ</p><h2 id="modal-title">Подготовим твоё поле</h2><p id="modal-copy">Поставь устройство устойчиво, освободи место для шага в сторону и встань лицом к свету.</p><ul class="setup-list" id="setup-list"><li><span>01</span>Камера видит тебя в полный рост</li><li><span>02</span>Вокруг есть место для движения</li><li><span>03</span>Видео обрабатывается на устройстве</li></ul><div class="loading hidden" id="loading"><div class="loading-track"><span></span></div><small>ПЕРВЫЙ ЗАПУСК МОЖЕТ ЗАНЯТЬ ДО 30 СЕКУНД</small></div><button class="primary modal-action" id="retry">Включить камеру <span>↗</span></button><p class="modal-note" id="modal-note">Браузер попросит разрешение на доступ к камере.</p></div></div>`;
}
